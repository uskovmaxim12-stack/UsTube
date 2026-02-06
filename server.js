const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const url = require('url');

// Конфигурация
const PORT = 3000;
const DB_FILE = './database.json';
const UPLOAD_DIR = './uploads';

// Создаем папки
[UPLOAD_DIR, UPLOAD_DIR + '/videos', UPLOAD_DIR + '/thumbnails', UPLOAD_DIR + '/avatars', UPLOAD_DIR + '/banners'].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// База данных
class Database {
    constructor() {
        this.data = {
            users: {},
            videos: {},
            comments: {},
            subscriptions: {},
            likes: {},
            nextId: { video: 1000, user: 1000, comment: 1000 }
        };
        this.load();
        this.initDefaultData();
    }

    load() {
        if (fs.existsSync(DB_FILE)) {
            try {
                this.data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
            } catch(e) {}
        }
    }

    save() {
        fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2));
    }

    initDefaultData() {
        // Создаем администратора
        if (!this.data.users['admin@ustube.com']) {
            this.data.users['admin@ustube.com'] = {
                id: 'user_1000',
                username: 'UsTube Official',
                email: 'admin@ustube.com',
                password: crypto.createHash('sha256').update('admin123').digest('hex'),
                avatar: 'https://i.pravatar.cc/300?img=1',
                banner: 'https://images.unsplash.com/photo-1492684223066-dd23140edf6d?w=1200&h=400&fit=crop',
                bio: 'Официальный канал платформы UsTube. Лучшие видео, обзоры и новости!',
                subscribers: 125000,
                videos: ['video_1001', 'video_1002', 'video_1003', 'video_1004'],
                shorts: ['video_1005', 'video_1006', 'video_1007'],
                createdAt: Date.now(),
                isAdmin: true,
                isVerified: true
            };
        }

        // Создаем видео UsTube Official
        const usTubeVideos = [
            {
                id: 'video_1001',
                title: "🚀 Добро пожаловать на UsTube!",
                description: "Полное руководство по новой платформе для видео. Все функции и возможности в одном видео!",
                duration: 245,
                category: "Образование",
                tags: "ustube, платформа, гайд, обучение",
                views: 125000,
                likes: 8500,
                dislikes: 120,
                commentsCount: 342
            },
            {
                id: 'video_1002',
                title: "🎬 Как монтировать видео в UsTube",
                description: "Полный гайд по встроенному редактору видео на нашей платформе. Все инструменты за 5 минут!",
                duration: 315,
                category: "Образование",
                tags: "монтаж, редактор, обучение",
                views: 89200,
                likes: 6200,
                dislikes: 85,
                commentsCount: 210
            },
            {
                id: 'video_1003',
                title: "🔥 Топ 10 фишек UsTube 2024",
                description: "Самые крутые функции, о которых вы не знали! Секреты и лайфхаки для авторов.",
                duration: 458,
                category: "Развлечения",
                tags: "фишки, секреты, 2024",
                views: 210000,
                likes: 15200,
                dislikes: 230,
                commentsCount: 589
            },
            {
                id: 'video_1004',
                title: "📈 Как набрать 1000 подписчиков за месяц",
                description: "Стратегия роста для новых авторов. Проверенные методы продвижения на платформе UsTube.",
                duration: 892,
                category: "Образование",
                tags: "рост, подписчики, продвижение",
                views: 187000,
                likes: 13400,
                dislikes: 180,
                commentsCount: 421
            }
        ];

        // Shorts UsTube Official
        const usTubeShorts = [
            {
                id: 'video_1005',
                title: "⚡️ UsTube за 60 секунд",
                description: "Самое важное о платформе за минуту!",
                duration: 60,
                category: "Развлечения",
                tags: "shorts, кратко, обзор",
                views: 89000,
                likes: 7200,
                dislikes: 45,
                commentsCount: 89,
                isShort: true
            },
            {
                id: 'video_1006',
                title: "🎯 3 совета для новичков",
                description: "Что нужно знать перед первым видео",
                duration: 45,
                category: "Образование",
                tags: "советы, новички, старт",
                views: 67000,
                likes: 5800,
                dislikes: 32,
                commentsCount: 67,
                isShort: true
            },
            {
                id: 'video_1007',
                title: "💡 Идеи для контента",
                description: "Что снимать в 2024 году",
                duration: 55,
                category: "Образование",
                tags: "идеи, контент, тренды",
                views: 78000,
                likes: 6400,
                dislikes: 28,
                commentsCount: 78,
                isShort: true
            }
        ];

        // Добавляем видео
        [...usTubeVideos, ...usTubeShorts].forEach(video => {
            if (!this.data.videos[video.id]) {
                this.data.videos[video.id] = {
                    ...video,
                    channelId: 'user_1000',
                    channelName: 'UsTube Official',
                    channelAvatar: 'https://i.pravatar.cc/300?img=1',
                    videoUrl: `/uploads/videos/${video.id}.mp4`,
                    thumbnailUrl: `https://picsum.photos/300/169?random=${video.id}&t=${Date.now()}`,
                    createdAt: Date.now() - (Math.random() * 30 * 86400000),
                    isPublished: true
                };
            }
        });

        // Создаем тестового пользователя
        if (!this.data.users['test@user.com']) {
            this.data.users['test@user.com'] = {
                id: 'user_1001',
                username: 'Тестовый Пользователь',
                email: 'test@user.com',
                password: crypto.createHash('sha256').update('test123').digest('hex'),
                avatar: 'https://i.pravatar.cc/300?img=5',
                banner: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&h=400&fit=crop',
                bio: 'Тестирую новую платформу UsTube!',
                subscribers: 150,
                videos: [],
                shorts: [],
                createdAt: Date.now() - (7 * 86400000),
                isAdmin: false,
                isVerified: false
            };
        }

        this.save();
    }

    generateId(type) {
        const id = `${type}_${this.data.nextId[type]++}`;
        this.save();
        return id;
    }

    hashPassword(password) {
        return crypto.createHash('sha256').update(password).digest('hex');
    }

    // Пользователи
    createUser(data) {
        const userId = this.generateId('user');
        const user = {
            id: userId,
            ...data,
            password: this.hashPassword(data.password),
            avatar: 'https://i.pravatar.cc/300?img=' + (Object.keys(this.data.users).length + 1),
            banner: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&h=400&fit=crop',
            bio: '',
            subscribers: 0,
            videos: [],
            shorts: [],
            createdAt: Date.now(),
            isAdmin: false,
            isVerified: false
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

    getAllUsers() {
        return Object.values(this.data.users);
    }

    // Видео
    createVideo(data) {
        const videoId = this.generateId('video');
        const video = {
            id: videoId,
            ...data,
            views: 0,
            likes: 0,
            dislikes: 0,
            commentsCount: 0,
            createdAt: Date.now(),
            isPublished: true,
            isShort: data.duration < 60
        };
        
        this.data.videos[videoId] = video;
        
        // Добавляем в канал пользователя
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
        const video = this.data.videos[id];
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
        
        if (filter.isShort !== undefined) {
            videos = videos.filter(v => v.isShort === filter.isShort);
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

    getAllVideos() {
        return Object.values(this.data.videos);
    }

    deleteVideo(videoId) {
        const video = this.data.videos[videoId];
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
        
        delete this.data.videos[videoId];
        this.save();
        return true;
    }

    // Комментарии
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
        
        // Увеличиваем счетчик комментариев
        const video = this.data.videos[videoId];
        if (video) {
            video.commentsCount = (video.commentsCount || 0) + 1;
        }
        
        this.save();
        return comment;
    }

    getVideoComments(videoId) {
        return Object.values(this.data.comments)
            .filter(c => c.videoId === videoId)
            .sort((a, b) => b.createdAt - a.createdAt);
    }

    // Подписки
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

    // Лайки
    likeVideo(userId, videoId, type) {
        const key = `${userId}_${videoId}`;
        const video = this.data.videos[videoId];
        
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

    // Поиск
    search(query, type = 'video') {
        const searchTerm = query.toLowerCase();
        
        if (type === 'video') {
            const videos = Object.values(this.data.videos);
            return videos.filter(video => 
                video.title.toLowerCase().includes(searchTerm) ||
                video.description.toLowerCase().includes(searchTerm) ||
                video.tags.toLowerCase().includes(searchTerm)
            );
        } else {
            const users = Object.values(this.data.users);
            return users.filter(user => 
                user.username.toLowerCase().includes(searchTerm) ||
                user.bio.toLowerCase().includes(searchTerm)
            );
        }
    }

    // Статистика для админ панели
    getAdminStats() {
        const users = Object.values(this.data.users);
        const videos = Object.values(this.data.videos);
        
        return {
            totalUsers: users.length,
            totalVideos: videos.length,
            totalViews: videos.reduce((sum, v) => sum + (v.views || 0), 0),
            totalComments: Object.keys(this.data.comments).length,
            totalSubscriptions: Object.keys(this.data.subscriptions).length,
            recentVideos: videos.slice(-10).reverse(),
            recentUsers: users.slice(-10).reverse()
        };
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
        
        delete this.data.users[email];
        this.save();
        return true;
    }
}

const db = new Database();

// HTTP сервер
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // API маршруты
    if (pathname === '/api/register' && req.method === 'POST') {
        handleRegister(req, res);
    } else if (pathname === '/api/login' && req.method === 'POST') {
        handleLogin(req, res);
    } else if (pathname === '/api/videos' && req.method === 'GET') {
        handleGetVideos(req, res, parsedUrl.query);
    } else if (pathname.startsWith('/api/video/') && req.method === 'GET') {
        const videoId = pathname.split('/')[3];
        handleGetVideo(req, res, videoId);
    } else if (pathname === '/api/upload' && req.method === 'POST') {
        handleUploadVideo(req, res);
    } else if (pathname === '/api/comments' && req.method === 'GET') {
        const videoId = parsedUrl.query.videoId;
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
    } else {
        serveStaticFile(req, res);
    }
});

// Вспомогательные функции
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

// Обработчики API
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
                isVerified: user.isVerified
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
            isShort: query.isShort === 'true' ? true : query.isShort === 'false' ? false : undefined,
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
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(video));
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
        
        const user = db.getUserById(data.channelId);
        const video = db.createVideo({
            ...data,
            channelName: user?.username,
            channelAvatar: user?.avatar,
            thumbnailUrl: `https://picsum.photos/300/169?random=${Date.now()}`,
            videoUrl: `/uploads/videos/${Date.now()}.mp4`
        });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            videoId: video.id
        }));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Ошибка загрузки видео' }));
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

function handleGetChannel(req, res, query) {
    try {
        const channel = db.getUserById(query.id);
        
        if (!channel) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Канал не найден' }));
            return;
        }
        
        const videos = db.getVideos({ channelId: channel.id, isShort: false });
        const shorts = db.getVideos({ channelId: channel.id, isShort: true });
        
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
        const videos = db.getAllVideos();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(videos));
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
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success }));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Ошибка сервера' }));
    }
}

function handleAdminUsers(req, res) {
    try {
        const users = db.getAllUsers();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(users));
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
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success }));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Ошибка сервера' }));
    }
}

function serveStaticFile(req, res) {
    let filePath = '.' + req.url;
    if (filePath === './') filePath = './index.html';
    
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

// Запуск сервера
server.listen(PORT, () => {
    console.log(`🚀 UsTube Server запущен на порту ${PORT}`);
    console.log(`🌐 Откройте: http://localhost:${PORT}`);
    console.log(`👑 Админ: admin@ustube.com / admin123`);
    console.log(`👤 Тестовый пользователь: test@user.com / test123`);
    console.log(`📊 Все данные хранятся в: ${DB_FILE}`);
});
