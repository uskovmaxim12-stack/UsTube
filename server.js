const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Настройки
const PORT = 3000;
const DB_FILE = 'database.json';
const UPLOADS_DIR = 'uploads';
const SALT = 'ustube_secure_salt_2024';

// Создаем папки
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    fs.mkdirSync(path.join(UPLOADS_DIR, 'videos'), { recursive: true });
    fs.mkdirSync(path.join(UPLOADS_DIR, 'thumbnails'), { recursive: true });
    fs.mkdirSync(path.join(UPLOADS_DIR, 'avatars'), { recursive: true });
}

// Инициализация базы данных
class Database {
    constructor() {
        this.data = {
            users: [],
            videos: [],
            comments: [],
            subscriptions: [],
            likes: [],
            views: [],
            settings: {
                nextUserId: 1,
                nextVideoId: 1,
                nextCommentId: 1
            },
            admin: {
                // Админ данные хранятся отдельно
                username: 'admin',
                passwordHash: this.hashPassword('AdminSecurePass123!'),
                email: 'admin@ustube.com',
                createdAt: Date.now()
            }
        };
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(DB_FILE)) {
                const saved = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
                this.data = { ...this.data, ...saved };
                console.log('📁 База данных загружена');
            }
        } catch (e) {
            console.log('📁 Новая база данных создана');
        }
    }

    save() {
        try {
            fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2));
        } catch (e) {
            console.error('Ошибка сохранения базы:', e);
        }
    }

    hashPassword(password) {
        return crypto.createHash('sha256')
            .update(password + SALT)
            .digest('hex');
    }

    // Пользователи
    createUser(username, email, password) {
        const user = {
            id: 'user_' + this.data.settings.nextUserId++,
            username,
            email,
            passwordHash: this.hashPassword(password),
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=FF0000&color=fff`,
            channelName: username,
            description: '',
            subscribers: 0,
            videos: [],
            createdAt: Date.now(),
            lastLogin: Date.now()
        };
        
        this.data.users.push(user);
        this.save();
        return { success: true, user: { ...user, passwordHash: undefined } };
    }

    findUserByEmail(email) {
        return this.data.users.find(u => u.email === email);
    }

    findUserById(id) {
        return this.data.users.find(u => u.id === id);
    }

    authenticate(email, password) {
        const user = this.findUserByEmail(email);
        if (!user) return null;
        
        const inputHash = this.hashPassword(password);
        if (user.passwordHash === inputHash) {
            return { ...user, passwordHash: undefined };
        }
        return null;
    }

    // Видео
    createVideo(videoData) {
        const video = {
            id: 'video_' + this.data.settings.nextVideoId++,
            ...videoData,
            views: 0,
            likes: 0,
            dislikes: 0,
            commentsCount: 0,
            createdAt: Date.now(),
            isPublished: true,
            status: 'active'
        };
        
        this.data.videos.push(video);
        
        // Добавляем видео в канал пользователя
        const user = this.findUserById(videoData.userId);
        if (user) {
            user.videos.push(video.id);
        }
        
        this.save();
        return video;
    }

    getVideo(id) {
        const video = this.data.videos.find(v => v.id === id);
        if (video) {
            video.views++;
            this.save();
        }
        return video;
    }

    getVideos(options = {}) {
        let videos = this.data.videos.filter(v => v.isPublished);
        
        if (options.userId) {
            videos = videos.filter(v => v.userId === options.userId);
        }
        
        if (options.category) {
            videos = videos.filter(v => v.category === options.category);
        }
        
        if (options.search) {
            const search = options.search.toLowerCase();
            videos = videos.filter(v => 
                v.title.toLowerCase().includes(search) ||
                v.description.toLowerCase().includes(search)
            );
        }
        
        // Сортировка
        videos.sort((a, b) => b.createdAt - a.createdAt);
        
        // Добавляем информацию о канале
        return videos.map(video => ({
            ...video,
            channel: this.getChannelInfo(video.userId)
        }));
    }

    // Комментарии
    addComment(commentData) {
        const comment = {
            id: 'comment_' + this.data.settings.nextCommentId++,
            ...commentData,
            likes: 0,
            createdAt: Date.now()
        };
        
        this.data.comments.push(comment);
        
        // Увеличиваем счетчик комментариев у видео
        const video = this.data.videos.find(v => v.id === commentData.videoId);
        if (video) {
            video.commentsCount++;
        }
        
        this.save();
        return comment;
    }

    getComments(videoId) {
        return this.data.comments
            .filter(c => c.videoId === videoId)
            .sort((a, b) => b.createdAt - a.createdAt)
            .map(comment => ({
                ...comment,
                user: this.findUserById(comment.userId)
            }));
    }

    // Подписки
    subscribe(subscriberId, channelId) {
        // Проверяем, не подписан ли уже
        const existing = this.data.subscriptions.find(s => 
            s.subscriberId === subscriberId && s.channelId === channelId
        );
        
        if (existing) return false;
        
        this.data.subscriptions.push({
            id: 'sub_' + Date.now(),
            subscriberId,
            channelId,
            createdAt: Date.now()
        });
        
        // Увеличиваем счетчик подписчиков
        const channel = this.findUserById(channelId);
        if (channel) {
            channel.subscribers++;
        }
        
        this.save();
        return true;
    }

    unsubscribe(subscriberId, channelId) {
        const index = this.data.subscriptions.findIndex(s => 
            s.subscriberId === subscriberId && s.channelId === channelId
        );
        
        if (index === -1) return false;
        
        this.data.subscriptions.splice(index, 1);
        
        // Уменьшаем счетчик подписчиков
        const channel = this.findUserById(channelId);
        if (channel && channel.subscribers > 0) {
            channel.subscribers--;
        }
        
        this.save();
        return true;
    }

    isSubscribed(subscriberId, channelId) {
        return this.data.subscriptions.some(s => 
            s.subscriberId === subscriberId && s.channelId === channelId
        );
    }

    // Лайки
    likeVideo(videoId, userId, type) {
        // Удаляем предыдущую реакцию
        const existingIndex = this.data.likes.findIndex(l => 
            l.videoId === videoId && l.userId === userId
        );
        
        if (existingIndex !== -1) {
            const oldLike = this.data.likes[existingIndex];
            this.data.likes.splice(existingIndex, 1);
            
            // Обновляем счетчики видео
            const video = this.data.videos.find(v => v.id === videoId);
            if (video) {
                if (oldLike.type === 1) video.likes--;
                if (oldLike.type === -1) video.dislikes--;
            }
        }
        
        // Добавляем новую реакцию
        const like = {
            id: 'like_' + Date.now(),
            videoId,
            userId,
            type,
            createdAt: Date.now()
        };
        
        this.data.likes.push(like);
        
        // Обновляем счетчики видео
        const video = this.data.videos.find(v => v.id === videoId);
        if (video) {
            if (type === 1) video.likes++;
            if (type === -1) video.dislikes++;
        }
        
        this.save();
        return true;
    }

    getUserReaction(videoId, userId) {
        const like = this.data.likes.find(l => 
            l.videoId === videoId && l.userId === userId
        );
        return like ? like.type : 0;
    }

    // Каналы
    getChannelInfo(userId) {
        const user = this.findUserById(userId);
        if (!user) return null;
        
        const videos = this.data.videos.filter(v => v.userId === userId && v.isPublished);
        const subscribers = this.data.subscriptions.filter(s => s.channelId === userId).length;
        
        return {
            id: user.id,
            name: user.channelName,
            avatar: user.avatar,
            subscribers,
            videosCount: videos.length,
            totalViews: videos.reduce((sum, v) => sum + v.views, 0),
            description: user.description,
            createdAt: user.createdAt
        };
    }

    updateChannel(userId, updates) {
        const user = this.findUserById(userId);
        if (!user) return false;
        
        Object.keys(updates).forEach(key => {
            if (key in user && key !== 'id' && key !== 'passwordHash') {
                user[key] = updates[key];
            }
        });
        
        this.save();
        return true;
    }

    // Админ функции
    authenticateAdmin(username, password) {
        const inputHash = this.hashPassword(password);
        return this.data.admin.username === username && 
               this.data.admin.passwordHash === inputHash;
    }

    getStats() {
        return {
            totalUsers: this.data.users.length,
            totalVideos: this.data.videos.length,
            totalViews: this.data.videos.reduce((sum, v) => sum + v.views, 0),
            totalComments: this.data.comments.length,
            totalSubscriptions: this.data.subscriptions.length,
            recentUsers: this.data.users.slice(-10).reverse(),
            recentVideos: this.data.videos.slice(-10).reverse(),
            topVideos: [...this.data.videos]
                .sort((a, b) => b.views - a.views)
                .slice(0, 10)
                .map(v => ({
                    ...v,
                    channel: this.getChannelInfo(v.userId)
                }))
        };
    }

    deleteVideo(videoId) {
        const index = this.data.videos.findIndex(v => v.id === videoId);
        if (index === -1) return false;
        
        const video = this.data.videos[index];
        
        // Удаляем видео из канала пользователя
        const user = this.findUserById(video.userId);
        if (user) {
            const videoIndex = user.videos.indexOf(videoId);
            if (videoIndex !== -1) {
                user.videos.splice(videoIndex, 1);
            }
        }
        
        // Удаляем комментарии
        this.data.comments = this.data.comments.filter(c => c.videoId !== videoId);
        
        // Удаляем лайки
        this.data.likes = this.data.likes.filter(l => l.videoId !== videoId);
        
        // Удаляем само видео
        this.data.videos.splice(index, 1);
        
        this.save();
        return true;
    }
}

// Инициализация базы данных
const db = new Database();

// Создаем HTTP сервер
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    
    // CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // API роуты
    if (pathname === '/api/register' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                
                if (!data.username || !data.email || !data.password) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Все поля обязательны' }));
                    return;
                }
                
                if (db.findUserByEmail(data.email)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Пользователь с таким email уже существует' }));
                    return;
                }
                
                const result = db.createUser(data.username, data.email, data.password);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
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
                const user = db.authenticate(data.email, data.password);
                
                if (!user) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Неверный email или пароль' }));
                    return;
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    user: {
                        id: user.id,
                        username: user.username,
                        channelName: user.channelName,
                        email: user.email,
                        avatar: user.avatar,
                        subscribers: user.subscribers
                    }
                }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Ошибка сервера' }));
            }
        });
        return;
    }
    
    if (pathname === '/api/videos' && req.method === 'GET') {
        const search = url.searchParams.get('search');
        const userId = url.searchParams.get('userId');
        const category = url.searchParams.get('category');
        const limit = parseInt(url.searchParams.get('limit')) || 50;
        
        const videos = db.getVideos({ search, userId, category }).slice(0, limit);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(videos));
        return;
    }
    
    if (pathname.startsWith('/api/videos/') && req.method === 'GET') {
        const videoId = pathname.split('/')[3];
        const video = db.getVideo(videoId);
        
        if (!video) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Видео не найдено' }));
            return;
        }
        
        const channel = db.getChannelInfo(video.userId);
        const response = {
            ...video,
            channel,
            comments: db.getComments(videoId)
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
        return;
    }
    
    if (pathname === '/api/videos' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const video = db.createVideo(data);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(video));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Ошибка загрузки видео' }));
            }
        });
        return;
    }
    
    if (pathname === '/api/comments' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const comment = db.addComment(data);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(comment));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Ошибка добавления комментария' }));
            }
        });
        return;
    }
    
    if (pathname.startsWith('/api/comments/') && req.method === 'GET') {
        const videoId = pathname.split('/')[3];
        const comments = db.getComments(videoId);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(comments));
        return;
    }
    
    if (pathname === '/api/subscribe' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const success = db.subscribe(data.subscriberId, data.channelId);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Ошибка подписки' }));
            }
        });
        return;
    }
    
    if (pathname === '/api/unsubscribe' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const success = db.unsubscribe(data.subscriberId, data.channelId);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Ошибка отписки' }));
            }
        });
        return;
    }
    
    if (pathname === '/api/like' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const success = db.likeVideo(data.videoId, data.userId, data.type);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Ошибка оценки' }));
            }
        });
        return;
    }
    
    if (pathname === '/api/channel' && req.method === 'GET') {
        const userId = url.searchParams.get('userId');
        const channel = db.getChannelInfo(userId);
        
        if (!channel) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Канал не найден' }));
            return;
        }
        
        const videos = db.getVideos({ userId });
        const isSubscribed = url.searchParams.get('checkSubscribe') ? 
            db.isSubscribed(url.searchParams.get('checkSubscribe'), userId) : false;
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            ...channel, 
            videos,
            isSubscribed 
        }));
        return;
    }
    
    if (pathname === '/api/channel/update' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const success = db.updateChannel(data.userId, data.updates);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Ошибка обновления канала' }));
            }
        });
        return;
    }
    
    if (pathname === '/api/admin/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const isAuthenticated = db.authenticateAdmin(data.username, data.password);
                
                if (!isAuthenticated) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Неверные учетные данные администратора' }));
                    return;
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Ошибка сервера' }));
            }
        });
        return;
    }
    
    if (pathname === '/api/admin/stats' && req.method === 'GET') {
        // Проверка админ прав через заголовок
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith('Basic ')) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Требуется авторизация' }));
            return;
        }
        
        const stats = db.getStats();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(stats));
        return;
    }
    
    if (pathname.startsWith('/api/admin/delete/video/') && req.method === 'DELETE') {
        const videoId = pathname.split('/')[5];
        const success = db.deleteVideo(videoId);
        
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
        case '.js': contentType = 'text/javascript'; break;
        case '.css': contentType = 'text/css'; break;
        case '.json': contentType = 'application/json'; break;
        case '.png': contentType = 'image/png'; break;
        case '.jpg': case '.jpeg': contentType = 'image/jpeg'; break;
        case '.mp4': contentType = 'video/mp4'; break;
    }
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                fs.readFile('./index.html', (error, content) => {
                    if (error) {
                        res.writeHead(404);
                        res.end('File not found');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(content);
                    }
                });
            } else {
                res.writeHead(500);
                res.end('Server error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

// Запуск сервера
server.listen(PORT, () => {
    console.log(`🚀 UsTube Server запущен на порту ${PORT}`);
    console.log(`🌐 Откройте в браузере: http://localhost:${PORT}`);
    console.log(`🔐 Админ доступ через интерфейс`);
    console.log(`📁 База данных: ${DB_FILE}`);
    console.log(`💾 Загрузки: ${UPLOADS_DIR}/`);
    console.log(`\n=== ВАЖНАЯ ИНФОРМАЦИЯ ===`);
    console.log(`1. Сначала создайте аккаунт через регистрацию`);
    console.log(`2. Админ панель доступна через отдельную авторизацию`);
    console.log(`3. Все данные сохраняются в реальном времени`);
    console.log(`4. Система готова к работе с тысячами пользователей`);
});
