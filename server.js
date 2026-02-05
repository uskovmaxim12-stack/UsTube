const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');
const url = require('url');

class USTubeServer {
    constructor(port = process.env.PORT || 3000) {
        this.port = port;
        this.mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017';
        this.dbName = 'ustube';
        this.init();
    }
    
    async init() {
        await this.connectDB();
        await this.createAdminUser();
        this.startServer();
    }
    
    async connectDB() {
        try {
            this.client = new MongoClient(this.mongoUrl);
            await this.client.connect();
            this.db = this.client.db(this.dbName);
            
            this.users = this.db.collection('users');
            this.videos = this.db.collection('videos');
            this.comments = this.db.collection('comments');
            this.likes = this.db.collection('likes');
            this.subscriptions = this.db.collection('subscriptions');
            this.views = this.db.collection('views');
            
            console.log('✅ MongoDB подключена');
        } catch (error) {
            console.error('❌ Ошибка MongoDB:', error);
            // Используем память как fallback
            this.useMemoryStorage();
        }
    }
    
    useMemoryStorage() {
        console.log('⚠️  Используем память для хранения');
        this.users = { find: () => ({ toArray: () => [] }) };
        this.videos = { 
            find: () => ({ 
                sort: () => ({ 
                    limit: () => ({ 
                        toArray: () => this.demoVideos 
                    }) 
                }) 
            }),
            insertOne: (data) => console.log('Запись в память:', data),
            updateOne: () => {},
            deleteOne: () => {}
        };
        
        this.demoVideos = [
            {
                _id: '1',
                title: 'Добро пожаловать в USTube!',
                description: 'Новая платформа видеохостинга',
                channel: { username: 'USTube Team', _id: 'admin' },
                views: 1500,
                likes: 120,
                duration: 120,
                createdAt: new Date(),
                visibility: 'public',
                tags: ['приветствие', 'обзор'],
                thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
            }
        ];
    }
    
    async createAdminUser() {
        try {
            const adminExists = await this.users.findOne({ username: 'admin' });
            if (!adminExists) {
                const hashedPassword = crypto.createHash('sha256').update('140612').digest('hex');
                await this.users.insertOne({
                    username: 'admin',
                    email: 'admin@ustube.com',
                    password: hashedPassword,
                    role: 'admin',
                    createdAt: new Date(),
                    subscribers: 0
                });
                console.log('👑 Админ пользователь создан');
            }
        } catch (error) {
            console.error('Ошибка создания админа:', error);
        }
    }
    
    generateId() {
        return crypto.randomBytes(16).toString('hex');
    }
    
    hashPassword(password) {
        return crypto.createHash('sha256').update(password).digest('hex');
    }
    
    createToken(userId) {
        const token = crypto.randomBytes(32).toString('hex');
        const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;
        return { token, expires };
    }
    
    async verifyToken(token) {
        try {
            const user = await this.users.findOne({ 
                'token.token': token,
                'token.expires': { $gt: Date.now() }
            });
            return user;
        } catch (error) {
            return null;
        }
    }
    
    async handleRequest(req, res) {
        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname;
        
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        
        // Маршруты API
        if (pathname.startsWith('/api/')) {
            await this.handleAPI(req, res, parsedUrl);
            return;
        }
        
        // Статические файлы
        this.serveStatic(req, res, pathname);
    }
    
    serveStatic(req, res, pathname) {
        let filePath = '.' + pathname;
        if (filePath === './') {
            filePath = './index.html';
        }
        
        const ext = path.extname(filePath);
        const mimeTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml'
        };
        
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        
        fs.readFile(filePath, (error, content) => {
            if (error) {
                if (error.code === 'ENOENT') {
                    // Страница не найдена - отдаем SPA
                    fs.readFile('./index.html', (err, data) => {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(data, 'utf-8');
                    });
                } else {
                    res.writeHead(500);
                    res.end('Ошибка сервера: ' + error.code);
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    }
    
    async handleAPI(req, res, parsedUrl) {
        const pathname = parsedUrl.pathname;
        const method = req.method;
        
        // Получаем тело запроса
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                const data = body ? JSON.parse(body) : {};
                const query = parsedUrl.query;
                
                // Получаем токен авторизации
                let user = null;
                const authHeader = req.headers.authorization;
                if (authHeader && authHeader.startsWith('Bearer ')) {
                    const token = authHeader.substring(7);
                    user = await this.verifyToken(token);
                }
                
                // Обработка маршрутов
                let result = { success: false, message: 'Маршрут не найден' };
                
                // Аутентификация
                if (pathname === '/api/auth/register' && method === 'POST') {
                    result = await this.register(data);
                } else if (pathname === '/api/auth/login' && method === 'POST') {
                    result = await this.login(data);
                } else if (pathname === '/api/auth/me' && method === 'GET') {
                    result = { success: !!user, user };
                } else if (pathname === '/api/auth/logout' && method === 'POST') {
                    result = await this.logout(user);
                
                // Видео
                } else if (pathname === '/api/videos' && method === 'GET') {
                    result = await this.getVideos(query);
                } else if (pathname === '/api/videos' && method === 'POST') {
                    result = await this.uploadVideo(data, user);
                } else if (pathname.match(/^\/api\/videos\/([^\/]+)$/) && method === 'GET') {
                    const videoId = pathname.split('/')[3];
                    result = await this.getVideo(videoId);
                } else if (pathname.match(/^\/api\/videos\/([^\/]+)$/) && method === 'PUT') {
                    const videoId = pathname.split('/')[3];
                    result = await this.updateVideo(videoId, data, user);
                } else if (pathname.match(/^\/api\/videos\/([^\/]+)$/) && method === 'DELETE') {
                    const videoId = pathname.split('/')[3];
                    result = await this.deleteVideo(videoId, user);
                
                // Комментарии
                } else if (pathname.match(/^\/api\/videos\/([^\/]+)\/comments$/) && method === 'GET') {
                    const videoId = pathname.split('/')[3];
                    result = await this.getComments(videoId);
                } else if (pathname.match(/^\/api\/videos\/([^\/]+)\/comments$/) && method === 'POST') {
                    const videoId = pathname.split('/')[3];
                    result = await this.addComment(videoId, data, user);
                
                // Лайки
                } else if (pathname.match(/^\/api\/videos\/([^\/]+)\/like$/) && method === 'POST') {
                    const videoId = pathname.split('/')[3];
                    result = await this.likeVideo(videoId, user);
                } else if (pathname.match(/^\/api\/videos\/([^\/]+)\/dislike$/) && method === 'POST') {
                    const videoId = pathname.split('/')[3];
                    result = await this.dislikeVideo(videoId, user);
                
                // Подписки
                } else if (pathname === '/api/channels/subscriptions' && method === 'GET') {
                    result = await this.getSubscriptions(user);
                } else if (pathname.match(/^\/api\/channels\/([^\/]+)\/subscribe$/) && method === 'POST') {
                    const channelId = pathname.split('/')[3];
                    result = await this.subscribe(channelId, user);
                
                // Админ
                } else if (pathname === '/api/admin/stats' && method === 'GET') {
                    result = await this.getAdminStats(user);
                } else if (pathname === '/api/admin/users' && method === 'GET') {
                    result = await this.getAdminUsers(user);
                } else if (pathname === '/api/admin/videos' && method === 'GET') {
                    result = await this.getAdminVideos(user);
                } else if (pathname.match(/^\/api\/admin\/videos\/([^\/]+)$/) && method === 'DELETE') {
                    const videoId = pathname.split('/')[4];
                    result = await this.adminDeleteVideo(videoId, user);
                
                // Статистика
                } else if (pathname === '/api/stats' && method === 'GET') {
                    result = await this.getStats();
                } else if (pathname === '/api/health' && method === 'GET') {
                    result = { success: true, status: 'ok', timestamp: new Date() };
                }
                
                res.writeHead(result.success ? 200 : 400, {
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify(result));
                
            } catch (error) {
                console.error('API Error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false, 
                    message: 'Внутренняя ошибка сервера' 
                }));
            }
        });
    }
    
    // ===== АУТЕНТИФИКАЦИЯ =====
    async register(data) {
        const { email, password, username } = data;
        
        if (!email || !password || !username) {
            return { success: false, message: 'Все поля обязательны' };
        }
        
        if (password.length < 6) {
            return { success: false, message: 'Пароль должен быть не менее 6 символов' };
        }
        
        // Проверка уникальности
        const existingUser = await this.users.findOne({ 
            $or: [{ email }, { username }] 
        });
        
        if (existingUser) {
            return { success: false, message: 'Пользователь уже существует' };
        }
        
        const userId = this.generateId();
        const hashedPassword = this.hashPassword(password);
        const token = this.createToken(userId);
        
        const user = {
            _id: userId,
            email,
            username,
            password: hashedPassword,
            token,
            role: 'user',
            subscribers: 0,
            createdAt: new Date(),
            avatar: `https://ui-avatars.com/api/?name=${username}&background=random`
        };
        
        await this.users.insertOne(user);
        
        const { password: _, ...userWithoutPassword } = user;
        return { 
            success: true, 
            user: userWithoutPassword, 
            token: token.token 
        };
    }
    
    async login(data) {
        const { email, password } = data;
        
        if (!email || !password) {
            return { success: false, message: 'Email и пароль обязательны' };
        }
        
        const hashedPassword = this.hashPassword(password);
        let user = await this.users.findOne({ 
            email, 
            password: hashedPassword 
        });
        
        if (!user) {
            // Попробуем найти по username
            user = await this.users.findOne({ 
                username: email, 
                password: hashedPassword 
            });
        }
        
        if (!user) {
            return { success: false, message: 'Неверный email/пароль' };
        }
        
        // Обновляем токен
        const token = this.createToken(user._id);
        await this.users.updateOne(
            { _id: user._id },
            { $set: { token } }
        );
        
        const { password: _, ...userWithoutPassword } = user;
        return { 
            success: true, 
            user: { ...userWithoutPassword, token }, 
            token: token.token 
        };
    }
    
    async logout(user) {
        if (user) {
            await this.users.updateOne(
                { _id: user._id },
                { $set: { token: null } }
            );
        }
        return { success: true };
    }
    
    // ===== ВИДЕО =====
    async getVideos(query = {}) {
        try {
            const limit = parseInt(query.limit) || 20;
            const skip = parseInt(query.skip) || 0;
            
            let filter = { visibility: 'public' };
            
            if (query.search) {
                filter.$or = [
                    { title: { $regex: query.search, $options: 'i' } },
                    { description: { $regex: query.search, $options: 'i' } },
                    { tags: { $regex: query.search, $options: 'i' } }
                ];
            }
            
            if (query.channelId) {
                filter['channel._id'] = query.channelId;
            }
            
            const videos = await this.videos
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray();
            
            const total = await this.videos.countDocuments(filter);
            
            // Добавляем просмотры
            for (let video of videos) {
                video.views = await this.views.countDocuments({ videoId: video._id });
                video.likes = await this.likes.countDocuments({ 
                    videoId: video._id, 
                    type: 'like' 
                });
            }
            
            return { success: true, videos, total };
        } catch (error) {
            console.error('Get videos error:', error);
            return { success: false, message: 'Ошибка загрузки видео' };
        }
    }
    
    async uploadVideo(data, user) {
        if (!user) {
            return { success: false, message: 'Требуется авторизация' };
        }
        
        const { title, description, tags, visibility = 'public', duration = 0 } = data;
        
        if (!title) {
            return { success: false, message: 'Название обязательно' };
        }
        
        const videoId = this.generateId();
        const video = {
            _id: videoId,
            title,
            description: description || '',
            channel: {
                _id: user._id,
                username: user.username,
                avatar: user.avatar
            },
            duration: parseInt(duration) || 0,
            tags: tags ? tags.split(',').map(t => t.trim()) : [],
            visibility,
            createdAt: new Date(),
            updatedAt: new Date(),
            // В реальном приложении здесь будет ссылка на видео файл
            videoUrl: `https://example.com/videos/${videoId}.mp4`,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        };
        
        await this.videos.insertOne(video);
        
        return { 
            success: true, 
            video,
            message: 'Видео успешно загружено' 
        };
    }
    
    async getVideo(videoId) {
        try {
            const video = await this.videos.findOne({ _id: videoId });
            if (!video) {
                return { success: false, message: 'Видео не найдено' };
            }
            
            // Увеличиваем просмотры
            await this.views.insertOne({
                videoId,
                viewedAt: new Date(),
                viewerId: 'anonymous' // В реальном приложении - ID пользователя
            });
            
            video.views = await this.views.countDocuments({ videoId });
            video.likes = await this.likes.countDocuments({ videoId, type: 'like' });
            video.dislikes = await this.likes.countDocuments({ videoId, type: 'dislike' });
            
            return { success: true, video };
        } catch (error) {
            return { success: false, message: 'Ошибка загрузки видео' };
        }
    }
    
    async updateVideo(videoId, data, user) {
        if (!user) {
            return { success: false, message: 'Требуется авторизация' };
        }
        
        const video = await this.videos.findOne({ _id: videoId });
        if (!video) {
            return { success: false, message: 'Видео не найдено' };
        }
        
        // Проверяем права
        if (video.channel._id !== user._id && user.role !== 'admin') {
            return { success: false, message: 'Нет прав для редактирования' };
        }
        
        await this.videos.updateOne(
            { _id: videoId },
            { 
                $set: { 
                    ...data,
                    updatedAt: new Date() 
                } 
            }
        );
        
        return { success: true, message: 'Видео обновлено' };
    }
    
    async deleteVideo(videoId, user) {
        if (!user) {
            return { success: false, message: 'Требуется авторизация' };
        }
        
        const video = await this.videos.findOne({ _id: videoId });
        if (!video) {
            return { success: false, message: 'Видео не найдено' };
        }
        
        // Проверяем права
        if (video.channel._id !== user._id && user.role !== 'admin') {
            return { success: false, message: 'Нет прав для удаления' };
        }
        
        await this.videos.deleteOne({ _id: videoId });
        await this.comments.deleteMany({ videoId });
        await this.likes.deleteMany({ videoId });
        await this.views.deleteMany({ videoId });
        
        return { success: true, message: 'Видео удалено' };
    }
    
    // ===== КОММЕНТАРИИ =====
    async getComments(videoId) {
        try {
            const comments = await this.comments
                .find({ videoId })
                .sort({ createdAt: -1 })
                .toArray();
            
            return { success: true, comments };
        } catch (error) {
            return { success: false, message: 'Ошибка загрузки комментариев' };
        }
    }
    
    async addComment(videoId, data, user) {
        if (!user) {
            return { success: false, message: 'Требуется авторизация' };
        }
        
        const { text } = data;
        if (!text || text.trim().length === 0) {
            return { success: false, message: 'Комментарий не может быть пустым' };
        }
        
        const commentId = this.generateId();
        const comment = {
            _id: commentId,
            videoId,
            user: {
                _id: user._id,
                username: user.username,
                avatar: user.avatar
            },
            text: text.trim(),
            likes: 0,
            createdAt: new Date()
        };
        
        await this.comments.insertOne(comment);
        
        return { success: true, comment };
    }
    
    // ===== ЛАЙКИ =====
    async likeVideo(videoId, user) {
        if (!user) {
            return { success: false, message: 'Требуется авторизация' };
        }
        
        // Удаляем предыдущие реакции
        await this.likes.deleteMany({ 
            videoId, 
            userId: user._id 
        });
        
        // Добавляем лайк
        await this.likes.insertOne({
            videoId,
            userId: user._id,
            type: 'like',
            createdAt: new Date()
        });
        
        const likes = await this.likes.countDocuments({ videoId, type: 'like' });
        const dislikes = await this.likes.countDocuments({ videoId, type: 'dislike' });
        
        return { 
            success: true, 
            likes, 
            dislikes 
        };
    }
    
    async dislikeVideo(videoId, user) {
        if (!user) {
            return { success: false, message: 'Требуется авторизация' };
        }
        
        await this.likes.deleteMany({ 
            videoId, 
            userId: user._id 
        });
        
        await this.likes.insertOne({
            videoId,
            userId: user._id,
            type: 'dislike',
            createdAt: new Date()
        });
        
        const likes = await this.likes.countDocuments({ videoId, type: 'like' });
        const dislikes = await this.likes.countDocuments({ videoId, type: 'dislike' });
        
        return { 
            success: true, 
            likes, 
            dislikes 
        };
    }
    
    // ===== ПОДПИСКИ =====
    async getSubscriptions(user) {
        if (!user) {
            return { success: false, message: 'Требуется авторизация' };
        }
        
        const subscriptions = await this.subscriptions
            .find({ userId: user._id })
            .toArray();
        
        // Получаем информацию о каналах
        const channelIds = subscriptions.map(s => s.channelId);
        const channels = await this.users
            .find({ _id: { $in: channelIds } })
            .toArray();
        
        return { success: true, subscriptions: channels };
    }
    
    async subscribe(channelId, user) {
        if (!user) {
            return { success: false, message: 'Требуется авторизация' };
        }
        
        if (user._id === channelId) {
            return { success: false, message: 'Нельзя подписаться на себя' };
        }
        
        const existing = await this.subscriptions.findOne({
            userId: user._id,
            channelId
        });
        
        if (existing) {
            // Отписываемся
            await this.subscriptions.deleteOne({ _id: existing._id });
            await this.users.updateOne(
                { _id: channelId },
                { $inc: { subscribers: -1 } }
            );
            return { success: true, subscribed: false };
        } else {
            // Подписываемся
            await this.subscriptions.insertOne({
                userId: user._id,
                channelId,
                subscribedAt: new Date()
            });
            await this.users.updateOne(
                { _id: channelId },
                { $inc: { subscribers: 1 } }
            );
            return { success: true, subscribed: true };
        }
    }
    
    // ===== АДМИН =====
    async getAdminStats(user) {
        if (!user || user.role !== 'admin') {
            return { success: false, message: 'Доступ запрещен' };
        }
        
        const totalUsers = await this.users.countDocuments();
        const totalVideos = await this.videos.countDocuments();
        const totalComments = await this.comments.countDocuments();
        const totalViews = await this.views.countDocuments();
        
        // Новые пользователи за последние 7 дней
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const newUsers = await this.users.countDocuments({
            createdAt: { $gte: weekAgo }
        });
        
        // Популярные видео
        const popularVideos = await this.videos
            .find()
            .sort({ views: -1 })
            .limit(5)
            .toArray();
        
        return {
            success: true,
            stats: {
                totalUsers,
                totalVideos,
                totalComments,
                totalViews,
                newUsers,
                popularVideos
            }
        };
    }
    
    async getAdminUsers(user) {
        if (!user || user.role !== 'admin') {
            return { success: false, message: 'Доступ запрещен' };
        }
        
        const users = await this.users
            .find({}, { projection: { password: 0 } })
            .toArray();
        
        return { success: true, users };
    }
    
    async getAdminVideos(user) {
        if (!user || user.role !== 'admin') {
            return { success: false, message: 'Доступ запрещен' };
        }
        
        const videos = await this.videos.find().toArray();
        
        // Добавляем статистику
        for (let video of videos) {
            video.views = await this.views.countDocuments({ videoId: video._id });
            video.comments = await this.comments.countDocuments({ videoId: video._id });
        }
        
        return { success: true, videos };
    }
    
    async adminDeleteVideo(videoId, user) {
        if (!user || user.role !== 'admin') {
            return { success: false, message: 'Доступ запрещен' };
        }
        
        await this.videos.deleteOne({ _id: videoId });
        await this.comments.deleteMany({ videoId });
        await this.likes.deleteMany({ videoId });
        await this.views.deleteMany({ videoId });
        
        return { success: true, message: 'Видео удалено администратором' };
    }
    
    // ===== СТАТИСТИКА =====
    async getStats() {
        const totalUsers = await this.users.countDocuments();
        const totalVideos = await this.videos.countDocuments();
        const totalComments = await this.comments.countDocuments();
        
        return {
            success: true,
            stats: {
                totalUsers,
                totalVideos,
                totalComments,
                serverUptime: process.uptime(),
                timestamp: new Date()
            }
        };
    }
    
    startServer() {
        const server = http.createServer((req, res) => {
            this.handleRequest(req, res);
        });
        
        server.listen(this.port, () => {
            console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🎬 USTube Server запущен!                                 ║
║                                                              ║
║   🔗 Порт: ${this.port}                                   ║
║   🗄️  База: MongoDB                                        ║
║   👑 Админ: admin / 140612                                  ║
║                                                              ║
║   📊 API Endpoints:                                         ║
║   • /api/videos - все видео                                ║
║   • /api/auth/login - вход                                 ║
║   • /api/auth/register - регистрация                       ║
║   • /api/admin - админ-панель                              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
            `);
        });
    }
}

// Запуск сервера
const PORT = process.env.PORT || 3000;
new USTubeServer(PORT);
