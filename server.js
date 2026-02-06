const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = 3000;
const ADMIN_PASSWORD = '140612';

// Создаем папки
const folders = ['uploads', 'uploads/videos', 'uploads/thumbnails', 'uploads/avatars', 'uploads/banners'];
folders.forEach(folder => {
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
});

// Настройка загрузки файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let folder = 'uploads/';
        if (file.fieldname === 'video') folder += 'videos/';
        else if (file.fieldname === 'thumbnail') folder += 'thumbnails/';
        else if (file.fieldname === 'avatar') folder += 'avatars/';
        else if (file.fieldname === 'banner') folder += 'banners/';
        cb(null, folder);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Инициализация базы данных
let database = {
    users: {},
    videos: {},
    comments: {},
    subscriptions: {},
    likes: {},
    views: {},
    logs: [],
    nextId: 1
};

const DB_FILE = 'database.json';

function loadDatabase() {
    if (fs.existsSync(DB_FILE)) {
        database = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } else {
        // Создаем администратора
        const adminId = generateId();
        database.users[adminId] = {
            id: adminId,
            username: 'UsTube Official',
            email: 'admin@ustube.com',
            password: crypto.createHash('sha256').update('admin123').digest('hex'),
            avatar: '/uploads/avatars/default.png',
            banner: '/uploads/banners/default.jpg',
            bio: 'Официальный канал платформы UsTube. Лучшие видео, обзоры и новости!',
            subscribers: 125000,
            videos: [],
            shorts: [],
            createdAt: Date.now(),
            isAdmin: true,
            isVerified: true
        };
        
        // Создаем демо видео для канала UsTube
        const demoVideos = [
            {
                title: "Добро пожаловать на UsTube! 🎬",
                description: "Полное руководство по новой платформе для видео. Все функции и возможности в одном видео!",
                duration: 245,
                category: "Образование",
                tags: "ustube, платформа, видео, гайд, обучение"
            },
            {
                title: "Как монтировать видео прямо в браузере ✂️",
                description: "Встроенный редактор видео с обрезкой, эффектами и текстом. Без установки программ!",
                duration: 542,
                category: "Образование",
                tags: "монтаж, редактор, обучение, видеообработка"
            },
            {
                title: "Топ 10 скрытых фишек UsTube 2024 🔥",
                description: "Самые крутые функции, о которых вы не знали! Секретные комбинации и лайфхаки.",
                duration: 623,
                category: "Развлечения",
                tags: "фишки, возможности, 2024, лайфхаки"
            },
            {
                title: "Как набрать 1000 подписчиков за месяц 📈",
                description: "Рабочая стратегия роста для новых авторов на платформе UsTube.",
                duration: 892,
                category: "Образование",
                tags: "рост, подписчики, продвижение, монетизация"
            },
            {
                title: "Создание идеального YouTube-канала с нуля 🚀",
                description: "От выбора ниши до первой монетизации. Полный план действий.",
                duration: 1120,
                category: "Образование",
                tags: "канал, старт, развитие, youtube"
            }
        ];

        const demoShorts = [
            {
                title: "Минутка UsTube #1 ⚡",
                description: "Самое интересное за неделю! Новости и обновления платформы.",
                duration: 45,
                tags: "новости, обновления, shorts"
            },
            {
                title: "За кадром UsTube 🎥",
                description: "Как создается контент для платформы. Эксклюзивные кадры!",
                duration: 52,
                tags: "закулисье, создание, эксклюзив"
            },
            {
                title: "3 совета для новых авторов 💡",
                description: "Главные советы от создателей платформы для быстрого старта.",
                duration: 38,
                tags: "советы, авторы, старт"
            },
            {
                title: "Лучший момент недели 😂",
                description: "Самые смешные и интересные моменты с платформы UsTube.",
                duration: 29,
                tags: "юмор, моменты, развлечение"
            },
            {
                title: "Новое в редакторе видео ✨",
                description: "Обзор новых функций встроенного редактора видео.",
                duration: 41,
                tags: "редактор, новое, функции"
            }
        ];

        // Добавляем видео
        demoVideos.forEach((videoData, index) => {
            const videoId = generateId();
            database.videos[videoId] = {
                id: videoId,
                title: videoData.title,
                description: videoData.description,
                channelId: adminId,
                channelName: 'UsTube Official',
                views: Math.floor(Math.random() * 50000) + 10000,
                likes: Math.floor(Math.random() * 2000) + 500,
                dislikes: Math.floor(Math.random() * 50),
                comments: Math.floor(Math.random() * 100) + 20,
                duration: videoData.duration,
                category: videoData.category,
                tags: videoData.tags,
                videoUrl: `/uploads/videos/demo${index + 1}.mp4`,
                thumbnailUrl: `/uploads/thumbnails/video${index + 1}.jpg`,
                isPublished: true,
                createdAt: Date.now() - (index * 86400000),
                isShort: false
            };
            database.users[adminId].videos.push(videoId);
        });

        // Добавляем шортсы
        demoShorts.forEach((shortData, index) => {
            const shortId = generateId();
            database.videos[shortId] = {
                id: shortId,
                title: shortData.title,
                description: shortData.description,
                channelId: adminId,
                channelName: 'UsTube Official',
                views: Math.floor(Math.random() * 20000) + 5000,
                likes: Math.floor(Math.random() * 1000) + 200,
                dislikes: Math.floor(Math.random() * 20),
                comments: Math.floor(Math.random() * 50) + 10,
                duration: shortData.duration,
                category: "Shorts",
                tags: shortData.tags,
                videoUrl: `/uploads/videos/short${index + 1}.mp4`,
                thumbnailUrl: `/uploads/thumbnails/short${index + 1}.jpg`,
                isPublished: true,
                createdAt: Date.now() - (index * 3600000),
                isShort: true
            };
            database.users[adminId].shorts.push(shortId);
        });

        saveDatabase();
    }
}

function saveDatabase() {
    fs.writeFileSync(DB_FILE, JSON.stringify(database, null, 2));
}

function generateId() {
    return `id_${database.nextId++}`;
}

function addLog(action, details) {
    database.logs.push({
        id: generateId(),
        action,
        details,
        timestamp: Date.now()
    });
    if (database.logs.length > 1000) {
        database.logs = database.logs.slice(-1000);
    }
    saveDatabase();
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// API Routes

// Регистрация
app.post('/api/register', (req, res) => {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }
    
    // Проверка существующего пользователя
    const existingUser = Object.values(database.users).find(u => u.email === email);
    if (existingUser) {
        return res.status(400).json({ error: 'Пользователь уже существует' });
    }
    
    const userId = generateId();
    database.users[userId] = {
        id: userId,
        username,
        email,
        password: crypto.createHash('sha256').update(password).digest('hex'),
        avatar: '/uploads/avatars/default.png',
        banner: '/uploads/banners/default.jpg',
        bio: '',
        subscribers: 0,
        videos: [],
        shorts: [],
        createdAt: Date.now(),
        isAdmin: false,
        isVerified: false
    };
    
    addLog('REGISTER', { userId, username, email });
    saveDatabase();
    
    res.json({
        success: true,
        user: {
            id: userId,
            username,
            email,
            avatar: '/uploads/avatars/default.png',
            isAdmin: false
        }
    });
});

// Вход
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    const user = Object.values(database.users).find(u => u.email === email);
    if (!user || user.password !== crypto.createHash('sha256').update(password).digest('hex')) {
        return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    
    addLog('LOGIN', { userId: user.id, email });
    
    res.json({
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
    });
});

// Получение видео
app.get('/api/videos', (req, res) => {
    const { limit = 20, category, channelId, sort = 'newest' } = req.query;
    
    let videos = Object.values(database.videos).filter(v => v.isPublished && !v.isShort);
    
    if (category) {
        videos = videos.filter(v => v.category === category);
    }
    
    if (channelId) {
        videos = videos.filter(v => v.channelId === channelId);
    }
    
    // Сортировка
    if (sort === 'popular') {
        videos.sort((a, b) => b.views - a.views);
    } else if (sort === 'trending') {
        videos.sort((a, b) => {
            const aScore = (b.likes * 2 - b.dislikes) + (b.views * 0.1);
            const bScore = (a.likes * 2 - a.dislikes) + (a.views * 0.1);
            return bScore - aScore;
        });
    } else {
        videos.sort((a, b) => b.createdAt - a.createdAt);
    }
    
    // Добавляем информацию о канале
    const videosWithChannel = videos.slice(0, parseInt(limit)).map(video => {
        const channel = database.users[video.channelId];
        return {
            ...video,
            channel: {
                id: channel?.id,
                name: channel?.username,
                avatar: channel?.avatar,
                subscribers: channel?.subscribers || 0,
                isVerified: channel?.isVerified
            }
        };
    });
    
    res.json(videosWithChannel);
});

// Получение шортсов
app.get('/api/shorts', (req, res) => {
    const { limit = 20 } = req.query;
    
    let shorts = Object.values(database.videos).filter(v => v.isPublished && v.isShort);
    shorts.sort((a, b) => b.createdAt - a.createdAt);
    
    const shortsWithChannel = shorts.slice(0, parseInt(limit)).map(short => {
        const channel = database.users[short.channelId];
        return {
            ...short,
            channel: {
                id: channel?.id,
                name: channel?.username,
                avatar: channel?.avatar,
                subscribers: channel?.subscribers || 0,
                isVerified: channel?.isVerified
            }
        };
    });
    
    res.json(shortsWithChannel);
});

// Получение видео по ID
app.get('/api/videos/:id', (req, res) => {
    const videoId = req.params.id;
    const video = database.videos[videoId];
    
    if (!video || !video.isPublished) {
        return res.status(404).json({ error: 'Видео не найдено' });
    }
    
    // Увеличиваем просмотры
    video.views = (video.views || 0) + 1;
    
    // Добавляем в историю просмотров
    if (req.query.userId) {
        const viewId = generateId();
        database.views[viewId] = {
            id: viewId,
            userId: req.query.userId,
            videoId: videoId,
            timestamp: Date.now()
        };
    }
    
    const channel = database.users[video.channelId];
    
    const response = {
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
    };
    
    saveDatabase();
    res.json(response);
});

// Загрузка видео
app.post('/api/upload/video', upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
]), (req, res) => {
    const { title, description, channelId, category, tags, isShort } = req.body;
    
    if (!title || !channelId) {
        return res.status(400).json({ error: 'Заполните обязательные поля' });
    }
    
    const channel = database.users[channelId];
    if (!channel) {
        return res.status(404).json({ error: 'Канал не найден' });
    }
    
    const videoId = generateId();
    const videoData = {
        id: videoId,
        title,
        description: description || '',
        channelId,
        channelName: channel.username,
        views: 0,
        likes: 0,
        dislikes: 0,
        comments: 0,
        duration: 0,
        category: category || 'Разное',
        tags: tags || '',
        videoUrl: req.files['video'] ? `/uploads/videos/${req.files['video'][0].filename}` : '',
        thumbnailUrl: req.files['thumbnail'] ? `/uploads/thumbnails/${req.files['thumbnail'][0].filename}` : '/uploads/thumbnails/default.jpg',
        isPublished: true,
        createdAt: Date.now(),
        isShort: isShort === 'true'
    };
    
    database.videos[videoId] = videoData;
    
    if (videoData.isShort) {
        channel.shorts.push(videoId);
    } else {
        channel.videos.push(videoId);
    }
    
    addLog('VIDEO_UPLOAD', { videoId, title, channelId });
    saveDatabase();
    
    res.json({
        success: true,
        videoId,
        message: 'Видео успешно загружено'
    });
});

// Получение комментариев
app.get('/api/videos/:id/comments', (req, res) => {
    const videoId = req.params.id;
    
    const videoComments = Object.values(database.comments)
        .filter(c => c.videoId === videoId)
        .sort((a, b) => b.createdAt - a.createdAt);
    
    // Добавляем информацию о пользователях
    const commentsWithUsers = videoComments.map(comment => {
        const user = database.users[comment.userId];
        return {
            ...comment,
            user: {
                id: user?.id,
                username: user?.username,
                avatar: user?.avatar
            }
        };
    });
    
    res.json(commentsWithUsers);
});

// Добавление комментария
app.post('/api/comments', (req, res) => {
    const { videoId, userId, text } = req.body;
    
    if (!videoId || !userId || !text) {
        return res.status(400).json({ error: 'Заполните все поля' });
    }
    
    const video = database.videos[videoId];
    const user = database.users[userId];
    
    if (!video || !user) {
        return res.status(404).json({ error: 'Видео или пользователь не найдены' });
    }
    
    const commentId = generateId();
    database.comments[commentId] = {
        id: commentId,
        videoId,
        userId,
        text,
        likes: 0,
        createdAt: Date.now()
    };
    
    video.comments = (video.comments || 0) + 1;
    
    addLog('COMMENT_ADD', { commentId, videoId, userId });
    saveDatabase();
    
    res.json({
        success: true,
        comment: {
            id: commentId,
            text,
            createdAt: Date.now(),
            user: {
                id: user.id,
                username: user.username,
                avatar: user.avatar
            }
        }
    });
});

// Лайк видео
app.post('/api/like', (req, res) => {
    const { videoId, userId, type } = req.body; // type: 1 - like, -1 - dislike
    
    const video = database.videos[videoId];
    const user = database.users[userId];
    
    if (!video || !user) {
        return res.status(404).json({ error: 'Видео или пользователь не найдены' });
    }
    
    const likeKey = `${userId}_${videoId}`;
    
    // Проверяем предыдущую реакцию
    if (database.likes[likeKey]) {
        const prevType = database.likes[likeKey].type;
        // Убираем предыдущую реакцию
        if (prevType === 1) video.likes--;
        if (prevType === -1) video.dislikes--;
        
        // Если новая реакция такая же, то удаляем
        if (prevType === type) {
            delete database.likes[likeKey];
        } else {
            // Меняем реакцию
            database.likes[likeKey].type = type;
            database.likes[likeKey].timestamp = Date.now();
            if (type === 1) video.likes++;
            if (type === -1) video.dislikes++;
        }
    } else {
        // Новая реакция
        database.likes[likeKey] = {
            userId,
            videoId,
            type,
            timestamp: Date.now()
        };
        if (type === 1) video.likes++;
        if (type === -1) video.dislikes++;
    }
    
    saveDatabase();
    res.json({ success: true });
});

// Подписка
app.post('/api/subscribe', (req, res) => {
    const { subscriberId, channelId } = req.body;
    
    const subscriber = database.users[subscriberId];
    const channel = database.users[channelId];
    
    if (!subscriber || !channel) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const subKey = `${subscriberId}_${channelId}`;
    
    if (database.subscriptions[subKey]) {
        // Отписка
        delete database.subscriptions[subKey];
        channel.subscribers = Math.max(0, channel.subscribers - 1);
    } else {
        // Подписка
        database.subscriptions[subKey] = {
            subscriberId,
            channelId,
            timestamp: Date.now()
        };
        channel.subscribers = (channel.subscribers || 0) + 1;
    }
    
    addLog('SUBSCRIBE', { subscriberId, channelId, action: database.subscriptions[subKey] ? 'subscribe' : 'unsubscribe' });
    saveDatabase();
    
    res.json({ 
        success: true,
        subscribed: !!database.subscriptions[subKey],
        subscribers: channel.subscribers
    });
});

// Проверка подписки
app.get('/api/subscribe/check', (req, res) => {
    const { subscriberId, channelId } = req.query;
    
    const subscribed = !!database.subscriptions[`${subscriberId}_${channelId}`];
    res.json({ subscribed });
});

// Поиск
app.get('/api/search', (req, res) => {
    const { q, type = 'video' } = req.query;
    
    if (!q) {
        return res.status(400).json({ error: 'Введите поисковый запрос' });
    }
    
    const searchTerm = q.toLowerCase();
    
    if (type === 'video') {
        const videos = Object.values(database.videos).filter(video => 
            video.isPublished && (
                video.title.toLowerCase().includes(searchTerm) ||
                video.description.toLowerCase().includes(searchTerm) ||
                video.tags.toLowerCase().includes(searchTerm)
            )
        );
        
        const videosWithChannel = videos.map(video => {
            const channel = database.users[video.channelId];
            return {
                ...video,
                channel: {
                    id: channel?.id,
                    name: channel?.username,
                    avatar: channel?.avatar,
                    subscribers: channel?.subscribers || 0
                }
            };
        });
        
        res.json(videosWithChannel);
    } else if (type === 'channel') {
        const channels = Object.values(database.users).filter(user =>
            user.username.toLowerCase().includes(searchTerm) ||
            user.bio.toLowerCase().includes(searchTerm)
        );
        
        res.json(channels.map(channel => ({
            id: channel.id,
            username: channel.username,
            avatar: channel.avatar,
            banner: channel.banner,
            bio: channel.bio,
            subscribers: channel.subscribers,
            isVerified: channel.isVerified
        })));
    }
});

// Получение канала
app.get('/api/channel/:id', (req, res) => {
    const channelId = req.params.id;
    const channel = database.users[channelId];
    
    if (!channel) {
        return res.status(404).json({ error: 'Канал не найден' });
    }
    
    // Получаем видео канала
    const videos = Object.values(database.videos)
        .filter(v => v.channelId === channelId && !v.isShort)
        .sort((a, b) => b.createdAt - a.createdAt);
    
    // Получаем шортсы канала
    const shorts = Object.values(database.videos)
        .filter(v => v.channelId === channelId && v.isShort)
        .sort((a, b) => b.createdAt - a.createdAt);
    
    // Проверяем подписку текущего пользователя
    let isSubscribed = false;
    if (req.query.currentUserId) {
        isSubscribed = !!database.subscriptions[`${req.query.currentUserId}_${channelId}`];
    }
    
    res.json({
        ...channel,
        videos,
        shorts,
        isSubscribed
    });
});

// Обновление канала
app.post('/api/channel/update', upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'banner', maxCount: 1 }
]), (req, res) => {
    const { userId, username, bio } = req.body;
    
    const user = database.users[userId];
    if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    // Обновляем данные
    if (username) user.username = username;
    if (bio) user.bio = bio;
    if (req.files['avatar']) {
        user.avatar = `/uploads/avatars/${req.files['avatar'][0].filename}`;
    }
    if (req.files['banner']) {
        user.banner = `/uploads/banners/${req.files['banner'][0].filename}`;
    }
    
    // Обновляем имя канала во всех видео
    Object.values(database.videos).forEach(video => {
        if (video.channelId === userId) {
            video.channelName = username || user.username;
        }
    });
    
    addLog('CHANNEL_UPDATE', { userId, changes: req.body });
    saveDatabase();
    
    res.json({
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
    });
});

// Админ API

// Проверка админ доступа
app.get('/api/admin/check/:password', (req, res) => {
    if (req.params.password === ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(403).json({ error: 'Неверный пароль администратора' });
    }
});

// Статистика
app.get('/api/admin/stats', (req, res) => {
    const users = Object.values(database.users);
    const videos = Object.values(database.videos);
    
    const stats = {
        totalUsers: users.length,
        totalVideos: videos.length,
        totalViews: videos.reduce((sum, v) => sum + (v.views || 0), 0),
        totalComments: Object.keys(database.comments).length,
        totalSubscriptions: Object.keys(database.subscriptions).length,
        recentVideos: videos
            .filter(v => v.isPublished)
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 10),
        recentUsers: users
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 10),
        topVideos: videos
            .filter(v => v.isPublished)
            .sort((a, b) => b.views - a.views)
            .slice(0, 10),
        topChannels: users
            .sort((a, b) => b.subscribers - a.subscribers)
            .slice(0, 10)
            .map(user => ({
                id: user.id,
                username: user.username,
                subscribers: user.subscribers,
                videos: user.videos.length + user.shorts.length
            }))
    };
    
    res.json(stats);
});

// Логи
app.get('/api/admin/logs', (req, res) => {
    res.json(database.logs.slice(-100).reverse());
});

// Все пользователи
app.get('/api/admin/users', (req, res) => {
    const users = Object.values(database.users);
    res.json(users);
});

// Все видео
app.get('/api/admin/videos', (req, res) => {
    const videos = Object.values(database.videos);
    res.json(videos);
});

// Удаление видео
app.post('/api/admin/videos/delete', (req, res) => {
    const { videoId } = req.body;
    
    const video = database.videos[videoId];
    if (!video) {
        return res.status(404).json({ error: 'Видео не найдено' });
    }
    
    // Удаляем из канала
    const channel = database.users[video.channelId];
    if (channel) {
        if (video.isShort) {
            channel.shorts = channel.shorts.filter(id => id !== videoId);
        } else {
            channel.videos = channel.videos.filter(id => id !== videoId);
        }
    }
    
    // Удаляем комментарии
    Object.keys(database.comments).forEach(commentId => {
        if (database.comments[commentId].videoId === videoId) {
            delete database.comments[commentId];
        }
    });
    
    // Удаляем лайки
    Object.keys(database.likes).forEach(likeKey => {
        if (database.likes[likeKey].videoId === videoId) {
            delete database.likes[likeKey];
        }
    });
    
    // Удаляем видео
    delete database.videos[videoId];
    
    addLog('VIDEO_DELETE', { videoId, title: video.title });
    saveDatabase();
    
    res.json({ success: true });
});

// Удаление пользователя
app.post('/api/admin/users/delete', (req, res) => {
    const { userId } = req.body;
    
    const user = database.users[userId];
    if (!user || user.isAdmin) {
        return res.status(400).json({ error: 'Нельзя удалить этого пользователя' });
    }
    
    // Удаляем видео пользователя
    [...user.videos, ...user.shorts].forEach(videoId => {
        delete database.videos[videoId];
    });
    
    // Удаляем комментарии пользователя
    Object.keys(database.comments).forEach(commentId => {
        if (database.comments[commentId].userId === userId) {
            delete database.comments[commentId];
        }
    });
    
    // Удаляем подписки пользователя
    Object.keys(database.subscriptions).forEach(subKey => {
        const sub = database.subscriptions[subKey];
        if (sub.subscriberId === userId || sub.channelId === userId) {
            delete database.subscriptions[subKey];
        }
    });
    
    // Удаляем пользователя
    delete database.users[userId];
    
    addLog('USER_DELETE', { userId, username: user.username });
    saveDatabase();
    
    res.json({ success: true });
});

// Загрузка от имени UsTube
app.post('/api/admin/upload/ustube', upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
]), (req, res) => {
    const { title, description, category, tags, isShort } = req.body;
    
    // Находим канал UsTube
    const ustubeChannel = Object.values(database.users).find(u => u.isAdmin);
    if (!ustubeChannel) {
        return res.status(404).json({ error: 'Канал UsTube не найден' });
    }
    
    const videoId = generateId();
    const videoData = {
        id: videoId,
        title,
        description: description || '',
        channelId: ustubeChannel.id,
        channelName: 'UsTube Official',
        views: 0,
        likes: 0,
        dislikes: 0,
        comments: 0,
        duration: 0,
        category: category || 'Разное',
        tags: tags || '',
        videoUrl: req.files['video'] ? `/uploads/videos/${req.files['video'][0].filename}` : '',
        thumbnailUrl: req.files['thumbnail'] ? `/uploads/thumbnails/${req.files['thumbnail'][0].filename}` : '/uploads/thumbnails/default.jpg',
        isPublished: true,
        createdAt: Date.now(),
        isShort: isShort === 'true'
    };
    
    database.videos[videoId] = videoData;
    
    if (videoData.isShort) {
        ustubeChannel.shorts.push(videoId);
    } else {
        ustubeChannel.videos.push(videoId);
    }
    
    addLog('USTUBE_VIDEO_UPLOAD', { videoId, title, isShort });
    saveDatabase();
    
    res.json({
        success: true,
        videoId,
        message: 'Видео опубликовано от имени UsTube Official'
    });
});

// Рекомендации
app.get('/api/recommendations', (req, res) => {
    const { userId } = req.query;
    
    let videos = Object.values(database.videos).filter(v => v.isPublished && !v.isShort);
    
    if (userId) {
        // Персонализированные рекомендации
        const user = database.users[userId];
        if (user) {
            // Видео с каналов, на которые подписан пользователь
            const subscribedChannels = Object.keys(database.subscriptions)
                .filter(key => key.startsWith(`${userId}_`))
                .map(key => key.split('_')[1]);
            
            const subscribedVideos = videos.filter(v => subscribedChannels.includes(v.channelId));
            
            // Популярные видео
            const popularVideos = videos
                .filter(v => !subscribedChannels.includes(v.channelId))
                .sort((a, b) => b.views - a.views)
                .slice(0, 10);
            
            // Смешиваем
            videos = [...subscribedVideos, ...popularVideos];
        }
    }
    
    // Сортируем по дате и берем 20
    videos.sort((a, b) => b.createdAt - a.createdAt);
    videos = videos.slice(0, 20);
    
    const videosWithChannel = videos.map(video => {
        const channel = database.users[video.channelId];
        return {
            ...video,
            channel: {
                id: channel?.id,
                name: channel?.username,
                avatar: channel?.avatar,
                subscribers: channel?.subscribers || 0,
                isVerified: channel?.isVerified
            }
        };
    });
    
    res.json(videosWithChannel);
});

// Статические файлы
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
loadDatabase();
app.listen(PORT, () => {
    console.log(`🚀 UsTube Server запущен на порту ${PORT}`);
    console.log(`🌐 Откройте: http://localhost:${PORT}`);
    console.log(`👑 Админ доступ: admin@ustube.com / admin123`);
    console.log(`🔧 Админ панель: http://localhost:${PORT}/admin.html?password=${ADMIN_PASSWORD}`);
    console.log(`📊 Реальные данные хранятся в database.json`);
});
