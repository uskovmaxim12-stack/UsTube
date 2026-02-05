const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class USTubeServer {
    constructor(port = process.env.PORT || 3000) {
        this.port = port;
        this.dataDir = './data';
        this.ensureDataDir();
        this.loadData();
        this.start();
    }
    
    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }
    
    loadData() {
        this.users = this.loadFromFile('users.json') || {};
        this.videos = this.loadFromFile('videos.json') || {};
        this.comments = this.loadFromFile('comments.json') || {};
        this.subscriptions = this.loadFromFile('subscriptions.json') || {};
        this.likes = this.loadFromFile('likes.json') || {};
        this.history = this.loadFromFile('history.json') || {};
        
        console.log('✅ Данные загружены');
        console.log(`👤 Пользователей: ${Object.keys(this.users).length}`);
        console.log(`🎥 Видео: ${Object.keys(this.videos).length}`);
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
        const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;
        
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
    
    serveStatic(req, res, url) {
        let filePath = '.' + url.pathname;
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
            case '.jpg': contentType = 'image/jpg'; break;
            case '.ico': contentType = 'image/x-icon'; break;
        }
        
        fs.readFile(filePath, (error, content) => {
            if (error) {
                if(error.code === 'ENOENT') {
                    // Страница не найдена
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
    
    handleAPI(req, res, url) {
        const method = req.method;
        const path = url.pathname;
        
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        if (method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        
        // Получаем токен авторизации
        let userId = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            userId = this.verifyToken(token);
        }
        
        // Парсим тело запроса
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                req.body = body ? JSON.parse(body) : {};
                req.userId = userId;
                req.query = Object.fromEntries(url.searchParams);
                
                this.routeAPI(req, res, path, method);
            } catch (error) {
                this.sendError(res, 'Ошибка парсинга запроса', 400);
            }
        });
    }
    
    routeAPI(req, res, path, method) {
        // API маршруты
        const routes = {
            'GET': {
                '/api/auth/me': () => this.getCurrentUser(req, res),
                '/api/videos': () => this.getVideos(req, res),
                '/api/stats': () => this.getStats(req, res),
                '/api/health': () => this.healthCheck(req, res)
            },
            'POST': {
                '/api/auth/register': () => this.register(req, res),
                '/api/auth/login': () => this.login(req, res),
                '/api/auth/logout': () => this.logout(req, res),
                '/api/videos/upload': () => this.uploadVideo(req, res)
            }
        };
        
        const handler = routes[method]?.[path];
        if (handler) {
            handler();
        } else {
            this.sendError(res, 'Маршрут не найден', 404);
        }
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
    
    // API методы
    register(req, res) {
        const { email, password, username } = req.body;
        
        if (!email || !password || !username) {
            return this.sendError(res, 'Все поля обязательны', 400);
        }
        
        // Проверка уникальности email
        for (const userId in this.users) {
            if (this.users[userId].email === email) {
                return this.sendError(res, 'Пользователь уже существует', 409);
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
    
    getVideos(req, res) {
        // Демо данные для видео
        const videos = [
            {
                id: '1',
                title: 'Добро пожаловать в USTube!',
                channel: { username: 'USTube Team', subscribers: 1000 },
                views: 1500,
                likes: 120,
                dislikes: 5,
                duration: 120,
                createdAt: Date.now() - 86400000,
                description: 'Официальное видео платформы USTube'
            },
            {
                id: '2',
                title: 'Как создать аккаунт',
                channel: { username: 'Техподдержка', subscribers: 500 },
                views: 800,
                likes: 75,
                dislikes: 2,
                duration: 180,
                createdAt: Date.now() - 172800000,
                description: 'Пошаговая инструкция регистрации'
            }
        ];
        
        this.sendSuccess(res, { videos });
    }
    
    uploadVideo(req, res) {
        const userId = req.userId;
        
        if (!userId) {
            return this.sendError(res, 'Требуется авторизация', 401);
        }
        
        const { title, description } = req.body;
        
        if (!title) {
            return this.sendError(res, 'Название видео обязательно', 400);
        }
        
        const videoId = this.generateId();
        
        if (!this.videos) this.videos = {};
        
        this.videos[videoId] = {
            id: videoId,
            title,
            description: description || '',
            channelId: userId,
            views: 0,
            likes: 0,
            dislikes: 0,
            duration: 180,
            format: 'video',
            tags: [],
            visibility: 'public',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        this.saveToFile('videos.json', this.videos);
        
        this.sendSuccess(res, {
            videoId,
            message: 'Видео успешно загружено'
        });
    }
    
    getStats(req, res) {
        const stats = {
            totalUsers: Object.keys(this.users).length,
            totalVideos: Object.keys(this.videos).length,
            totalComments: Object.keys(this.comments).length,
            serverUptime: process.uptime(),
            timestamp: Date.now()
        };
        
        this.sendSuccess(res, { stats });
    }
    
    healthCheck(req, res) {
        this.sendSuccess(res, { status: 'ok', timestamp: Date.now() });
    }
    
    start() {
        const server = http.createServer((req, res) => {
            const url = new URL(req.url, `http://${req.headers.host}`);
            
            if (url.pathname.startsWith('/api/')) {
                this.handleAPI(req, res, url);
            } else {
                this.serveStatic(req, res, url);
            }
        });
        
        server.listen(this.port, () => {
            console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🎬 USTube Server запущен!                                 ║
║                                                              ║
║   🔗 Порт: ${this.port}                                   ║
║                                                              ║
║   📊 Статистика:                                            ║
║   👤 Пользователей: ${Object.keys(this.users).length}                          ║
║   🎥 Видео: ${Object.keys(this.videos).length}                            ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
            `);
        });
    }
}

// Запуск сервера
const PORT = process.env.PORT || 3000;
new USTubeServer(PORT);
