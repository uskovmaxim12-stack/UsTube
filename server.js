const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

// Создаем директории для хранения
const UPLOAD_DIR = './uploads';
const DB_FILE = './database.json';

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.mkdirSync(UPLOAD_DIR + '/videos', { recursive: true });
    fs.mkdirSync(UPLOAD_DIR + '/thumbnails', { recursive: true });
    fs.mkdirSync(UPLOAD_DIR + '/avatars', { recursive: true });
}

// Инициализация базы данных
let database = {
    users: {},
    videos: {},
    comments: {},
    subscriptions: {},
    likes: {},
    views: {},
    playlists: {},
    notifications: {},
    nextId: {
        video: 1000,
        user: 1000,
        comment: 1000,
        playlist: 1000
    }
};

if (fs.existsSync(DB_FILE)) {
    try {
        database = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch(e) {
        console.log('Новая база данных создана');
    }
}

function saveDatabase() {
    fs.writeFileSync(DB_FILE, JSON.stringify(database, null, 2));
}

// Функции работы с данными
const DataManager = {
    // Пользователи
    createUser(username, email, password) {
        const userId = 'user_' + database.nextId.user++;
        const user = {
            id: userId,
            username,
            email,
            password: crypto.createHash('sha256').update(password).digest('hex'),
            avatar: `/uploads/avatars/default.png`,
            channelName: username,
            subscribers: 0,
            videos: [],
            subscriptions: [],
            createdAt: Date.now(),
            isAdmin: username === 'admin'
        };
        database.users[userId] = user;
        saveDatabase();
        return user;
    },

    findUserByEmail(email) {
        return Object.values(database.users).find(u => u.email === email);
    },

    findUserById(id) {
        return database.users[id];
    },

    // Видео
    createVideo(data) {
        const videoId = 'video_' + database.nextId.video++;
        const video = {
            id: videoId,
            ...data,
            views: 0,
            likes: 0,
            dislikes: 0,
            comments: 0,
            createdAt: Date.now(),
            isShort: data.duration < 60
        };
        database.videos[videoId] = video;
        
        // Добавляем в пользователя
        if (database.users[data.userId]) {
            database.users[data.userId].videos.push(videoId);
        }
        
        saveDatabase();
        return video;
    },

    getVideo(id) {
        const video = database.videos[id];
        if (video) {
            video.views++;
            saveDatabase();
        }
        return video;
    },

    getVideos(sortBy = 'newest', limit = 50, category = null) {
        let videos = Object.values(database.videos);
        
        if (category) {
            videos = videos.filter(v => v.category === category);
        }
        
        switch(sortBy) {
            case 'popular': 
                videos.sort((a, b) => b.views - a.views);
                break;
            case 'trending':
                videos.sort((a, b) => {
                    const aScore = b.likes * 2 - b.dislikes + b.views * 0.1;
                    const bScore = a.likes * 2 - a.dislikes + a.views * 0.1;
                    return bScore - aScore;
                });
                break;
            default: // newest
                videos.sort((a, b) => b.createdAt - a.createdAt);
        }
        
        return videos.slice(0, limit);
    },

    // Лайки
    likeVideo(userId, videoId, type) {
        const key = `${userId}_${videoId}`;
        database.likes[key] = { userId, videoId, type, timestamp: Date.now() };
        
        const video = database.videos[videoId];
        if (video) {
            if (type === 1) video.likes++;
            if (type === -1) video.dislikes++;
            saveDatabase();
        }
    },

    getUserLike(userId, videoId) {
        return database.likes[`${userId}_${videoId}`];
    },

    // Подписки
    subscribe(subscriberId, channelId) {
        const key = `${subscriberId}_${channelId}`;
        database.subscriptions[key] = { subscriberId, channelId, timestamp: Date.now() };
        
        const user = database.users[channelId];
        if (user) {
            user.subscribers = (user.subscribers || 0) + 1;
            saveDatabase();
        }
    },

    unsubscribe(subscriberId, channelId) {
        delete database.subscriptions[`${subscriberId}_${channelId}`];
        
        const user = database.users[channelId];
        if (user && user.subscribers > 0) {
            user.subscribers--;
            saveDatabase();
        }
    },

    isSubscribed(subscriberId, channelId) {
        return !!database.subscriptions[`${subscriberId}_${channelId}`];
    },

    // Комментарии
    addComment(videoId, userId, text) {
        const commentId = 'comment_' + database.nextId.comment++;
        const comment = {
            id: commentId,
            videoId,
            userId,
            text,
            likes: 0,
            timestamp: Date.now()
        };
        database.comments[commentId] = comment;
        
        // Увеличиваем счетчик комментариев у видео
        const video = database.videos[videoId];
        if (video) {
            video.comments = (video.comments || 0) + 1;
            saveDatabase();
        }
        
        return comment;
    },

    getVideoComments(videoId) {
        return Object.values(database.comments)
            .filter(c => c.videoId === videoId)
            .sort((a, b) => b.timestamp - a.timestamp);
    },

    // Поиск
    search(query, type = 'video') {
        query = query.toLowerCase();
        
        if (type === 'video') {
            return Object.values(database.videos).filter(video => 
                video.title.toLowerCase().includes(query) ||
                video.description.toLowerCase().includes(query) ||
                video.tags.toLowerCase().includes(query)
            );
        } else {
            return Object.values(database.users).filter(user => 
                user.username.toLowerCase().includes(query) ||
                user.channelName.toLowerCase().includes(query)
            );
        }
    },

    // Рекомендации
    getRecommendations(userId, limit = 20) {
        const user = database.users[userId];
        let videos = Object.values(database.videos);
        
        // Если пользователь есть, даем персонализированные рекомендации
        if (user) {
            // Видео с каналов, на которые подписан
            const subscribedChannels = Object.values(database.subscriptions)
                .filter(s => s.subscriberId === userId)
                .map(s => s.channelId);
            
            const subscribedVideos = videos.filter(v => subscribedChannels.includes(v.userId));
            
            // Популярные видео в категориях, которые пользователь смотрел
            const watchedVideos = Object.values(database.views)
                .filter(v => v.userId === userId)
                .map(v => database.videos[v.videoId])
                .filter(Boolean);
            
            const favoriteCategories = {};
            watchedVideos.forEach(v => {
                favoriteCategories[v.category] = (favoriteCategories[v.category] || 0) + 1;
            });
            
            const topCategory = Object.keys(favoriteCategories).sort((a,b) => 
                favoriteCategories[b] - favoriteCategories[a])[0];
            
            const categoryVideos = videos.filter(v => v.category === topCategory);
            
            // Смешиваем результаты
            const recommendations = [
                ...subscribedVideos,
                ...categoryVideos,
                ...videos.filter(v => v.views > 1000) // Популярные
            ];
            
            // Убираем дубликаты и уже просмотренные
            const uniqueVideos = [...new Map(recommendations.map(v => [v.id, v])).values()]
                .filter(v => !watchedVideos.find(w => w.id === v.id))
                .slice(0, limit);
            
            return uniqueVideos.length > 0 ? uniqueVideos : videos.slice(0, limit);
        }
        
        // Для неавторизованных - просто популярные видео
        return videos.sort((a, b) => b.views - a.views).slice(0, limit);
    },

    // Админ функции
    getStats() {
        return {
            totalUsers: Object.keys(database.users).length,
            totalVideos: Object.keys(database.videos).length,
            totalViews: Object.values(database.videos).reduce((sum, v) => sum + v.views, 0),
            totalComments: Object.keys(database.comments).length,
            topVideos: Object.values(database.videos)
                .sort((a, b) => b.views - a.views)
                .slice(0, 10),
            topChannels: Object.values(database.users)
                .sort((a, b) => (b.subscribers || 0) - (a.subscribers || 0))
                .slice(0, 10)
        };
    },

    deleteVideo(videoId) {
        const video = database.videos[videoId];
        if (video) {
            // Удаляем файлы
            try {
                if (video.videoPath && fs.existsSync('.' + video.videoPath)) {
                    fs.unlinkSync('.' + video.videoPath);
                }
                if (video.thumbnailPath && fs.existsSync('.' + video.thumbnailPath)) {
                    fs.unlinkSync('.' + video.thumbnailPath);
                }
            } catch(e) {}
            
            // Удаляем из базы
            delete database.videos[videoId];
            
            // Удаляем комментарии
            Object.keys(database.comments).forEach(commentId => {
                if (database.comments[commentId].videoId === videoId) {
                    delete database.comments[commentId];
                }
            });
            
            saveDatabase();
            return true;
        }
        return false;
    }
};

// Создаем HTTP сервер
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // Устанавливаем заголовки CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // API endpoints
    if (pathname === '/api/register' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                
                if (!data.username || !data.email || !data.password) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Все поля обязательны' }));
                    return;
                }
                
                if (DataManager.findUserByEmail(data.email)) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Пользователь с таким email уже существует' }));
                    return;
                }
                
                const user = DataManager.createUser(data.username, data.email, data.password);
                
                // Создаем токен
                const token = crypto.createHash('sha256')
                    .update(user.id + Date.now())
                    .digest('hex');
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        channelName: user.channelName,
                        avatar: user.avatar,
                        isAdmin: user.isAdmin
                    }
                }));
            } catch(e) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Ошибка сервера' }));
            }
        });
        return;
    }
    
    if (pathname === '/api/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const user = DataManager.findUserByEmail(data.email);
                
                if (!user || user.password !== crypto.createHash('sha256').update(data.password).digest('hex')) {
                    res.writeHead(401);
                    res.end(JSON.stringify({ error: 'Неверный email или пароль' }));
                    return;
                }
                
                const token = crypto.createHash('sha256')
                    .update(user.id + Date.now())
                    .digest('hex');
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        channelName: user.channelName,
                        avatar: user.avatar,
                        isAdmin: user.isAdmin
                    }
                }));
            } catch(e) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Ошибка сервера' }));
            }
        });
        return;
    }
    
    if (pathname === '/api/videos' && req.method === 'GET') {
        const query = parsedUrl.query;
        const videos = DataManager.getVideos(
            query.sort || 'newest',
            parseInt(query.limit) || 50,
            query.category
        );
        
        // Добавляем информацию о канале
        const videosWithChannel = videos.map(video => {
            const user = DataManager.findUserById(video.userId);
            return {
                ...video,
                channelName: user?.channelName || 'Unknown',
                channelAvatar: user?.avatar,
                subscribers: user?.subscribers || 0
            };
        });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(videosWithChannel));
        return;
    }
    
    if (pathname.startsWith('/api/videos/') && req.method === 'GET') {
        const videoId = pathname.split('/')[3];
        const video = DataManager.getVideo(videoId);
        
        if (!video) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Видео не найдено' }));
            return;
        }
        
        const user = DataManager.findUserById(video.userId);
        const response = {
            ...video,
            channel: {
                id: user?.id,
                name: user?.channelName,
                avatar: user?.avatar,
                subscribers: user?.subscribers || 0
            }
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
        return;
    }
    
    if (pathname === '/api/upload' && req.method === 'POST') {
        // Здесь будет обработка загрузки видео
        // Для простоты сохраняем только метаданные
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const video = DataManager.createVideo(data);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    videoId: video.id,
                    message: 'Видео успешно загружено'
                }));
            } catch(e) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Ошибка загрузки видео' }));
            }
        });
        return;
    }
    
    if (pathname.startsWith('/api/like/') && req.method === 'POST') {
        const videoId = pathname.split('/')[3];
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                DataManager.likeVideo(data.userId, videoId, data.type);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch(e) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Ошибка' }));
            }
        });
        return;
    }
    
    if (pathname.startsWith('/api/subscribe/') && req.method === 'POST') {
        const channelId = pathname.split('/')[3];
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                DataManager.subscribe(data.userId, channelId);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch(e) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Ошибка' }));
            }
        });
        return;
    }
    
    if (pathname.startsWith('/api/subscribe/') && req.method === 'DELETE') {
        const channelId = pathname.split('/')[3];
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                DataManager.unsubscribe(data.userId, channelId);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch(e) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Ошибка' }));
            }
        });
        return;
    }
    
    if (pathname === '/api/search' && req.method === 'GET') {
        const query = parsedUrl.query.q;
        const type = parsedUrl.query.type || 'video';
        
        if (!query) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Запрос обязателен' }));
            return;
        }
        
        const results = DataManager.search(query, type);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(results));
        return;
    }
    
    if (pathname === '/api/recommendations' && req.method === 'GET') {
        const userId = parsedUrl.query.userId;
        const recommendations = DataManager.getRecommendations(userId);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(recommendations));
        return;
    }
    
    if (pathname === '/api/admin/stats' && req.method === 'GET') {
        const stats = DataManager.getStats();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(stats));
        return;
    }
    
    if (pathname.startsWith('/api/admin/delete/') && req.method === 'DELETE') {
        const videoId = pathname.split('/')[4];
        const success = DataManager.deleteVideo(videoId);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success }));
        return;
    }
    
    // Статические файлы
    let filePath = '.' + pathname;
    if (filePath === './') {
        filePath = './index.html';
    }
    
    const extname = path.extname(filePath);
    let contentType = 'text/html';
    
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.jpg':
        case '.jpeg':
            contentType = 'image/jpg';
            break;
        case '.mp4':
            contentType = 'video/mp4';
            break;
        case '.webm':
            contentType = 'video/webm';
            break;
    }
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // Файл не найден - возвращаем index.html для SPA
                fs.readFile('./index.html', (error, content) => {
                    if (error) {
                        res.writeHead(404);
                        res.end('File not found');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(content, 'utf-8');
                    }
                });
            } else {
                res.writeHead(500);
                res.end('Server error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 UsTube Server запущен на порту ${PORT}`);
    console.log(`🌐 Откройте в браузере: http://localhost:${PORT}`);
    console.log(`🔑 Админ доступ: admin@admin.com / admin123`);
    console.log(`📁 Файлы загружаются в папку: ${UPLOAD_DIR}`);
});
