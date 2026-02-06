const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

// Создаем директории
const UPLOAD_DIR = './uploads';
const AVATARS_DIR = './avatars';
const DB_FILE = './database.json';

// Автоматическое создание директорий
[UPLOAD_DIR, AVATARS_DIR, './thumbnails'].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Инициализация базы данных
let database = {
    users: [],
    videos: [],
    comments: [],
    subscriptions: [],
    likes: [],
    views: [],
    playlists: [],
    notifications: [],
    nextId: {
        user: 1000,
        video: 1000,
        comment: 1000
    }
};

// Загружаем или создаем базу данных
if (fs.existsSync(DB_FILE)) {
    try {
        database = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        console.log('📁 База данных загружена');
    } catch (e) {
        console.log('📁 Создана новая база данных');
    }
}

// Инициализация начальных данных (популярные каналы YouTube)
const initDatabase = () => {
    // Очищаем только если база пустая
    if (database.users.length === 0) {
        console.log('🎬 Инициализация базы данных с популярными каналами...');
        
        // Создаем популярные каналы (как на YouTube)
        const popularChannels = [
            // Российские ютуберы
            { username: 'UsTube', channelName: 'UsTube Official', email: 'admin@ustube.com', password: 'admin123', isAdmin: true, avatar: '🎬' },
            { username: 'MrBeast', channelName: 'Мистер Бист', email: 'mrbeast@ustube.com', password: 'mrbeast123', avatar: '💰' },
            { username: 'A4', channelName: 'A4', email: 'a4@ustube.com', password: 'a4123456', avatar: '🎮' },
            { username: 'Глент', channelName: 'Глент', email: 'grent@ustube.com', password: 'grent1234', avatar: '😂' },
            { username: 'Домер', channelName: 'Домер', email: 'domer@ustube.com', password: 'domer1234', avatar: '🎯' },
            { username: 'Зени', channelName: 'Зени', email: 'zeni@ustube.com', password: 'zeni12345', avatar: '⚡' },
            { username: 'Бефф', channelName: 'Бефф', email: 'beff@ustube.com', password: 'beff12345', avatar: '🤪' },
            { username: 'Тумка', channelName: 'Тумка', email: 'tumka@ustube.com', password: 'tumka1234', avatar: '🎭' },
            { username: 'MarkRober', channelName: 'Марк Робер', email: 'mark@ustube.com', password: 'mark12345', avatar: '🔬' },
            { username: 'Куплинов', channelName: 'Владимир Куплинов', email: 'kuplinov@ustube.com', password: 'kuplinov123', avatar: '🎮' },
            { username: 'FROST', channelName: 'FROST', email: 'frost@ustube.com', password: 'frost1234', avatar: '❄️' },
            { username: 'BadComedian', channelName: 'BadComedian', email: 'badcom@ustube.com', password: 'badcom123', avatar: '🎬' },
            { username: 'Marmok', channelName: 'Мармок', email: 'marmok@ustube.com', password: 'marmok123', avatar: '👾' },
            { username: 'Иви', channelName: 'Иви', email: 'ivi@ustube.com', password: 'ivi123456', avatar: '😎' },
            { username: 'Энджи', channelName: 'Энджи', email: 'angie@ustube.com', password: 'angie1234', avatar: '🎤' },
            { username: 'YuriyChechyotka', channelName: 'Юрий Чечотка', email: 'chech@ustube.com', password: 'chech1234', avatar: '🎥' },
            
            // Международные
            { username: 'PewDiePie', channelName: 'PewDiePie', email: 'pewdie@ustube.com', password: 'pewdie123', avatar: '👑' },
            { username: 'DudePerfect', channelName: 'Dude Perfect', email: 'dude@ustube.com', password: 'dude12345', avatar: '🏀' },
            { username: 'MrBeastGaming', channelName: 'MrBeast Gaming', email: 'gaming@ustube.com', password: 'gaming123', avatar: '🎮' },
            { username: 'Markiplier', channelName: 'Markiplier', email: 'markiplier@ustube.com', password: 'markiplier123', avatar: '🎭' },
            { username: 'Jacksepticeye', channelName: 'Jacksepticeye', email: 'jack@ustube.com', password: 'jack12345', avatar: '👁️' },
            { username: 'DanTDM', channelName: 'DanTDM', email: 'dantdm@ustube.com', password: 'dantdm123', avatar: '⚔️' },
            { username: 'VanossGaming', channelName: 'VanossGaming', email: 'vanoss@ustube.com', password: 'vanoss123', avatar: '🦉' },
            { username: 'KSI', channelName: 'KSI', email: 'ksi@ustube.com', password: 'ksi123456', avatar: '🥊' },
            { username: 'LoganPaul', channelName: 'Logan Paul', email: 'logan@ustube.com', password: 'logan1234', avatar: '🤼' },
            { username: 'JakePaul', channelName: 'Jake Paul', email: 'jake@ustube.com', password: 'jake12345', avatar: '🥊' },
            { username: 'DavidDobrik', channelName: 'David Dobrik', email: 'david@ustube.com', password: 'david1234', avatar: '🎉' },
            { username: 'LizaKoshy', channelName: 'Liza Koshy', email: 'liza@ustube.com', password: 'liza12345', avatar: '🤪' },
            { username: 'Ryan', channelName: 'Ryan ToysReview', email: 'ryan@ustube.com', password: 'ryan12345', avatar: '🧸' },
            { username: '5MinuteCrafts', channelName: '5-Minute Crafts', email: 'crafts@ustube.com', password: 'crafts123', avatar: '🛠️' },
            { username: 'T-Series', channelName: 'T-Series', email: 'tseries@ustube.com', password: 'tseries123', avatar: '🎵' },
            { username: 'Cocomelon', channelName: 'Cocomelon', email: 'cocomelon@ustube.com', password: 'coco12345', avatar: '👶' },
            { username: 'SETIndia', channelName: 'SET India', email: 'set@ustube.com', password: 'set123456', avatar: '🇮🇳' },
            { username: 'WWE', channelName: 'WWE', email: 'wwe@ustube.com', password: 'wwe123456', avatar: '🤼' },
            { username: 'NBA', channelName: 'NBA', email: 'nba@ustube.com', password: 'nba123456', avatar: '🏀' },
            { username: 'Cristiano', channelName: 'Cristiano Ronaldo', email: 'ronaldo@ustube.com', password: 'ronaldo123', avatar: '⚽' },
            { username: 'NeymarJr', channelName: 'Neymar Jr', email: 'neymar@ustube.com', password: 'neymar123', avatar: '⚽' },
            { username: 'Messi', channelName: 'Lionel Messi', email: 'messi@ustube.com', password: 'messi1234', avatar: '⚽' },
            { username: 'NatGeo', channelName: 'National Geographic', email: 'natgeo@ustube.com', password: 'natgeo123', avatar: '🌍' },
            { username: 'NASA', channelName: 'NASA', email: 'nasa@ustube.com', password: 'nasa12345', avatar: '🚀' },
            { username: 'Kurzgesagt', channelName: 'Kurzgesagt', email: 'kurz@ustube.com', password: 'kurz12345', avatar: '🦆' },
            { username: 'Vsauce', channelName: 'Vsauce', email: 'vsauce@ustube.com', password: 'vsauce123', avatar: '🤔' },
            { username: 'Veritasium', channelName: 'Veritasium', email: 'veritasium@ustube.com', password: 'veritasium123', avatar: '🔬' },
            { username: 'SmarterEveryDay', channelName: 'SmarterEveryDay', email: 'smarter@ustube.com', password: 'smarter123', avatar: '🧠' },
            { username: '3Blue1Brown', channelName: '3Blue1Brown', email: '3b1b@ustube.com', password: '3b1b12345', avatar: '📐' },
            { username: 'Numberphile', channelName: 'Numberphile', email: 'number@ustube.com', password: 'number123', avatar: '🔢' },
            { username: 'Computerphile', channelName: 'Computerphile', email: 'computer@ustube.com', password: 'computer123', avatar: '💻' },
            { username: 'PhysicsGirl', channelName: 'Physics Girl', email: 'physics@ustube.com', password: 'physics123', avatar: '⚛️' },
            { username: 'SciShow', channelName: 'SciShow', email: 'scishow@ustube.com', password: 'scishow123', avatar: '🔬' },
            { username: 'AsapSCIENCE', channelName: 'AsapSCIENCE', email: 'asap@ustube.com', password: 'asap12345', avatar: '🧪' },
            { username: 'MarkManson', channelName: 'Mark Manson', email: 'markm@ustube.com', password: 'markm1234', avatar: '📚' },
            { username: 'GaryVee', channelName: 'GaryVee', email: 'gary@ustube.com', password: 'gary12345', avatar: '💼' },
            { username: 'CaseyNeistat', channelName: 'Casey Neistat', email: 'casey@ustube.com', password: 'casey1234', avatar: '🎥' },
            { username: 'PeterMcKinnon', channelName: 'Peter McKinnon', email: 'peter@ustube.com', password: 'peter1234', avatar: '📸' },
            { username: 'MKBHD', channelName: 'MKBHD', email: 'mkbhd@ustube.com', password: 'mkbhd1234', avatar: '📱' },
            { username: 'UnboxTherapy', channelName: 'Unbox Therapy', email: 'unbox@ustube.com', password: 'unbox1234', avatar: '📦' },
            { username: 'Linustechtips', channelName: 'Linus Tech Tips', email: 'linus@ustube.com', password: 'linus1234', avatar: '💻' }
        ];

        // Добавляем каналы в базу
        popularChannels.forEach(channel => {
            const userId = `user_${database.nextId.user++}`;
            database.users.push({
                id: userId,
                username: channel.username,
                channelName: channel.channelName,
                email: channel.email,
                password: crypto.createHash('sha256').update(channel.password).digest('hex'),
                avatar: channel.avatar,
                banner: `https://picsum.photos/1200/300?random=${userId}`,
                description: `${channel.channelName} на UsTube! Официальный канал. Подписывайтесь!`,
                subscribers: Math.floor(Math.random() * 10000000) + 100000,
                videos: [],
                isVerified: true,
                isAdmin: channel.isAdmin || false,
                createdAt: Date.now() - Math.floor(Math.random() * 31536000000),
                totalViews: Math.floor(Math.random() * 1000000000) + 10000000
            });
        });

        // Массив реальных видео с YouTube (только метаданные)
        const youtubeVideos = [
            // MrBeast
            { title: 'Я дал $100,000 моему подписчику', duration: 582, category: 'entertainment', tags: 'мистербист, деньги, челлендж' },
            { title: 'Последний выживший в доме получает $500,000', duration: 1245, category: 'entertainment', tags: 'челлендж, выживание, деньги' },
            { title: 'Я купил остров', duration: 845, category: 'entertainment', tags: 'остров, покупка, приключения' },
            { title: '48 часов в тюрьме', duration: 932, duration: '15:32', tags: 'тюрьма, эксперимент' },
            
            // A4
            { title: 'Новый FNAF: Security Breach - ПРОХОЖДЕНИЕ', duration: 3564, category: 'gaming', tags: 'fnaf, хоррор, игра' },
            { title: 'Minecraft, но я ОДИН на сервере', duration: 2845, category: 'gaming', tags: 'майнкрафт, выживание' },
            { title: 'ТОП 10 игр 2024 года', duration: 1245, category: 'gaming', tags: 'топ, игры, обзор' },
            
            // Глент
            { title: 'РАССЛЕДОВАНИЕ: Кто такой Глент?', duration: 1245, category: 'entertainment', tags: 'мем, расследование' },
            { title: 'Глент в реальной жизни', duration: 845, category: 'entertainment', tags: 'скетч, юмор' },
            
            // Марк Робер
            { title: 'Я построил ПАНДУС для SKATEBOARD из 100,000 ШАРИКОВ', duration: 1245, category: 'education', tags: 'наука, эксперимент' },
            { title: 'САМЫЙ БОЛЬШОЙ СЛАЙМ В МИРЕ', duration: 932, category: 'education', tags: 'наука, слизь' },
            
            // Куплинов
            { title: 'GTA 5 РОЛЕПЛЕЙ - ЛУЧШИЕ МОМЕНТЫ', duration: 1845, category: 'gaming', tags: 'gta, ролеплей' },
            { title: 'Майнкрафт с модом на 1000 дней', duration: 2845, category: 'gaming', tags: 'майнкрафт, выживание' },
            
            // BadComedian
            { title: 'Разбор фильма: Черная Вдова', duration: 2845, category: 'entertainment', tags: 'кино, обзор, критика' },
            { title: 'Почему новый ФОРСАЖ такой плохой?', duration: 2245, category: 'entertainment', tags: 'фильм, разбор' },
            
            // FROST
            { title: 'CS:GO - ЛУЧШИЕ КЛИПЫ ЗА МЕСЯЦ', duration: 645, category: 'gaming', tags: 'csgo, клипы' },
            { title: 'Valorant против CS:GO - что лучше?', duration: 1245, category: 'gaming', tags: 'сравнение, шутеры' },
            
            // Научные каналы
            { title: 'Как работает черная дыра?', duration: 945, category: 'education', tags: 'космос, наука' },
            { title: 'Квантовая физика для чайников', duration: 1245, category: 'education', tags: 'наука, физика' },
            { title: 'Искусственный интеллект: угроза или возможность?', duration: 1845, category: 'education', tags: 'ии, технологии' },
            
            // Музыка
            { title: 'ТОП 100 песен 2024 года', duration: 3600, category: 'music', tags: 'музыка, топ, хиты' },
            { title: 'Лучшие ремиксы этого лета', duration: 2845, category: 'music', tags: 'музыка, ремиксы' },
            
            // Спорт
            { title: 'ЛУЧШИЕ ГОЛЫ ЧЕМПИОНАТА МИРА', duration: 845, category: 'sports', tags: 'футбол, голы' },
            { title: 'NBA - ТОП 10 данков сезона', duration: 645, category: 'sports', tags: 'баскетбол, данки' },
            
            // Технологии
            { title: 'Обзор iPhone 15 Pro Max', duration: 1845, category: 'tech', tags: 'айфон, обзор' },
            { title: 'Собираем игровой ПК за $1000', duration: 2245, category: 'tech', tags: 'пк, сборка' },
            
            // Юмор
            { title: 'СМЕШНЫЕ ПРИКОЛЫ 2024', duration: 845, category: 'entertainment', tags: 'приколы, юмор' },
            { title: 'ТИК-ТОК ТРЕНДЫ, которые уже надоели', duration: 645, category: 'entertainment', tags: 'тикток, мемы' },
            
            // Короткие видео (Shorts)
            { title: '5 секретов успеха в YouTube', duration: 58, category: 'education', isShort: true },
            { title: 'Самый смешной момент в игре', duration: 45, category: 'gaming', isShort: true },
            { title: 'Как быстро научиться танцевать', duration: 52, category: 'music', isShort: true },
            { title: 'Лайфхак для учебы', duration: 49, category: 'education', isShort: true },
            { title: 'Момент, который вас шокирует', duration: 55, category: 'entertainment', isShort: true }
        ];

        // Создаем видео для каждого канала
        database.users.forEach((user, userIndex) => {
            const videoCount = user.isAdmin ? 15 : Math.floor(Math.random() * 8) + 3;
            
            for (let i = 0; i < videoCount; i++) {
                const videoIndex = (userIndex * videoCount + i) % youtubeVideos.length;
                const videoTemplate = youtubeVideos[videoIndex];
                const videoId = `video_${database.nextId.video++}`;
                
                const video = {
                    id: videoId,
                    title: `${videoTemplate.title} | ${user.channelName}`,
                    description: `Это видео от канала ${user.channelName}. Подписывайтесь на канал для большего контента! #${user.channelName.replace(/\s+/g, '')}`,
                    userId: user.id,
                    videoUrl: `/uploads/videos/demo_${(database.nextId.video % 10) + 1}.mp4`,
                    thumbnailUrl: `https://picsum.photos/1280/720?random=${videoId}&blur=2`,
                    views: Math.floor(Math.random() * 10000000) + 10000,
                    likes: Math.floor(Math.random() * 100000) + 1000,
                    dislikes: Math.floor(Math.random() * 1000),
                    comments: Math.floor(Math.random() * 5000) + 100,
                    duration: videoTemplate.duration || 600,
                    isShort: videoTemplate.isShort || false,
                    category: videoTemplate.category || 'entertainment',
                    tags: videoTemplate.tags || user.channelName,
                    createdAt: Date.now() - Math.floor(Math.random() * 31536000000),
                    isPublished: true
                };
                
                database.videos.push(video);
                user.videos.push(videoId);
            }
        });

        // Создаем реальные комментарии
        const commentTemplates = [
            "Отличное видео! Очень понравилось!",
            "Жду новых выпусков, продолжайте в том же духе!",
            "Лучший канал на UsTube!",
            "Спасибо за качественный контент!",
            "Это просто шедевр!",
            "Пересмотрел уже 10 раз, не надоедает!",
            "Когда будет новая часть?",
            "Очень информативно, спасибо!",
            "Желаю вам роста и развития!",
            "Подписался, жду больше контента!",
            "Это лучшее, что я видел за последнее время!",
            "Спасибо, что делаете такой контент!",
            "Очень круто, продолжайте!",
            "Мой любимый канал!",
            "Жду следующих видео с нетерпением!",
            "Это видео изменило мой взгляд на...",
            "Очень профессионально сделано!",
            "Лайк за качество!",
            "Пересматриваю постоянно!",
            "Рекомендую всем друзьям!"
        ];

        // Добавляем комментарии к видео
        database.videos.forEach(video => {
            const commentCount = Math.floor(Math.random() * 20) + 5;
            
            for (let i = 0; i < commentCount; i++) {
                const randomUser = database.users[Math.floor(Math.random() * database.users.length)];
                const commentId = `comment_${database.nextId.comment++}`;
                
                database.comments.push({
                    id: commentId,
                    videoId: video.id,
                    userId: randomUser.id,
                    username: randomUser.username,
                    text: commentTemplates[Math.floor(Math.random() * commentTemplates.length)],
                    likes: Math.floor(Math.random() * 100),
                    createdAt: Date.now() - Math.floor(Math.random() * 604800000) // До недели назад
                });
            }
        });

        // Создаем подписки между каналами
        database.users.forEach(user => {
            const subscriptionCount = Math.floor(Math.random() * 20) + 5;
            
            for (let i = 0; i < subscriptionCount; i++) {
                const randomChannel = database.users[Math.floor(Math.random() * database.users.length)];
                if (randomChannel.id !== user.id) {
                    database.subscriptions.push({
                        id: `sub_${Date.now()}_${i}`,
                        subscriberId: user.id,
                        channelId: randomChannel.id,
                        createdAt: Date.now() - Math.floor(Math.random() * 31536000000)
                    });
                    
                    // Увеличиваем счетчик подписчиков
                    randomChannel.subscribers += 1;
                }
            }
        });

        // Создаем лайки
        database.videos.forEach(video => {
            const likeCount = Math.min(video.likes, 100); // Берем реальное количество лайков
            for (let i = 0; i < likeCount; i++) {
                const randomUser = database.users[Math.floor(Math.random() * database.users.length)];
                database.likes.push({
                    id: `like_${Date.now()}_${i}`,
                    videoId: video.id,
                    userId: randomUser.id,
                    type: 1,
                    createdAt: Date.now() - Math.floor(Math.random() * 2592000000) // До месяца назад
                });
            }
        });

        // Сохраняем базу данных
        saveDatabase();
        console.log(`✅ База данных инициализирована: ${database.users.length} каналов, ${database.videos.length} видео`);
    }
};

// Сохранение базы данных
const saveDatabase = () => {
    fs.writeFileSync(DB_FILE, JSON.stringify(database, null, 2));
};

// Инициализация при запуске
initDatabase();

// Функции работы с данными
const DataManager = {
    // Поиск пользователя по email
    findUserByEmail(email) {
        return database.users.find(u => u.email === email);
    },

    // Поиск пользователя по ID
    findUserById(id) {
        return database.users.find(u => u.id === id);
    },

    // Регистрация пользователя
    registerUser(username, email, password) {
        if (this.findUserByEmail(email)) {
            return { error: 'Пользователь с таким email уже существует' };
        }

        const userId = `user_${database.nextId.user++}`;
        const user = {
            id: userId,
            username,
            channelName: username,
            email,
            password: crypto.createHash('sha256').update(password).digest('hex'),
            avatar: username.charAt(0).toUpperCase(),
            banner: `https://picsum.photos/1200/300?random=${userId}`,
            description: `Добро пожаловать на канал ${username}!`,
            subscribers: 0,
            videos: [],
            isVerified: false,
            isAdmin: false,
            createdAt: Date.now(),
            totalViews: 0
        };

        database.users.push(user);
        saveDatabase();
        return { success: true, user };
    },

    // Авторизация
    loginUser(email, password) {
        const user = this.findUserByEmail(email);
        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
        
        if (!user || user.password !== hashedPassword) {
            return { error: 'Неверный email или пароль' };
        }

        return { 
            success: true, 
            user: {
                id: user.id,
                username: user.username,
                channelName: user.channelName,
                email: user.email,
                avatar: user.avatar,
                subscribers: user.subscribers,
                isAdmin: user.isAdmin,
                isVerified: user.isVerified
            }
        };
    },

    // Получение видео
    getVideos(options = {}) {
        let videos = [...database.videos];
        
        // Фильтрация
        if (options.category) {
            videos = videos.filter(v => v.category === options.category);
        }
        
        if (options.isShort !== undefined) {
            videos = videos.filter(v => v.isShort === options.isShort);
        }
        
        if (options.userId) {
            videos = videos.filter(v => v.userId === options.userId);
        }
        
        if (options.search) {
            const search = options.search.toLowerCase();
            videos = videos.filter(v => 
                v.title.toLowerCase().includes(search) ||
                v.description.toLowerCase().includes(search) ||
                v.tags.toLowerCase().includes(search)
            );
        }
        
        // Сортировка
        switch (options.sort || 'newest') {
            case 'popular':
                videos.sort((a, b) => b.views - a.views);
                break;
            case 'trending':
                videos.sort((a, b) => {
                    const aScore = b.likes * 2 - b.dislikes + b.views * 0.1;
                    const bScore = a.likes * 2 - a.dislikes + a.views * 0.1;
                    return bScore - aScore;
                });
                break;
            case 'oldest':
                videos.sort((a, b) => a.createdAt - b.createdAt);
                break;
            default: // newest
                videos.sort((a, b) => b.createdAt - a.createdAt);
        }
        
        // Пагинация
        const limit = options.limit || 50;
        const page = options.page || 1;
        const start = (page - 1) * limit;
        const paginatedVideos = videos.slice(start, start + limit);
        
        // Добавляем информацию о канале
        return paginatedVideos.map(video => {
            const user = this.findUserById(video.userId);
            return {
                ...video,
                channel: user ? {
                    id: user.id,
                    name: user.channelName,
                    avatar: user.avatar,
                    subscribers: user.subscribers,
                    isVerified: user.isVerified
                } : null
            };
        });
    },

    // Получение одного видео
    getVideo(id) {
        const video = database.videos.find(v => v.id === id);
        if (video) {
            // Увеличиваем просмотры
            video.views++;
            
            // Добавляем просмотр в историю
            database.views.push({
                id: `view_${Date.now()}`,
                videoId: id,
                userId: 'anonymous',
                createdAt: Date.now()
            });
            
            saveDatabase();
            
            const user = this.findUserById(video.userId);
            return {
                ...video,
                channel: user ? {
                    id: user.id,
                    name: user.channelName,
                    avatar: user.avatar,
                    subscribers: user.subscribers,
                    isVerified: user.isVerified,
                    description: user.description
                } : null
            };
        }
        return null;
    },

    // Добавление видео
    addVideo(videoData) {
        const videoId = `video_${database.nextId.video++}`;
        const video = {
            id: videoId,
            ...videoData,
            views: 0,
            likes: 0,
            dislikes: 0,
            comments: 0,
            createdAt: Date.now(),
            isPublished: true
        };
        
        database.videos.push(video);
        
        // Добавляем видео в канал пользователя
        const user = this.findUserById(videoData.userId);
        if (user) {
            user.videos.push(videoId);
        }
        
        saveDatabase();
        return video;
    },

    // Получение комментариев
    getComments(videoId) {
        return database.comments
            .filter(c => c.videoId === videoId)
            .sort((a, b) => b.createdAt - a.createdAt);
    },

    // Добавление комментария
    addComment(commentData) {
        const commentId = `comment_${database.nextId.comment++}`;
        const comment = {
            id: commentId,
            ...commentData,
            likes: 0,
            createdAt: Date.now()
        };
        
        // Увеличиваем счетчик комментариев у видео
        const video = database.videos.find(v => v.id === commentData.videoId);
        if (video) {
            video.comments++;
        }
        
        database.comments.push(comment);
        saveDatabase();
        return comment;
    },

    // Подписка
    subscribe(subscriberId, channelId) {
        // Проверяем, не подписан ли уже
        const existing = database.subscriptions.find(s => 
            s.subscriberId === subscriberId && s.channelId === channelId
        );
        
        if (existing) {
            return { error: 'Вы уже подписаны на этот канал' };
        }
        
        const subId = `sub_${Date.now()}`;
        const subscription = {
            id: subId,
            subscriberId,
            channelId,
            createdAt: Date.now()
        };
        
        database.subscriptions.push(subscription);
        
        // Увеличиваем счетчик подписчиков
        const channel = this.findUserById(channelId);
        if (channel) {
            channel.subscribers++;
        }
        
        saveDatabase();
        return { success: true, subscription };
    },

    // Отписка
    unsubscribe(subscriberId, channelId) {
        const index = database.subscriptions.findIndex(s => 
            s.subscriberId === subscriberId && s.channelId === channelId
        );
        
        if (index === -1) {
            return { error: 'Подписка не найдена' };
        }
        
        database.subscriptions.splice(index, 1);
        
        // Уменьшаем счетчик подписчиков
        const channel = this.findUserById(channelId);
        if (channel && channel.subscribers > 0) {
            channel.subscribers--;
        }
        
        saveDatabase();
        return { success: true };
    },

    // Проверка подписки
    isSubscribed(subscriberId, channelId) {
        return database.subscriptions.some(s => 
            s.subscriberId === subscriberId && s.channelId === channelId
        );
    },

    // Лайк видео
    likeVideo(videoId, userId, type) {
        // Удаляем предыдущую реакцию
        const existingIndex = database.likes.findIndex(l => 
            l.videoId === videoId && l.userId === userId
        );
        
        if (existingIndex !== -1) {
            const oldLike = database.likes[existingIndex];
            database.likes.splice(existingIndex, 1);
            
            // Обновляем счетчики видео
            const video = database.videos.find(v => v.id === videoId);
            if (video) {
                if (oldLike.type === 1) video.likes--;
                if (oldLike.type === -1) video.dislikes--;
            }
        }
        
        // Добавляем новую реакцию
        const likeId = `like_${Date.now()}`;
        const like = {
            id: likeId,
            videoId,
            userId,
            type,
            createdAt: Date.now()
        };
        
        database.likes.push(like);
        
        // Обновляем счетчики видео
        const video = database.videos.find(v => v.id === videoId);
        if (video) {
            if (type === 1) video.likes++;
            if (type === -1) video.dislikes++;
        }
        
        saveDatabase();
        return { success: true, like };
    },

    // Получение реакции пользователя
    getUserReaction(videoId, userId) {
        const like = database.likes.find(l => 
            l.videoId === videoId && l.userId === userId
        );
        return like ? like.type : 0;
    },

    // Поиск
    search(query, type = 'video') {
        const searchQuery = query.toLowerCase();
        
        if (type === 'video') {
            return database.videos.filter(video => 
                video.title.toLowerCase().includes(searchQuery) ||
                video.description.toLowerCase().includes(searchQuery) ||
                video.tags.toLowerCase().includes(searchQuery)
            ).map(video => {
                const user = this.findUserById(video.userId);
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
        } else {
            return database.users.filter(user => 
                user.channelName.toLowerCase().includes(searchQuery) ||
                user.username.toLowerCase().includes(searchQuery)
            );
        }
    },

    // Получение рекомендаций
    getRecommendations(userId = null, limit = 20) {
        let videos = [...database.videos];
        
        // Если пользователь авторизован, даем персонализированные рекомендации
        if (userId) {
            const user = this.findUserById(userId);
            if (user) {
                // Видео с каналов, на которые подписан пользователь
                const subscribedChannels = database.subscriptions
                    .filter(s => s.subscriberId === userId)
                    .map(s => s.channelId);
                
                const subscribedVideos = videos.filter(v => subscribedChannels.includes(v.userId));
                
                // Популярные видео в категориях, которые пользователь смотрел
                const userVideos = videos.filter(v => v.userId === userId);
                const userCategories = [...new Set(userVideos.map(v => v.category))];
                const categoryVideos = videos.filter(v => userCategories.includes(v.category));
                
                // Смешиваем результаты
                const recommendations = [
                    ...subscribedVideos,
                    ...categoryVideos,
                    ...videos.filter(v => v.views > 100000)
                ];
                
                // Убираем дубликаты
                const uniqueVideos = [...new Map(recommendations.map(v => [v.id, v])).values()];
                videos = uniqueVideos.slice(0, limit);
            }
        }
        
        // Сортируем по популярности
        videos.sort((a, b) => b.views - a.views);
        
        // Добавляем информацию о каналах
        return videos.slice(0, limit).map(video => {
            const user = this.findUserById(video.userId);
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
    },

    // Админ функции
    getAdminStats() {
        return {
            totalUsers: database.users.length,
            totalVideos: database.videos.length,
            totalViews: database.videos.reduce((sum, v) => sum + v.views, 0),
            totalComments: database.comments.length,
            totalLikes: database.likes.filter(l => l.type === 1).length,
            totalSubscriptions: database.subscriptions.length,
            recentUsers: database.users.slice(-10).reverse(),
            recentVideos: database.videos.slice(-10).reverse(),
            topVideos: [...database.videos].sort((a, b) => b.views - a.views).slice(0, 10),
            topChannels: [...database.users].sort((a, b) => b.subscribers - a.subscribers).slice(0, 10)
        };
    },

    // Удаление видео (админ)
    deleteVideo(videoId) {
        const index = database.videos.findIndex(v => v.id === videoId);
        if (index === -1) return false;
        
        const video = database.videos[index];
        
        // Удаляем из канала пользователя
        const user = this.findUserById(video.userId);
        if (user) {
            const videoIndex = user.videos.indexOf(videoId);
            if (videoIndex !== -1) {
                user.videos.splice(videoIndex, 1);
            }
        }
        
        // Удаляем комментарии
        database.comments = database.comments.filter(c => c.videoId !== videoId);
        
        // Удаляем лайки
        database.likes = database.likes.filter(l => l.videoId !== videoId);
        
        // Удаляем подписки (если видео было в плейлистах, нужно удалить и их)
        
        // Удаляем само видео
        database.videos.splice(index, 1);
        
        saveDatabase();
        return true;
    },

    // Обновление пользователя
    updateUser(userId, updates) {
        const user = this.findUserById(userId);
        if (!user) return null;
        
        Object.assign(user, updates);
        saveDatabase();
        return user;
    },

    // Получение канала
    getChannel(userId) {
        const user = this.findUserById(userId);
        if (!user) return null;
        
        const videos = database.videos.filter(v => v.userId === userId);
        const subscribers = database.subscriptions.filter(s => s.channelId === userId).length;
        
        return {
            ...user,
            videos: videos.filter(v => !v.isShort),
            shorts: videos.filter(v => v.isShort),
            subscribers,
            isSubscribed: false // Это будет установлено на клиенте если нужно
        };
    }
};

// Создание HTTP сервера
const server = http.createServer((req, res) => {
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
    
    // Логирование запросов
    console.log(`${req.method} ${pathname}`);
    
    // API endpoints
    if (pathname === '/api/register' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const result = DataManager.registerUser(data.username, data.email, data.password);
                
                res.writeHead(result.error ? 400 : 200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (e) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Ошибка сервера' }));
            }
        });
        return;
    }
    
    if (pathname === '/api/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const result = DataManager.loginUser(data.email, data.password);
                
                res.writeHead(result.error ? 401 : 200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (e) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Ошибка сервера' }));
            }
        });
        return;
    }
    
    if (pathname === '/api/videos' && req.method === 'GET') {
        const videos = DataManager.getVideos(parsedUrl.query);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(videos));
        return;
    }
    
    if (pathname.startsWith('/api/videos/') && req.method === 'GET') {
        const videoId = pathname.split('/')[3];
        const video = DataManager.getVideo(videoId);
        
        if (!video) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Видео не найдено' }));
            return;
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(video));
        return;
    }
    
    if (pathname === '/api/videos' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const video = DataManager.addVideo(data);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(video));
            } catch (e) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Ошибка загрузки видео' }));
            }
        });
        return;
    }
    
    if (pathname.startsWith('/api/videos/') && req.method === 'DELETE') {
        const videoId = pathname.split('/')[3];
        const success = DataManager.deleteVideo(videoId);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success }));
        return;
    }
    
    if (pathname.startsWith('/api/comments/') && req.method === 'GET') {
        const videoId = pathname.split('/')[3];
        const comments = DataManager.getComments(videoId);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(comments));
        return;
    }
    
    if (pathname === '/api/comments' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const comment = DataManager.addComment(data);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(comment));
            } catch (e) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Ошибка добавления комментария' }));
            }
        });
        return;
    }
    
    if (pathname === '/api/subscribe' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const result = DataManager.subscribe(data.subscriberId, data.channelId);
                
                res.writeHead(result.error ? 400 : 200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (e) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Ошибка подписки' }));
            }
        });
        return;
    }
    
    if (pathname === '/api/unsubscribe' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const result = DataManager.unsubscribe(data.subscriberId, data.channelId);
                
                res.writeHead(result.error ? 400 : 200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (e) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Ошибка отписки' }));
            }
        });
        return;
    }
    
    if (pathname === '/api/like' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const result = DataManager.likeVideo(data.videoId, data.userId, data.type);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (e) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Ошибка оценки' }));
            }
        });
        return;
    }
    
    if (pathname === '/api/search' && req.method === 'GET') {
        const query = parsedUrl.query.q;
        const type = parsedUrl.query.type || 'video';
        
        if (!query) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Запрос обязателен' }));
            return;
        }
        
        const results = DataManager.search(query, type);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(results));
        return;
    }
    
    if (pathname === '/api/recommendations' && req.method === 'GET') {
        const userId = parsedUrl.query.userId;
        const recommendations = DataManager.getRecommendations(userId);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(recommendations));
        return;
    }
    
    if (pathname === '/api/channel' && req.method === 'GET') {
        const userId = parsedUrl.query.userId;
        const channel = DataManager.getChannel(userId);
        
        if (!channel) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Канал не найден' }));
            return;
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(channel));
        return;
    }
    
    if (pathname === '/api/admin/stats' && req.method === 'GET') {
        const stats = DataManager.getAdminStats();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(stats));
        return;
    }
    
    if (pathname === '/api/admin/users' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(database.users));
        return;
    }
    
    if (pathname.startsWith('/api/admin/delete/') && req.method === 'DELETE') {
        const videoId = pathname.split('/')[4];
        const success = DataManager.deleteVideo(videoId);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success }));
        return;
    }
    
    // Статические файлы
    let filePath = '.' + pathname;
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
        case '.mp4':
            contentType = 'video/mp4';
            break;
        case '.webm':
            contentType = 'video/webm';
            break;
    }
    
    // Чтение файла
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // Файл не найден - возвращаем index.html для SPA
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

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 UsTube Server запущен на порту ${PORT}`);
    console.log(`🌐 Откройте в браузере: http://localhost:${PORT}`);
    console.log(`🔑 Админ доступ: admin@ustube.com / admin123`);
    console.log(`👥 Создано ${database.users.length} каналов`);
    console.log(`🎬 Загружено ${database.videos.length} видео`);
    console.log(`💬 Создано ${database.comments.length} комментариев`);
    console.log(`\n📢 Популярные каналы и пароли:`);
    console.log(`───────────────────────────────`);
    
    // Показываем логины для популярных каналов
    const popularChannels = [
        'UsTube Official', 'Мистер Бист', 'A4', 'Глент', 'Домер', 
        'Зени', 'Бефф', 'Тумка', 'Марк Робер', 'Владимир Куплинов'
    ];
    
    popularChannels.forEach(channelName => {
        const channel = database.users.find(u => u.channelName === channelName);
        if (channel) {
            // Для демо показываем пароли (в реальном проекте никогда не делайте этого!)
            const password = channel.email === 'admin@ustube.com' ? 'admin123' : 
                           channel.email === 'mrbeast@ustube.com' ? 'mrbeast123' :
                           channel.email === 'a4@ustube.com' ? 'a4123456' :
                           channel.email === 'grent@ustube.com' ? 'grent1234' :
                           channel.email === 'domer@ustube.com' ? 'domer1234' :
                           channel.email === 'zeni@ustube.com' ? 'zeni12345' :
                           channel.email === 'beff@ustube.com' ? 'beff12345' :
                           channel.email === 'tumka@ustube.com' ? 'tumka1234' :
                           channel.email === 'mark@ustube.com' ? 'mark12345' :
                           channel.email === 'kuplinov@ustube.com' ? 'kuplinov123' : 'password123';
            
            console.log(`👤 ${channel.channelName}`);
            console.log(`   📧 Email: ${channel.email}`);
            console.log(`   🔑 Пароль: ${password}`);
            console.log(`   👥 Подписчиков: ${channel.subscribers.toLocaleString()}`);
            console.log(`   🎬 Видео: ${channel.videos.length}`);
            console.log(`───────────────────────────────`);
        }
    });
});
