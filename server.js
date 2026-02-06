const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'youtube_clone_secret_key_2024';
const ADMIN_PASSWORD = '140612';

// Инициализация базы данных
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
    // Таблица пользователей
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        password TEXT,
        avatar TEXT,
        channel_name TEXT,
        subscribers_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_admin BOOLEAN DEFAULT 0
    )`);
    
    // Таблица видео
    db.run(`CREATE TABLE IF NOT EXISTS videos (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        video_url TEXT,
        thumbnail_url TEXT,
        user_id TEXT,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        dislikes INTEGER DEFAULT 0,
        duration INTEGER,
        is_short BOOLEAN DEFAULT 0,
        is_live BOOLEAN DEFAULT 0,
        category TEXT,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);
    
    // Таблица комментариев
    db.run(`CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        video_id TEXT,
        user_id TEXT,
        text TEXT,
        likes INTEGER DEFAULT 0,
        parent_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (video_id) REFERENCES videos(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);
    
    // Таблица подписок
    db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        subscriber_id TEXT,
        channel_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(subscriber_id, channel_id),
        FOREIGN KEY (subscriber_id) REFERENCES users(id),
        FOREIGN KEY (channel_id) REFERENCES users(id)
    )`);
    
    // Таблица лайков
    db.run(`CREATE TABLE IF NOT EXISTS likes (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        video_id TEXT,
        type INTEGER, -- 1 like, -1 dislike
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, video_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (video_id) REFERENCES videos(id)
    )`);
    
    // Таблица плейлистов
    db.run(`CREATE TABLE IF NOT EXISTS playlists (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        name TEXT,
        is_private BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);
    
    // Таблица элементов плейлиста
    db.run(`CREATE TABLE IF NOT EXISTS playlist_items (
        id TEXT PRIMARY KEY,
        playlist_id TEXT,
        video_id TEXT,
        position INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (playlist_id) REFERENCES playlists(id),
        FOREIGN KEY (video_id) REFERENCES videos(id)
    )`);
    
    // Таблица истории просмотров
    db.run(`CREATE TABLE IF NOT EXISTS watch_history (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        video_id TEXT,
        watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        progress INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (video_id) REFERENCES videos(id)
    )`);
    
    // Таблица уведомлений
    db.run(`CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        type TEXT,
        content TEXT,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);
    
    // Создаем администратора по умолчанию
    const adminHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    db.run(`INSERT OR IGNORE INTO users (id, username, email, password, is_admin) 
            VALUES (?, ?, ?, ?, ?)`, 
            ['admin_id', 'admin', 'admin@admin.com', adminHash, 1]);
});

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));

// Middleware для проверки JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Неверный токен' });
        }
        req.user = user;
        next();
    });
};

// Middleware для проверки администратора
const isAdmin = (req, res, next) => {
    db.get('SELECT is_admin FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err || !row || !row.is_admin) {
            return res.status(403).json({ error: 'Требуются права администратора' });
        }
        next();
    });
};

// ==================== АВТОРИЗАЦИЯ ====================
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4();
        
        db.run(`INSERT INTO users (id, username, email, password, channel_name) 
                VALUES (?, ?, ?, ?, ?)`,
                [userId, username, email, hashedPassword, username],
                function(err) {
                    if (err) {
                        return res.status(400).json({ error: err.message });
                    }
                    
                    const token = jwt.sign({ id: userId, username }, JWT_SECRET);
                    res.json({ 
                        token, 
                        user: { 
                            id: userId, 
                            username, 
                            channel_name: username 
                        } 
                    });
                });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err || !user) {
            return res.status(400).json({ error: 'Неверные учетные данные' });
        }
        
        try {
            if (await bcrypt.compare(password, user.password)) {
                const token = jwt.sign({ 
                    id: user.id, 
                    username: user.username 
                }, JWT_SECRET);
                
                res.json({ 
                    token, 
                    user: {
                        id: user.id,
                        username: user.username,
                        channel_name: user.channel_name,
                        avatar: user.avatar,
                        is_admin: user.is_admin
                    }
                });
            } else {
                res.status(400).json({ error: 'Неверные учетные данные' });
            }
        } catch (error) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    });
});

// ==================== ВИДЕО ====================
app.get('/api/videos', (req, res) => {
    const { limit = 50, offset = 0, category, is_short } = req.query;
    let query = `
        SELECT v.*, u.username, u.channel_name, u.avatar,
               (SELECT COUNT(*) FROM likes WHERE video_id = v.id AND type = 1) as likes_count,
               (SELECT COUNT(*) FROM subscriptions WHERE channel_id = u.id) as subscribers_count
        FROM videos v
        JOIN users u ON v.user_id = u.id
        WHERE 1=1
    `;
    const params = [];
    
    if (category) {
        query += ' AND v.category = ?';
        params.push(category);
    }
    
    if (is_short !== undefined) {
        query += ' AND v.is_short = ?';
        params.push(is_short === 'true' ? 1 : 0);
    }
    
    query += ' ORDER BY v.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(query, params, (err, videos) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(videos);
    });
});

app.get('/api/videos/:id', (req, res) => {
    const videoId = req.params.id;
    
    db.get(`
        SELECT v.*, u.username, u.channel_name, u.avatar,
               (SELECT COUNT(*) FROM likes WHERE video_id = v.id AND type = 1) as likes_count,
               (SELECT COUNT(*) FROM likes WHERE video_id = v.id AND type = -1) as dislikes_count,
               (SELECT COUNT(*) FROM subscriptions WHERE channel_id = u.id) as subscribers_count
        FROM videos v
        JOIN users u ON v.user_id = u.id
        WHERE v.id = ?
    `, [videoId], (err, video) => {
        if (err || !video) {
            return res.status(404).json({ error: 'Видео не найдено' });
        }
        
        // Увеличиваем счетчик просмотров
        db.run('UPDATE videos SET views = views + 1 WHERE id = ?', [videoId]);
        
        // Добавляем в историю просмотров, если пользователь авторизован
        if (req.headers.authorization) {
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, JWT_SECRET, (err, user) => {
                if (!err && user) {
                    db.run(`INSERT OR REPLACE INTO watch_history (id, user_id, video_id) 
                            VALUES (?, ?, ?)`,
                            [uuidv4(), user.id, videoId]);
                }
            });
        }
        
        res.json(video);
    });
});

app.post('/api/videos', authenticateToken, upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
]), (req, res) => {
    const { title, description, is_short, category, tags } = req.body;
    const videoFile = req.files['video'] ? req.files['video'][0] : null;
    const thumbnailFile = req.files['thumbnail'] ? req.files['thumbnail'][0] : null;
    
    if (!videoFile) {
        return res.status(400).json({ error: 'Видео файл обязателен' });
    }
    
    const videoId = uuidv4();
    const videoUrl = `/uploads/${videoFile.filename}`;
    const thumbnailUrl = thumbnailFile ? `/uploads/${thumbnailFile.filename}` : null;
    
    db.run(`INSERT INTO videos (id, title, description, video_url, thumbnail_url, 
                                user_id, is_short, category, tags) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [videoId, title, description, videoUrl, thumbnailUrl, 
             req.user.id, is_short ? 1 : 0, category, tags],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                // Отправляем уведомления подписчикам
                db.all(`SELECT subscriber_id FROM subscriptions WHERE channel_id = ?`, 
                      [req.user.id], (err, subscribers) => {
                    if (!err && subscribers) {
                        subscribers.forEach(subscriber => {
                            db.run(`INSERT INTO notifications (id, user_id, type, content) 
                                    VALUES (?, ?, ?, ?)`,
                                    [uuidv4(), subscriber.subscriber_id, 
                                     'new_video', 
                                     `${req.user.username} загрузил новое видео: "${title}"`]);
                        });
                    }
                });
                
                res.json({ id: videoId, message: 'Видео успешно загружено' });
            });
});

// ==================== КОММЕНТАРИИ ====================
app.get('/api/videos/:videoId/comments', (req, res) => {
    const videoId = req.params.videoId;
    
    db.all(`
        SELECT c.*, u.username, u.avatar
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.video_id = ? AND c.parent_id IS NULL
        ORDER BY c.likes DESC, c.created_at DESC
    `, [videoId], (err, comments) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(comments);
    });
});

app.post('/api/videos/:videoId/comments', authenticateToken, (req, res) => {
    const { text, parent_id } = req.body;
    const videoId = req.params.videoId;
    
    if (!text) {
        return res.status(400).json({ error: 'Текст комментария обязателен' });
    }
    
    const commentId = uuidv4();
    
    db.run(`INSERT INTO comments (id, video_id, user_id, text, parent_id) 
            VALUES (?, ?, ?, ?, ?)`,
            [commentId, videoId, req.user.id, text, parent_id || null],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                // Уведомление владельцу видео
                db.get('SELECT user_id FROM videos WHERE id = ?', [videoId], (err, video) => {
                    if (!err && video && video.user_id !== req.user.id) {
                        db.run(`INSERT INTO notifications (id, user_id, type, content) 
                                VALUES (?, ?, ?, ?)`,
                                [uuidv4(), video.user_id, 
                                 'new_comment', 
                                 `${req.user.username} прокомментировал ваше видео`]);
                    }
                });
                
                res.json({ id: commentId, message: 'Комментарий добавлен' });
            });
});

// ==================== ЛАЙКИ ====================
app.post('/api/videos/:videoId/like', authenticateToken, (req, res) => {
    const { type } = req.body; // 1 like, -1 dislike
    const videoId = req.params.videoId;
    
    if (![1, -1].includes(type)) {
        return res.status(400).json({ error: 'Неверный тип реакции' });
    }
    
    // Удаляем существующую реакцию
    db.run(`DELETE FROM likes WHERE user_id = ? AND video_id = ?`, 
           [req.user.id, videoId], () => {
        
        // Добавляем новую
        db.run(`INSERT INTO likes (id, user_id, video_id, type) 
                VALUES (?, ?, ?, ?)`,
                [uuidv4(), req.user.id, videoId, type],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    
                    res.json({ message: type === 1 ? 'Лайк добавлен' : 'Дизлайк добавлен' });
                });
    });
});

// ==================== ПОДПИСКИ ====================
app.post('/api/users/:channelId/subscribe', authenticateToken, (req, res) => {
    const channelId = req.params.channelId;
    
    if (channelId === req.user.id) {
        return res.status(400).json({ error: 'Нельзя подписаться на себя' });
    }
    
    db.run(`INSERT OR IGNORE INTO subscriptions (id, subscriber_id, channel_id) 
            VALUES (?, ?, ?)`,
            [uuidv4(), req.user.id, channelId],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                if (this.changes > 0) {
                    // Уведомление каналу
                    db.run(`INSERT INTO notifications (id, user_id, type, content) 
                            VALUES (?, ?, ?, ?)`,
                            [uuidv4(), channelId, 
                             'new_subscriber', 
                             `${req.user.username} подписался на ваш канал`]);
                    
                    // Обновляем счетчик подписчиков
                    db.run(`UPDATE users SET subscribers_count = subscribers_count + 1 
                            WHERE id = ?`, [channelId]);
                }
                
                res.json({ message: 'Подписка оформлена' });
            });
});

app.delete('/api/users/:channelId/subscribe', authenticateToken, (req, res) => {
    const channelId = req.params.channelId;
    
    db.run(`DELETE FROM subscriptions WHERE subscriber_id = ? AND channel_id = ?`,
           [req.user.id, channelId],
           function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                if (this.changes > 0) {
                    db.run(`UPDATE users SET subscribers_count = subscribers_count - 1 
                            WHERE id = ? AND subscribers_count > 0`, [channelId]);
                }
                
                res.json({ message: 'Подписка отменена' });
            });
});

// ==================== РЕКОМЕНДАЦИИ ====================
app.get('/api/recommendations', authenticateToken, (req, res) => {
    // Сложный алгоритм рекомендаций на основе истории просмотров и подписок
    const userId = req.user.id;
    
    const query = `
        SELECT DISTINCT v.*, u.username, u.channel_name, u.avatar,
               (SELECT COUNT(*) FROM likes WHERE video_id = v.id AND type = 1) as likes_count,
               (SELECT COUNT(*) FROM subscriptions WHERE channel_id = u.id) as subscribers_count
        FROM videos v
        JOIN users u ON v.user_id = u.id
        WHERE v.id NOT IN (
            SELECT video_id FROM watch_history WHERE user_id = ?
        )
        AND (
            -- Видео с каналов, на которые подписан пользователь
            u.id IN (SELECT channel_id FROM subscriptions WHERE subscriber_id = ?)
            -- Или популярные видео в категориях, которые пользователь смотрел
            OR v.category IN (
                SELECT DISTINCT v2.category 
                FROM watch_history wh
                JOIN videos v2 ON wh.video_id = v2.id
                WHERE wh.user_id = ?
                GROUP BY v2.category
                ORDER BY COUNT(*) DESC
                LIMIT 3
            )
            -- Или самые популярные видео за последнюю неделю
            OR v.views > 1000 AND v.created_at > datetime('now', '-7 days')
        )
        ORDER BY 
            CASE WHEN u.id IN (SELECT channel_id FROM subscriptions WHERE subscriber_id = ?) THEN 0 ELSE 1 END,
            v.views DESC,
            v.created_at DESC
        LIMIT 20
    `;
    
    db.all(query, [userId, userId, userId, userId], (err, videos) => {
        if (err) {
            console.error(err);
            // Если алгоритм не сработал, возвращаем просто популярные видео
            return db.all(`
                SELECT v.*, u.username, u.channel_name, u.avatar
                FROM videos v
                JOIN users u ON v.user_id = u.id
                ORDER BY v.views DESC, v.created_at DESC
                LIMIT 20
            `, [], (err, videos) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json(videos);
            });
        }
        res.json(videos);
    });
});

// ==================== ПОИСК ====================
app.get('/api/search', (req, res) => {
    const { q, type = 'video' } = req.query;
    
    if (!q) {
        return res.status(400).json({ error: 'Запрос поиска обязателен' });
    }
    
    if (type === 'video') {
        const query = `
            SELECT v.*, u.username, u.channel_name, u.avatar
            FROM videos v
            JOIN users u ON v.user_id = u.id
            WHERE v.title LIKE ? OR v.description LIKE ? OR v.tags LIKE ?
            ORDER BY v.views DESC
            LIMIT 50
        `;
        
        const searchTerm = `%${q}%`;
        db.all(query, [searchTerm, searchTerm, searchTerm], (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(results);
        });
    } else if (type === 'channel') {
        const query = `
            SELECT * FROM users
            WHERE username LIKE ? OR channel_name LIKE ?
            ORDER BY subscribers_count DESC
            LIMIT 50
        `;
        
        const searchTerm = `%${q}%`;
        db.all(query, [searchTerm, searchTerm], (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(results);
        });
    }
});

// ==================== АДМИН ПАНЕЛЬ ====================
// Скрытый эндпоинт для админ панели
app.get('/admin/:password', (req, res) => {
    if (req.params.password === ADMIN_PASSWORD) {
        const adminToken = jwt.sign({ 
            id: 'admin',
            username: 'admin',
            is_admin: true 
        }, JWT_SECRET, { expiresIn: '24h' });
        
        res.json({ 
            token: adminToken,
            message: 'Доступ к админ панели предоставлен'
        });
    } else {
        res.status(403).json({ error: 'Неверный пароль администратора' });
    }
});

app.get('/api/admin/stats', authenticateToken, isAdmin, (req, res) => {
    const queries = {
        total_users: 'SELECT COUNT(*) as count FROM users',
        total_videos: 'SELECT COUNT(*) as count FROM videos',
        total_views: 'SELECT SUM(views) as count FROM videos',
        total_likes: 'SELECT COUNT(*) as count FROM likes WHERE type = 1',
        recent_videos: `SELECT v.*, u.username FROM videos v 
                       JOIN users u ON v.user_id = u.id 
                       ORDER BY v.created_at DESC LIMIT 10`,
        top_videos: `SELECT v.*, u.username FROM videos v 
                    JOIN users u ON v.user_id = u.id 
                    ORDER BY v.views DESC LIMIT 10`,
        top_channels: `SELECT *, subscribers_count FROM users 
                      ORDER BY subscribers_count DESC LIMIT 10`
    };
    
    const results = {};
    let completed = 0;
    
    Object.keys(queries).forEach(key => {
        db.all(queries[key], [], (err, rows) => {
            results[key] = rows;
            completed++;
            
            if (completed === Object.keys(queries).length) {
                res.json(results);
            }
        });
    });
});

app.delete('/api/admin/videos/:id', authenticateToken, isAdmin, (req, res) => {
    const videoId = req.params.id;
    
    db.run('DELETE FROM videos WHERE id = ?', [videoId], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // Удаляем связанные данные
        db.run('DELETE FROM comments WHERE video_id = ?', [videoId]);
        db.run('DELETE FROM likes WHERE video_id = ?', [videoId]);
        db.run('DELETE FROM playlist_items WHERE video_id = ?', [videoId]);
        
        res.json({ message: 'Видео удалено' });
    });
});

app.delete('/api/admin/users/:id', authenticateToken, isAdmin, (req, res) => {
    const userId = req.params.id;
    
    // Нельзя удалить администратора
    db.get('SELECT is_admin FROM users WHERE id = ?', [userId], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        if (user.is_admin) {
            return res.status(400).json({ error: 'Нельзя удалить администратора' });
        }
        
        // Удаляем пользователя и все его данные
        db.serialize(() => {
            db.run('DELETE FROM users WHERE id = ?', [userId]);
            db.run('DELETE FROM videos WHERE user_id = ?', [userId]);
            db.run('DELETE FROM comments WHERE user_id = ?', [userId]);
            db.run('DELETE FROM subscriptions WHERE subscriber_id = ? OR channel_id = ?', 
                   [userId, userId]);
            db.run('DELETE FROM likes WHERE user_id = ?', [userId]);
            db.run('DELETE FROM playlists WHERE user_id = ?', [userId]);
        });
        
        res.json({ message: 'Пользователь удален' });
    });
});

// ==================== ПЛЕЙЛИСТЫ ====================
app.get('/api/playlists', authenticateToken, (req, res) => {
    db.all(`
        SELECT p.*, COUNT(pi.video_id) as video_count
        FROM playlists p
        LEFT JOIN playlist_items pi ON p.id = pi.playlist_id
        WHERE p.user_id = ? OR p.is_private = 0
        GROUP BY p.id
        ORDER BY p.created_at DESC
    `, [req.user.id], (err, playlists) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(playlists);
    });
});

app.post('/api/playlists', authenticateToken, (req, res) => {
    const { name, is_private } = req.body;
    const playlistId = uuidv4();
    
    db.run(`INSERT INTO playlists (id, user_id, name, is_private) 
            VALUES (?, ?, ?, ?)`,
            [playlistId, req.user.id, name, is_private ? 1 : 0],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ id: playlistId, message: 'Плейлист создан' });
            });
});

// ==================== УВЕДОМЛЕНИЯ ====================
app.get('/api/notifications', authenticateToken, (req, res) => {
    const { unread_only } = req.query;
    
    let query = `SELECT * FROM notifications WHERE user_id = ?`;
    const params = [req.user.id];
    
    if (unread_only === 'true') {
        query += ' AND is_read = 0';
    }
    
    query += ' ORDER BY created_at DESC LIMIT 50';
    
    db.all(query, params, (err, notifications) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(notifications);
    });
});

app.put('/api/notifications/:id/read', authenticateToken, (req, res) => {
    const notificationId = req.params.id;
    
    db.run(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
           [notificationId, req.user.id],
           function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: 'Уведомление отмечено как прочитанное' });
            });
});

// ==================== ПРЯМЫЕ ТРАНСЛЯЦИИ ====================
app.post('/api/live/start', authenticateToken, (req, res) => {
    const { title, description } = req.body;
    const streamId = uuidv4();
    const videoId = uuidv4();
    
    // Создаем запись о трансляции
    db.run(`INSERT INTO videos (id, title, description, user_id, is_live, video_url) 
            VALUES (?, ?, ?, ?, 1, ?)`,
            [videoId, title, description, req.user.id, `/live/${streamId}`],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                // Уведомляем подписчиков
                db.all(`SELECT subscriber_id FROM subscriptions WHERE channel_id = ?`, 
                      [req.user.id], (err, subscribers) => {
                    if (!err && subscribers) {
                        subscribers.forEach(subscriber => {
                            db.run(`INSERT INTO notifications (id, user_id, type, content) 
                                    VALUES (?, ?, ?, ?)`,
                                    [uuidv4(), subscriber.subscriber_id, 
                                     'live_started', 
                                     `${req.user.username} начал трансляцию: "${title}"`]);
                        });
                    }
                });
                
                res.json({ 
                    stream_id: streamId,
                    video_id: videoId,
                    rtmp_url: `rtmp://localhost:1935/live/${streamId}`,
                    stream_key: streamId
                });
            });
});

// ==================== ШОРТС (короткие видео) ====================
app.get('/api/shorts', (req, res) => {
    const { limit = 30, offset = 0 } = req.query;
    
    db.all(`
        SELECT v.*, u.username, u.channel_name, u.avatar
        FROM videos v
        JOIN users u ON v.user_id = u.id
        WHERE v.is_short = 1
        ORDER BY v.views DESC, v.created_at DESC
        LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)], (err, shorts) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(shorts);
    });
});

// ==================== ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ====================
app.get('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    
    db.get(`
        SELECT id, username, channel_name, avatar, subscribers_count, created_at
        FROM users 
        WHERE id = ?
    `, [userId], (err, user) => {
        if (err || !user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        // Получаем видео пользователя
        db.all(`
            SELECT * FROM videos 
            WHERE user_id = ? AND is_short = 0
            ORDER BY created_at DESC
        `, [userId], (err, videos) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            // Получаем шорты пользователя
            db.all(`
                SELECT * FROM videos 
                WHERE user_id = ? AND is_short = 1
                ORDER BY created_at DESC
            `, [userId], (err, shorts) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                // Проверяем подписку, если пользователь авторизован
                let is_subscribed = false;
                if (req.headers.authorization) {
                    const token = req.headers.authorization.split(' ')[1];
                    jwt.verify(token, JWT_SECRET, (err, authUser) => {
                        if (!err && authUser) {
                            db.get(`SELECT 1 FROM subscriptions 
                                    WHERE subscriber_id = ? AND channel_id = ?`,
                                    [authUser.id, userId], (err, subscription) => {
                                is_subscribed = !!subscription;
                                res.json({ ...user, videos, shorts, is_subscribed });
                            });
                            return;
                        }
                    });
                }
                
                res.json({ ...user, videos, shorts, is_subscribed });
            });
        });
    });
});

// ==================== ИСТОРИЯ ПРОСМОТРОВ ====================
app.get('/api/history', authenticateToken, (req, res) => {
    db.all(`
        SELECT v.*, u.username, u.channel_name, u.avatar, wh.watched_at, wh.progress
        FROM watch_history wh
        JOIN videos v ON wh.video_id = v.id
        JOIN users u ON v.user_id = u.id
        WHERE wh.user_id = ?
        ORDER BY wh.watched_at DESC
        LIMIT 50
    `, [req.user.id], (err, history) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(history);
    });
});

// ==================== ЗАПУСК СЕРВЕРА ====================
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Админ панель доступна по адресу: /admin/${ADMIN_PASSWORD}`);
    console.log(`Загруженные файлы доступны по адресу: /uploads/`);
});
