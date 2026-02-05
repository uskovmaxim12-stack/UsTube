require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            mediaSrc: ["'self'", "https:"]
        }
    }
}));

app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.ALLOWED_ORIGINS?.split(',') : '*',
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Статические файлы
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0'
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100 // лимит запросов
});
app.use('/api/', limiter);

// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ustube', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB подключена'))
  .catch(err => console.error('❌ Ошибка MongoDB:', err));

// Модели
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, minlength: 3 },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatar: { type: String, default: '' },
    subscribers: { type: Number, default: 0 },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date }
}, { timestamps: true });

const VideoSchema = new mongoose.Schema({
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, maxlength: 5000 },
    videoUrl: { type: String, required: true },
    thumbnailUrl: { type: String, required: true },
    duration: { type: Number, required: true },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    category: { type: String, required: true },
    tags: [{ type: String }],
    visibility: { type: String, enum: ['public', 'unlisted', 'private'], default: 'public' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    commentsEnabled: { type: Boolean, default: true },
    monetization: { type: Boolean, default: false }
}, { timestamps: true });

const CommentSchema = new mongoose.Schema({
    text: { type: String, required: true, maxlength: 1000 },
    videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    likes: { type: Number, default: 0 },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null }
}, { timestamps: true });

const SubscriptionSchema = new mongoose.Schema({
    subscriberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true, unique: true });

const ViewSchema = new mongoose.Schema({
    videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ip: { type: String },
    duration: { type: Number, default: 0 }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Video = mongoose.model('Video', VideoSchema);
const Comment = mongoose.model('Comment', CommentSchema);
const Subscription = mongoose.model('Subscription', SubscriptionSchema);
const View = mongoose.model('View', ViewSchema);

// JWT middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Требуется авторизация' });

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) return res.status(403).json({ error: 'Неверный токен' });
        req.user = user;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Требуются права администратора' });
    }
    next();
};

// Загрузка файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'public/uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /video\/|image\//;
        const isValid = allowedTypes.test(file.mimetype);
        cb(null, isValid);
    }
});

// Маршруты
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Аутентификация
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Все поля обязательны' });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(409).json({ error: 'Пользователь уже существует' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({
            username,
            email,
            password: hashedPassword,
            avatar: `https://ui-avatars.com/api/?name=${username}&background=random`
        });

        await user.save();

        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Неверные учетные данные' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Неверные учетные данные' });
        }

        user.lastLogin = new Date();
        await user.save();

        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Видео
app.get('/api/videos', async (req, res) => {
    try {
        const { page = 1, limit = 20, category, search, sort = 'newest' } = req.query;
        const skip = (page - 1) * limit;

        let query = { visibility: 'public' };
        
        if (category) query.category = category;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }

        let sortOption = {};
        switch(sort) {
            case 'popular': sortOption = { views: -1 }; break;
            case 'likes': sortOption = { likes: -1 }; break;
            default: sortOption = { createdAt: -1 };
        }

        const videos = await Video.find(query)
            .populate('userId', 'username avatar subscribers')
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Video.countDocuments(query);

        res.json({
            success: true,
            videos,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Get videos error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/videos/:id', async (req, res) => {
    try {
        const video = await Video.findById(req.params.id)
            .populate('userId', 'username avatar subscribers')
            .populate({
                path: 'comments',
                populate: { path: 'userId', select: 'username avatar' }
            });

        if (!video) {
            return res.status(404).json({ error: 'Видео не найдено' });
        }

        // Увеличиваем просмотры
        video.views += 1;
        await video.save();

        // Записываем просмотр
        const view = new View({
            videoId: video._id,
            ip: req.ip,
            userId: req.user?.id
        });
        await view.save();

        res.json({ success: true, video });
    } catch (error) {
        console.error('Get video error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/videos', authenticateToken, upload.single('video'), async (req, res) => {
    try {
        const { title, description, category, tags, visibility } = req.body;
        
        if (!title || !category) {
            return res.status(400).json({ error: 'Заполните обязательные поля' });
        }

        const video = new Video({
            title,
            description: description || '',
            videoUrl: `/uploads/${req.file.filename}`,
            thumbnailUrl: req.body.thumbnail || `/uploads/${req.file.filename}-thumb.jpg`,
            duration: req.body.duration || 0,
            category,
            tags: tags ? tags.split(',').map(t => t.trim()) : [],
            visibility: visibility || 'public',
            userId: req.user.id
        });

        await video.save();

        res.json({ 
            success: true, 
            video,
            message: 'Видео успешно загружено'
        });
    } catch (error) {
        console.error('Upload video error:', error);
        res.status(500).json({ error: 'Ошибка загрузки видео' });
    }
});

// Комментарии
app.get('/api/videos/:id/comments', async (req, res) => {
    try {
        const comments = await Comment.find({ videoId: req.params.id, parentId: null })
            .populate('userId', 'username avatar')
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({ success: true, comments });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка загрузки комментариев' });
    }
});

app.post('/api/videos/:id/comments', authenticateToken, async (req, res) => {
    try {
        const { text, parentId } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: 'Комментарий не может быть пустым' });
        }

        const video = await Video.findById(req.params.id);
        if (!video || !video.commentsEnabled) {
            return res.status(400).json({ error: 'Комментарии отключены' });
        }

        const comment = new Comment({
            text: text.trim(),
            videoId: req.params.id,
            userId: req.user.id,
            parentId: parentId || null
        });

        await comment.save();

        const populatedComment = await Comment.findById(comment._id)
            .populate('userId', 'username avatar');

        res.json({ success: true, comment: populatedComment });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ error: 'Ошибка добавления комментария' });
    }
});

// Лайки/дизлайки
app.post('/api/videos/:id/like', authenticateToken, async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) return res.status(404).json({ error: 'Видео не найдено' });

        // В реальном приложении нужно проверять, лайкал ли уже пользователь
        video.likes += 1;
        await video.save();

        res.json({ success: true, likes: video.likes });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Подписки
app.post('/api/channels/:id/subscribe', authenticateToken, async (req, res) => {
    try {
        const channelId = req.params.id;
        const subscriberId = req.user.id;

        if (channelId === subscriberId) {
            return res.status(400).json({ error: 'Нельзя подписаться на себя' });
        }

        const existing = await Subscription.findOne({ subscriberId, channelId });
        
        if (existing) {
            await existing.deleteOne();
            await User.findByIdAndUpdate(channelId, { $inc: { subscribers: -1 } });
            res.json({ success: true, subscribed: false });
        } else {
            const subscription = new Subscription({ subscriberId, channelId });
            await subscription.save();
            await User.findByIdAndUpdate(channelId, { $inc: { subscribers: 1 } });
            res.json({ success: true, subscribed: true });
        }
    } catch (error) {
        console.error('Subscribe error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Админ API
app.get('/api/admin/stats', authenticateToken, isAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalVideos = await Video.countDocuments();
        const totalViews = await View.countDocuments();
        const totalComments = await Comment.countDocuments();

        const recentUsers = await User.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select('-password');

        const popularVideos = await Video.find()
            .sort({ views: -1 })
            .limit(10)
            .populate('userId', 'username');

        const recentActivity = await View.find()
            .sort({ createdAt: -1 })
            .limit(20)
            .populate('videoId', 'title')
            .populate('userId', 'username');

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalVideos,
                totalViews,
                totalComments,
                recentUsers,
                popularVideos,
                recentActivity
            }
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.delete('/api/admin/videos/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const video = await Video.findByIdAndDelete(req.params.id);
        if (!video) return res.status(404).json({ error: 'Видео не найдено' });

        // Удаляем связанные данные
        await Comment.deleteMany({ videoId: req.params.id });
        await View.deleteMany({ videoId: req.params.id });

        // Удаляем файлы
        try {
            if (video.videoUrl.startsWith('/uploads/')) {
                fs.unlinkSync(path.join(__dirname, 'public', video.videoUrl));
            }
            if (video.thumbnailUrl.startsWith('/uploads/')) {
                fs.unlinkSync(path.join(__dirname, 'public', video.thumbnailUrl));
            }
        } catch (fileError) {
            console.error('File deletion error:', fileError);
        }

        res.json({ success: true, message: 'Видео удалено' });
    } catch (error) {
        console.error('Delete video error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Статистика
app.get('/api/stats', async (req, res) => {
    try {
        const stats = {
            totalVideos: await Video.countDocuments(),
            totalUsers: await User.countDocuments(),
            totalViews: await View.countDocuments(),
            serverUptime: process.uptime(),
            timestamp: new Date().toISOString()
        };
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// SPA маршрут
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: 'Ошибка загрузки файла' });
    }
    
    res.status(500).json({ 
        error: 'Внутренняя ошибка сервера',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Создание админа при первом запуске
async function createAdminUser() {
    try {
        const adminExists = await User.findOne({ role: 'admin' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('140612', 10);
            const admin = new User({
                username: 'admin',
                email: 'admin@ustube.com',
                password: hashedPassword,
                role: 'admin',
                avatar: 'https://ui-avatars.com/api/?name=Admin&background=ff0000&color=fff'
            });
            await admin.save();
            console.log('👑 Админ пользователь создан: admin / 140612');
        }
    } catch (error) {
        console.error('Admin creation error:', error);
    }
}

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🎬 USTube Server запущен!                                 ║
║                                                              ║
║   🔗 Порт: ${PORT}                                         ║
║   🚀 Режим: ${process.env.NODE_ENV || 'development'}               ║
║   🗄️  База: MongoDB                                        ║
║   👑 Админ: admin / 140612                                  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `);
    
    await createAdminUser();
});
