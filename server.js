const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const { exec } = require('child_process');

// ===== КОНФИГУРАЦИЯ =====
const CONFIG = {
    PORT: process.env.PORT || 3000,
    UPLOAD_DIR: './uploads',
    DB_FILE: './database.json',
    JWT_SECRET: 'ustube_super_secret_key_2024',
    ADMIN_PASSWORD: '140612',
    MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
    ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/ogg'],
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif']
};

// ===== ИНИЦИАЛИЗАЦИЯ ХРАНИЛИЩА =====
class DataStorage {
    constructor() {
        this.db = this.loadDatabase();
        this.initDefaultData();
    }

    loadDatabase() {
        if (fs.existsSync(CONFIG.DB_FILE)) {
            try {
                return JSON.parse(fs.readFileSync(CONFIG.DB_FILE, 'utf8'));
            } catch (e) {
                console.log('Ошибка загрузки БД, создаем новую');
                return this.createEmptyDatabase();
            }
        }
        return this.createEmptyDatabase();
    }

    createEmptyDatabase() {
        return {
            users: {},
            channels: {},
            videos: {},
            comments: {},
            subscriptions: {},
            likes: {},
            views: {},
            playlists: {},
            notifications: {},
            reports: {},
            nextId: {
                user: 1000,
                channel: 1000,
                video: 1000,
                comment: 1000
            }
        };
    }

    initDefaultData() {
        // Создаем канал UsTube
        if (!this.db.channels['channel_1']) {
            this.db.channels['channel_1'] = {
                id: 'channel_1',
                name: 'UsTube',
                description: 'Официальный канал платформы UsTube. Здесь публикуются лучшие видео, обучающие материалы и новости платформы.',
                avatar: '/uploads/avatars/ustube.png',
                banner: '/uploads/banners/ustube.jpg',
                ownerId: 'user_1',
                subscribers: 0,
                views: 0,
                videos: [],
                created: Date.now(),
                verified: true
            };
        }

        // Создаем администратора
        if (!this.db.users['user_1']) {
            this.db.users['user_1'] = {
                id: 'user_1',
                username: 'admin',
                email: 'admin@ustube.com',
                password: crypto.createHash('sha256').update(CONFIG.ADMIN_PASSWORD).digest('hex'),
                avatar: '/uploads/avatars/ustube.png',
                channelId: 'channel_1',
                role: 'admin',
                created: Date.now(),
                lastLogin: Date.now()
            };
        }

        // Добавляем демо видео для канала UsTube
        const demoVideos = [
            {
                id: 'video_1',
                title: 'Добро пожаловать на UsTube! 🎬',
                description: 'Официальное приветственное видео платформы UsTube. Узнайте о всех возможностях нашей платформы.',
                category: 'Образование',
                tags: 'ustube, платформа, видео, хостинг',
                duration: 186,
                views: 15432,
                likes: 1245,
                dislikes: 23,
                comments: 89,
                isShort: false,
                channelId: 'channel_1',
                videoUrl: '/uploads/videos/welcome.mp4',
                thumbnail: '/uploads/thumbnails/welcome.jpg',
                published: Date.now() - 86400000 * 7,
                status: 'published'
            },
            {
                id: 'video_2',
                title: 'Как загрузить свое первое видео 📤',
                description: 'Полное руководство по загрузке и публикации видео на платформе UsTube.',
                category: 'Образование',
                tags: 'обучение, загрузка, видео, инструкция',
                duration: 324,
                views: 8921,
                likes: 876,
                dislikes: 12,
                comments: 45,
                isShort: false,
                channelId: 'channel_1',
                videoUrl: '/uploads/videos/upload-guide.mp4',
                thumbnail: '/uploads/thumbnails/upload-guide.jpg',
                published: Date.now() - 86400000 * 5,
                status: 'published'
            },
            {
                id: 'video_3',
                title: 'Топ 5 функций UsTube 2024 🔥',
                description: 'Самые крутые и полезные функции нашей платформы, которые вам понравятся!',
                category: 'Развлечения',
                tags: 'функции, топ, обзор, 2024',
                duration: 215,
                views: 12456,
                likes: 1456,
                dislikes: 34,
                comments: 123,
                isShort: false,
                channelId: 'channel_1',
                videoUrl: '/uploads/videos/top-features.mp4',
                thumbnail: '/uploads/thumbnails/top-features.jpg',
                published: Date.now() - 86400000 * 3,
                status: 'published'
            },
            {
                id: 'short_1',
                title: 'UsTube в 60 секунд ⚡',
                description: 'Вся платформа за минуту!',
                category: 'Развлечения',
                tags: 'shorts, коротко, обзор',
                duration: 58,
                views: 45321,
                likes: 4321,
                dislikes: 45,
                comments: 234,
                isShort: true,
                channelId: 'channel_1',
                videoUrl: '/uploads/videos/short-demo.mp4',
                thumbnail: '/uploads/thumbnails/short-demo.jpg',
                published: Date.now() - 86400000 * 2,
                status: 'published'
            },
            {
                id: 'short_2',
                title: 'Создавайте контент с нами 🎥',
                description: 'Присоединяйтесь к сообществу создателей!',
                category: 'Развлечения',
                tags: 'создатели, контент, сообщество',
                duration: 42,
                views: 32145,
                likes: 2987,
                dislikes: 32,
                comments: 189,
                isShort: true,
                channelId: 'channel_1',
                videoUrl: '/uploads/videos/creator-community.mp4',
                thumbnail: '/uploads/thumbnails/creator-community.jpg',
                published: Date.now() - 86400000 * 1,
                status: 'published'
            }
        ];

        demoVideos.forEach(video => {
            if (!this.db.videos[video.id]) {
                this.db.videos[video.id] = video;
                if (!this.db.channels['channel_1'].videos.includes(video.id)) {
                    this.db.channels['channel_1'].videos.push(video.id);
                }
            }
        });

        this.save();
    }

    save() {
        fs.writeFileSync(CONFIG.DB_FILE, JSON.stringify(this.db, null, 2));
    }

    // ===== МЕТОДЫ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ =====
    createUser(username, email, password) {
        const userId = 'user_' + this.db.nextId.user++;
        const channelId = 'channel_' + this.db.nextId.channel++;

        const user = {
            id: userId,
            username,
            email,
            password: crypto.createHash('sha256').update(password).digest('hex'),
            avatar: '/uploads/avatars/default.png',
            channelId,
            role: 'user',
            created: Date.now(),
            lastLogin: Date.now(),
            settings: {
                notifications: true,
                theme: 'dark',
                language: 'ru'
            }
        };

        const channel = {
            id: channelId,
            name: username,
            description: '',
            avatar: '/uploads/avatars/default.png',
            banner: '',
            ownerId: userId,
            subscribers: 0,
            views: 0,
            videos: [],
            created: Date.now(),
            verified: false
        };

        this.db.users[userId] = user;
        this.db.channels[channelId] = channel;
        this.save();

        return { user, channel };
    }

    getUserById(id) {
        return this.db.users[id];
    }

    getUserByEmail(email) {
        return Object.values(this.db.users).find(u => u.email === email);
    }

    updateUser(userId, updates) {
        if (this.db.users[userId]) {
            this.db.users[userId] = { ...this.db.users[userId], ...updates };
            this.save();
            return true;
        }
        return false;
    }

    // ===== МЕТОДЫ ДЛЯ КАНАЛОВ =====
    getChannel(id) {
        return this.db.channels[id];
    }

    updateChannel(channelId, updates) {
        if (this.db.channels[channelId]) {
            this.db.channels[channelId] = { ...this.db.channels[channelId], ...updates };
            this.save();
            return true;
        }
        return false;
    }

    subscribe(userId, channelId) {
        const key = `${userId}_${channelId}`;
        if (!this.db.subscriptions[key]) {
            this.db.subscriptions[key] = {
                userId,
                channelId,
                timestamp: Date.now()
            };
            
            // Увеличиваем счетчик подписчиков
            if (this.db.channels[channelId]) {
                this.db.channels[channelId].subscribers++;
                this.save();
            }
            
            return true;
        }
        return false;
    }

    unsubscribe(userId, channelId) {
        const key = `${userId}_${channelId}`;
        if (this.db.subscriptions[key]) {
            delete this.db.subscriptions[key];
            
            // Уменьшаем счетчик подписчиков
            if (this.db.channels[channelId] && this.db.channels[channelId].subscribers > 0) {
                this.db.channels[channelId].subscribers--;
                this.save();
            }
            
            return true;
        }
        return false;
    }

    isSubscribed(userId, channelId) {
        return !!this.db.subscriptions[`${userId}_${channelId}`];
    }

    // ===== МЕТОДЫ ДЛЯ ВИДЕО =====
    createVideo(data) {
        const videoId = 'video_' + this.db.nextId.video++;
        
        const video = {
            id: videoId,
            title: data.title || 'Без названия',
            description: data.description || '',
            category: data.category || 'Разное',
            tags: data.tags || '',
            duration: data.duration || 0,
            views: 0,
            likes: 0,
            dislikes: 0,
            comments: 0,
            isShort: data.isShort || false,
            channelId: data.channelId,
            videoUrl: data.videoUrl,
            thumbnail: data.thumbnail || '/uploads/thumbnails/default.jpg',
            published: Date.now(),
            status: 'published',
            privacy: data.privacy || 'public'
        };

        this.db.videos[videoId] = video;
        
        // Добавляем видео в канал
        const channel = this.db.channels[data.channelId];
        if (channel) {
            channel.videos.push(videoId);
            channel.views += video.views;
        }
        
        this.save();
        return video;
    }

    getVideo(id) {
        const video = this.db.videos[id];
        if (video) {
            video.views++;
            if (this.db.channels[video.channelId]) {
                this.db.channels[video.channelId].views++;
            }
            this.save();
        }
        return video;
    }

    getVideos(filter = {}) {
        let videos = Object.values(this.db.videos);
        
        if (filter.channelId) {
            videos = videos.filter(v => v.channelId === filter.channelId);
        }
        
        if (filter.isShort !== undefined) {
            videos = videos.filter(v => v.isShort === filter.isShort);
        }
        
        if (filter.category) {
            videos = videos.filter(v => v.category === filter.category);
        }
        
        if (filter.status) {
            videos = videos.filter(v => v.status === filter.status);
        }
        
        // Сортировка
        if (filter.sort === 'popular') {
            videos.sort((a, b) => b.views - a.views);
        } else if (filter.sort === 'trending') {
            videos.sort((a, b) => {
                const aScore = b.likes * 2 - b.dislikes + b.views * 0.1;
                const bScore = a.likes * 2 - a.dislikes + a.views * 0.1;
                return bScore - aScore;
            });
        } else {
            videos.sort((a, b) => b.published - a.published);
        }
        
        return videos.slice(0, filter.limit || 50);
    }

    updateVideo(videoId, updates) {
        if (this.db.videos[videoId]) {
            this.db.videos[videoId] = { ...this.db.videos[videoId], ...updates };
            this.save();
            return true;
        }
        return false;
    }

    deleteVideo(videoId) {
        const video = this.db.videos[videoId];
        if (video) {
            // Удаляем из канала
            const channel = this.db.channels[video.channelId];
            if (channel) {
                const index = channel.videos.indexOf(videoId);
                if (index > -1) {
                    channel.videos.splice(index, 1);
                }
            }
            
            // Удаляем видео
            delete this.db.videos[videoId];
            
            // Удаляем комментарии
            Object.keys(this.db.comments).forEach(commentId => {
                if (this.db.comments[commentId].videoId === videoId) {
                    delete this.db.comments[commentId];
                }
            });
            
            this.save();
            return true;
        }
        return false;
    }

    // ===== МЕТОДЫ ДЛЯ КОММЕНТАРИЕВ =====
    addComment(videoId, userId, text) {
        const commentId = 'comment_' + this.db.nextId.comment++;
        
        const comment = {
            id: commentId,
            videoId,
            userId,
            text,
            likes: 0,
            timestamp: Date.now(),
            edited: false
        };
        
        this.db.comments[commentId] = comment;
        
        // Увеличиваем счетчик комментариев у видео
        const video = this.db.videos[videoId];
        if (video) {
            video.comments = (video.comments || 0) + 1;
        }
        
        this.save();
        return comment;
    }

    getVideoComments(videoId) {
        return Object.values(this.db.comments)
            .filter(c => c.videoId === videoId)
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    updateComment(commentId, text) {
        if (this.db.comments[commentId]) {
            this.db.comments[commentId].text = text;
            this.db.comments[commentId].edited = true;
            this.save();
            return true;
        }
        return false;
    }

    deleteComment(commentId) {
        if (this.db.comments[commentId]) {
            const comment = this.db.comments[commentId];
            
            // Уменьшаем счетчик комментариев у видео
            const video = this.db.videos[comment.videoId];
            if (video && video.comments > 0) {
                video.comments--;
            }
            
            delete this.db.comments[commentId];
            this.save();
            return true;
        }
        return false;
    }

    // ===== МЕТОДЫ ДЛЯ ЛАЙКОВ =====
    likeVideo(userId, videoId, type) {
        const key = `${userId}_${videoId}`;
        const video = this.db.videos[videoId];
        
        if (!video) return false;
        
        const existingLike = this.db.likes[key];
        
        if (existingLike) {
            // Удаляем предыдущий лайк
            if (existingLike.type === 1) video.likes--;
            if (existingLike.type === -1) video.dislikes--;
            delete this.db.likes[key];
        }
        
        // Добавляем новый лайк
        if (type !== 0) {
            this.db.likes[key] = { userId, videoId, type, timestamp: Date.now() };
            if (type === 1) video.likes++;
            if (type === -1) video.dislikes++;
        }
        
        this.save();
        return true;
    }

    getUserLike(userId, videoId) {
        return this.db.likes[`${userId}_${videoId}`];
    }

    // ===== МЕТОДЫ ДЛЯ ПОИСКА =====
    search(query, type = 'video') {
        const q = query.toLowerCase();
        
        if (type === 'video') {
            return Object.values(this.db.videos).filter(video => 
                video.title.toLowerCase().includes(q) ||
                video.description.toLowerCase().includes(q) ||
                video.tags.toLowerCase().includes(q)
            );
        } else if (type === 'channel') {
            return Object.values(this.db.channels).filter(channel => 
                channel.name.toLowerCase().includes(q) ||
                channel.description.toLowerCase().includes(q)
            );
        }
        
        return [];
    }

    // ===== МЕТОДЫ ДЛЯ АДМИНИСТРИРОВАНИЯ =====
    getStats() {
        return {
            totalUsers: Object.keys(this.db.users).length,
            totalChannels: Object.keys(this.db.channels).length,
            totalVideos: Object.keys(this.db.videos).length,
            totalViews: Object.values(this.db.videos).reduce((sum, v) => sum + v.views, 0),
            totalComments: Object.keys(this.db.comments).length,
            recentVideos: Object.values(this.db.videos)
                .sort((a, b) => b.published - a.published)
                .slice(0, 10),
            topVideos: Object.values(this.db.videos)
                .sort((a, b) => b.views - a.views)
                .slice(0, 10),
            topChannels: Object.values(this.db.channels)
                .sort((a, b) => b.subscribers - a.subscribers)
                .slice(0, 10)
        };
    }

    getUsers() {
        return Object.values(this.db.users);
    }

    updateUserRole(userId, role) {
        const user = this.db.users[userId];
        if (user) {
            user.role = role;
            this.save();
            return true;
        }
        return false;
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ ХРАНИЛИЩА =====
const storage = new DataStorage();

// ===== СОЗДАНИЕ ДИРЕКТОРИЙ =====
const dirs = [
    CONFIG.UPLOAD_DIR,
    CONFIG.UPLOAD_DIR + '/videos',
    CONFIG.UPLOAD_DIR + '/thumbnails',
    CONFIG.UPLOAD_DIR + '/avatars',
    CONFIG.UPLOAD_DIR + '/banners'
];

dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function generateToken(user) {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        channelId: user.channelId
    };
    
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = crypto
        .createHmac('sha256', CONFIG.JWT_SECRET)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64');
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyToken(token) {
    try {
        const [encodedHeader, encodedPayload, signature] = token.split('.');
        
        const expectedSignature = crypto
            .createHmac('sha256', CONFIG.JWT_SECRET)
            .update(`${encodedHeader}.${encodedPayload}`)
            .digest('base64');
        
        if (signature !== expectedSignature) {
            return null;
        }
        
        const payload = JSON.parse(Buffer.from(encodedPayload, 'base64').toString());
        return payload;
    } catch (error) {
        return null;
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ===== СОЗДАНИЕ HTTP СЕРВЕРА =====
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // Устанавливаем CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // ===== АВТОРИЗАЦИЯ =====
    if (pathname === '/api/auth/register' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                
                if (!data.username || !data.email || !data.password) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Все поля обязательны' }));
                    return;
                }
                
                if (storage.getUserByEmail(data.email)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Пользователь с таким email уже существует' }));
                    return;
                }
                
                const { user, channel } = storage.createUser(data.username, data.email, data.password);
                const token = generateToken(user);
                
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        avatar: user.avatar,
                        role: user.role,
                        channelId: user.channelId
                    },
                    channel: {
                        id: channel.id,
                        name: channel.name,
                        avatar: channel.avatar,
                        subscribers: channel.subscribers
                    }
                }));
            } catch (error) {
                console.error('Registration error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Ошибка сервера' }));
            }
        });
        return;
    }
    
    if (pathname === '/api/auth/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const user = storage.getUserByEmail(data.email);
                
                if (!user || user.password !== crypto.createHash('sha256').update(data.password).digest('hex')) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Неверный email или пароль' }));
                    return;
                }
                
                // Обновляем время последнего входа
                storage.updateUser(user.id, { lastLogin: Date.now() });
                
                const token = generateToken(user);
                const channel = storage.getChannel(user.channelId);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        avatar: user.avatar,
                        role: user.role,
                        channelId: user.channelId,
                        settings: user.settings
                    },
                    channel: {
                        id: channel.id,
                        name: channel.name,
                        avatar: channel.avatar,
                        banner: channel.banner,
                        subscribers: channel.subscribers,
                        verified: channel.verified
                    }
                }));
            } catch (error) {
                console.error('Login error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Ошибка сервера' }));
            }
        });
        return;
    }
    
    if (pathname === '/api/auth/me' && req.method === 'GET') {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Требуется авторизация' }));
            return;
        }
        
        const token = authHeader.split(' ')[1];
        const payload = verifyToken(token);
        
        if (!payload) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Неверный токен' }));
            return;
        }
        
        const user = storage.getUserById(payload.id);
        const channel = storage.getChannel(payload.channelId);
        
        if (!user) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Пользователь не найден' }));
            return;
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                channelId: user.channelId,
                settings: user.settings
            },
            channel: channel ? {
                id: channel.id,
                name: channel.name,
                description: channel.description,
                avatar: channel.avatar,
                banner: channel.banner,
                subscribers: channel.subscribers,
                views: channel.views,
                videos: channel.videos,
                verified: channel.verified
            } : null
        }));
        return;
    }
    
    // ===== КАНАЛЫ =====
    if (pathname.startsWith('/api/channels/') && req.method === 'GET') {
        const channelId = pathname.split('/')[3];
        const channel = storage.getChannel(channelId);
        
        if (!channel) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Канал не найден' }));
            return;
        }
        
        // Получаем видео канала
        const videos = storage.getVideos({ channelId, status: 'published' });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            channel,
            videos,
            isSubscribed: false // Будет вычисляться если пользователь авторизован
        }));
        return;
    }
    
    if (pathname === '/api/channels/update' && req.method === 'POST') {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Требуется авторизация' }));
            return;
        }
        
        const token = authHeader.split(' ')[1];
        const payload = verifyToken(token);
        
        if (!payload) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Неверный токен' }));
            return;
        }
        
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const user = storage.getUserById(payload.id);
                
                if (!user) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Пользователь не найден' }));
                    return;
                }
                
                const updated = storage.updateChannel(user.channelId, data);
                
                if (updated) {
                    const channel = storage.getChannel(user.channelId);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, channel }));
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Ошибка обновления канала' }));
                }
            } catch (error) {
                console.error('Channel update error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Ошибка сервера' }));
            }
        });
        return;
    }
    
    // ===== ВИДЕО =====
    if (pathname === '/api/videos' && req.method === 'GET') {
        const query = parsedUrl.query;
        const videos = storage.getVideos({
            isShort: query.shorts === 'true' ? true : undefined,
            category: query.category,
            sort: query.sort || 'newest',
            limit: parseInt(query.limit) || 50
        });
        
        // Добавляем информацию о каналах
        const videosWithChannel = videos.map(video => {
            const channel = storage.getChannel(video.channelId);
            return {
                ...video,
                channel: {
                    id: channel.id,
                    name: channel.name,
                    avatar: channel.avatar,
                    verified: channel.verified
                }
            };
        });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(videosWithChannel));
        return;
    }
    
    if (pathname.startsWith('/api/videos/') && req.method === 'GET') {
        const videoId = pathname.split('/')[3];
        
        if (pathname.includes('/comments')) {
            // Получение комментариев видео
            const comments = storage.getVideoComments(videoId);
            
            // Добавляем информацию о пользователях
            const commentsWithUsers = comments.map(comment => {
                const user = storage.getUserById(comment.userId);
                return {
                    ...comment,
                    user: {
                        id: user.id,
                        username: user.username,
                        avatar: user.avatar
                    }
                };
            });
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(commentsWithUsers));
            return;
        }
        
        const video = storage.getVideo(videoId);
        
        if (!video) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Видео не найдено' }));
            return;
        }
        
        const channel = storage.getChannel(video.channelId);
        const comments = storage.getVideoComments(videoId);
        
        // Добавляем информацию о пользователях для комментариев
        const commentsWithUsers = comments.map(comment => {
            const user = storage.getUserById(comment.userId);
            return {
                ...comment,
                user: {
                    id: user.id,
                    username: user.username,
                    avatar: user.avatar
                }
            };
        });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            video,
            channel,
            comments: commentsWithUsers
        }));
        return;
    }
    
    if (pathname === '/api/videos/upload' && req.method === 'POST') {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Требуется авторизация' }));
            return;
        }
        
        const token = authHeader.split(' ')[1];
        const payload = verifyToken(token);
        
        if (!payload) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Неверный токен' }));
            return;
        }
        
        // Получаем данные формы
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const user = storage.getUserById(payload.id);
                
                if (!user) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Пользователь не найден' }));
                    return;
                }
                
                // В реальном приложении здесь была бы загрузка файла
                // Для демо создаем видео с заглушками
                const videoData = {
                    title: data.title,
                    description: data.description,
                    category: data.category,
                    tags: data.tags,
                    duration: data.duration || 120,
                    isShort: data.duration < 60,
                    channelId: user.channelId,
                    videoUrl: '/uploads/videos/demo.mp4',
                    thumbnail: '/uploads/thumbnails/demo.jpg',
                    privacy: data.privacy || 'public'
                };
                
                const video = storage.createVideo(videoData);
                
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    video,
                    message: 'Видео успешно загружено'
                }));
            } catch (error) {
                console.error('Upload error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Ошибка загрузки видео' }));
            }
        });
        return;
    }
    
    // ===== КОММЕНТАРИИ =====
    if (pathname === '/api/comments' && req.method === 'POST') {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Требуется авторизация' }));
            return;
        }
        
        const token = authHeader.split(' ')[1];
        const payload = verifyToken(token);
        
        if (!payload) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Неверный токен' }));
            return;
        }
        
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                
                if (!data.videoId || !data.text) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Заполните все поля' }));
                    return;
                }
                
                const comment = storage.addComment(data.videoId, payload.id, data.text);
                const user = storage.getUserById(payload.id);
                
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    comment: {
                        ...comment,
                        user: {
                            id: user.id,
                            username: user.username,
                            avatar: user.avatar
                        }
                    }
                }));
            } catch (error) {
                console.error('Comment error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Ошибка добавления комментария' }));
            }
        });
        return;
    }
    
    // ===== ЛАЙКИ =====
    if (pathname.startsWith('/api/like/') && req.method === 'POST') {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Требуется авторизация' }));
            return;
        }
        
        const token = authHeader.split(' ')[1];
        const payload = verifyToken(token);
        
        if (!payload) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Неверный токен' }));
            return;
        }
        
        const videoId = pathname.split('/')[3];
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const success = storage.likeVideo(payload.id, videoId, data.type);
                
                if (success) {
                    const video = storage.db.videos[videoId];
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        likes: video.likes,
                        dislikes: video.dislikes
                    }));
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Ошибка оценки видео' }));
                }
            } catch (error) {
                console.error('Like error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Ошибка сервера' }));
            }
        });
        return;
    }
    
    // ===== ПОДПИСКИ =====
    if (pathname.startsWith('/api/subscribe/') && req.method === 'POST') {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Требуется авторизация' }));
            return;
        }
        
        const token = authHeader.split(' ')[1];
        const payload = verifyToken(token);
        
        if (!payload) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Неверный токен' }));
            return;
        }
        
        const channelId = pathname.split('/')[3];
        
        try {
            const success = storage.subscribe(payload.id, channelId);
            const channel = storage.getChannel(channelId);
            
            if (success) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    subscribed: true,
                    subscribers: channel.subscribers
                }));
            } else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Ошибка подписки' }));
            }
        } catch (error) {
            console.error('Subscribe error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Ошибка сервера' }));
        }
        return;
    }
    
    if (pathname.startsWith('/api/subscribe/') && req.method === 'DELETE') {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Требуется авторизация' }));
            return;
        }
        
        const token = authHeader.split(' ')[1];
        const payload = verifyToken(token);
        
        if (!payload) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Неверный токен' }));
            return;
        }
        
        const channelId = pathname.split('/')[3];
        
        try {
            const success = storage.unsubscribe(payload.id, channelId);
            const channel = storage.getChannel(channelId);
            
            if (success) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    subscribed: false,
                    subscribers: channel.subscribers
                }));
            } else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Ошибка отписки' }));
            }
        } catch (error) {
            console.error('Unsubscribe error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Ошибка сервера' }));
        }
        return;
    }
    
    // ===== ПОИСК =====
    if (pathname === '/api/search' && req.method === 'GET') {
        const query = parsedUrl.query.q;
        const type = parsedUrl.query.type || 'video';
        
        if (!query) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Запрос обязателен' }));
            return;
        }
        
        const results = storage.search(query, type);
        
        if (type === 'video') {
            const resultsWithChannels = results.map(video => {
                const channel = storage.getChannel(video.channelId);
                return {
                    ...video,
                    channel: {
                        id: channel.id,
                        name: channel.name,
                        avatar: channel.avatar
                    }
                };
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(resultsWithChannels));
        } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(results));
        }
        return;
    }
    
    // ===== АДМИН ПАНЕЛЬ =====
    if (pathname === '/api/admin/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                
                if (data.password === CONFIG.ADMIN_PASSWORD) {
                    // Находим админа
                    const admin = Object.values(storage.db.users).find(u => u.role === 'admin');
                    
                    if (admin) {
                        const token = generateToken(admin);
                        
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: true,
                            token,
                            user: {
                                id: admin.id,
                                username: admin.username,
                                role: admin.role
                            }
                        }));
                    } else {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Администратор не найден' }));
                    }
                } else {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Неверный пароль' }));
                }
            } catch (error) {
                console.error('Admin login error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Ошибка сервера' }));
            }
        });
        return;
    }
    
    if (pathname === '/api/admin/stats' && req.method === 'GET') {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Требуется авторизация' }));
            return;
        }
        
        const token = authHeader.split(' ')[1];
        const payload = verifyToken(token);
        
        if (!payload || payload.role !== 'admin') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Доступ запрещен' }));
            return;
        }
        
        const stats = storage.getStats();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(stats));
        return;
    }
    
    if (pathname === '/api/admin/users' && req.method === 'GET') {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Требуется авторизация' }));
            return;
        }
        
        const token = authHeader.split(' ')[1];
        const payload = verifyToken(token);
        
        if (!payload || payload.role !== 'admin') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Доступ запрещен' }));
            return;
        }
        
        const users = storage.getUsers();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(users));
        return;
    }
    
    if (pathname.startsWith('/api/admin/videos/') && req.method === 'DELETE') {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Требуется авторизация' }));
            return;
        }
        
        const token = authHeader.split(' ')[1];
        const payload = verifyToken(token);
        
        if (!payload || payload.role !== 'admin') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Доступ запрещен' }));
            return;
        }
        
        const videoId = pathname.split('/')[4];
        const success = storage.deleteVideo(videoId);
        
        if (success) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Видео не найдено' }));
        }
        return;
    }
    
    if (pathname === '/api/admin/publish' && req.method === 'POST') {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Требуется авторизация' }));
            return;
        }
        
        const token = authHeader.split(' ')[1];
        const payload = verifyToken(token);
        
        if (!payload || payload.role !== 'admin') {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Доступ запрещен' }));
            return;
        }
        
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                
                // Публикация от имени канала UsTube
                const videoData = {
                    ...data,
                    channelId: 'channel_1', // Канал UsTube
                    videoUrl: data.videoUrl || '/uploads/videos/ustube.mp4',
                    thumbnail: data.thumbnail || '/uploads/thumbnails/ustube.jpg',
                    status: 'published'
                };
                
                const video = storage.createVideo(videoData);
                
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    video,
                    message: 'Видео опубликовано на канале UsTube'
                }));
            } catch (error) {
                console.error('Admin publish error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Ошибка публикации' }));
            }
        });
        return;
    }
    
    // ===== СТАТИЧЕСКИЕ ФАЙЛЫ =====
    let filePath = '.' + pathname;
    
    // Для корня отдаем index.html
    if (filePath === './') {
        filePath = './index.html';
    }
    
    // Определяем тип контента
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
            contentType = 'image/jpeg';
            break;
        case '.gif':
            contentType = 'image/gif';
            break;
        case '.mp4':
            contentType = 'video/mp4';
            break;
        case '.webm':
            contentType = 'video/webm';
            break;
        case '.ogg':
            contentType = 'video/ogg';
            break;
    }
    
    // Отдаем файл
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // Файл не найден - пробуем index.html для SPA
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

// ===== ЗАПУСК СЕРВЕРА =====
server.listen(CONFIG.PORT, () => {
    console.log('='.repeat(50));
    console.log('🚀 UsTube Server запущен!');
    console.log('='.repeat(50));
    console.log(`📡 Порт: ${CONFIG.PORT}`);
    console.log(`🌐 URL: http://localhost:${CONFIG.PORT}`);
    console.log(`🔐 Админ пароль: ${CONFIG.ADMIN_PASSWORD}`);
    console.log(`📁 База данных: ${CONFIG.DB_FILE}`);
    console.log(`📂 Загрузки: ${CONFIG.UPLOAD_DIR}`);
    console.log('='.repeat(50));
    console.log('\n📺 Демо видео доступны:');
    console.log('   • Официальный канал UsTube');
    console.log('   • 3 обычных видео');
    console.log('   • 2 Shorts видео');
    console.log('\n👤 Тестовые аккаунты:');
    console.log('   • Админ: admin@ustube.com / admin123');
    console.log('   • Или используйте регистрацию');
    console.log('='.repeat(50));
});
