#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

class UsTubeServer {
    constructor(port = process.env.PORT || 3000) {
        this.port = port;
        this.users = new Map();
        this.videos = new Map();
        this.comments = new Map();
        this.channels = new Map();
        this.subscriptions = new Map();
        this.sessions = new Map();
        this.videoIdCounter = 1;
        this.commentIdCounter = 1;
        this.userIdCounter = 1;
        this.channelIdCounter = 1;
        
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🎬 UsTube Server - Полноценный клон YouTube               ║
║   Без демо данных - всё работает с нуля!                    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
        `);
    }
    
    hashPassword(password) {
        return crypto.createHash('sha256').update(password).digest('hex');
    }
    
    generateId() {
        return crypto.randomBytes(16).toString('hex');
    }
    
    createSession(userId) {
        const sessionId = this.generateId();
        this.sessions.set(sessionId, {
            userId,
            created: Date.now(),
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 дней
        });
        return sessionId;
    }
    
    validateSession(sessionId) {
        if (!sessionId) return null;
        
        const session = this.sessions.get(sessionId);
        if (!session) return null;
        
        if (Date.now() > session.expires) {
            this.sessions.delete(sessionId);
            return null;
        }
        
        return session.userId;
    }
    
    getAuthenticatedUser(req) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        
        const token = authHeader.substring(7);
        const userId = this.validateSession(token);
        if (!userId) return null;
        
        return this.users.get(userId);
    }
    
    start() {
        const server = http.createServer((req, res) => {
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
            
            // Маршрутизация
            if (pathname === '/' || pathname === '/index.html') {
                this.serveIndex(res);
            } else if (pathname.startsWith('/api/')) {
                this.handleAPI(req, res, parsedUrl);
            } else {
                this.serveIndex(res);
            }
        });
        
        server.listen(this.port, () => {
            console.log(`
🚀 Сервер запущен на порту ${this.port}
🌐 Локальный: http://localhost:${this.port}
📱 Для мобильных: http://${this.getIPAddress()}:${this.port}

🎯 Функции:
✅ Регистрация и вход пользователей
✅ Загрузка видео (без реальных файлов)
✅ Просмотр видео с увеличением счетчика
✅ Лайки, дизлайки, комментарии
✅ Подписки на каналы
✅ Поиск видео
✅ Рекомендации
✅ Творческая студия с аналитикой
✅ Темная/светлая темы

🔧 Начинайте с регистрации и загрузки первого видео!
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
    
    serveIndex(res) {
        fs.readFile('./index.html', 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Ошибка загрузки страницы');
                return;
            }
            
            res.writeHead(200, {
                'Content-Type': 'text/html',
                'Cache-Control': 'no-cache'
            });
            res.end(data);
        });
    }
    
    async handleAPI(req, res, parsedUrl) {
        const pathname = parsedUrl.pathname;
        const method = req.method;
        const query = parsedUrl.query;
        
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        
        req.on('end', () => {
            try {
                const data = body ? JSON.parse(body) : {};
                
                // Аутентификация
                const user = this.getAuthenticatedUser(req);
                
                // API endpoints
                if (pathname === '/api/auth/register' && method === 'POST') {
                    this.handleRegister(req, res, data);
                } else if (pathname === '/api/auth/login' && method === 'POST') {
                    this.handleLogin(req, res, data);
                } else if (pathname === '/api/auth/me' && method === 'GET') {
                    this.handleGetMe(req, res, user);
                } else if (pathname === '/api/videos' && method === 'GET') {
                    this.handleGetVideos(req, res, query);
                } else if (pathname === '/api/videos/upload' && method === 'POST') {
                    this.handleUploadVideo(req, res, data, user);
                } else if (pathname.match(/^\/api\/videos\/[^\/]+$/) && method === 'GET') {
                    const videoId = pathname.split('/')[3];
                    this.handleGetVideo(req, res, videoId, user);
                } else if (pathname.match(/^\/api\/videos\/[^\/]+\/like$/) && method === 'POST') {
                    const videoId = pathname.split('/')[3];
                    this.handleLikeVideo(req, res, videoId, user);
                } else if (pathname.match(/^\/api\/videos\/[^\/]+\/dislike$/) && method === 'POST') {
                    const videoId = pathname.split('/')[3];
                    this.handleDislikeVideo(req, res, videoId, user);
                } else if (pathname.match(/^\/api\/videos\/[^\/]+\/view$/) && method === 'POST') {
                    const videoId = pathname.split('/')[3];
                    this.handleViewVideo(req, res, videoId);
                } else if (pathname.match(/^\/api\/videos\/[^\/]+\/comments$/) && method === 'GET') {
                    const videoId = pathname.split('/')[3];
                    this.handleGetComments(req, res, videoId);
                } else if (pathname.match(/^\/api\/videos\/[^\/]+\/comments$/) && method === 'POST') {
                    const videoId = pathname.split('/')[3];
                    this.handlePostComment(req, res, videoId, data, user);
                } else if (pathname === '/api/search' && method === 'GET') {
                    this.handleSearch(req, res, query);
                } else if (pathname === '/api/videos/recommended' && method === 'GET') {
                    this.handleGetRecommended(req, res, query);
                } else if (pathname === '/api/subscriptions' && method === 'GET') {
                    this.handleGetSubscriptions(req, res, user);
                } else if (pathname.match(/^\/api\/channels\/[^\/]+\/subscribe$/) && method === 'POST') {
                    const channelId = pathname.split('/')[3];
                    this.handleSubscribe(req, res, channelId, user);
                } else if (pathname === '/api/studio/videos' && method === 'GET') {
                    this.handleGetStudioVideos(req, res, user);
                } else if (pathname === '/api/studio/stats' && method === 'GET') {
                    this.handleGetStudioStats(req, res, user);
                } else {
                    this.sendJSON(res, { error: 'API endpoint not found' }, 404);
                }
            } catch (error) {
                console.error('API Error:', error);
                this.sendJSON(res, { error: 'Internal server error' }, 500);
            }
        });
    }
    
    // ===== АУТЕНТИФИКАЦИЯ =====
    handleRegister(req, res, data) {
        const { username, email, password } = data;
        
        if (!username || !email || !password) {
            this.sendJSON(res, { error: 'Все поля обязательны' }, 400);
            return;
        }
        
        if (password.length < 6) {
            this.sendJSON(res, { error: 'Пароль должен быть не менее 6 символов' }, 400);
            return;
        }
        
        // Проверка уникальности email и username
        for (const user of this.users.values()) {
            if (user.email === email) {
                this.sendJSON(res, { error: 'Пользователь с таким email уже существует' }, 409);
                return;
            }
            if (user.username === username) {
                this.sendJSON(res, { error: 'Пользователь с таким именем уже существует' }, 409);
                return;
            }
        }
        
        // Создание пользователя
        const userId = `user_${this.userIdCounter++}`;
        const channelId = `channel_${this.channelIdCounter++}`;
        
        const user = {
            id: userId,
            username,
            email,
            password: this.hashPassword(password),
            createdAt: Date.now(),
            channelId
        };
        
        const channel = {
            id: channelId,
            name: username,
            ownerId: userId,
            subscribers: 0,
            videos: [],
            createdAt: Date.now()
        };
        
        this.users.set(userId, user);
        this.channels.set(channelId, channel);
        
        // Создание сессии
        const token = this.createSession(userId);
        
        this.sendJSON(res, {
            token,
            user: {
                id: userId,
                username,
                email,
                channelId
            }
        });
    }
    
    handleLogin(req, res, data) {
        const { email, password } = data;
        
        if (!email || !password) {
            this.sendJSON(res, { error: 'Email и пароль обязательны' }, 400);
            return;
        }
        
        // Поиск пользователя
        let user = null;
        for (const u of this.users.values()) {
            if (u.email === email && u.password === this.hashPassword(password)) {
                user = u;
                break;
            }
        }
        
        if (!user) {
            this.sendJSON(res, { error: 'Неверный email или пароль' }, 401);
            return;
        }
        
        // Создание сессии
        const token = this.createSession(user.id);
        
        this.sendJSON(res, {
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                channelId: user.channelId
            }
        });
    }
    
    handleGetMe(req, res, user) {
        if (!user) {
            this.sendJSON(res, { error: 'Not authenticated' }, 401);
            return;
        }
        
        this.sendJSON(res, {
            id: user.id,
            username: user.username,
            email: user.email,
            channelId: user.channelId
        });
    }
    
    // ===== ВИДЕО =====
    handleGetVideos(req, res, query) {
        const videos = Array.from(this.videos.values())
            .sort((a, b) => b.createdAt - a.createdAt)
            .map(video => this.formatVideoForResponse(video));
        
        this.sendJSON(res, videos);
    }
    
    handleUploadVideo(req, res, data, user) {
        if (!user) {
            this.sendJSON(res, { error: 'Not authenticated' }, 401);
            return;
        }
        
        const { title, description, category, duration } = data;
        
        if (!title || !title.trim()) {
            this.sendJSON(res, { error: 'Название видео обязательно' }, 400);
            return;
        }
        
        const videoId = `video_${this.videoIdCounter++}`;
        const channel = this.channels.get(user.channelId);
        
        if (!channel) {
            this.sendJSON(res, { error: 'Канал не найден' }, 404);
            return;
        }
        
        const video = {
            id: videoId,
            title: title.trim(),
            description: description?.trim() || '',
            category: category || 'entertainment',
            duration: duration || 300,
            channelId: user.channelId,
            channelName: channel.name,
            views: 0,
            likes: 0,
            dislikes: 0,
            comments: [],
            createdAt: Date.now(),
            uploadedAt: Date.now()
        };
        
        this.videos.set(videoId, video);
        channel.videos.push(videoId);
        
        this.sendJSON(res, this.formatVideoForResponse(video));
    }
    
    handleGetVideo(req, res, videoId, user) {
        const video = this.videos.get(videoId);
        
        if (!video) {
            this.sendJSON(res, { error: 'Video not found' }, 404);
            return;
        }
        
        const channel = this.channels.get(video.channelId);
        const response = this.formatVideoForResponse(video);
        
        // Проверяем подписку пользователя
        if (user) {
            const subscriptionKey = `${user.id}_${video.channelId}`;
            response.isSubscribed = this.subscriptions.has(subscriptionKey);
        } else {
            response.isSubscribed = false;
        }
        
        response.channelSubscribers = channel.subscribers;
        
        this.sendJSON(res, response);
    }
    
    handleLikeVideo(req, res, videoId, user) {
        if (!user) {
            this.sendJSON(res, { error: 'Not authenticated' }, 401);
            return;
        }
        
        const video = this.videos.get(videoId);
        if (!video) {
            this.sendJSON(res, { error: 'Video not found' }, 404);
            return;
        }
        
        video.likes++;
        this.sendJSON(res, { likes: video.likes });
    }
    
    handleDislikeVideo(req, res, videoId, user) {
        if (!user) {
            this.sendJSON(res, { error: 'Not authenticated' }, 401);
            return;
        }
        
        const video = this.videos.get(videoId);
        if (!video) {
            this.sendJSON(res, { error: 'Video not found' }, 404);
            return;
        }
        
        video.dislikes++;
        this.sendJSON(res, { dislikes: video.dislikes });
    }
    
    handleViewVideo(req, res, videoId) {
        const video = this.videos.get(videoId);
        if (!video) {
            this.sendJSON(res, { error: 'Video not found' }, 404);
            return;
        }
        
        video.views++;
        this.sendJSON(res, { views: video.views });
    }
    
    // ===== КОММЕНТАРИИ =====
    handleGetComments(req, res, videoId) {
        const video = this.videos.get(videoId);
        if (!video) {
            this.sendJSON(res, { error: 'Video not found' }, 404);
            return;
        }
        
        const comments = video.comments.map(commentId => {
            const comment = this.comments.get(commentId);
            if (!comment) return null;
            
            const user = this.users.get(comment.userId);
            return {
                id: comment.id,
                text: comment.text,
                author: user ? user.username : 'Unknown',
                likes: comment.likes,
                timestamp: comment.createdAt
            };
        }).filter(Boolean);
        
        this.sendJSON(res, comments);
    }
    
    handlePostComment(req, res, videoId, data, user) {
        if (!user) {
            this.sendJSON(res, { error: 'Not authenticated' }, 401);
            return;
        }
        
        const video = this.videos.get(videoId);
        if (!video) {
            this.sendJSON(res, { error: 'Video not found' }, 404);
            return;
        }
        
        const { text } = data;
        if (!text || !text.trim()) {
            this.sendJSON(res, { error: 'Comment text is required' }, 400);
            return;
        }
        
        const commentId = `comment_${this.commentIdCounter++}`;
        const comment = {
            id: commentId,
            videoId,
            userId: user.id,
            text: text.trim(),
            likes: 0,
            createdAt: Date.now()
        };
        
        this.comments.set(commentId, comment);
        video.comments.push(commentId);
        
        this.sendJSON(res, {
            id: comment.id,
            text: comment.text,
            author: user.username,
            likes: comment.likes,
            timestamp: comment.createdAt
        });
    }
    
    // ===== ПОИСК И РЕКОМЕНДАЦИИ =====
    handleSearch(req, res, query) {
        const searchQuery = query.q?.toLowerCase() || '';
        
        if (!searchQuery) {
            this.sendJSON(res, []);
            return;
        }
        
        const results = Array.from(this.videos.values())
            .filter(video => 
                video.title.toLowerCase().includes(searchQuery) ||
                video.description.toLowerCase().includes(searchQuery) ||
                video.channelName.toLowerCase().includes(searchQuery)
            )
            .map(video => this.formatVideoForResponse(video));
        
        this.sendJSON(res, results);
    }
    
    handleGetRecommended(req, res, query) {
        const excludeId = query.exclude;
        const allVideos = Array.from(this.videos.values())
            .filter(video => video.id !== excludeId)
            .sort((a, b) => b.views - a.views)
            .slice(0, 10)
            .map(video => this.formatVideoForResponse(video));
        
        this.sendJSON(res, allVideos);
    }
    
    // ===== ПОДПИСКИ =====
    handleGetSubscriptions(req, res, user) {
        if (!user) {
            this.sendJSON(res, { error: 'Not authenticated' }, 401);
            return;
        }
        
        const subscriptions = [];
        for (const [key, channelId] of this.subscriptions) {
            if (key.startsWith(`${user.id}_`)) {
                const channel = this.channels.get(channelId);
                if (channel) {
                    subscriptions.push({
                        id: channel.id,
                        name: channel.name
                    });
                }
            }
        }
        
        this.sendJSON(res, subscriptions);
    }
    
    handleSubscribe(req, res, channelId, user) {
        if (!user) {
            this.sendJSON(res, { error: 'Not authenticated' }, 401);
            return;
        }
        
        const channel = this.channels.get(channelId);
        if (!channel) {
            this.sendJSON(res, { error: 'Channel not found' }, 404);
            return;
        }
        
        const subscriptionKey = `${user.id}_${channelId}`;
        let subscribed = false;
        
        if (this.subscriptions.has(subscriptionKey)) {
            this.subscriptions.delete(subscriptionKey);
            channel.subscribers = Math.max(0, channel.subscribers - 1);
        } else {
            this.subscriptions.set(subscriptionKey, channelId);
            channel.subscribers++;
            subscribed = true;
        }
        
        this.sendJSON(res, {
            subscribed,
            subscribers: channel.subscribers
        });
    }
    
    // ===== СТУДИЯ =====
    handleGetStudioVideos(req, res, user) {
        if (!user) {
            this.sendJSON(res, { error: 'Not authenticated' }, 401);
            return;
        }
        
        const channel = this.channels.get(user.channelId);
        if (!channel) {
            this.sendJSON(res, { error: 'Channel not found' }, 404);
            return;
        }
        
        const videos = channel.videos
            .map(videoId => this.videos.get(videoId))
            .filter(Boolean)
            .map(video => this.formatVideoForResponse(video));
        
        this.sendJSON(res, videos);
    }
    
    handleGetStudioStats(req, res, user) {
        if (!user) {
            this.sendJSON(res, { error: 'Not authenticated' }, 401);
            return;
        }
        
        const channel = this.channels.get(user.channelId);
        if (!channel) {
            this.sendJSON(res, { error: 'Channel not found' }, 404);
            return;
        }
        
        const videos = channel.videos
            .map(videoId => this.videos.get(videoId))
            .filter(Boolean);
        
        const views = videos.reduce((sum, video) => sum + video.views, 0);
        const watchTime = videos.reduce((sum, video) => sum + video.duration * video.views, 0) / 3600; // в часах
        const revenue = views * 0.01; // Примерная монетизация
        
        this.sendJSON(res, {
            views,
            subscribers: channel.subscribers,
            revenue: Math.round(revenue * 100) / 100,
            watchTime: Math.round(watchTime * 100) / 100,
            videoCount: videos.length
        });
    }
    
    // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ =====
    formatVideoForResponse(video) {
        return {
            id: video.id,
            title: video.title,
            description: video.description,
            category: video.category,
            duration: video.duration,
            channelId: video.channelId,
            channelName: video.channelName,
            views: video.views,
            likes: video.likes,
            dislikes: video.dislikes,
            uploadedAt: video.uploadedAt
        };
    }
    
    sendJSON(res, data, statusCode = 200) {
        res.writeHead(statusCode, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        });
        res.end(JSON.stringify(data, null, 2));
    }
}

// Запуск сервера
const PORT = process.env.PORT || 3000;
const server = new UsTubeServer(PORT);
server.start();

// Обработка завершения
process.on('SIGINT', () => {
    console.log('\n👋 Сервер остановлен');
    process.exit(0);
});
