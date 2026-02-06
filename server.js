const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

// Создаем директории
const UPLOADS_DIR = './uploads';
const AVATARS_DIR = path.join(UPLOADS_DIR, 'avatars');
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, 'thumbnails');
const VIDEOS_DIR = path.join(UPLOADS_DIR, 'videos');

[UPLOADS_DIR, AVATARS_DIR, THUMBNAILS_DIR, VIDEOS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// База данных
const DB_FILE = './ustube.db.json';

let database = {
    users: {},
    videos: {},
    comments: {},
    subscriptions: {},
    likes: {},
    views: {},
    watchHistory: {},
    playlists: {},
    notifications: {}
};

// Загрузка базы данных
if (fs.existsSync(DB_FILE)) {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        database = JSON.parse(data);
    } catch (e) {
        console.log('Создана новая база данных');
    }
}

// Сохранение базы данных
function saveDatabase() {
    fs.writeFileSync(DB_FILE, JSON.stringify(database, null, 2));
}

// Инициализация начальных данных
function initDatabase() {
    // Администратор UsTube
    const adminId = 'admin_001';
    if (!database.users[adminId]) {
        database.users[adminId] = {
            id: adminId,
            username: 'UsTube',
            email: 'admin@ustube.com',
            password: crypto.createHash('sha256').update('admin123').digest('hex'),
            avatar: '/uploads/avatars/ustube.jpg',
            banner: '/uploads/banners/ustube_banner.jpg',
            channelName: 'UsTube Official',
            description: 'Официальный канал платформы UsTube. Здесь вы найдете лучшие видео, руководства и новости о платформе.',
            subscribers: 1250000,
            totalViews: 45000000,
            videos: [],
            shorts: [],
            createdAt: Date.now(),
            isAdmin: true,
            isVerified: true
        };
    }

    // Популярные каналы с YouTube
    const popularChannels = [
        {
            id: 'a4_001',
            username: 'A4',
            email: 'a4@example.com',
            password: crypto.createHash('sha256').update('a4password').digest('hex'),
            avatar: '/uploads/avatars/a4.jpg',
            banner: '/uploads/banners/a4_banner.jpg',
            channelName: 'A4',
            description: 'Лучшие обзоры игр, приколы и развлекательный контент. Подписывайся!',
            subscribers: 3200000,
            totalViews: 850000000,
            videos: [],
            shorts: [],
            createdAt: Date.now() - 86400000 * 365 * 3,
            isVerified: true
        },
        {
            id: 'glent_001',
            username: 'Глент',
            email: 'glent@example.com',
            password: crypto.createHash('sha256').update('glentpassword').digest('hex'),
            avatar: '/uploads/avatars/glent.jpg',
            banner: '/uploads/banners/glent_banner.jpg',
            channelName: 'Глент',
            description: 'Комедийные скетчи, пародии и развлекательный контент',
            subscribers: 2800000,
            totalViews: 720000000,
            videos: [],
            shorts: [],
            createdAt: Date.now() - 86400000 * 365 * 2,
            isVerified: true
        },
        {
            id: 'damer_001',
            username: 'Домер',
            email: 'damer@example.com',
            password: crypto.createHash('sha256').update('damerpassword').digest('hex'),
            avatar: '/uploads/avatars/damer.jpg',
            banner: '/uploads/banners/damer_banner.jpg',
            channelName: 'Домер',
            description: 'Игровые стримы, летсплеи и обзоры',
            subscribers: 1900000,
            totalViews: 540000000,
            videos: [],
            shorts: [],
            createdAt: Date.now() - 86400000 * 365 * 4,
            isVerified: true
        },
        {
            id: 'zeni_001',
            username: 'Зени',
            email: 'zeni@example.com',
            password: crypto.createHash('sha256').update('zenipassword').digest('hex'),
            avatar: '/uploads/avatars/zeni.jpg',
            banner: '/uploads/banners/zeni_banner.jpg',
            channelName: 'Зени',
            description: 'Музыкальные каверы, аранжировки и концерты',
            subscribers: 1500000,
            totalViews: 420000000,
            videos: [],
            shorts: [],
            createdAt: Date.now() - 86400000 * 365 * 1.5,
            isVerified: true
        },
        {
            id: 'beff_001',
            username: 'Бефф',
            email: 'beff@example.com',
            password: crypto.createHash('sha256').update('beffpassword').digest('hex'),
            avatar: '/uploads/avatars/beff.jpg',
            banner: '/uploads/banners/beff_banner.jpg',
            channelName: 'Бефф',
            description: 'Кулинарные рецепты, гастрономические путешествия',
            subscribers: 2100000,
            totalViews: 680000000,
            videos: [],
            shorts: [],
            createdAt: Date.now() - 86400000 * 365 * 2.5,
            isVerified: true
        },
        {
            id: 'tumka_001',
            username: 'Тумка',
            email: 'tumka@example.com',
            password: crypto.createHash('sha256').update('tumpassword').digest('hex'),
            avatar: '/uploads/avatars/tumka.jpg',
            banner: '/uploads/banners/tumka_banner.jpg',
            channelName: 'Тумка',
            description: 'Обзоры технологий, гаджетов и лайфхаки',
            subscribers: 1800000,
            totalViews: 510000000,
            videos: [],
            shorts: [],
            createdAt: Date.now() - 86400000 * 365 * 3,
            isVerified: true
        },
        {
            id: 'mark_001',
            username: 'MarkRober',
            email: 'mark@example.com',
            password: crypto.createHash('sha256').update('markpassword').digest('hex'),
            avatar: '/uploads/avatars/mark.jpg',
            banner: '/uploads/banners/mark_banner.jpg',
            channelName: 'Марк Робер',
            description: 'Научные эксперименты, изобретения и образовательный контент',
            subscribers: 4500000,
            totalViews: 1200000000,
            videos: [],
            shorts: [],
            createdAt: Date.now() - 86400000 * 365 * 5,
            isVerified: true
        },
        {
            id: 'mister_001',
            username: 'MrBeast',
            email: 'mrbeast@example.com',
            password: crypto.createHash('sha256').update('mrbeastpass').digest('hex'),
            avatar: '/uploads/avatars/mrbeast.jpg',
            banner: '/uploads/banners/mrbeast_banner.jpg',
            channelName: 'Мистер Бист',
            description: 'Благотворительность, челленджи и масштабные проекты',
            subscribers: 9000000,
            totalViews: 2500000000,
            videos: [],
            shorts: [],
            createdAt: Date.now() - 86400000 * 365 * 6,
            isVerified: true
        }
    ];

    // Добавляем каналы в базу
    popularChannels.forEach(channel => {
        if (!database.users[channel.id]) {
            database.users[channel.id] = channel;
        }
    });

    // Видео для каждого канала
    const allVideos = [
        // Видео от UsTube
        {
            id: 'ustube_001',
            userId: 'admin_001',
            title: 'Добро пожаловать на UsTube! Полный обзор платформы',
            description: 'Узнайте все возможности новой платформы для видео. Как загружать видео, монтировать, зарабатывать и многое другое!',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            thumbnailUrl: 'https://i.ytimg.com/vi/3JZ_D3ELwOQ/maxresdefault.jpg',
            duration: 654,
            views: 1500000,
            likes: 125000,
            dislikes: 2500,
            commentsCount: 12500,
            category: 'Образование',
            tags: 'ustube, обзор, платформа, видео',
            isShort: false,
            isLive: false,
            createdAt: Date.now() - 86400000 * 30
        },
        {
            id: 'ustube_002',
            userId: 'admin_001',
            title: 'Как монтировать видео в UsTube - полное руководство',
            description: 'Пошаговое руководство по монтажу видео прямо в браузере. Все инструменты для создания профессионального контента.',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            thumbnailUrl: 'https://i.ytimg.com/vi/LXb3EKWsInQ/maxresdefault.jpg',
            duration: 432,
            views: 850000,
            likes: 78000,
            dislikes: 1500,
            commentsCount: 8900,
            category: 'Образование',
            tags: 'монтаж, руководство, обучение, видео',
            isShort: false,
            isLive: false,
            createdAt: Date.now() - 86400000 * 15
        },
        {
            id: 'ustube_003',
            userId: 'admin_001',
            title: 'Новые функции 2024 - ИИ редактор, шортсы и многое другое',
            description: 'Обзор всех новых функций платформы UsTube. ИИ-помощник для монтажа, улучшенные шортсы и новые инструменты для авторов.',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
            duration: 521,
            views: 1200000,
            likes: 110000,
            dislikes: 3200,
            commentsCount: 15200,
            category: 'Новости',
            tags: 'новости, функции, 2024, обновление',
            isShort: false,
            isLive: false,
            createdAt: Date.now() - 86400000 * 7
        },

        // Видео от A4
        {
            id: 'a4_001',
            userId: 'a4_001',
            title: 'ИГРА КОТОРАЯ УБИЛА МОЙ ПК',
            description: 'Тестируем новую игру на максималках! Что произошло с компьютером? Смотри до конца!',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
            thumbnailUrl: 'https://i.ytimg.com/vi/5qap5aO4i9A/maxresdefault.jpg',
            duration: 1245,
            views: 8500000,
            likes: 750000,
            dislikes: 12000,
            commentsCount: 45000,
            category: 'Игры',
            tags: 'игры, пк, тест, обзор',
            isShort: false,
            isLive: false,
            createdAt: Date.now() - 86400000 * 45
        },

        // Видео от Глент
        {
            id: 'glent_001',
            userId: 'glent_001',
            title: 'ПРАНК НАД ДРУГОМ - ОН НЕ ВЫДЕРЖАЛ!',
            description: 'Лучший пранк за всю историю канала! Смотрите реакцию друга.',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
            thumbnailUrl: 'https://i.ytimg.com/vi/jNQXAC9IVRw/maxresdefault.jpg',
            duration: 856,
            views: 7200000,
            likes: 680000,
            dislikes: 8500,
            commentsCount: 38000,
            category: 'Развлечения',
            tags: 'пранк, прикол, развлечение',
            isShort: false,
            isLive: false,
            createdAt: Date.now() - 86400000 * 60
        },

        // Видео от Домер
        {
            id: 'damer_001',
            userId: 'damer_001',
            title: 'МИНЕКРАФТ ВЫЖИВАНИЕ С НУЛЯ - 24 ЧАСА МАРАФОН',
            description: 'Выживаем в Майнкрафте 24 часа подряд! Что получилось?',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
            thumbnailUrl: 'https://i.ytimg.com/vi/M7lc1UVf-VE/maxresdefault.jpg',
            duration: 86400,
            views: 5400000,
            likes: 520000,
            dislikes: 7500,
            commentsCount: 32000,
            category: 'Игры',
            tags: 'майнкрафт, выживание, стрим',
            isShort: false,
            isLive: true,
            createdAt: Date.now() - 86400000 * 90
        },

        // Видео от Зени
        {
            id: 'zeni_001',
            userId: 'zeni_001',
            title: 'НОВЫЙ КАВЕР НА ПОПУЛЯРНУЮ ПЕСНЮ',
            description: 'Представляю вам свой кавер на песню, которая взорвала интернет!',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
            thumbnailUrl: 'https://i.ytimg.com/vi/9bZkp7q19f0/maxresdefault.jpg',
            duration: 245,
            views: 4200000,
            likes: 410000,
            dislikes: 4500,
            commentsCount: 28000,
            category: 'Музыка',
            tags: 'музыка, кавер, песня',
            isShort: false,
            isLive: false,
            createdAt: Date.now() - 86400000 * 25
        },

        // Видео от Бефф
        {
            id: 'beff_001',
            userId: 'beff_001',
            title: 'КАК ПРИГОТОВИТЬ ИДЕАЛЬНЫЙ СТЕЙК',
            description: 'Секреты приготовления идеального стейка от шеф-повара.',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
            thumbnailUrl: 'https://i.ytimg.com/vi/CevxZvSJLk8/maxresdefault.jpg',
            duration: 654,
            views: 6800000,
            likes: 650000,
            dislikes: 6500,
            commentsCount: 42000,
            category: 'Еда',
            tags: 'рецепт, стейк, готовка',
            isShort: false,
            isLive: false,
            createdAt: Date.now() - 86400000 * 40
        },

        // Видео от Тумка
        {
            id: 'tumka_001',
            userId: 'tumka_001',
            title: 'ОБЗОР НОВОГО IPHONE - СТОИТ ЛИ ПОКУПАТЬ?',
            description: 'Полный обзор нового смартфона, все плюсы и минусы.',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
            thumbnailUrl: 'https://i.ytimg.com/vi/XNWhE7buN9Q/maxresdefault.jpg',
            duration: 987,
            views: 5100000,
            likes: 490000,
            dislikes: 9200,
            commentsCount: 35000,
            category: 'Технологии',
            tags: 'обзор, iphone, технологии',
            isShort: false,
            isLive: false,
            createdAt: Date.now() - 86400000 * 20
        },

        // Видео от Марка Робера
        {
            id: 'mark_001',
            userId: 'mark_001',
            title: 'САМЫЙ БОЛЬШОЙ СЛАЙМ В МИРЕ',
            description: 'Научный эксперимент по созданию самого большого слайма.',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
            thumbnailUrl: 'https://i.ytimg.com/vi/3JZ_D3ELwOQ/maxresdefault.jpg',
            duration: 1345,
            views: 12000000,
            likes: 1150000,
            dislikes: 15000,
            commentsCount: 85000,
            category: 'Наука',
            tags: 'наука, эксперимент, слайм',
            isShort: false,
            isLive: false,
            createdAt: Date.now() - 86400000 * 100
        },

        // Видео от Мистера Биста
        {
            id: 'mister_001',
            userId: 'mister_001',
            title: 'РАЗДАЛ $100,000 НЕЗНАКОМЦАМ',
            description: 'Очередная масштабная раздача денег незнакомым людям.',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
            thumbnailUrl: 'https://i.ytimg.com/vi/0KSOMA3QBU0/maxresdefault.jpg',
            duration: 1567,
            views: 25000000,
            likes: 2400000,
            dislikes: 25000,
            commentsCount: 185000,
            category: 'Развлечения',
            tags: 'раздача, деньги, благотворительность',
            isShort: false,
            isLive: false,
            createdAt: Date.now() - 86400000 * 120
        }
    ];

    // Шортсы (короткие видео)
    const shorts = [
        {
            id: 'short_001',
            userId: 'admin_001',
            title: 'Новый ИИ-редактор в UsTube!',
            description: 'Попробуйте новый ИИ-редактор для создания видео',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            thumbnailUrl: 'https://i.ytimg.com/vi/_It7sxKX0hs/maxresdefault.jpg',
            duration: 45,
            views: 1500000,
            likes: 125000,
            dislikes: 2500,
            commentsCount: 12500,
            category: 'Образование',
            tags: 'ustube, шортс, ии',
            isShort: true,
            isLive: false,
            createdAt: Date.now() - 86400000 * 5
        },
        {
            id: 'short_002',
            userId: 'a4_001',
            title: 'Прикол в игре 😂',
            description: '',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
            thumbnailUrl: 'https://i.ytimg.com/vi/5qap5aO4i9A/maxresdefault.jpg',
            duration: 32,
            views: 2500000,
            likes: 220000,
            dislikes: 3500,
            commentsCount: 18000,
            category: 'Игры',
            tags: 'прикол, игра',
            isShort: true,
            isLive: false,
            createdAt: Date.now() - 86400000 * 3
        },
        {
            id: 'short_003',
            userId: 'glent_001',
            title: 'Реакция на пранк 😲',
            description: '',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
            thumbnailUrl: 'https://i.ytimg.com/vi/jNQXAC9IVRw/maxresdefault.jpg',
            duration: 28,
            views: 1800000,
            likes: 170000,
            dislikes: 2800,
            commentsCount: 12500,
            category: 'Развлечения',
            tags: 'пранк, реакция',
            isShort: true,
            isLive: false,
            createdAt: Date.now() - 86400000 * 7
        }
    ];

    // Добавляем все видео в базу
    [...allVideos, ...shorts].forEach(video => {
        if (!database.videos[video.id]) {
            database.videos[video.id] = video;
            
            // Добавляем видео в список пользователя
            if (database.users[video.userId]) {
                if (video.isShort) {
                    database.users[video.userId].shorts.push(video.id);
                } else {
                    database.users[video.userId].videos.push(video.id);
                }
            }
        }
    });

    // Комментарии для видео
    const comments = [
        {
            id: 'comment_001',
            videoId: 'ustube_001',
            userId: 'a4_001',
            text: 'Отличная платформа! Уже загрузил свое первое видео!',
            likes: 1250,
            timestamp: Date.now() - 86400000 * 29
        },
        {
            id: 'comment_002',
            videoId: 'ustube_001',
            userId: 'glent_001',
            text: 'Мне нравится интерфейс, очень удобно монтировать!',
            likes: 890,
            timestamp: Date.now() - 86400000 * 28
        },
        {
            id: 'comment_003',
            videoId: 'ustube_002',
            userId: 'damer_001',
            text: 'Руководство очень помогло, спасибо!',
            likes: 560,
            timestamp: Date.now() - 86400000 * 14
        },
        {
            id: 'comment_004',
            videoId: 'a4_001',
            userId: 'admin_001',
            text: 'Крутое видео! Ждем новых обзоров!',
            likes: 12500,
            timestamp: Date.now() - 86400000 * 44
        },
        {
            id: 'comment_005',
            videoId: 'glent_001',
            userId: 'zeni_001',
            text: 'Это самый смешной пранк! 😂',
            likes: 8900,
            timestamp: Date.now() - 86400000 * 59
        },
        {
            id: 'comment_006',
            videoId: 'mister_001',
            userId: 'admin_001',
            text: 'Невероятная благотворительность! Вы вдохновляете!',
            likes: 25000,
            timestamp: Date.now() - 86400000 * 119
        },
        {
            id: 'comment_007',
            videoId: 'mark_001',
            userId: 'beff_001',
            text: 'Научный контент высшего уровня!',
            likes: 18000,
            timestamp: Date.now() - 86400000 * 99
        },
        {
            id: 'comment_008',
            videoId: 'tumka_001',
            userId: 'glent_001',
            text: 'Обзор очень подробный, помог с выбором!',
            likes: 6500,
            timestamp: Date.now() - 86400000 * 19
        },
        {
            id: 'comment_009',
            videoId: 'beff_001',
            userId: 'admin_001',
            text: 'Теперь понял как готовить идеальный стейк!',
            likes: 7200,
            timestamp: Date.now() - 86400000 * 39
        },
        {
            id: 'comment_010',
            videoId: 'zeni_001',
            userId: 'a4_001',
            text: 'Кавер просто огонь! 🔥',
            likes: 4200,
            timestamp: Date.now() - 86400000 * 24
        }
    ];

    // Добавляем комментарии
    comments.forEach(comment => {
        if (!database.comments[comment.id]) {
            database.comments[comment.id] = comment;
        }
    });

    saveDatabase();
    console.log('База данных инициализирована с реальными данными!');
}

// Инициализация базы
initDatabase();

// Вспомогательные функции
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                reject(e);
            }
        });
        req.on('error', reject);
    });
}

function parseFormData(req, boundary) {
    return new Promise((resolve, reject) => {
        let chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
            try {
                const buffer = Buffer.concat(chunks);
                const parts = buffer.toString('binary').split(boundary);
                const result = {};
                
                parts.forEach(part => {
                    if (part.includes('Content-Disposition')) {
                        const nameMatch = part.match(/name="([^"]+)"/);
                        const filenameMatch = part.match(/filename="([^"]+)"/);
                        
                        if (nameMatch) {
                            const name = nameMatch[1];
                            const valueStart = part.indexOf('\r\n\r\n') + 4;
                            const valueEnd = part.lastIndexOf('\r\n');
                            const value = part.substring(valueStart, valueEnd);
                            
                            if (filenameMatch) {
                                // Это файл
                                const filename = filenameMatch[1];
                                const fileContent = part.substring(valueStart, valueEnd);
                                result[name] = {
                                    filename,
                                    content: Buffer.from(fileContent, 'binary')
                                };
                            } else {
                                // Это текст
                                result[name] = value;
                            }
                        }
                    }
                });
                
                resolve(result);
            } catch (e) {
                reject(e);
            }
        });
        req.on('error', reject);
    });
}

function sendJSON(res, data, statusCode = 200) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(data));
}

function sendError(res, message, statusCode = 400) {
    sendJSON(res, { error: message }, statusCode);
}

function generateToken(userId) {
    return crypto.randomBytes(32).toString('hex');
}

// Создаем HTTP сервер
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
    if (req.method === 'GET' && pathname.startsWith('/uploads/')) {
        const filePath = '.' + pathname;
        if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath);
            const mimeTypes = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.mp4': 'video/mp4',
                '.webm': 'video/webm',
                '.json': 'application/json',
                '.js': 'text/javascript',
                '.css': 'text/css',
                '.html': 'text/html'
            };
            
            fs.readFile(filePath, (err, content) => {
                if (err) {
                    res.writeHead(404);
                    res.end('File not found');
                } else {
                    res.writeHead(200, {
                        'Content-Type': mimeTypes[ext] || 'application/octet-stream'
                    });
                    res.end(content);
                }
            });
            return;
        }
    }
    
    // API маршруты
    if (pathname === '/api/register' && req.method === 'POST') {
        try {
            const body = await parseBody(req);
            const { username, email, password, channelName } = body;
            
            if (!username || !email || !password) {
                return sendError(res, 'Все поля обязательны');
            }
            
            // Проверяем, существует ли пользователь
            const existingUser = Object.values(database.users).find(
                u => u.email === email || u.username === username
            );
            
            if (existingUser) {
                return sendError(res, 'Пользователь с таким email или именем уже существует');
            }
            
            const userId = 'user_' + Date.now();
            const user = {
                id: userId,
                username,
                email,
                password: crypto.createHash('sha256').update(password).digest('hex'),
                avatar: '/uploads/avatars/default.jpg',
                banner: '/uploads/banners/default.jpg',
                channelName: channelName || username,
                description: 'Новый пользователь UsTube',
                subscribers: 0,
                totalViews: 0,
                videos: [],
                shorts: [],
                createdAt: Date.now(),
                isAdmin: false,
                isVerified: false
            };
            
            database.users[userId] = user;
            saveDatabase();
            
            const token = generateToken(userId);
            sendJSON(res, {
                success: true,
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    channelName: user.channelName,
                    avatar: user.avatar,
                    subscribers: user.subscribers,
                    isAdmin: user.isAdmin,
                    isVerified: user.isVerified
                }
            });
        } catch (error) {
            sendError(res, 'Ошибка сервера: ' + error.message, 500);
        }
        return;
    }
    
    if (pathname === '/api/login' && req.method === 'POST') {
        try {
            const body = await parseBody(req);
            const { email, password } = body;
            
            const user = Object.values(database.users).find(u => u.email === email);
            if (!user || user.password !== crypto.createHash('sha256').update(password).digest('hex')) {
                return sendError(res, 'Неверный email или пароль');
            }
            
            const token = generateToken(user.id);
            sendJSON(res, {
                success: true,
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    channelName: user.channelName,
                    avatar: user.avatar,
                    subscribers: user.subscribers,
                    isAdmin: user.isAdmin,
                    isVerified: user.isVerified
                }
            });
        } catch (error) {
            sendError(res, 'Ошибка сервера', 500);
        }
        return;
    }
    
    if (pathname === '/api/videos' && req.method === 'GET') {
        const query = parsedUrl.query;
        const limit = parseInt(query.limit) || 50;
        const page = parseInt(query.page) || 1;
        const category = query.category;
        const isShort = query.isShort === 'true';
        
        let videos = Object.values(database.videos)
            .filter(v => v.isShort === isShort)
            .sort((a, b) => b.createdAt - a.createdAt);
        
        if (category) {
            videos = videos.filter(v => v.category === category);
        }
        
        // Добавляем информацию о канале
        const videosWithChannel = videos.slice((page - 1) * limit, page * limit).map(video => {
            const user = database.users[video.userId];
            return {
                ...video,
                channel: user ? {
                    id: user.id,
                    name: user.channelName,
                    avatar: user.avatar,
                    subscribers: user.subscribers
                } : null
            };
        });
        
        sendJSON(res, {
            videos: videosWithChannel,
            total: videos.length,
            page,
            totalPages: Math.ceil(videos.length / limit)
        });
        return;
    }
    
    if (pathname.startsWith('/api/videos/') && req.method === 'GET') {
        const videoId = pathname.split('/')[3];
        const video = database.videos[videoId];
        
        if (!video) {
            return sendError(res, 'Видео не найдено', 404);
        }
        
        // Увеличиваем просмотры
        video.views++;
        
        const user = database.users[video.userId];
        const relatedVideos = Object.values(database.videos)
            .filter(v => v.id !== videoId && v.category === video.category && !v.isShort)
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);
        
        const response = {
            ...video,
            channel: user ? {
                id: user.id,
                name: user.channelName,
                avatar: user.avatar,
                banner: user.banner,
                description: user.description,
                subscribers: user.subscribers,
                totalViews: user.totalViews,
                isVerified: user.isVerified
            } : null,
            relatedVideos: relatedVideos.map(v => ({
                id: v.id,
                title: v.title,
                thumbnailUrl: v.thumbnailUrl,
                duration: v.duration,
                views: v.views,
                channelName: database.users[v.userId]?.channelName || 'Unknown'
            }))
        };
        
        saveDatabase();
        sendJSON(res, response);
        return;
    }
    
    if (pathname === '/api/upload' && req.method === 'POST') {
        try {
            const contentType = req.headers['content-type'];
            if (!contentType || !contentType.includes('multipart/form-data')) {
                return sendError(res, 'Неверный формат запроса');
            }
            
            const boundary = contentType.split('boundary=')[1];
            const formData = await parseFormData(req, boundary);
            
            const { title, description, category, tags, userId, isShort } = formData;
            const videoFile = formData.video;
            const thumbnailFile = formData.thumbnail;
            
            if (!title || !userId || !videoFile) {
                return sendError(res, 'Заполните обязательные поля');
            }
            
            const user = database.users[userId];
            if (!user) {
                return sendError(res, 'Пользователь не найден');
            }
            
            // Генерируем ID для видео
            const videoId = 'video_' + Date.now();
            
            // Сохраняем файлы
            const videoFilename = `${videoId}.mp4`;
            const videoPath = path.join(VIDEOS_DIR, videoFilename);
            fs.writeFileSync(videoPath, videoFile.content);
            
            let thumbnailUrl = '/uploads/thumbnails/default.jpg';
            if (thumbnailFile) {
                const thumbExt = path.extname(thumbnailFile.filename) || '.jpg';
                const thumbFilename = `${videoId}${thumbExt}`;
                const thumbPath = path.join(THUMBNAILS_DIR, thumbFilename);
                fs.writeFileSync(thumbPath, thumbnailFile.content);
                thumbnailUrl = `/uploads/thumbnails/${thumbFilename}`;
            }
            
            // Создаем запись о видео
            const video = {
                id: videoId,
                userId,
                title: title.toString(),
                description: description ? description.toString() : '',
                videoUrl: `/uploads/videos/${videoFilename}`,
                thumbnailUrl,
                duration: 0, // В реальном приложении здесь нужно определить длительность
                views: 0,
                likes: 0,
                dislikes: 0,
                commentsCount: 0,
                category: category ? category.toString() : 'Развлечения',
                tags: tags ? tags.toString() : '',
                isShort: isShort === 'true',
                isLive: false,
                createdAt: Date.now()
            };
            
            database.videos[videoId] = video;
            
            // Добавляем видео в список пользователя
            if (video.isShort) {
                user.shorts.push(videoId);
            } else {
                user.videos.push(videoId);
            }
            
            saveDatabase();
            
            sendJSON(res, {
                success: true,
                videoId,
                message: 'Видео успешно загружено'
            });
        } catch (error) {
            console.error('Upload error:', error);
            sendError(res, 'Ошибка загрузки видео: ' + error.message, 500);
        }
        return;
    }
    
    if (pathname === '/api/videos/edit' && req.method === 'POST') {
        try {
            const body = await parseBody(req);
            const { videoId, title, description, category, tags } = body;
            
            const video = database.videos[videoId];
            if (!video) {
                return sendError(res, 'Видео не найдено');
            }
            
            // Обновляем информацию
            if (title) video.title = title;
            if (description !== undefined) video.description = description;
            if (category) video.category = category;
            if (tags) video.tags = tags;
            
            saveDatabase();
            sendJSON(res, { success: true, message: 'Видео обновлено' });
        } catch (error) {
            sendError(res, 'Ошибка обновления видео', 500);
        }
        return;
    }
    
    if (pathname === '/api/comments' && req.method === 'POST') {
        try {
            const body = await parseBody(req);
            const { videoId, userId, text } = body;
            
            if (!videoId || !userId || !text) {
                return sendError(res, 'Все поля обязательны');
            }
            
            const video = database.videos[videoId];
            const user = database.users[userId];
            
            if (!video || !user) {
                return sendError(res, 'Видео или пользователь не найден');
            }
            
            const commentId = 'comment_' + Date.now();
            const comment = {
                id: commentId,
                videoId,
                userId,
                text,
                likes: 0,
                timestamp: Date.now()
            };
            
            database.comments[commentId] = comment;
            video.commentsCount = (video.commentsCount || 0) + 1;
            
            saveDatabase();
            sendJSON(res, {
                success: true,
                comment: {
                    ...comment,
                    user: {
                        id: user.id,
                        username: user.username,
                        channelName: user.channelName,
                        avatar: user.avatar
                    }
                }
            });
        } catch (error) {
            sendError(res, 'Ошибка добавления комментария', 500);
        }
        return;
    }
    
    if (pathname.startsWith('/api/comments/video/') && req.method === 'GET') {
        const videoId = pathname.split('/')[4];
        const page = parseInt(parsedUrl.query.page) || 1;
        const limit = parseInt(parsedUrl.query.limit) || 20;
        
        const comments = Object.values(database.comments)
            .filter(c => c.videoId === videoId)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice((page - 1) * limit, page * limit)
            .map(comment => {
                const user = database.users[comment.userId];
                return {
                    ...comment,
                    user: user ? {
                        id: user.id,
                        username: user.username,
                        channelName: user.channelName,
                        avatar: user.avatar,
                        isVerified: user.isVerified
                    } : null
                };
            });
        
        sendJSON(res, {
            comments,
            total: Object.values(database.comments).filter(c => c.videoId === videoId).length,
            page,
            totalPages: Math.ceil(Object.values(database.comments).filter(c => c.videoId === videoId).length / limit)
        });
        return;
    }
    
    if (pathname === '/api/like' && req.method === 'POST') {
        try {
            const body = await parseBody(req);
            const { videoId, userId, type } = body; // type: 'like' or 'dislike'
            
            const video = database.videos[videoId];
            if (!video) {
                return sendError(res, 'Видео не найдено');
            }
            
            if (type === 'like') {
                video.likes++;
            } else if (type === 'dislike') {
                video.dislikes++;
            }
            
            saveDatabase();
            sendJSON(res, { success: true, likes: video.likes, dislikes: video.dislikes });
        } catch (error) {
            sendError(res, 'Ошибка оценки видео', 500);
        }
        return;
    }
    
    if (pathname === '/api/subscribe' && req.method === 'POST') {
        try {
            const body = await parseBody(req);
            const { channelId, userId } = body;
            
            const channel = database.users[channelId];
            const user = database.users[userId];
            
            if (!channel || !user) {
                return sendError(res, 'Канал или пользователь не найден');
            }
            
            if (channelId === userId) {
                return sendError(res, 'Нельзя подписаться на себя');
            }
            
            const subKey = `${userId}_${channelId}`;
            if (!database.subscriptions[subKey]) {
                database.subscriptions[subKey] = {
                    userId,
                    channelId,
                    timestamp: Date.now()
                };
                channel.subscribers++;
                saveDatabase();
            }
            
            sendJSON(res, { success: true, subscribers: channel.subscribers });
        } catch (error) {
            sendError(res, 'Ошибка подписки', 500);
        }
        return;
    }
    
    if (pathname === '/api/unsubscribe' && req.method === 'POST') {
        try {
            const body = await parseBody(req);
            const { channelId, userId } = body;
            
            const channel = database.users[channelId];
            const subKey = `${userId}_${channelId}`;
            
            if (database.subscriptions[subKey]) {
                delete database.subscriptions[subKey];
                channel.subscribers = Math.max(0, channel.subscribers - 1);
                saveDatabase();
            }
            
            sendJSON(res, { success: true, subscribers: channel.subscribers });
        } catch (error) {
            sendError(res, 'Ошибка отписки', 500);
        }
        return;
    }
    
    if (pathname.startsWith('/api/channel/') && req.method === 'GET') {
        const channelId = pathname.split('/')[3];
        const channel = database.users[channelId];
        
        if (!channel) {
            return sendError(res, 'Канал не найден', 404);
        }
        
        // Получаем видео канала
        const videos = channel.videos.map(id => database.videos[id]).filter(Boolean);
        const shorts = channel.shorts.map(id => database.videos[id]).filter(Boolean);
        
        // Проверяем подписку, если передан userId
        const userId = parsedUrl.query.userId;
        let isSubscribed = false;
        if (userId) {
            isSubscribed = !!database.subscriptions[`${userId}_${channelId}`];
        }
        
        sendJSON(res, {
            channel: {
                id: channel.id,
                username: channel.username,
                channelName: channel.channelName,
                avatar: channel.avatar,
                banner: channel.banner,
                description: channel.description,
                subscribers: channel.subscribers,
                totalViews: channel.totalViews,
                isVerified: channel.isVerified,
                createdAt: channel.createdAt
            },
            videos: videos.map(video => ({
                id: video.id,
                title: video.title,
                thumbnailUrl: video.thumbnailUrl,
                duration: video.duration,
                views: video.views,
                createdAt: video.createdAt
            })),
            shorts: shorts.map(short => ({
                id: short.id,
                title: short.title,
                thumbnailUrl: short.thumbnailUrl,
                duration: short.duration,
                views: short.views,
                createdAt: short.createdAt
            })),
            isSubscribed
        });
        return;
    }
    
    if (pathname === '/api/channel/update' && req.method === 'POST') {
        try {
            const body = await parseBody(req);
            const { userId, channelName, description, avatar, banner } = body;
            
            const channel = database.users[userId];
            if (!channel) {
                return sendError(res, 'Канал не найден');
            }
            
            if (channelName) channel.channelName = channelName;
            if (description !== undefined) channel.description = description;
            if (avatar) channel.avatar = avatar;
            if (banner) channel.banner = banner;
            
            saveDatabase();
            sendJSON(res, {
                success: true,
                channel: {
                    id: channel.id,
                    channelName: channel.channelName,
                    description: channel.description,
                    avatar: channel.avatar,
                    banner: channel.banner
                }
            });
        } catch (error) {
            sendError(res, 'Ошибка обновления канала', 500);
        }
        return;
    }
    
    if (pathname === '/api/search' && req.method === 'GET') {
        const query = parsedUrl.query.q;
        const type = parsedUrl.query.type || 'video';
        
        if (!query) {
            return sendJSON(res, { results: [], total: 0 });
        }
        
        const searchTerm = query.toLowerCase();
        
        if (type === 'video') {
            const results = Object.values(database.videos)
                .filter(video => 
                    video.title.toLowerCase().includes(searchTerm) ||
                    video.description.toLowerCase().includes(searchTerm) ||
                    video.tags.toLowerCase().includes(searchTerm)
                )
                .map(video => {
                    const user = database.users[video.userId];
                    return {
                        id: video.id,
                        title: video.title,
                        thumbnailUrl: video.thumbnailUrl,
                        duration: video.duration,
                        views: video.views,
                        channelName: user?.channelName || 'Unknown',
                        channelAvatar: user?.avatar,
                        createdAt: video.createdAt
                    };
                });
            
            sendJSON(res, { results, total: results.length });
        } else if (type === 'channel') {
            const results = Object.values(database.users)
                .filter(user => 
                    user.channelName.toLowerCase().includes(searchTerm) ||
                    user.description.toLowerCase().includes(searchTerm)
                )
                .map(user => ({
                    id: user.id,
                    channelName: user.channelName,
                    avatar: user.avatar,
                    subscribers: user.subscribers,
                    description: user.description,
                    isVerified: user.isVerified
                }));
            
            sendJSON(res, { results, total: results.length });
        }
        return;
    }
    
    if (pathname === '/api/recommendations' && req.method === 'GET') {
        const userId = parsedUrl.query.userId;
        let recommendations = [];
        
        // Если пользователь авторизован, даем персонализированные рекомендации
        if (userId && database.users[userId]) {
            const user = database.users[userId];
            
            // Видео с каналов, на которые подписан
            const subscribedChannels = Object.values(database.subscriptions)
                .filter(sub => sub.userId === userId)
                .map(sub => sub.channelId);
            
            const subscribedVideos = Object.values(database.videos)
                .filter(video => subscribedChannels.includes(video.userId) && !video.isShort);
            
            // Популярные видео в категориях, которые пользователь смотрел
            // (В реальном приложении здесь была бы история просмотров)
            const popularVideos = Object.values(database.videos)
                .filter(v => !v.isShort)
                .sort((a, b) => b.views - a.views)
                .slice(0, 20);
            
            recommendations = [...subscribedVideos, ...popularVideos];
        } else {
            // Для неавторизованных - популярные видео
            recommendations = Object.values(database.videos)
                .filter(v => !v.isShort)
                .sort((a, b) => b.views - a.views)
                .slice(0, 30);
        }
        
        // Убираем дубликаты и добавляем информацию о канале
        const uniqueVideos = [];
        const seenIds = new Set();
        
        recommendations.forEach(video => {
            if (!seenIds.has(video.id)) {
                seenIds.add(video.id);
                const user = database.users[video.userId];
                uniqueVideos.push({
                    ...video,
                    channel: user ? {
                        id: user.id,
                        name: user.channelName,
                        avatar: user.avatar,
                        subscribers: user.subscribers
                    } : null
                });
            }
        });
        
        sendJSON(res, { videos: uniqueVideos.slice(0, 20) });
        return;
    }
    
    if (pathname === '/api/admin/stats' && req.method === 'GET') {
        const token = parsedUrl.query.token;
        if (token !== '140612') {
            return sendError(res, 'Доступ запрещен', 403);
        }
        
        const stats = {
            totalUsers: Object.keys(database.users).length,
            totalVideos: Object.keys(database.videos).length,
            totalComments: Object.keys(database.comments).length,
            totalSubscriptions: Object.keys(database.subscriptions).length,
            totalViews: Object.values(database.videos).reduce((sum, video) => sum + video.views, 0),
            totalLikes: Object.values(database.videos).reduce((sum, video) => sum + video.likes, 0),
            recentVideos: Object.values(database.videos)
                .sort((a, b) => b.createdAt - a.createdAt)
                .slice(0, 10)
                .map(video => ({
                    id: video.id,
                    title: video.title,
                    views: video.views,
                    likes: video.likes,
                    channel: database.users[video.userId]?.channelName || 'Unknown',
                    createdAt: video.createdAt
                })),
            topChannels: Object.values(database.users)
                .filter(user => !user.isAdmin)
                .sort((a, b) => b.subscribers - a.subscribers)
                .slice(0, 10)
                .map(user => ({
                    id: user.id,
                    channelName: user.channelName,
                    subscribers: user.subscribers,
                    totalViews: user.totalViews,
                    videosCount: user.videos.length + user.shorts.length
                })),
            recentComments: Object.values(database.comments)
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 20)
                .map(comment => {
                    const user = database.users[comment.userId];
                    const video = database.videos[comment.videoId];
                    return {
                        id: comment.id,
                        text: comment.text,
                        user: user ? {
                            id: user.id,
                            channelName: user.channelName
                        } : null,
                        video: video ? {
                            id: video.id,
                            title: video.title
                        } : null,
                        timestamp: comment.timestamp
                    };
                })
        };
        
        sendJSON(res, stats);
        return;
    }
    
    if (pathname === '/api/admin/delete' && req.method === 'POST') {
        try {
            const body = await parseBody(req);
            const { token, type, id } = body;
            
            if (token !== '140612') {
                return sendError(res, 'Доступ запрещен', 403);
            }
            
            if (type === 'video') {
                const video = database.videos[id];
                if (video) {
                    // Удаляем видео из списка пользователя
                    const user = database.users[video.userId];
                    if (user) {
                        user.videos = user.videos.filter(vid => vid !== id);
                        user.shorts = user.shorts.filter(vid => vid !== id);
                    }
                    
                    // Удаляем комментарии к видео
                    Object.keys(database.comments).forEach(commentId => {
                        if (database.comments[commentId].videoId === id) {
                            delete database.comments[commentId];
                        }
                    });
                    
                    delete database.videos[id];
                    saveDatabase();
                    sendJSON(res, { success: true, message: 'Видео удалено' });
                } else {
                    sendError(res, 'Видео не найдено');
                }
            } else if (type === 'user') {
                const user = database.users[id];
                if (user && !user.isAdmin) {
                    // Удаляем все видео пользователя
                    [...user.videos, ...user.shorts].forEach(videoId => {
                        delete database.videos[videoId];
                    });
                    
                    // Удаляем комментарии пользователя
                    Object.keys(database.comments).forEach(commentId => {
                        if (database.comments[commentId].userId === id) {
                            delete database.comments[commentId];
                        }
                    });
                    
                    // Удаляем подписки пользователя
                    Object.keys(database.subscriptions).forEach(subKey => {
                        if (subKey.startsWith(id + '_') || subKey.endsWith('_' + id)) {
                            delete database.subscriptions[subKey];
                        }
                    });
                    
                    delete database.users[id];
                    saveDatabase();
                    sendJSON(res, { success: true, message: 'Пользователь удален' });
                } else {
                    sendError(res, 'Пользователь не найден или это администратор');
                }
            } else if (type === 'comment') {
                const comment = database.comments[id];
                if (comment) {
                    // Уменьшаем счетчик комментариев у видео
                    const video = database.videos[comment.videoId];
                    if (video) {
                        video.commentsCount = Math.max(0, video.commentsCount - 1);
                    }
                    
                    delete database.comments[id];
                    saveDatabase();
                    sendJSON(res, { success: true, message: 'Комментарий удален' });
                } else {
                    sendError(res, 'Комментарий не найдено');
                }
            }
        } catch (error) {
            sendError(res, 'Ошибка удаления', 500);
        }
        return;
    }
    
    if (pathname === '/api/admin/create-video' && req.method === 'POST') {
        try {
            const body = await parseBody(req);
            const { token, title, description, videoUrl, thumbnailUrl, duration, category, tags, userId } = body;
            
            if (token !== '140612') {
                return sendError(res, 'Доступ запрещен', 403);
            }
            
            const videoId = 'admin_video_' + Date.now();
            const video = {
                id: videoId,
                userId: userId || 'admin_001',
                title,
                description: description || '',
                videoUrl,
                thumbnailUrl,
                duration: duration || 0,
                views: 0,
                likes: 0,
                dislikes: 0,
                commentsCount: 0,
                category: category || 'Развлечения',
                tags: tags || '',
                isShort: false,
                isLive: false,
                createdAt: Date.now()
            };
            
            database.videos[videoId] = video;
            
            // Добавляем видео в список пользователя
            const user = database.users[video.userId];
            if (user) {
                user.videos.push(videoId);
            }
            
            saveDatabase();
            sendJSON(res, { success: true, videoId, message: 'Видео создано' });
        } catch (error) {
            sendError(res, 'Ошибка создания видео', 500);
        }
        return;
    }
    
    if (pathname === '/api/shorts' && req.method === 'GET') {
        const shorts = Object.values(database.videos)
            .filter(video => video.isShort)
            .sort((a, b) => b.createdAt - a.createdAt)
            .map(short => {
                const user = database.users[short.userId];
                return {
                    ...short,
                    channel: user ? {
                        id: user.id,
                        name: user.channelName,
                        avatar: user.avatar,
                        subscribers: user.subscribers
                    } : null
                };
            });
        
        sendJSON(res, { shorts });
        return;
    }
    
    // Отдаем index.html для всех остальных GET запросов
    if (req.method === 'GET') {
        fs.readFile('./index.html', 'utf8', (err, content) => {
            if (err) {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(200, {
                    'Content-Type': 'text/html; charset=utf-8'
                });
                res.end(content);
            }
        });
        return;
    }
    
    // Если маршрут не найден
    res.writeHead(404);
    res.end('Not Found');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`============================================`);
    console.log(`🚀 UsTube Server запущен на порту ${PORT}`);
    console.log(`🌐 Откройте в браузере: http://localhost:${PORT}`);
    console.log(`============================================`);
    console.log(`🔑 АДМИН ДОСТУП:`);
    console.log(`   Логин: admin@ustube.com`);
    console.log(`   Пароль: admin123`);
    console.log(`   Токен админ-панели: 140612`);
    console.log(`============================================`);
    console.log(`👤 ТЕСТОВЫЕ АККАУНТЫ С ПАРОЛЯМИ:`);
    console.log(`   A4: a4@example.com / a4password`);
    console.log(`   Глент: glent@example.com / glentpassword`);
    console.log(`   Домер: damer@example.com / damerpassword`);
    console.log(`   Зени: zeni@example.com / zenipassword`);
    console.log(`   Бефф: beff@example.com / beffpassword`);
    console.log(`   Тумка: tumka@example.com / tumpassword`);
    console.log(`   Марк Робер: mark@example.com / markpassword`);
    console.log(`   Мистер Бист: mrbeast@example.com / mrbeastpass`);
    console.log(`============================================`);
    console.log(`🎬 Загружено видео: ${Object.keys(database.videos).length}`);
    console.log(`👥 Загружено пользователей: ${Object.keys(database.users).length}`);
    console.log(`💬 Загружено комментариев: ${Object.keys(database.comments).length}`);
    console.log(`============================================`);
});
