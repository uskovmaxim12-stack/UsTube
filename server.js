const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

// ===== КОНФИГУРАЦИЯ =====
const CONFIG = {
    PORT: 3000,
    UPLOAD_DIR: './uploads',
    DB_FILE: './database.json',
    ADMIN_EMAIL: 'uskovmaxim12@gmail.com',
    ADMIN_PASSWORD: 'Uskov140612',
    JWT_SECRET: 'ustube_secret_key_2024'
};

// ===== СОЗДАНИЕ ПАПОК =====
const folders = [
    CONFIG.UPLOAD_DIR,
    CONFIG.UPLOAD_DIR + '/videos',
    CONFIG.UPLOAD_DIR + '/thumbnails',
    CONFIG.UPLOAD_DIR + '/avatars',
    CONFIG.UPLOAD_DIR + '/banners',
    CONFIG.UPLOAD_DIR + '/shorts'
];

folders.forEach(folder => {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }
});

// ===== БАЗА ДАННЫХ =====
class Database {
    constructor() {
        this.data = {
            users: {},
            videos: {},
            shorts: {},
            comments: {},
            subscriptions: {},
            likes: {},
            views: {},
            playlists: {},
            notifications: {},
            logs: [],
            nextId: {
                video: 1000,
                user: 1000,
                comment: 1000,
                channel: 1000
            }
        };
        this.load();
        this.initDefaultData();
    }

    load() {
        if (fs.existsSync(CONFIG.DB_FILE)) {
            try {
                const content = fs.readFileSync(CONFIG.DB_FILE, 'utf8');
                this.data = JSON.parse(content);
                console.log('✅ База данных загружена');
            } catch (e) {
                console.log('⚠️ Новая база данных создана');
            }
        }
    }

    save() {
        fs.writeFileSync(CONFIG.DB_FILE, JSON.stringify(this.data, null, 2));
    }

    initDefaultData() {
        // Создаем администратора
        if (!this.data.users[CONFIG.ADMIN_EMAIL]) {
            const adminId = this.generateId('user');
            this.data.users[CONFIG.ADMIN_EMAIL] = {
                id: adminId,
                username: 'UsTube Official',
                email: CONFIG.ADMIN_EMAIL,
                password: this.hashPassword(CONFIG.ADMIN_PASSWORD),
                avatar: 'https://i.pravatar.cc/300?img=1',
                banner: 'https://picsum.photos/1200/400',
                bio: 'Официальный канал платформы UsTube. Лучшие видео, обзоры, новости и многое другое!',
                subscribers: 125000,
                videos: [],
                shorts: [],
                createdAt: Date.now(),
                isAdmin: true,
                isVerified: true,
                channelId: 'ustube_official'
            };
        }

        // Создаем демо видео для канала UsTube
        const demoVideos = [
            {
                title: "Добро пожаловать на UsTube!",
                description: "Знакомство с новой платформой для видео. Все функции и возможности.",
                duration: 245,
                category: "Образование",
                tags: "ustube, платформа, видео, гайд",
                thumbnail: "https://picsum.photos/300/169?random=1"
            },
            {
                title: "Как монтировать видео в UsTube",
                description: "Полный гайд по встроенному редактору видео на нашей платформе.",
                duration: 542,
                category: "Образование",
                tags: "монтаж, редактор, обучение",
                thumbnail: "https://picsum.photos/300/169?random=2"
            },
            {
                title: "Топ 10 фишек UsTube 2024",
                description: "Самые крутые функции, о которых вы не знали!",
                duration: 623,
                category: "Развлечения",
                tags: "фишки, возможности, 2024",
                thumbnail: "https://picsum.photos/300/169?random=3"
            },
            {
                title: "Как набрать 1000 подписчиков",
                description: "Стратегия роста для новых авторов на платформе UsTube.",
                duration: 892,
                category: "Образование",
                tags: "рост, подписчики, продвижение",
                thumbnail: "https://picsum.photos/300/169?random=4"
            },
            {
                title: "Создание контента для начинающих",
                description: "С чего начать свой путь на UsTube?",
                duration: 732,
                category: "Образование",
                tags: "контент, создание, начало",
                thumbnail: "https://picsum.photos/300/169?random=5"
            }
        ];

        const admin = this.data.users[CONFIG.ADMIN_EMAIL];
        demoVideos.forEach((video, index) => {
            const videoId = `video_ustube_${index + 1}`;
            if (!this.data.videos[videoId]) {
                this.data.videos[videoId] = {
                    id: videoId,
                    title: video.title,
                    description: video.description,
                    channelId: admin.id,
                    channelName: admin.username,
                    views: Math.floor(Math.random() * 100000) + 10000,
                    likes: Math.floor(Math.random() * 5000) + 500,
                    dislikes: Math.floor(Math.random() * 50),
                    comments: Math.floor(Math.random() * 200) + 20,
                    duration: video.duration,
                    category: video.category,
                    tags: video.tags,
                    videoUrl: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`,
                    thumbnailUrl: video.thumbnail,
                    isPublished: true,
                    createdAt: Date.now() - (index * 86400000),
                    isShort: false
                };
                admin.videos.push(videoId);
            }
        });

        // Создаем демо шортсы
        const demoShorts = [
            {
                title: "Минутка UsTube #1",
                description: "Самое интересное за неделю!",
                duration: 45,
                thumbnail: "https://picsum.photos/169/300?random=6"
            },
            {
                title: "За кадром UsTube",
                description: "Как создается контент для платформы",
                duration: 52,
                thumbnail: "https://picsum.photos/169/300?random=7"
            },
            {
                title: "Советы для авторов",
                description: "3 главных совета от создателей платформы",
                duration: 38,
                thumbnail: "https://picsum.photos/169/300?random=8"
            },
            {
                title: "Новые функции платформы",
                description: "Что добавили в последнем обновлении",
                duration: 41,
                thumbnail: "https://picsum.photos/169/300?random=9"
            }
        ];

        demoShorts.forEach((short, index) => {
            const shortId = `short_ustube_${index + 1}`;
            if (!this.data.shorts[shortId]) {
                this.data.shorts[shortId] = {
                    id: shortId,
                    title: short.title,
                    description: short.description,
                    channelId: admin.id,
                    channelName: admin.username,
                    views: Math.floor(Math.random() * 50000) + 5000,
                    likes: Math.floor(Math.random() * 3000) + 300,
                    comments: Math.floor(Math.random() * 100) + 10,
                    duration: short.duration,
                    videoUrl: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4`,
                    thumbnailUrl: short.thumbnail,
                    createdAt: Date.now() - (index * 3600000),
                    isShort: true
                };
                admin.shorts.push(shortId);
            }
        });

        this.save();
    }

    generateId(type) {
        const id = `${type}_${this.data.nextId[type]++}`;
        this.save();
        return id;
    }

    hashPassword(password) {
        return crypto.createHash('sha256').update(password + CONFIG.JWT_SECRET).digest('hex');
    }

    // ===== МЕТОДЫ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ =====
    createUser(data) {
        const userId = this.generateId('user');
        const user = {
            id: userId,
            username: data.username,
            email: data.email,
            password: this.hashPassword(data.password),
            avatar: 'https://i.pravatar.cc/300?img=' + (Object.keys(this.data.users).length + 1),
            banner: 'https://picsum.photos/1200/400?random=' + Date.now(),
            bio: '',
            subscribers: 0,
            videos: [],
            shorts: [],
            createdAt: Date.now(),
            isAdmin: false,
            isVerified: false,
            channelId: `channel_${data.username.toLowerCase().replace(/\s+/g, '_')}`
        };
        
        this.data.users[data.email] = user;
        this.save();
        return user;
    }

    getUserByEmail(email) {
        return this.data.users[email];
    }

    getUserById(id) {
        return Object.values(this.data.users).find(u => u.id === id);
    }

    updateUser(email, data) {
        const user = this.data.users[email];
        if (user) {
            Object.assign(user, data);
            this.save();
            return user;
        }
        return null;
    }

    // ===== МЕТОДЫ ДЛЯ ВИДЕО =====
    createVideo(data) {
        const videoId = this.generateId('video');
        const video = {
            id: videoId,
            ...data,
            views: 0,
            likes: 0,
            dislikes: 0,
            comments: 0,
            createdAt: Date.now(),
            isPublished: true,
            isShort: data.duration < 60,
            thumbnailUrl: data.thumbnailUrl || `https://picsum.photos/300/169?random=${Date.now()}`
        };
        
        this.data.videos[videoId] = video;
        
        // Добавляем видео в канал пользователя
        const user = this.getUserById(data.channelId);
        if (user) {
            if (video.isShort) {
                user.shorts.push(videoId);
            } else {
                user.videos.push(videoId);
            }
        }
        
        this.save();
        return video;
    }

    getVideo(id) {
        const video = this.data.videos[id] || this.data.shorts[id];
        if (video) {
            video.views = (video.views || 0) + 1;
            this.save();
        }
        return video;
    }

    getVideos(filter = {}) {
        let videos = Object.values(this.data.videos);
        
        if (filter.category) {
            videos = videos.filter(v => v.category === filter.category);
        }
        
        if (filter.channelId) {
            videos = videos.filter(v => v.channelId === filter.channelId);
        }
        
        if (filter.sortBy === 'popular') {
            videos.sort((a, b) => b.views - a.views);
        } else if (filter.sortBy === 'trending') {
            videos.sort((a, b) => {
                const aScore = b.likes * 2 - b.dislikes + b.views * 0.1;
                const bScore = a.likes * 2 - a.dislikes + a.views * 0.1;
                return bScore - aScore;
            });
        } else {
            videos.sort((a, b) => b.createdAt - a.createdAt);
        }
        
        return videos.slice(0, filter.limit || 50);
    }

    getShorts(limit = 30) {
        const shorts = Object.values(this.data.shorts);
        shorts.sort((a, b) => b.createdAt - a.createdAt);
        return shorts.slice(0, limit);
    }

    // ===== МЕТОДЫ ДЛЯ КОММЕНТАРИЕВ =====
    addComment(videoId, userId, text) {
        const commentId = this.generateId('comment');
        const user = this.getUserById(userId);
        const comment = {
            id: commentId,
            videoId,
            userId,
            username: user?.username || 'Аноним',
            userAvatar: user?.avatar,
            text,
            likes: 0,
            createdAt: Date.now()
        };
        
        this.data.comments[commentId] = comment;
        
        // Увеличиваем счетчик комментариев у видео
        const video = this.data.videos[videoId] || this.data.shorts[videoId];
        if (video) {
            video.comments = (video.comments || 0) + 1;
        }
        
        this.save();
        return comment;
    }

    getVideoComments(videoId) {
        return Object.values(this.data.comments)
            .filter(c => c.videoId === videoId)
            .sort((a, b) => b.createdAt - a.createdAt);
    }

    // ===== МЕТОДЫ ДЛЯ ПОДПИСОК =====
    subscribe(subscriberId, channelId) {
        const key = `${subscriberId}_${channelId}`;
        if (!this.data.subscriptions[key]) {
            this.data.subscriptions[key] = {
                subscriberId,
                channelId,
                createdAt: Date.now()
            };
            
            // Увеличиваем счетчик подписчиков
            const channel = this.getUserById(channelId);
            if (channel) {
                channel.subscribers = (channel.subscribers || 0) + 1;
            }
            
            this.save();
            return true;
        }
        return false;
    }

    unsubscribe(subscriberId, channelId) {
        const key = `${subscriberId}_${channelId}`;
        if (this.data.subscriptions[key]) {
            delete this.data.subscriptions[key];
            
            // Уменьшаем счетчик подписчиков
            const channel = this.getUserById(channelId);
            if (channel && channel.subscribers > 0) {
                channel.subscribers--;
            }
            
            this.save();
            return true;
        }
        return false;
    }

    isSubscribed(subscriberId, channelId) {
        return !!this.data.subscriptions[`${subscriberId}_${channelId}`];
    }

    // ===== МЕТОДЫ ДЛЯ ЛАЙКОВ =====
    likeVideo(userId, videoId, type) {
        const key = `${userId}_${videoId}`;
        const video = this.data.videos[videoId] || this.data.shorts[videoId];
        
        if (video) {
            // Удаляем предыдущую реакцию
            if (this.data.likes[key]) {
                const prevType = this.data.likes[key].type;
                if (prevType === 1) video.likes--;
                if (prevType === -1) video.dislikes--;
            }
            
            // Добавляем новую
            this.data.likes[key] = { userId, videoId, type, createdAt: Date.now() };
            
            if (type === 1) video.likes++;
            if (type === -1) video.dislikes++;
            
            this.save();
            return true;
        }
        return false;
    }

    getUserLike(userId, videoId) {
        return this.data.likes[`${userId}_${videoId}`];
    }

    // ===== МЕТОДЫ ДЛЯ ПОИСКА =====
    search(query, type = 'video') {
        const searchTerm = query.toLowerCase();
        
        if (type === 'video') {
            const videos = Object.values(this.data.videos);
            return videos.filter(video => 
                video.title.toLowerCase().includes(searchTerm) ||
                video.description.toLowerCase().includes(searchTerm) ||
                video.tags.toLowerCase().includes(searchTerm)
            );
        } else if (type === 'channel') {
            const users = Object.values(this.data.users);
            return users.filter(user => 
                user.username.toLowerCase().includes(searchTerm) ||
                user.bio.toLowerCase().includes(searchTerm)
            );
        }
        
        return [];
    }

    // ===== МЕТОДЫ ДЛЯ РЕКОМЕНДАЦИЙ =====
    getRecommendations(userId) {
        const allVideos = Object.values(this.data.videos);
        const user = this.getUserById(userId);
        
        if (!user) {
            // Для неавторизованных - популярные видео
            return allVideos
                .sort((a, b) => b.views - a.views)
                .slice(0, 20);
        }
        
        // Получаем видео с каналов, на которые подписан пользователь
        const subscribedChannels = Object.values(this.data.subscriptions)
            .filter(s => s.subscriberId === userId)
            .map(s => s.channelId);
        
        const subscribedVideos = allVideos.filter(v => subscribedChannels.includes(v.channelId));
        
        // Смешиваем с популярными видео
        const popularVideos = allVideos
            .filter(v => !subscribedChannels.includes(v.channelId))
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);
        
        return [...subscribedVideos, ...popularVideos].slice(0, 20);
    }

    // ===== АДМИН МЕТОДЫ =====
    getAdminStats() {
        const users = Object.values(this.data.users);
        const videos = Object.values(this.data.videos);
        const shorts = Object.values(this.data.shorts);
        
        return {
            totalUsers: users.length,
            totalVideos: videos.length,
            totalShorts: shorts.length,
            totalViews: videos.reduce((sum, v) => sum + (v.views || 0), 0) + 
                        shorts.reduce((sum, s) => sum + (s.views || 0), 0),
            totalComments: Object.keys(this.data.comments).length,
            totalSubscriptions: Object.keys(this.data.subscriptions).length,
            recentUsers: users.slice(-10).reverse(),
            recentVideos: videos.slice(-10).reverse(),
            systemLogs: this.data.logs.slice(-50).reverse()
        };
    }

    deleteVideo(videoId) {
        const video = this.data.videos[videoId] || this.data.shorts[videoId];
        if (!video) return false;
        
        // Удаляем из канала
        const user = this.getUserById(video.channelId);
        if (user) {
            if (video.isShort) {
                user.shorts = user.shorts.filter(id => id !== videoId);
            } else {
                user.videos = user.videos.filter(id => id !== videoId);
            }
        }
        
        // Удаляем комментарии
        Object.keys(this.data.comments).forEach(commentId => {
            if (this.data.comments[commentId].videoId === videoId) {
                delete this.data.comments[commentId];
            }
        });
        
        // Удаляем лайки
        Object.keys(this.data.likes).forEach(likeKey => {
            if (this.data.likes[likeKey].videoId === videoId) {
                delete this.data.likes[likeKey];
            }
        });
        
        // Удаляем видео
        if (video.isShort) {
            delete this.data.shorts[videoId];
        } else {
            delete this.data.videos[videoId];
        }
        
        this.save();
        return true;
    }

    deleteUser(email) {
        const user = this.data.users[email];
        if (!user || user.isAdmin) return false;
        
        // Удаляем видео пользователя
        [...user.videos, ...user.shorts].forEach(videoId => {
            this.deleteVideo(videoId);
        });
        
        // Удаляем подписки
        Object.keys(this.data.subscriptions).forEach(key => {
            const sub = this.data.subscriptions[key];
            if (sub.subscriberId === user.id || sub.channelId === user.id) {
                delete this.data.subscriptions[key];
            }
        });
        
        // Удаляем комментарии
        Object.keys(this.data.comments).forEach(commentId => {
            if (this.data.comments[commentId].userId === user.id) {
                delete this.data.comments[commentId];
            }
        });
        
        // Удаляем пользователя
        delete this.data.users[email];
        
        this.save();
        return true;
    }

    addLog(action, details) {
        const log = {
            id: `log_${Date.now()}`,
            action,
            details,
            timestamp: Date.now(),
            userAgent: details.userAgent || 'Unknown'
        };
        
        this.data.logs.push(log);
        if (this.data.logs.length > 1000) {
            this.data.logs = this.data.logs.slice(-1000);
        }
        
        this.save();
        return log;
    }

    // ===== ВИДЕО МОНТАЖ =====
    saveVideoEdit(videoId, edits) {
        const video = this.data.videos[videoId] || this.data.shorts[videoId];
        if (!video) return false;
        
        video.edits = edits;
        this.save();
        return true;
    }
}

const db = new Database();

// ===== HTTP СЕРВЕР =====
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Статические файлы
    if (pathname.startsWith('/uploads/') || pathname.startsWith('/static/')) {
        serveStaticFile(req, res);
        return;
    }
    
    // API маршруты
    if (pathname === '/api/register' && req.method === 'POST') {
        handleRegister(req, res);
    } else if (pathname === '/api/login' && req.method === 'POST') {
        handleLogin(req, res);
    } else if (pathname === '/api/videos' && req.method === 'GET') {
        handleGetVideos(req, res, parsedUrl.query);
    } else if (pathname.startsWith('/api/videos/') && req.method === 'GET') {
        const videoId = pathname.split('/')[3];
        handleGetVideo(req, res, videoId);
    } else if (pathname === '/api/upload/video' && req.method === 'POST') {
        handleUploadVideo(req, res);
    } else if (pathname === '/api/shorts' && req.method === 'GET') {
        handleGetShorts(req, res);
    } else if (pathname.startsWith('/api/comments/') && req.method === 'GET') {
        const videoId = pathname.split('/')[3];
        handleGetComments(req, res, videoId);
    } else if (pathname === '/api/comments' && req.method === 'POST') {
        handleAddComment(req, res);
    } else if (pathname === '/api/like' && req.method === 'POST') {
        handleLike(req, res);
    } else if (pathname === '/api/subscribe' && req.method === 'POST') {
        handleSubscribe(req, res);
    } else if (pathname === '/api/unsubscribe' && req.method === 'POST') {
        handleUnsubscribe(req, res);
    } else if (pathname === '/api/search' && req.method === 'GET') {
        handleSearch(req, res, parsedUrl.query);
    } else if (pathname === '/api/recommendations' && req.method === 'GET') {
        handleRecommendations(req, res, parsedUrl.query);
    } else if (pathname === '/api/channel' && req.method === 'GET') {
        handleGetChannel(req, res, parsedUrl.query);
    } else if (pathname === '/api/channel/update' && req.method === 'POST') {
        handleUpdateChannel(req, res);
    } else if (pathname === '/api/admin/stats' && req.method === 'GET') {
        handleAdminStats(req, res);
    } else if (pathname === '/api/admin/videos' && req.method === 'GET') {
        handleAdminVideos(req, res);
    } else if (pathname === '/api/admin/videos/delete' && req.method === 'POST') {
        handleDeleteVideo(req, res);
    } else if (pathname === '/api/admin/users' && req.method === 'GET') {
        handleAdminUsers(req, res);
    } else if (pathname === '/api/admin/users/delete' && req.method === 'POST') {
        handleDeleteUser(req, res);
    } else if (pathname === '/api/admin/logs' && req.method === 'GET') {
        handleAdminLogs(req, res);
    } else if (pathname === '/api/edit/video' && req.method === 'POST') {
        handleEditVideo(req, res);
    } else if (pathname === '/api/video/edit/save' && req.method === 'POST') {
        handleSaveVideoEdit(req, res);
    } else if (pathname === '/api/admin/publish' && req.method === 'POST') {
        handleAdminPublish(req, res);
    } else {
        serveStaticFile(req, res);
    }
});

// ===== ОБРАБОТЧИКИ API =====
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                resolve({});
            }
        });
        req.on('error', reject);
    });
}

async function handleRegister(req, res) {
    try {
        const data = await parseBody(req);
        
        if (!data.username || !data.email || !data.password) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Все поля обязательны' }));
            return;
        }
        
        if (db.getUserByEmail(data.email)) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Пользователь уже существует' }));
            return;
        }
        
        const user = db.createUser(data);
        
        // Логируем регистрацию
        db.addLog('REGISTER', {
            email: data.email,
            username: data.username,
            userAgent: req.headers['user-agent']
        });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                isAdmin: user.isAdmin
            }
        }));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Ошибка сервера' }));
    }
}

async function handleLogin(req, res) {
    try {
        const data = await parseBody(req);
        const user = db.getUserByEmail(data.email);
        
        if (!user || user.password !== db.hashPassword(data.password)) {
            res.writeHead(401);
            res.end(JSON.stringify({ error: 'Неверный email или пароль' }));
            return;
        }
        
        // Логируем вход
        db.addLog('LOGIN', {
            email: data.email,
            userAgent: req.headers['user-agent']
        });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                banner: user.banner,
                bio: user.bio,
                subscribers: user.subscribers,
                isAdmin: user.isAdmin,
                isVerified: user.isVerified,
                channelId: user.channelId
            }
        }));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Ошибка сервера' }));
    }
}

function handleGetVideos(req, res, query) {
    try {
        const videos = db.getVideos({
            category: query.category,
            channelId: query.channelId,
            sortBy: query.sort || 'newest',
            limit: parseInt(query.limit) || 50
        });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(videos));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Ошибка сервера' }));
    }
}

function handleGetVideo(req, res, videoId) {
    try {
        const video = db.getVideo(videoId);
        
        if (!video) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Видео не найдено' }));
            return;
        }
        
        // Получаем информацию о канале
        const channel = db.getUserById(video.channelId);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            ...video,
            channel: {
                id: channel?.id,
                name: channel?.username,
                avatar: channel?.avatar,
                banner: channel?.banner,
                bio: channel?.bio,
                subscribers: channel?.subscribers || 0,
                isVerified: channel?.isVerified
            }
        }));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Ошибка сервера' }));
    }
}

async function handleUploadVideo(req, res) {
    try {
        const data = await parseBody(req);
        
        if (!data.channelId || !data.title) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Заполните обязательные поля' }));
            return;
        }
        
        const video = db.createVideo(data);
        
        // Логируем загрузку
        db.addLog('VIDEO_UPLOAD', {
            videoId: video.id,
            title: data.title,
            channelId: data.channelId,
            userAgent: req.headers['user-agent']
        });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            videoId: video.id,
            message: 'Видео успешно загружено'
        }));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Ошибка загрузки видео' }));
    }
}

function handleGetShorts(req, res) {
    try {
        const shorts = db.getShorts(30);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(shorts));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Ошибка сервера' }));
    }
}

function handleGetComments(req, res, videoId) {
    try {
        const comments = db.getVideoComments(videoId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(comments));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Ошибка сервера' }));
    }
}

async function handleAddComment(req, res) {
    try {
        const data = await parseBody(req);
        
        if (!data.videoId || !data.userId || !data.text) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Заполните все поля' }));
            return;
        }
        
        const comment = db.addComment(data.videoId, data.userId, data.text);
        
        // Логируем комментарий
        db.addLog('COMMENT_ADD', {
            videoId: data.videoId,
            userId: data.userId,
            commentId: comment.id,
            userAgent: req.headers['user-agent']
        });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            comment
        }));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Ошибка сервера' }));
    }
}

async function handleLike(req, res) {
    try {
        const data = await parseBody(req);
        
        if (!data.userId || !data.videoId || data.type === undefined) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Неверные данные' }));
            return;
        }
        
        const success = db.likeVideo(data.userId, data.videoId, data.type);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success }));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Ошибка сервера' }));
    }
}

async function handleSubscribe(req, res) {
    try {
        const data = await parseBody(req);
        
        if (!data.subscriberId || !data.channelId) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Неверные данные' }));
            return;
        }
        
        const success = db.subscribe(data.subscriberId, data.channelId);
        
        // Логируем подписку
        if (success) {
            db.addLog('SUBSCRIBE', {
                subscriberId: data.subscriberId,
                channelId: data.channelId,
                userAgent: req.headers['user-agent']
            });
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success }));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Ошибка сервера' }));
    }
}

async function handleUnsubscribe(req, res) {
    try {
        const data = await parseBody(req);
        
        if (!data.subscriberId || !data.channelId) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Неверные данные' }));
            return;
        }
        
        const success = db.unsubscribe(data.subscriberId, data.channelId);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success }));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Ошибка сервера' }));
    }
}

function handleSearch(req, res, query) {
    try {
        const results = db.search(query.q, query.type || 'video');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(results));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Ошибка поиска' }));
    }
}

function handleRecommendations(req, res, query) {
    try {
        const recommendations = db.getRecommendations(query.userId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(recommendations));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Ошибка сервера' }));
    }
}

function handleGetChannel(req, res, query) {
    try {
        const channel = db.getUserById(query.id);
        
        if (!channel) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Канал не найден' }));
            return;
        }
        
        const videos = db.getVideos({ channelId: channel.id });
        const shorts = db.getShorts(50).filter(s => s.channelId === channel.id);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            ...channel,
            videos,
            shorts
        }));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Ошибка сервера' }));
    }
}

async function handleUpdateChannel(req, res) {
    try {
        const data = await parseBody(req);
        
        if (!data.email) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Не указан email' }));
            return;
        }
        
        const user = db.updateUser(data.email, {
            username: data.username,
            bio: data.bio,
            avatar: data.avatar,
            banner: data.banner
        });
        
        if (!user) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Пользователь не найден' }));
            return;
        }
        
        // Логируем обновление
        db.addLog('CHANNEL_UPDATE', {
            email: data.email,
            changes: Object.keys(data),
            userAgent: req.headers['user-agent']
        });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            user
        }));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Ошибка сервера' }));
    }
}

async function handleEditVideo(req, res) {
    try {
        const data = await parseBody(req);
        
        if (!data.videoId || !data.title) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Заполните обязательные поля' }));
            return;
        }
        
        const video = db.data.videos[data.videoId] || db.data.shorts[data.videoId];
        if (!video) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Видео не найдено' }));
            return;
        }
        
        // Обновляем данные видео
        Object.assign(video, {
            title: data.title,
            description: data.description || video.description,
            category: data.category || video.category,
            tags: data.tags || video.tags
        });
        
        db.save();
        
        // Логируем редактирование
        db.addLog('VIDEO_EDIT', {
            videoId: data.videoId,
            title: data.title,
            userAgent: req.headers['user-agent']
        });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            video
        }));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Ошибка сервера' }));
    }
}

async function handleSaveVideoEdit(req, res) {
    try {
        const data = await parseBody(req);
        
        if (!data.videoId || !data.edits) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Неверные данные' }));
            return;
        }
        
        const success = db.saveVideoEdit(data.videoId, data.edits);
        
        // Логируем редактирование
        db.addLog('VIDEO_EDIT_SAVE', {
            videoId: data.videoId,
            edits: Object.keys(data.edits),
            userAgent: req.headers['user-agent']
        });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success }));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Ошибка сервера' }));
    }
}

async function handleAdminPublish(req, res) {
    try {
        const data = await parseBody(req);
        
        if (!data.title || !data.channelId) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Заполните обязательные поля' }));
            return;
        }
        
        const admin = db.getUserByEmail(CONFIG.ADMIN_EMAIL);
        if (!admin || admin.id !== data.channelId) {
            res.writeHead(403);
            res.end(JSON.stringify({ error: 'Недостаточно прав' }));
            return;
        }
        
        const video = db.createVideo({
            ...data,
            channelId: admin.id,
            channelName: admin.username
        });
        
        // Логируем публикацию от админа
        db.addLog('ADMIN_PUBLISH', {
            videoId: video.id,
            title: data.title,
            userAgent: req.headers['user-agent']
        });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            videoId: video.id,
            message: 'Видео опубликовано от имени UsTube Official'
        }));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Ошибка сервера' }));
    }
}

// ===== АДМИН ОБРАБОТЧИКИ =====
function handleAdminStats(req, res) {
    try {
        const stats = db.getAdminStats();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(stats));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Ошибка сервера' }));
    }
}

function handleAdminVideos(req, res) {
    try {
        const videos = Object.values(db.data.videos);
        const shorts = Object.values(db.data.shorts);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            videos: videos.sort((a, b) => b.createdAt - a.createdAt),
            shorts: shorts.sort((a, b) => b.createdAt - a.createdAt)
        }));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Ошибка сервера' }));
    }
}

async function handleDeleteVideo(req, res) {
    try {
        const data = await parseBody(req);
        
        if (!data.videoId) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Не указан ID видео' }));
            return;
        }
        
        const success = db.deleteVideo(data.videoId);
        
        // Логируем удаление
        if (success) {
            db.addLog('VIDEO_DELETE', {
                videoId: data.videoId,
                userAgent: req.headers['user-agent']
            });
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success }));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Ошибка сервера' }));
    }
}

function handleAdminUsers(req, res) {
    try {
        const users = Object.values(db.data.users);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(
            users.sort((a, b) => b.createdAt - a.createdAt)
        ));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Ошибка сервера' }));
    }
}

async function handleDeleteUser(req, res) {
    try {
        const data = await parseBody(req);
        
        if (!data.email) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Не указан email' }));
            return;
        }
        
        const success = db.deleteUser(data.email);
        
        // Логируем удаление
        if (success) {
            db.addLog('USER_DELETE', {
                email: data.email,
                userAgent: req.headers['user-agent']
            });
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success }));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Ошибка сервера' }));
    }
}

function handleAdminLogs(req, res) {
    try {
        const logs = db.data.logs.slice(-100).reverse();
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(logs));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Ошибка сервера' }));
    }
}

// ===== СТАТИЧЕСКИЕ ФАЙЛЫ =====
function serveStaticFile(req, res) {
    let filePath = '.' + req.url;
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
        case '.webm': contentType = 'video/webm'; break;
        case '.svg': contentType = 'image/svg+xml'; break;
    }
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // Отдаем index.html для SPA
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
}

// ===== ЗАПУСК СЕРВЕРА =====
server.listen(CONFIG.PORT, () => {
    console.log(`🚀 UsTube Server запущен на порту ${CONFIG.PORT}`);
    console.log(`🌐 Откройте в браузере: http://localhost:${CONFIG.PORT}`);
    console.log(`👑 Админ доступ: ${CONFIG.ADMIN_EMAIL} / ${CONFIG.ADMIN_PASSWORD}`);
    console.log(`📁 Данные сохраняются в: ${CONFIG.DB_FILE}`);
    console.log(`🎬 Официальный канал: 5 видео + 4 шортса`);
    console.log(`📊 Все данные реальные и хранятся на сервере!`);
});
