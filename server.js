#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

class USTubeServer {
    constructor(port = process.env.PORT || 3000) {
        this.port = port;
        this.dataDir = './data';
        this.ensureDataDir();
        this.loadData();
        this.setupRoutes();
        this.start();
    }
    
    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }
    
    loadData() {
        // Пользователи
        this.users = this.loadFromFile('users.json') || {};
        
        // Видео
        this.videos = this.loadFromFile('videos.json') || {};
        
        // Комментарии
        this.comments = this.loadFromFile('comments.json') || {};
        
        // Подписки
        this.subscriptions = this.loadFromFile('subscriptions.json') || {};
        
        // Лайки
        this.likes = this.loadFromFile('likes.json') || {};
        
        // История просмотров
        this.history = this.loadFromFile('history.json') || {};
        
        console.log('✅ Данные загружены');
        console.log(`👤 Пользователей: ${Object.keys(this.users).length}`);
        console.log(`🎥 Видео: ${Object.keys(this.videos).length}`);
        console.log(`💬 Комментариев: ${Object.keys(this.comments).length}`);
    }
    
    loadFromFile(filename) {
        const filepath = path.join(this.dataDir, filename);
        try {
            if (fs.existsSync(filepath)) {
                return JSON.parse(fs.readFileSync(filepath, 'utf8'));
            }
        } catch (error) {
            console.error(`Ошибка загрузки ${filename}:`, error);
        }
        return null;
    }
    
    saveToFile(filename, data) {
        const filepath = path.join(this.dataDir, filename);
        try {
            fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error(`Ошибка сохранения ${filename}:`, error);
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
        this.saveToFile('users.json', this.users);
        
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
                '/api/auth/me': this.getCurrentUser.bind(this),
                '/api/videos': this.getVideos.bind(this),
                '/api/videos/:id': this.getVideo.bind(this),
                '/api/videos/:id/comments': this.getComments.bind(this),
                '/api/channels/subscriptions': this.getSubscriptions.bind(this),
                '/api/channels/:id': this.getChannel.bind(this),
                '/api/stats': this.getStats.bind(this)
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
            
            // Обработка статических файлов (для демонстрации)
            if (pathname === '/' || pathname === '/index.html') {
                this.serveIndex(req, res);
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
                    
                    // Проверка авторизации для защищенных маршрутов
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
║   🔗 Локальный: http://localhost:${this.port}${this.port < 1000 ? ' ' : ''}               ║
║   🌐 Сеть: http://${this.getIPAddress()}:${this.port}                 ║
║                                                              ║
║   📊 Статистика:                                            ║
║   👤 Пользователей: ${Object.keys(this.users).length}                          ║
║   🎥 Видео: ${Object.keys(this.videos).length}                            ║
║   💬 Комментариев: ${Object.keys(this.comments).length}                       ║
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
                    } else if (req.headers['content-type']?.includes('multipart/form-data')) {
                        // Упрощенная обработка multipart/form-data
                        const boundary = req.headers['content-type'].split('boundary=')[1];
                        const parts = body.split('--' + boundary);
                        
                        const result = {};
                        for (const part of parts) {
                            const match = part.match(/name="([^"]+)"\r\n\r\n([\s\S]*?)\r\n/);
                            if (match) {
                                const [, name, value] = match;
                                result[name] = value.trim();
                            }
                        }
                        
                        callback(result);
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
        const indexPath = path.join(__dirname, 'index.html');
        fs.readFile(indexPath, 'utf8', (err, data) => {
            if (err) {
                this.sendError(res, 'Ошибка загрузки страницы', 500);
                return;
            }
            
            res.writeHead(200, {
                'Content-Type': 'text/html',
                'Cache-Control': 'no-cache'
            });
            res.end(data);
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
            avatar: username.charAt(0).toUpperCase()
        };
        
        this.saveToFile('users.json', this.users);
        
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
            this.saveToFile('users.json', this.users);
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
        const paginatedVideos = videos.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
        
        // Добавляем информацию о канале
        const videosWithChannel = paginatedVideos.map(video => {
            const channel = this.users[video.channelId];
            return {
                ...video,
                channel: {
                    id: channel.id,
                    username: channel.username,
                    subscribers: channel.subscribers || 0,
                    avatar: channel.avatar
                }
            };
        });
        
        this.sendSuccess(res, {
            videos: videosWithChannel,
            total: videos.length
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
        this.saveToFile('videos.json', this.videos);
        
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
            
            this.saveToFile('history.json', this.history);
        }
        
        const channel = this.users[video.channelId];
        const videoWithChannel = {
            ...video,
            channel: {
                id: channel.id,
                username: channel.username,
                subscribers: channel.subscribers || 0,
                avatar: channel.avatar
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
            duration: Math.floor(Math.random() * 600) + 60, // 1-10 минут для демо
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
        
        this.saveToFile('videos.json', this.videos);
        this.saveToFile('users.json', this.users);
        
        this.sendSuccess(res, {
            videoId,
            message: 'Видео успешно загружено'
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
            
            this.saveToFile('likes.json', this.likes);
            this.saveToFile('videos.json', this.videos);
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
            
            this.saveToFile('likes.json', this.likes);
            this.saveToFile('videos.json', this.videos);
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
                        id: author.id,
                        username: author.username,
                        avatar: author.avatar
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
        
        this.saveToFile('comments.json', this.comments);
        
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
        this.saveToFile('comments.json', this.comments);
        
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
            videos: channelVideos
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
                return {
                    id: channel.id,
                    username: channel.username,
                    avatar: channel.avatar,
                    subscribers: channel.subscribers || 0,
                    subscribedAt: sub.createdAt
                };
            });
        
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
        
        this.saveToFile('subscriptions.json', this.subscriptions);
        this.saveToFile('users.json', this.users);
        
        this.sendSuccess(res, {
            subscribed,
            subscribers: this.users[channelId].subscribers
        });
    }
    
    // ===== СТАТИСТИКА =====
    
    getStats(req, res) {
        const stats = {
            totalUsers: Object.keys(this.users).length,
            totalVideos: Object.keys(this.videos).length,
            totalComments: Object.keys(this.comments).length,
            totalSubscriptions: Object.keys(this.subscriptions).length,
            totalViews: Object.values(this.videos).reduce((sum, video) => sum + (video.views || 0), 0),
            totalLikes: Object.values(this.videos).reduce((sum, video) => sum + (video.likes || 0), 0),
            serverUptime: process.uptime(),
            timestamp: Date.now()
        };
        
        this.sendSuccess(res, { stats });
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
