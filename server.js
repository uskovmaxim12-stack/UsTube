#!/usr/bin/env node

const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const url = require('url');
const crypto = require('crypto');

class USTubeServer {
    constructor(port = process.env.PORT || 3000) {
        this.port = port;
        this.dataDir = './data';
        this.users = {};
        this.videos = {};
        this.comments = {};
        this.subscriptions = {};
        this.likes = {};
        this.history = {};
        
        this.init();
    }
    
    async init() {
        await this.ensureDataDir();
        await this.loadAllData();
        this.setupRoutes();
        this.start();
    }
    
    async ensureDataDir() {
        try {
            await fs.mkdir(this.dataDir, { recursive: true });
            console.log('📁 Директория данных создана');
        } catch (err) {
            console.error('Ошибка создания директории:', err);
        }
    }
    
    async loadAllData() {
        try {
            const files = ['users.json', 'videos.json', 'comments.json', 'subscriptions.json', 'likes.json', 'history.json'];
            
            for (const file of files) {
                try {
                    const data = await fs.readFile(path.join(this.dataDir, file), 'utf8');
                    this[file.replace('.json', '')] = JSON.parse(data);
                    console.log(`✅ Загружен ${file}: ${Object.keys(this[file.replace('.json', '')]).length} записей`);
                } catch (err) {
                    console.log(`📄 Создан новый файл: ${file}`);
                    this[file.replace('.json', '')] = {};
                    await this.saveToFile(file.replace('.json', ''));
                }
            }
            
            // Создаем тестовые данные если их нет
            if (Object.keys(this.users).length === 0) {
                await this.createInitialData();
            }
            
        } catch (err) {
            console.error('Ошибка загрузки данных:', err);
        }
    }
    
    async createInitialData() {
        console.log('🎬 Создание начальных данных...');
        
        // Тестовые пользователи
        const users = [
            { id: 'user1', email: 'demo@ustube.com', username: 'DemoCreator', password: this.hashPassword('demo123'), createdAt: Date.now() },
            { id: 'user2', email: 'viewer@ustube.com', username: 'ViewerUser', password: this.hashPassword('demo123'), createdAt: Date.now() },
            { id: 'user3', email: 'gamer@ustube.com', username: 'GameMaster', password: this.hashPassword('demo123'), createdAt: Date.now() }
        ];
        
        users.forEach(user => {
            this.users[user.id] = {
                ...user,
                subscribers: Math.floor(Math.random() * 10000),
                avatar: user.username.charAt(0).toUpperCase(),
                videos: []
            };
        });
        
        // Тестовые видео
        const videoTemplates = [
            { title: 'Как создать YouTube за 5 минут', tags: ['программирование', 'урок', 'образование'], duration: 600, channelId: 'user1' },
            { title: 'Игровой процесс - Cyberpunk 2077', tags: ['игры', 'киберпанк', 'гейминг'], duration: 1800, channelId: 'user3' },
            { title: 'Музыка для работы и учебы', tags: ['музыка', 'лофи', 'релакс'], duration: 3600, channelId: 'user1' },
            { title: 'Обзор нового смартфона 2024', tags: ['технологии', 'обзор', 'гаджеты'], duration: 900, channelId: 'user2' },
            { title: 'Приготовление пиццы дома', tags: ['кулинария', 'рецепт', 'еда'], duration: 1200, channelId: 'user1' },
            { title: 'Тренировка для начинающих', tags: ['спорт', 'фитнес', 'здоровье'], duration: 1500, channelId: 'user3' },
            { title: 'Путешествие в Японию 2024', tags: ['путешествия', 'япония', 'туризм'], duration: 2400, channelId: 'user2' },
            { title: 'Изучение английского за месяц', tags: ['образование', 'языки', 'английский'], duration: 3000, channelId: 'user1' }
        ];
        
        videoTemplates.forEach((template, index) => {
            const videoId = 'video' + (index + 1);
            this.videos[videoId] = {
                id: videoId,
                title: template.title,
                description: `Это демонстрационное видео на платформе USTube. ${template.title}`,
                channelId: template.channelId,
                views: Math.floor(Math.random() * 1000000),
                likes: Math.floor(Math.random() * 50000),
                dislikes: Math.floor(Math.random() * 1000),
                duration: template.duration,
                format: 'video',
                tags: template.tags,
                visibility: 'public',
                createdAt: Date.now() - (index * 86400000), // Разные даты
                updatedAt: Date.now()
            };
            
            // Добавляем видео в канал пользователя
            if (this.users[template.channelId]) {
                if (!this.users[template.channelId].videos) {
                    this.users[template.channelId].videos = [];
                }
                this.users[template.channelId].videos.push(videoId);
            }
        });
        
        // Тестовые комментарии
        for (let i = 1; i <= 3; i++) {
            const videoId = 'video' + i;
            for (let j = 1; j <= 5; j++) {
                const commentId = 'comment' + ((i-1)*5 + j);
                const userId = j % 2 === 0 ? 'user1' : 'user2';
                
                this.comments[commentId] = {
                    id: commentId,
                    videoId,
                    userId,
                    text: `Это тестовый комментарий ${j} к видео ${i}. Очень интересное видео!`,
                    likes: Math.floor(Math.random() * 100),
                    createdAt: Date.now() - (j * 3600000)
                };
            }
        }
        
        // Тестовые подписки
        this.subscriptions['user2_user1'] = { userId: 'user2', channelId: 'user1', createdAt: Date.now() };
        this.subscriptions['user3_user1'] = { userId: 'user3', channelId: 'user1', createdAt: Date.now() };
        this.subscriptions['user1_user3'] = { userId: 'user1', channelId: 'user3', createdAt: Date.now() };
        
        // Обновляем счетчики подписчиков
        this.users['user1'].subscribers = 2;
        this.users['user3'].subscribers = 1;
        
        // Сохраняем все данные
        await Promise.all([
            this.saveToFile('users'),
            this.saveToFile('videos'),
            this.saveToFile('comments'),
            this.saveToFile('subscriptions'),
            this.saveToFile('likes'),
            this.saveToFile('history')
        ]);
        
        console.log('🎉 Начальные данные созданы!');
    }
    
    async saveToFile(dataType) {
        try {
            const filePath = path.join(this.dataDir, `${dataType}.json`);
            await fs.writeFile(filePath, JSON.stringify(this[dataType], null, 2));
        } catch (err) {
            console.error(`Ошибка сохранения ${dataType}:`, err);
        }
    }
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    hashPassword(password) {
        return crypto.createHash('sha256').update(password).digest('hex');
    }
    
    createToken(userId) {
        const token = crypto.randomBytes(32).toString('hex');
        const expires = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 дней
        
        if (!this.users[userId]) return null;
        
        this.users[userId].token = token;
        this.users[userId].tokenExpires = expires;
        this.saveToFile('users');
        
        return token;
    }
    
    verifyToken(token) {
        if (!token) return null;
        
        for (const userId in this.users) {
            const user = this.users[userId];
            if (user.token === token && user.tokenExpires > Date.now()) {
                return userId;
            }
        }
        
        return null;
    }
    
    setupRoutes() {
        this.routes = {
            'GET': {
                '/': this.serveIndex.bind(this),
                '/api/health': this.getHealth.bind(this),
                '/api/stats': this.getStats.bind(this),
                '/api/auth/me': this.getCurrentUser.bind(this),
                '/api/videos': this.getVideos.bind(this),
                '/api/videos/:id': this.getVideo.bind(this),
                '/api/videos/:id/comments': this.getComments.bind(this),
                '/api/channels/subscriptions': this.getSubscriptions.bind(this),
                '/api/channels/:id': this.getChannel.bind(this)
            },
            'POST': {
                '/api/auth/register': this.register.bind(this),
                '/api/auth/login': this.login.bind(this),
                '/api/auth/logout': this.logout.bind(this),
                '/api/videos/upload': this.uploadVideo.bind(this),
                '/api/videos/:id/comments': this.addComment.bind(this),
                '/api/videos/:id/like': this.likeVideo.bind(this),
                '/api/videos/:id/dislike': this.dislikeVideo.bind(this),
                '/api/channels/:id/subscribe': this.subscribe.bind(this),
                '/api/comments/:id/like': this.likeComment.bind(this)
            }
        };
    }
    
    start() {
        this.server = http.createServer((req, res) => {
            const parsedUrl = url.parse(req.url, true);
            const pathname = parsedUrl.pathname;
            const method = req.method;
            
            // CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            
            if (method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }
            
            // Обслуживание статических файлов
            if (pathname === '/' || pathname === '/index.html') {
                this.serveIndex(req, res);
                return;
            }
            
            if (pathname === '/api/health') {
                this.getHealth(req, res);
                return;
            }
            
            if (pathname === '/api/stats') {
                this.getStats(req, res);
                return;
            }
            
            // Поиск обработчика маршрута
            let handler = null;
            let params = {};
            
            for (const route in this.routes[method] || {}) {
                const routePattern = route.replace(/:\w+/g, '([^/]+)');
                const regex = new RegExp(`^${routePattern}$`);
                const match = pathname.match(regex);
                
                if (match) {
                    handler = this.routes[method][route];
                    
                    // Извлекаем параметры из пути
                    const paramNames = [];
                    const routeMatch = route.match(/:\w+/g);
                    if (routeMatch) {
                        routeMatch.forEach((param, index) => {
                            params[param.substring(1)] = match[index + 1];
                        });
                    }
                    
                    break;
                }
            }
            
            if (handler) {
                this.parseRequestBody(req, (body) => {
                    req.body = body;
                    req.params = params;
                    req.query = parsedUrl.query;
                    
                    // Проверка авторизации
                    const authHeader = req.headers.authorization;
                    if (authHeader && authHeader.startsWith('Bearer ')) {
                        const token = authHeader.substring(7);
                        req.userId = this.verifyToken(token);
                    }
                    
                    try {
                        handler(req, res);
                    } catch (error) {
                        console.error('Handler error:', error);
                        this.sendError(res, 'Внутренняя ошибка сервера', 500);
                    }
                });
            } else {
                this.sendError(res, 'Маршрут не найден', 404);
            }
        });
        
        this.server.listen(this.port, () => {
            console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🎬 USTube Server запущен!                                 ║
║                                                              ║
║   🔗 Локальный: http://localhost:${this.port}${this.port < 1000 ? '  ' : ' '}             ║
║   🌐 Сеть: http://${this.getIPAddress()}:${this.port}                 ║
║                                                              ║
║   📊 Статистика:                                            ║
║   👤 Пользователей: ${Object.keys(this.users).length}                          ║
║   🎥 Видео: ${Object.keys(this.videos).length}                            ║
║   💬 Комментариев: ${Object.keys(this.comments).length}                       ║
║   ⭐ Подписок: ${Object.keys(this.subscriptions).length}                         ║
║                                                              ║
║   💾 Данные сохраняются в: ./data/*.json                   ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
            `);
        });
    }
    
    getIPAddress() {
        const interfaces = require('os').networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
        return 'localhost';
    }
    
    parseRequestBody(req, callback) {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                if (body) {
                    if (req.headers['content-type']?.includes('application/json')) {
                        callback(JSON.parse(body));
                    } else {
                        callback(body);
                    }
                } else {
                    callback({});
                }
            } catch (error) {
                callback({});
            }
        });
    }
    
    sendJSON(res, data, statusCode = 200) {
        res.writeHead(statusCode, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        });
        res.end(JSON.stringify(data));
    }
    
    sendError(res, message, statusCode = 500) {
        this.sendJSON(res, {
            success: false,
            message,
            timestamp: Date.now()
        }, statusCode);
    }
    
    sendSuccess(res, data = {}) {
        this.sendJSON(res, {
            success: true,
            ...data,
            timestamp: Date.now()
        });
    }
    
    // ===== ОБРАБОТЧИКИ МАРШРУТОВ =====
    
    serveIndex(req, res) {
        const fs = require('fs');
        const path = require('path');
        
        const indexPath = path.join(__dirname, 'index.html');
        fs.readFile(indexPath, 'utf8', (err, data) => {
            if (err) {
                // Если файла нет, отдаем 404
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>Файл index.html не найден</h1>');
                return;
            }
            
            res.writeHead(200, {
                'Content-Type': 'text/html',
                'Cache-Control': 'no-cache'
            });
            res.end(data);
        });
    }
    
    getHealth(req, res) {
        this.sendSuccess(res, {
            status: 'ok',
            server: 'USTube',
            version: '3.0.0',
            uptime: process.uptime(),
            timestamp: Date.now(),
            data: {
                users: Object.keys(this.users).length,
                videos: Object.keys(this.videos).length,
                comments: Object.keys(this.comments).length
            }
        });
    }
    
    getStats(req, res) {
        const totalViews = Object.values(this.videos).reduce((sum, video) => sum + (video.views || 0), 0);
        const totalLikes = Object.values(this.videos).reduce((sum, video) => sum + (video.likes || 0), 0);
        const totalComments = Object.keys(this.comments).length;
        const totalSubscriptions = Object.keys(this.subscriptions).length;
        
        // Самые популярные видео
        const popularVideos = Object.values(this.videos)
            .sort((a, b) => b.views - a.views)
            .slice(0, 5)
            .map(video => ({
                id: video.id,
                title: video.title,
                views: video.views,
                channel: this.users[video.channelId]?.username
            }));
        
        // Активные пользователи
        const activeUsers = Object.values(this.users)
            .filter(user => user.videos && user.videos.length > 0)
            .sort((a, b) => (b.subscribers || 0) - (a.subscribers || 0))
            .slice(0, 5)
            .map(user => ({
                id: user.id,
                username: user.username,
                videos: user.videos?.length || 0,
                subscribers: user.subscribers || 0
            }));
        
        this.sendSuccess(res, {
            stats: {
                totalUsers: Object.keys(this.users).length,
                totalVideos: Object.keys(this.videos).length,
                totalComments,
                totalSubscriptions,
                totalViews,
                totalLikes,
                serverUptime: process.uptime(),
                timestamp: Date.now()
            },
            popularVideos,
            activeUsers,
            recentActivity: {
                lastHour: Object.values(this.videos).filter(v => Date.now() - v.createdAt < 3600000).length,
                lastDay: Object.values(this.videos).filter(v => Date.now() - v.createdAt < 86400000).length
            }
        });
    }
    
    // ===== АВТОРИЗАЦИЯ =====
    
    register(req, res) {
        const { email, password, username } = req.body;
        
        if (!email || !password || !username) {
            return this.sendError(res, 'Все поля обязательны', 400);
        }
        
        if (password.length < 6) {
            return this.sendError(res, 'Пароль должен быть не менее 6 символов', 400);
        }
        
        // Проверка уникальности email
        for (const userId in this.users) {
            if (this.users[userId].email === email) {
                return this.sendError(res, 'Пользователь с таким email уже существует', 409);
            }
            if (this.users[userId].username === username) {
                return this.sendError(res, 'Пользователь с таким именем уже существует', 409);
            }
        }
        
        const userId = this.generateId();
        const hashedPassword = this.hashPassword(password);
        
        this.users[userId] = {
            id: userId,
            email,
            username,
            password: hashedPassword,
            createdAt: Date.now(),
            subscribers: 0,
            videos: [],
            avatar: username.charAt(0).toUpperCase(),
            bio: 'Новый пользователь USTube',
            location: '',
            website: ''
        };
        
        this.saveToFile('users');
        
        const token = this.createToken(userId);
        const { password: _, ...userWithoutPassword } = this.users[userId];
        
        this.sendSuccess(res, {
            user: userWithoutPassword,
            token
        });
    }
    
    login(req, res) {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return this.sendError(res, 'Email и пароль обязательны', 400);
        }
        
        const hashedPassword = this.hashPassword(password);
        
        // Поиск пользователя
        let user = null;
        let userId = null;
        
        for (const id in this.users) {
            if (this.users[id].email === email && this.users[id].password === hashedPassword) {
                user = this.users[id];
                userId = id;
                break;
            }
        }
        
        if (!user) {
            return this.sendError(res, 'Неверный email или пароль', 401);
        }
        
        const token = this.createToken(userId);
        const { password: _, ...userWithoutPassword } = user;
        
        this.sendSuccess(res, {
            user: userWithoutPassword,
            token
        });
    }
    
    logout(req, res) {
        const userId = req.userId;
        
        if (userId && this.users[userId]) {
            delete this.users[userId].token;
            delete this.users[userId].tokenExpires;
            this.saveToFile('users');
        }
        
        this.sendSuccess(res);
    }
    
    getCurrentUser(req, res) {
        const userId = req.userId;
        
        if (!userId) {
            return this.sendError(res, 'Не авторизован', 401);
        }
        
        const user = this.users[userId];
        if (!user) {
            return this.sendError(res, 'Пользователь не найден', 404);
        }
        
        const { password, token, tokenExpires, ...userWithoutSensitive } = user;
        this.sendSuccess(res, { user: userWithoutSensitive });
    }
    
    // ===== ВИДЕО =====
    
    getVideos(req, res) {
        const { format, channels, search, limit = 20, offset = 0 } = req.query;
        
        let videos = Object.values(this.videos)
            .filter(video => video.visibility === 'public')
            .sort((a, b) => b.createdAt - a.createdAt);
        
        // Фильтрация по формату
        if (format) {
            videos = videos.filter(video => video.format === format);
        }
        
        // Фильтрация по каналам
        if (channels) {
            const channelIds = channels.split(',');
            videos = videos.filter(video => channelIds.includes(video.channelId));
        }
        
        // Поиск
        if (search) {
            const searchLower = search.toLowerCase();
            videos = videos.filter(video => 
                video.title.toLowerCase().includes(searchLower) ||
                video.description.toLowerCase().includes(searchLower) ||
                video.tags.some(tag => tag.toLowerCase().includes(searchLower))
            );
        }
        
        // Пагинация
        const start = parseInt(offset);
        const end = start + parseInt(limit);
        const paginatedVideos = videos.slice(start, end);
        
        // Добавляем информацию о канале
        const videosWithChannel = paginatedVideos.map(video => {
            const channel = this.users[video.channelId];
            return {
                ...video,
                channel: {
                    id: channel?.id,
                    username: channel?.username || 'Неизвестный',
                    subscribers: channel?.subscribers || 0,
                    avatar: channel?.avatar || '?'
                }
            };
        });
        
        this.sendSuccess(res, {
            videos: videosWithChannel,
            total: videos.length,
            hasMore: end < videos.length
        });
    }
    
    getVideo(req, res) {
        const videoId = req.params.id;
        const video = this.videos[videoId];
        
        if (!video) {
            return this.sendError(res, 'Видео не найдено', 404);
        }
        
        // Увеличиваем счетчик просмотров
        video.views = (video.views || 0) + 1;
        this.saveToFile('videos');
        
        // Добавляем в историю просмотров
        if (req.userId) {
            if (!this.history[req.userId]) {
                this.history[req.userId] = [];
            }
            
            this.history[req.userId].unshift({
                videoId,
                watchedAt: Date.now()
            });
            
            // Ограничиваем историю 100 записями
            if (this.history[req.userId].length > 100) {
                this.history[req.userId] = this.history[req.userId].slice(0, 100);
            }
            
            this.saveToFile('history');
        }
        
        const channel = this.users[video.channelId];
        const videoWithChannel = {
            ...video,
            channel: {
                id: channel?.id,
                username: channel?.username || 'Неизвестный',
                subscribers: channel?.subscribers || 0,
                avatar: channel?.avatar || '?',
                bio: channel?.bio || ''
            }
        };
        
        this.sendSuccess(res, { video: videoWithChannel });
    }
    
    uploadVideo(req, res) {
        const userId = req.userId;
        
        if (!userId) {
            return this.sendError(res, 'Требуется авторизация', 401);
        }
        
        const { title, description, tags, visibility = 'public' } = req.body;
        
        if (!title) {
            return this.sendError(res, 'Название видео обязательно', 400);
        }
        
        const videoId = this.generateId();
        const parsedTags = tags ? JSON.parse(tags) : [];
        
        this.videos[videoId] = {
            id: videoId,
            title,
            description: description || '',
            channelId: userId,
            views: 0,
            likes: 0,
            dislikes: 0,
            duration: Math.floor(Math.random() * 600) + 60, // 1-10 минут
            format: 'video',
            tags: parsedTags,
            visibility,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        // Добавляем видео в список пользователя
        if (!this.users[userId].videos) {
            this.users[userId].videos = [];
        }
        this.users[userId].videos.push(videoId);
        
        this.saveToFile('videos');
        this.saveToFile('users');
        
        this.sendSuccess(res, {
            videoId,
            message: 'Видео успешно загружено',
            video: this.videos[videoId]
        });
    }
    
    likeVideo(req, res) {
        const userId = req.userId;
        const videoId = req.params.id;
        
        if (!userId) {
            return this.sendError(res, 'Требуется авторизация', 401);
        }
        
        if (!this.videos[videoId]) {
            return this.sendError(res, 'Видео не найдено', 404);
        }
        
        const likeKey = `${userId}_${videoId}`;
        
        if (!this.likes[likeKey]) {
            this.likes[likeKey] = {
                userId,
                videoId,
                type: 'like',
                createdAt: Date.now()
            };
            
            this.videos[videoId].likes = (this.videos[videoId].likes || 0) + 1;
            
            this.saveToFile('likes');
            this.saveToFile('videos');
        }
        
        this.sendSuccess(res, {
            likes: this.videos[videoId].likes
        });
    }
    
    dislikeVideo(req, res) {
        const userId = req.userId;
        const videoId = req.params.id;
        
        if (!userId) {
            return this.sendError(res, 'Требуется авторизация', 401);
        }
        
        if (!this.videos[videoId]) {
            return this.sendError(res, 'Видео не найдено', 404);
        }
        
        const dislikeKey = `${userId}_${videoId}_dislike`;
        
        if (!this.likes[dislikeKey]) {
            this.likes[dislikeKey] = {
                userId,
                videoId,
                type: 'dislike',
                createdAt: Date.now()
            };
            
            this.videos[videoId].dislikes = (this.videos[videoId].dislikes || 0) + 1;
            
            this.saveToFile('likes');
            this.saveToFile('videos');
        }
        
        this.sendSuccess(res, {
            dislikes: this.videos[videoId].dislikes
        });
    }
    
    // ===== КОММЕНТАРИИ =====
    
    getComments(req, res) {
        const videoId = req.params.id;
        
        // Получаем все комментарии для видео
        const videoComments = Object.values(this.comments)
            .filter(comment => comment.videoId === videoId)
            .sort((a, b) => b.createdAt - a.createdAt)
            .map(comment => {
                const author = this.users[comment.userId];
                return {
                    ...comment,
                    author: {
                        id: author?.id,
                        username: author?.username || 'Неизвестный',
                        avatar: author?.avatar || '?'
                    }
                };
            });
        
        this.sendSuccess(res, { comments: videoComments });
    }
    
    addComment(req, res) {
        const userId = req.userId;
        const videoId = req.params.id;
        const { text } = req.body;
        
        if (!userId) {
            return this.sendError(res, 'Требуется авторизация', 401);
        }
        
        if (!text || text.trim().length === 0) {
            return this.sendError(res, 'Комментарий не может быть пустым', 400);
        }
        
        if (!this.videos[videoId]) {
            return this.sendError(res, 'Видео не найдено', 404);
        }
        
        const commentId = this.generateId();
        
        this.comments[commentId] = {
            id: commentId,
            videoId,
            userId,
            text: text.trim(),
            likes: 0,
            createdAt: Date.now()
        };
        
        this.saveToFile('comments');
        
        const author = this.users[userId];
        const commentWithAuthor = {
            ...this.comments[commentId],
            author: {
                id: author.id,
                username: author.username,
                avatar: author.avatar
            }
        };
        
        this.sendSuccess(res, { comment: commentWithAuthor });
    }
    
    likeComment(req, res) {
        const userId = req.userId;
        const commentId = req.params.id;
        
        if (!userId) {
            return this.sendError(res, 'Требуется авторизация', 401);
        }
        
        if (!this.comments[commentId]) {
            return this.sendError(res, 'Комментарий не найден', 404);
        }
        
        this.comments[commentId].likes = (this.comments[commentId].likes || 0) + 1;
        this.saveToFile('comments');
        
        this.sendSuccess(res, {
            likes: this.comments[commentId].likes
        });
    }
    
    // ===== КАНАЛЫ И ПОДПИСКИ =====
    
    getChannel(req, res) {
        const channelId = req.params.id;
        const channel = this.users[channelId];
        
        if (!channel) {
            return this.sendError(res, 'Канал не найден', 404);
        }
        
        const { password, token, tokenExpires, ...channelWithoutSensitive } = channel;
        
        // Получаем видео канала
        const channelVideos = Object.values(this.videos)
            .filter(video => video.channelId === channelId && video.visibility === 'public')
            .sort((a, b) => b.createdAt - a.createdAt);
        
        this.sendSuccess(res, {
            channel: channelWithoutSensitive,
            videos: channelVideos,
            totalVideos: channelVideos.length
        });
    }
    
    getSubscriptions(req, res) {
        const userId = req.userId;
        
        if (!userId) {
            return this.sendError(res, 'Требуется авторизация', 401);
        }
        
        // Получаем подписки пользователя
        const userSubscriptions = Object.values(this.subscriptions)
            .filter(sub => sub.userId === userId)
            .map(sub => {
                const channel = this.users[sub.channelId];
                if (!channel) return null;
                return {
                    id: channel.id,
                    username: channel.username,
                    avatar: channel.avatar,
                    subscribers: channel.subscribers || 0,
                    subscribedAt: sub.createdAt
                };
            })
            .filter(Boolean);
        
        this.sendSuccess(res, { subscriptions: userSubscriptions });
    }
    
    subscribe(req, res) {
        const userId = req.userId;
        const channelId = req.params.id;
        
        if (!userId) {
            return this.sendError(res, 'Требуется авторизация', 401);
        }
        
        if (!this.users[channelId]) {
            return this.sendError(res, 'Канал не найден', 404);
        }
        
        if (userId === channelId) {
            return this.sendError(res, 'Нельзя подписаться на себя', 400);
        }
        
        const subscriptionKey = `${userId}_${channelId}`;
        let subscribed = false;
        
        if (this.subscriptions[subscriptionKey]) {
            // Отписываемся
            delete this.subscriptions[subscriptionKey];
            this.users[channelId].subscribers = Math.max(0, (this.users[channelId].subscribers || 0) - 1);
        } else {
            // Подписываемся
            this.subscriptions[subscriptionKey] = {
                userId,
                channelId,
                createdAt: Date.now()
            };
            
            this.users[channelId].subscribers = (this.users[channelId].subscribers || 0) + 1;
            subscribed = true;
        }
        
        this.saveToFile('subscriptions');
        this.saveToFile('users');
        
        this.sendSuccess(res, {
            subscribed,
            subscribers: this.users[channelId].subscribers
        });
    }
}

// Запуск сервера
const PORT = process.env.PORT || 3000;
const server = new USTubeServer(PORT);

// Обработка завершения
process.on('SIGINT', () => {
    console.log('\n👋 Сервер завершает работу...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Сервер завершает работу...');
    process.exit(0);
});
