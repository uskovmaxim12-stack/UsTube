const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

class VideoPlatformServer {
    constructor(port = 3000) {
        this.port = port;
        this.users = new Map();
        this.videos = new Map();
        this.comments = new Map();
        this.sessions = new Map();
        this.stats = {
            totalViews: 0,
            totalVideos: 0,
            totalUsers: 0,
            totalComments: 0
        };
        this.initData();
    }

    initData() {
        // Инициализация демо данных
        const demoUsers = [
            { id: 'user1', username: 'creator1', email: 'creator1@example.com', password: this.hashPassword('password123'), role: 'creator', createdAt: Date.now() },
            { id: 'user2', username: 'viewer1', email: 'viewer1@example.com', password: this.hashPassword('password123'), role: 'viewer', createdAt: Date.now() },
            { id: 'user3', username: 'admin', email: 'admin@example.com', password: this.hashPassword('admin123'), role: 'admin', createdAt: Date.now() }
        ];

        const demoVideos = [
            {
                id: 'video1',
                title: 'ИИ инструменты 2026: полный обзор',
                description: 'Обзор всех AI-инструментов платформы на 2026 год',
                authorId: 'user1',
                views: 15000,
                likes: 1200,
                dislikes: 25,
                duration: 600,
                format: 'long',
                tags: ['AI', '2026', 'инструменты'],
                createdAt: Date.now() - 86400000,
                thumbnail: 'ai_tools_thumb'
            },
            {
                id: 'video2',
                title: 'Shorts за 60 секунд',
                description: 'Как создавать вирусные Shorts',
                authorId: 'user1',
                views: 500000,
                likes: 45000,
                dislikes: 300,
                duration: 60,
                format: 'short',
                tags: ['Shorts', 'вирусный'],
                createdAt: Date.now() - 172800000,
                thumbnail: 'shorts_thumb'
            },
            {
                id: 'video3', 
                title: 'Прямой эфир с ИИ дубляжом',
                description: 'Демонстрация нейродубляжа в реальном времени',
                authorId: 'user1',
                views: 75000,
                likes: 5000,
                dislikes: 45,
                duration: 3600,
                format: 'live',
                tags: ['live', 'AI', 'дубляж'],
                createdAt: Date.now() - 43200000,
                thumbnail: 'live_thumb'
            }
        ];

        const demoComments = [
            { id: 'comment1', videoId: 'video1', userId: 'user2', text: 'Отличный обзор! Жду новых инструментов', likes: 45, createdAt: Date.now() - 43200000 },
            { id: 'comment2', videoId: 'video1', userId: 'user3', text: 'Интересно, когда выйдут эти функции', likes: 12, createdAt: Date.now() - 21600000 },
            { id: 'comment3', videoId: 'video2', userId: 'user2', text: 'Попробовал создать Shorts - получилось круто!', likes: 78, createdAt: Date.now() - 86400000 }
        ];

        demoUsers.forEach(user => this.users.set(user.id, user));
        demoVideos.forEach(video => this.videos.set(video.id, video));
        demoComments.forEach(comment => this.comments.set(comment.id, comment));
        
        this.stats.totalUsers = demoUsers.length;
        this.stats.totalVideos = demoVideos.length;
        this.stats.totalComments = demoComments.length;
        this.stats.totalViews = demoVideos.reduce((sum, v) => sum + v.views, 0);
    }

    hashPassword(password) {
        return crypto.createHash('sha256').update(password).digest('hex');
    }

    createSession(userId) {
        const sessionId = crypto.randomBytes(16).toString('hex');
        this.sessions.set(sessionId, { userId, createdAt: Date.now() });
        return sessionId;
    }

    validateSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return null;
        if (Date.now() - session.createdAt > 86400000) {
            this.sessions.delete(sessionId);
            return null;
        }
        return session.userId;
    }

    start() {
        const server = http.createServer((req, res) => {
            const parsedUrl = url.parse(req.url, true);
            const method = req.method;
            const path = parsedUrl.pathname;
            
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
            if (path === '/' || path === '/index.html') {
                this.serveDashboard(req, res);
            } else if (path.startsWith('/api/')) {
                this.handleApi(req, res, parsedUrl);
            } else if (path.startsWith('/video/')) {
                this.serveVideoPage(req, res, parsedUrl);
            } else if (path.startsWith('/studio')) {
                this.serveCreatorStudio(req, res);
            } else if (path.startsWith('/login')) {
                this.serveLoginPage(req, res);
            } else if (path.startsWith('/register')) {
                this.serveRegisterPage(req, res);
            } else {
                this.serve404(req, res);
            }
        });

        server.listen(this.port, () => {
            console.log(`🚀 Сервер запущен: http://localhost:${this.port}`);
            console.log(`📊 API: http://localhost:${this.port}/api/stats`);
            console.log(`👤 Демо аккаунт: creator1 / password123`);
        });
    }

    serveDashboard(req, res) {
        const html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Платформа Видеохостинга</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #0f0f0f; 
            color: #fff; 
            line-height: 1.6;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        
        /* Навигация */
        .navbar { 
            background: rgba(0,0,0,0.9); 
            backdrop-filter: blur(10px);
            position: fixed; 
            top: 0; left: 0; right: 0; 
            z-index: 1000;
            border-bottom: 1px solid #272727;
        }
        .nav-content { 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            padding: 0 20px;
            height: 60px;
        }
        .logo { 
            display: flex; 
            align-items: center; 
            gap: 10px;
            font-size: 1.5rem; 
            font-weight: bold; 
            color: #ff0000;
        }
        .nav-links { display: flex; gap: 30px; }
        .nav-link { 
            color: #fff; 
            text-decoration: none; 
            padding: 8px 16px;
            border-radius: 20px;
            transition: background 0.3s;
        }
        .nav-link:hover { background: #272727; }
        .btn { 
            background: #ff0000; 
            color: white; 
            border: none; 
            padding: 10px 20px;
            border-radius: 20px; 
            cursor: pointer; 
            font-weight: 500;
            transition: background 0.3s;
        }
        .btn:hover { background: #cc0000; }
        
        /* Герой */
        .hero { 
            margin-top: 80px; 
            padding: 60px 0;
            background: linear-gradient(135deg, #ff0000, #065fd4);
            position: relative;
            overflow: hidden;
        }
        .hero-content { text-align: center; }
        .hero h1 { font-size: 3rem; margin-bottom: 20px; }
        .hero p { font-size: 1.2rem; opacity: 0.9; max-width: 600px; margin: 0 auto 30px; }
        
        /* Статистика */
        .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 20px;
            margin: 40px 0;
        }
        .stat-card { 
            background: #272727; 
            padding: 30px; 
            border-radius: 10px;
            text-align: center;
        }
        .stat-number { 
            font-size: 2.5rem; 
            font-weight: bold; 
            color: #ff0000;
            margin-bottom: 10px;
        }
        
        /* Видео сетка */
        .videos-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px; 
            margin: 40px 0;
        }
        .video-card { 
            background: #272727; 
            border-radius: 10px;
            overflow: hidden;
            transition: transform 0.3s;
        }
        .video-card:hover { transform: translateY(-5px); }
        .video-thumb { 
            width: 100%; 
            height: 180px; 
            background: linear-gradient(45deg, #ff0000, #065fd4);
            position: relative;
        }
        .video-duration { 
            position: absolute; 
            bottom: 10px; 
            right: 10px;
            background: rgba(0,0,0,0.8); 
            padding: 2px 6px;
            border-radius: 3px; 
            font-size: 0.8rem;
        }
        .video-info { padding: 15px; }
        .video-title { 
            font-weight: 500; 
            margin-bottom: 8px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        .video-meta { 
            display: flex; 
            justify-content: space-between;
            color: #aaa; 
            font-size: 0.9rem;
        }
        
        /* Форматы */
        .formats { margin: 60px 0; }
        .format-tabs { 
            display: flex; 
            gap: 10px; 
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        .format-tab { 
            background: #272727; 
            border: none; 
            color: #fff;
            padding: 10px 20px; 
            border-radius: 20px;
            cursor: pointer;
            transition: background 0.3s;
        }
        .format-tab.active { background: #ff0000; }
        
        /* Монетизация */
        .revenue-chart { 
            background: #272727; 
            padding: 30px; 
            border-radius: 10px;
            margin: 40px 0;
        }
        .chart-bars { 
            display: flex; 
            height: 200px; 
            align-items: flex-end;
            gap: 20px; 
            margin-top: 20px;
        }
        .chart-bar { 
            flex: 1; 
            background: linear-gradient(to top, #ff0000, #065fd4);
            border-radius: 5px 5px 0 0;
            min-height: 20px;
            position: relative;
        }
        .bar-label { 
            position: absolute; 
            bottom: -25px;
            left: 0; right: 0; 
            text-align: center;
            font-size: 0.9rem;
        }
        
        /* Адаптивность */
        @media (max-width: 768px) {
            .hero h1 { font-size: 2rem; }
            .nav-links { display: none; }
            .stats-grid { grid-template-columns: 1fr; }
        }
        
        /* Утилиты */
        .section { margin: 60px 0; }
        .section-title { 
            font-size: 2rem; 
            margin-bottom: 30px;
            border-left: 4px solid #ff0000;
            padding-left: 15px;
        }
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .items-center { align-items: center; }
        .justify-between { justify-content: space-between; }
        .gap-4 { gap: 1rem; }
        .p-4 { padding: 1rem; }
        .m-4 { margin: 1rem; }
        .text-center { text-align: center; }
    </style>
</head>
<body>
    <nav class="navbar">
        <div class="nav-content container">
            <div class="logo">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#ff0000">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                </svg>
                <span>VideoPlatform</span>
            </div>
            <div class="nav-links">
                <a href="#stats" class="nav-link">Статистика</a>
                <a href="#videos" class="nav-link">Видео</a>
                <a href="#formats" class="nav-link">Форматы</a>
                <a href="#monetization" class="nav-link">Монетизация</a>
                <a href="/studio" class="nav-link">Студия</a>
                <a href="/login" class="nav-link">Войти</a>
            </div>
            <button class="btn" onclick="uploadVideo()">Загрузить видео</button>
        </div>
    </nav>

    <div class="hero">
        <div class="hero-content container">
            <h1>Крупнейшая платформа видеохостинга</h1>
            <p>Полное исследование экосистемы: 2.7B+ пользователей, $100B+ выплат авторам, AI-инструменты 2026</p>
            <div class="stats-grid" id="stats">
                <div class="stat-card">
                    <div class="stat-number" id="totalUsers">2.7B+</div>
                    <div>Пользователей</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="totalViews">200B+</div>
                    <div>Просмотров в день</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="totalRevenue">$100B+</div>
                    <div>Выплат авторам</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="totalVideos">500M+</div>
                    <div>Часов контента</div>
                </div>
            </div>
        </div>
    </div>

    <div class="container">
        <!-- Рекомендации -->
        <section class="section" id="videos">
            <h2 class="section-title">Рекомендации для вас</h2>
            <div class="videos-grid" id="videosContainer">
                <!-- Видео загружаются через JavaScript -->
            </div>
        </section>

        <!-- Форматы контента -->
        <section class="section" id="formats">
            <h2 class="section-title">Форматы контента</h2>
            <div class="format-tabs">
                <button class="format-tab active" onclick="showFormat('long')">Длинные видео</button>
                <button class="format-tab" onclick="showFormat('short')">Shorts</button>
                <button class="format-tab" onclick="showFormat('live')">Трансляции</button>
                <button class="format-tab" onclick="showFormat('podcast')">Подкасты</button>
            </div>
            <div class="formats-content">
                <div id="formatLong" class="format-content active">
                    <h3>Основной исторический формат</h3>
                    <p>Горизонтальные видео с таймкодами, описанием, конечной заставкой.</p>
                    <p><strong>Инновации 2026:</strong> Замена устаревших брендированных сегментов</p>
                </div>
                <div id="formatShort" class="format-content">
                    <h3>Shorts - вертикальные видео до 60 сек</h3>
                    <p>Бесконечная лента коротких видео. Ключевой инструмент для вирусного распространения.</p>
                    <p><strong>ИИ-инструменты 2026:</strong> Veo 3 Fast, анимация фото, стилизация, добавление объектов</p>
                </div>
                <div id="formatLive" class="format-content">
                    <h3>Прямые трансляции</h3>
                    <p>Эфиры в реальном времени с общим чатом и монетизацией.</p>
                    <p><strong>Обновления 2026:</strong> Режим репетиции, комбинированный эфир, React Live</p>
                </div>
                <div id="formatPodcast" class="format-content">
                    <h3>Аудио и видео подкасты</h3>
                    <p>Полная интеграция в экосистему платформы.</p>
                </div>
            </div>
        </section>

        <!-- Монетизация -->
        <section class="section" id="monetization">
            <h2 class="section-title">Экономика создателей</h2>
            <div class="revenue-chart">
                <h3>Доходы авторов (последние 4 года)</h3>
                <div class="chart-bars">
                    <div class="chart-bar" style="height: 100%">
                        <div class="bar-label">AdSense<br>$100B+</div>
                    </div>
                    <div class="chart-bar" style="height: 70%">
                        <div class="bar-label">Фан-финансирование</div>
                    </div>
                    <div class="chart-bar" style="height: 60%">
                        <div class="bar-label">Брендированный контент</div>
                    </div>
                    <div class="chart-bar" style="height: 40%">
                        <div class="bar-label">Прямой шоппинг</div>
                    </div>
                </div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <h4>Партнёрская программа</h4>
                    <p>Доход от рекламы в видео. Выплачено более $100 млрд за 4 года.</p>
                </div>
                <div class="stat-card">
                    <h4>Фан-финансирование</h4>
                    <p>Super Chat, Super Thanks, Членство в канале, Jewels, Gifts.</p>
                </div>
                <div class="stat-card">
                    <h4>Обновляемый контент</h4>
                    <p>Замена устаревших рекламных сегментов в архивных видео.</p>
                </div>
                <div class="stat-card">
                    <h4>Прямой шоппинг</h4>
                    <p>Покупка товаров прямо в приложении (2026).</p>
                </div>
            </div>
        </section>

        <!-- ИИ инструменты -->
        <section class="section">
            <h2 class="section-title">ИИ-инструменты 2024-2026</h2>
            <div class="videos-grid">
                <div class="video-card">
                    <div class="video-thumb"></div>
                    <div class="video-info">
                        <h4>Нейродубляж</h4>
                        <p>Автоматический перевод с сохранением голоса (27 языков)</p>
                        <small>Expressive Speech + Lip Sync</small>
                    </div>
                </div>
                <div class="video-card">
                    <div class="video-thumb"></div>
                    <div class="video-info">
                        <h4>ИИ для Shorts</h4>
                        <p>Veo 3 Fast: анимация фото, стилизация, добавление объектов</p>
                        <small>Speech to Song</small>
                    </div>
                </div>
                <div class="video-card">
                    <div class="video-thumb"></div>
                    <div class="video-info">
                        <h4>Цифровой двойник</h4>
                        <p>Генерация контента в Shorts с ИИ-образом автора</p>
                        <small>2026</small>
                    </div>
                </div>
                <div class="video-card">
                    <div class="video-thumb"></div>
                    <div class="video-info">
                        <h4>Игры по запросу</h4>
                        <p>Создание мини-игр в плеере по текстовому описанию</p>
                        <small>В разработке</small>
                    </div>
                </div>
            </div>
        </section>
    </div>

    <script>
        // Глобальные переменные
        let currentUser = null;
        let videosData = [];
        let commentsData = [];

        // Инициализация
        document.addEventListener('DOMContentLoaded', async () => {
            await loadVideos();
            await loadStats();
            updateUI();
        });

        // Загрузка видео
        async function loadVideos() {
            try {
                const response = await fetch('/api/videos');
                const data = await response.json();
                videosData = data.videos;
                displayVideos(videosData);
            } catch (error) {
                console.error('Ошибка загрузки видео:', error);
                // Демо данные
                videosData = [
                    {id: '1', title: 'ИИ инструменты 2026', views: 15000, likes: 1200, duration: '10:00', author: 'AI Explorer'},
                    {id: '2', title: 'Shorts за 60 секунд', views: 500000, likes: 45000, duration: '1:00', author: 'Shorts Pro'},
                    {id: '3', title: 'Прямой эфир с дубляжом', views: 75000, likes: 5000, duration: '1:00:00', author: 'Live Master'},
                    {id: '4', title: 'Монетизация 2026', views: 89000, likes: 3200, duration: '15:30', author: 'Money Expert'}
                ];
                displayVideos(videosData);
            }
        }

        // Отображение видео
        function displayVideos(videos) {
            const container = document.getElementById('videosContainer');
            container.innerHTML = videos.map(video => \`
                <div class="video-card" onclick="watchVideo('\${video.id}')">
                    <div class="video-thumb">
                        <div class="video-duration">\${video.duration}</div>
                    </div>
                    <div class="video-info">
                        <h3 class="video-title">\${video.title}</h3>
                        <div class="video-meta">
                            <span>\${video.author}</span>
                            <span>\${formatNumber(video.views)} просмотров</span>
                        </div>
                        <div class="video-meta">
                            <span>♥ \${formatNumber(video.likes)}</span>
                            <span>\${video.comments || 0} комментариев</span>
                        </div>
                    </div>
                </div>
            \`).join('');
        }

        // Загрузка статистики
        async function loadStats() {
            try {
                const response = await fetch('/api/stats');
                const data = await response.json();
                
                document.getElementById('totalUsers').textContent = data.totalUsers + 'B+';
                document.getElementById('totalViews').textContent = data.totalViews + 'B+';
                document.getElementById('totalRevenue').textContent = '$' + data.totalRevenue + 'B+';
                document.getElementById('totalVideos').textContent = data.totalVideos + 'M+';
            } catch (error) {
                console.error('Ошибка загрузки статистики:', error);
            }
        }

        // Просмотр видео
        function watchVideo(videoId) {
            window.location.href = \`/video/\${videoId}\`;
        }

        // Показ формата
        function showFormat(format) {
            document.querySelectorAll('.format-tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.format-content').forEach(content => content.classList.remove('active'));
            
            event.target.classList.add('active');
            document.getElementById(\`format\${format.charAt(0).toUpperCase() + format.slice(1)}\`).classList.add('active');
        }

        // Загрузка видео (симуляция)
        function uploadVideo() {
            if (!currentUser) {
                alert('Войдите в систему для загрузки видео');
                window.location.href = '/login';
                return;
            }
            
            const title = prompt('Введите название видео:');
            if (title) {
                alert(\`Видео "\${title}" отправлено на обработку!\nОно появится в студии после модерации.\`);
            }
        }

        // Форматирование чисел
        function formatNumber(num) {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
            return num.toString();
        }

        // Обновление UI
        function updateUI() {
            const loginBtn = document.querySelector('a[href="/login"]');
            if (currentUser) {
                loginBtn.textContent = currentUser.username;
                loginBtn.href = '/studio';
            }
        }

        // API вызовы
        async function apiCall(endpoint, method = 'GET', data = null) {
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            };
            
            if (data) options.body = JSON.stringify(data);
            
            const response = await fetch(\`/api\${endpoint}\`, options);
            return await response.json();
        }
    </script>
</body>
</html>`;
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    }

    serveVideoPage(req, res, parsedUrl) {
        const videoId = parsedUrl.pathname.split('/')[2];
        const video = this.videos.get(videoId) || {
            id: videoId,
            title: 'Видео не найдено',
            description: 'Это видео было удалено или никогда не существовало',
            views: 0,
            likes: 0,
            dislikes: 0,
            authorId: 'unknown'
        };

        const author = this.users.get(video.authorId) || { username: 'Неизвестный автор' };
        const videoComments = Array.from(this.comments.values())
            .filter(c => c.videoId === videoId)
            .sort((a, b) => b.createdAt - a.createdAt);

        const html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${video.title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0f0f0f; color: #fff; font-family: sans-serif; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .video-container { display: flex; gap: 20px; }
        .video-player { flex: 2; }
        .video-sidebar { flex: 1; }
        .player { width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 10px; }
        .video-info { margin: 20px 0; }
        .video-title { font-size: 1.5rem; margin-bottom: 10px; }
        .video-stats { display: flex; gap: 20px; color: #aaa; margin-bottom: 20px; }
        .video-actions { display: flex; gap: 10px; margin-bottom: 20px; }
        .btn { background: #272727; border: none; color: #fff; padding: 8px 16px; border-radius: 20px; cursor: pointer; }
        .btn-like { background: #ff0000; }
        .channel-info { display: flex; align-items: center; gap: 15px; margin: 20px 0; }
        .channel-avatar { width: 50px; height: 50px; border-radius: 50%; background: #ff0000; }
        .comments { margin-top: 30px; }
        .comment { display: flex; gap: 15px; margin-bottom: 20px; }
        .comment-avatar { width: 40px; height: 40px; border-radius: 50%; background: #272727; }
        .comment-content { flex: 1; }
        .comment-text { margin: 5px 0; }
        .comment-actions { display: flex; gap: 15px; color: #aaa; font-size: 0.9rem; }
        .sidebar-video { display: flex; gap: 10px; margin-bottom: 15px; cursor: pointer; }
        .sidebar-thumb { width: 120px; height: 68px; background: #272727; border-radius: 5px; }
        .sidebar-info { flex: 1; }
        .sidebar-title { font-size: 0.9rem; margin-bottom: 5px; }
        .sidebar-channel { font-size: 0.8rem; color: #aaa; }
        .back-btn { background: #272727; color: #fff; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <button class="back-btn" onclick="window.history.back()">← Назад</button>
        
        <div class="video-container">
            <div class="video-player">
                <div class="player">
                    <!-- Видео плеер -->
                    <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #aaa;">
                        <div style="text-align: center;">
                            <div style="font-size: 3rem; margin-bottom: 10px;">▶️</div>
                            <div>Видео плеер</div>
                            <div style="font-size: 0.9rem; margin-top: 10px;">ID: ${video.id}</div>
                        </div>
                    </div>
                </div>
                
                <div class="video-info">
                    <h1 class="video-title">${video.title}</h1>
                    <div class="video-stats">
                        <span>${this.formatNumber(video.views)} просмотров</span>
                        <span>${new Date(video.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    <div class="video-actions">
                        <button class="btn btn-like" onclick="likeVideo('${video.id}')">
                            ♥ ${this.formatNumber(video.likes)}
                        </button>
                        <button class="btn" onclick="dislikeVideo('${video.id}')">
                            👎 ${this.formatNumber(video.dislikes)}
                        </button>
                        <button class="btn" onclick="shareVideo('${video.id}')">
                            📤 Поделиться
                        </button>
                        <button class="btn" onclick="saveVideo('${video.id}')">
                            💾 Сохранить
                        </button>
                    </div>
                    
                    <div class="channel-info">
                        <div class="channel-avatar"></div>
                        <div>
                            <h3>${author.username}</h3>
                            <p>${this.formatNumber(author.subscribers || 10000)} подписчиков</p>
                        </div>
                        <button class="btn btn-like">Подписаться</button>
                    </div>
                    
                    <div class="video-description">
                        <p>${video.description}</p>
                        <p><strong>Теги:</strong> ${(video.tags || []).join(', ')}</p>
                    </div>
                </div>
                
                <div class="comments">
                    <h3>Комментарии (${videoComments.length})</h3>
                    <div style="margin: 20px 0;">
                        <input type="text" id="commentInput" placeholder="Добавьте комментарий..." 
                               style="width: 100%; padding: 10px; background: #272727; border: none; border-radius: 20px; color: #fff;">
                        <button class="btn" onclick="postComment()" style="margin-top: 10px;">Комментировать</button>
                    </div>
                    
                    ${videoComments.map(comment => {
                        const commentUser = this.users.get(comment.userId) || { username: 'Аноним' };
                        return `
                        <div class="comment">
                            <div class="comment-avatar"></div>
                            <div class="comment-content">
                                <div style="display: flex; justify-content: space-between;">
                                    <strong>${commentUser.username}</strong>
                                    <span style="color: #aaa; font-size: 0.9rem;">
                                        ${this.timeAgo(comment.createdAt)}
                                    </span>
                                </div>
                                <p class="comment-text">${comment.text}</p>
                                <div class="comment-actions">
                                    <span onclick="likeComment('${comment.id}')">♥ ${comment.likes || 0}</span>
                                    <span onclick="replyTo('${commentUser.username}')">Ответить</span>
                                </div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
            
            <div class="video-sidebar">
                <h3>Рекомендуемые</h3>
                ${Array.from(this.videos.values())
                    .filter(v => v.id !== videoId)
                    .slice(0, 5)
                    .map(recVideo => {
                        const recAuthor = this.users.get(recVideo.authorId) || { username: 'Автор' };
                        return `
                        <div class="sidebar-video" onclick="window.location='/video/${recVideo.id}'">
                            <div class="sidebar-thumb"></div>
                            <div class="sidebar-info">
                                <div class="sidebar-title">${recVideo.title}</div>
                                <div class="sidebar-channel">${recAuthor.username}</div>
                                <div style="color: #aaa; font-size: 0.8rem;">
                                    ${this.formatNumber(recVideo.views)} просмотров • 
                                    ${this.timeAgo(recVideo.createdAt)}
                                </div>
                            </div>
                        </div>`;
                    }).join('')}
            </div>
        </div>
    </div>
    
    <script>
        function likeVideo(videoId) {
            fetch(\`/api/video/\${videoId}/like\`, { method: 'POST' })
                .then(() => location.reload());
        }
        
        function dislikeVideo(videoId) {
            fetch(\`/api/video/\${videoId}/dislike\`, { method: 'POST' })
                .then(() => location.reload());
        }
        
        function postComment() {
            const input = document.getElementById('commentInput');
            const text = input.value.trim();
            if (!text) return;
            
            fetch(\`/api/video/${videoId}/comment\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            }).then(() => location.reload());
        }
        
        function likeComment(commentId) {
            fetch(\`/api/comment/\${commentId}/like\`, { method: 'POST' });
        }
        
        function replyTo(username) {
            const input = document.getElementById('commentInput');
            input.value = \`@\${username} \`;
            input.focus();
        }
        
        function shareVideo(videoId) {
            const url = window.location.href;
            navigator.clipboard.writeText(url);
            alert('Ссылка скопирована в буфер обмена!');
        }
        
        function saveVideo(videoId) {
            alert('Видео добавлено в "Смотреть позже"');
        }
    </script>
</body>
</html>`;

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    }

    serveCreatorStudio(req, res) {
        const html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Творческая студия</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0f0f0f; color: #fff; font-family: sans-serif; }
        .studio { display: flex; height: 100vh; }
        .sidebar { width: 250px; background: #1a1a1a; padding: 20px; }
        .main { flex: 1; padding: 20px; }
        .logo { color: #ff0000; font-size: 1.5rem; margin-bottom: 30px; }
        .menu-item { padding: 10px; margin: 5px 0; border-radius: 5px; cursor: pointer; }
        .menu-item:hover { background: #272727; }
        .menu-item.active { background: #ff0000; }
        .dashboard { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { background: #272727; padding: 20px; border-radius: 10px; }
        .stat { font-size: 2rem; color: #ff0000; margin: 10px 0; }
        .upload-area { border: 2px dashed #444; border-radius: 10px; padding: 40px; text-align: center; margin: 20px 0; }
        .upload-btn { background: #ff0000; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
        .video-list { margin-top: 20px; }
        .video-item { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #333; }
        .btn { background: #444; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-left: 5px; }
        .btn-primary { background: #ff0000; }
        .modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); align-items: center; justify-content: center; }
        .modal.active { display: flex; }
        .modal-content { background: #272727; padding: 30px; border-radius: 10px; width: 400px; }
        .form-group { margin-bottom: 15px; }
        .form-input { width: 100%; padding: 10px; background: #1a1a1a; border: 1px solid #444; border-radius: 5px; color: #fff; }
        .form-label { display: block; margin-bottom: 5px; }
    </style>
</head>
<body>
    <div class="studio">
        <div class="sidebar">
            <div class="logo">🎬 Студия</div>
            <div class="menu-item active" onclick="showSection('dashboard')">📊 Дашборд</div>
            <div class="menu-item" onclick="showSection('content')">🎥 Контент</div>
            <div class="menu-item" onclick="showSection('analytics')">📈 Аналитика</div>
            <div class="menu-item" onclick="showSection('monetization')">💰 Монетизация</div>
            <div class="menu-item" onclick="showSection('comments')">💬 Комментарии</div>
            <div class="menu-item" onclick="showSection('settings')">⚙️ Настройки</div>
            <div class="menu-item" onclick="window.location='/'">🏠 На главную</div>
        </div>
        
        <div class="main">
            <!-- Дашборд -->
            <div id="dashboard" class="section active">
                <h2>Обзор канала</h2>
                <div class="dashboard">
                    <div class="card">
                        <h3>Просмотры за 28 дней</h3>
                        <div class="stat">1.2M</div>
                        <div>↑ 15% за месяц</div>
                    </div>
                    <div class="card">
                        <h3>Подписчики</h3>
                        <div class="stat">45.8K</div>
                        <div>↑ 1,245 за месяц</div>
                    </div>
                    <div class="card">
                        <h3>Доход (28 дней)</h3>
                        <div class="stat">$1,245</div>
                        <div>↑ $150 за месяц</div>
                    </div>
                    <div class="card">
                        <h3>Время просмотра</h3>
                        <div class="stat">45K часов</div>
                        <div>↑ 12% за месяц</div>
                    </div>
                </div>
                
                <div class="card" style="margin-top: 20px;">
                    <h3>Быстрая загрузка</h3>
                    <div class="upload-area">
                        <p>Перетащите видео файлы сюда</p>
                        <p>или</p>
                        <button class="upload-btn" onclick="showUploadModal()">Выбрать файлы</button>
                        <p style="margin-top: 10px; font-size: 0.9rem; color: #aaa;">
                            Поддерживаются: MP4, MOV, AVI (до 256GB)
                        </p>
                    </div>
                </div>
            </div>
            
            <!-- Контент -->
            <div id="content" class="section">
                <h2>Мои видео</h2>
                <button class="upload-btn" onclick="showUploadModal()">+ Загрузить видео</button>
                
                <div class="video-list">
                    <div class="video-item">
                        <div>
                            <strong>ИИ инструменты 2026: полный обзор</strong>
                            <div style="color: #aaa; font-size: 0.9rem;">
                                15K просмотров • 1.2K лайков • Опубликовано 2 дня назад
                            </div>
                        </div>
                        <div>
                            <button class="btn" onclick="editVideo('video1')">✏️</button>
                            <button class="btn" onclick="analyticsVideo('video1')">📊</button>
                            <button class="btn btn-primary" onclick="promoteVideo('video1')">🚀</button>
                        </div>
                    </div>
                    <div class="video-item">
                        <div>
                            <strong>Shorts за 60 секунд</strong>
                            <div style="color: #aaa; font-size: 0.9rem;">
                                500K просмотров • 45K лайков • Опубликовано 1 неделю назад
                            </div>
                        </div>
                        <div>
                            <button class="btn">✏️</button>
                            <button class="btn">📊</button>
                            <button class="btn btn-primary">🚀</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Аналитика -->
            <div id="analytics" class="section">
                <h2>Аналитика</h2>
                <div class="card">
                    <h3>Источники трафика</h3>
                    <div style="margin: 20px 0;">
                        <div style="display: flex; align-items: center; margin: 10px 0;">
                            <div style="width: 200px;">Рекомендации</div>
                            <div style="flex: 1; height: 20px; background: #444; border-radius: 10px;">
                                <div style="width: 65%; height: 100%; background: #ff0000; border-radius: 10px;"></div>
                            </div>
                            <div style="margin-left: 10px;">65%</div>
                        </div>
                        <div style="display: flex; align-items: center; margin: 10px 0;">
                            <div style="width: 200px;">Поиск</div>
                            <div style="flex: 1; height: 20px; background: #444; border-radius: 10px;">
                                <div style="width: 20%; height: 100%; background: #065fd4; border-radius: 10px;"></div>
                            </div>
                            <div style="margin-left: 10px;">20%</div>
                        </div>
                    </div>
                </div>
                
                <div class="card" style="margin-top: 20px;">
                    <h3>Демография аудитории</h3>
                    <div style="display: flex; gap: 20px; margin-top: 15px;">
                        <div>
                            <h4>Возраст</h4>
                            <div>18-24: 35%</div>
                            <div>25-34: 45%</div>
                            <div>35-44: 15%</div>
                        </div>
                        <div>
                            <h4>Пол</h4>
                            <div>Мужчины: 65%</div>
                            <div>Женщины: 35%</div>
                        </div>
                        <div>
                            <h4>Топ страны</h4>
                            <div>Россия: 40%</div>
                            <div>Украина: 15%</div>
                            <div>Беларусь: 10%</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Монетизация -->
            <div id="monetization" class="section">
                <h2>Монетизация</h2>
                <div class="dashboard">
                    <div class="card">
                        <h3>Партнёрская программа</h3>
                        <div class="stat">$1,245</div>
                        <div>Доход за 28 дней</div>
                        <button class="btn btn-primary" style="margin-top: 10px;">Настроить</button>
                    </div>
                    <div class="card">
                        <h3>Членство в канале</h3>
                        <div class="stat">245</div>
                        <div>Участников</div>
                        <button class="btn" style="margin-top: 10px;">Управлять</button>
                    </div>
                    <div class="card">
                        <h3>Super Chat</h3>
                        <div class="stat">$350</div>
                        <div>За все время</div>
                    </div>
                </div>
                
                <div class="card" style="margin-top: 20px;">
                    <h3>Новые форматы 2026</h3>
                    <div style="display: flex; gap: 20px; margin-top: 15px;">
                        <div>
                            <h4>Прямой шоппинг</h4>
                            <p>Продавайте товары прямо в видео</p>
                            <button class="btn">Подключить</button>
                        </div>
                        <div>
                            <h4>Обновляемые сегменты</h4>
                            <p>Заменяйте устаревшую рекламу</p>
                            <button class="btn">Настроить</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Комментарии -->
            <div id="comments" class="section">
                <h2>Комментарии</h2>
                <div class="card">
                    <div style="display: flex; gap: 20px; margin-bottom: 15px;">
                        <button class="btn">Все (245)</button>
                        <button class="btn">Опубликованные (230)</button>
                        <button class="btn">На проверке (15)</button>
                    </div>
                    
                    <div style="margin-top: 20px;">
                        <div style="padding: 10px; border-bottom: 1px solid #333;">
                            <div style="display: flex; justify-content: space-between;">
                                <strong>user_viewer</strong>
                                <span style="color: #aaa;">2 часа назад</span>
                            </div>
                            <p>Отличный обзор! Когда выйдут эти ИИ-инструменты?</p>
                            <div style="margin-top: 10px;">
                                <button class="btn">✓ Одобрить</button>
                                <button class="btn">✗ Скрыть</button>
                                <button class="btn">💬 Ответить</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Модальное окно загрузки -->
    <div id="uploadModal" class="modal">
        <div class="modal-content">
            <h2>Загрузить видео</h2>
            <div class="form-group">
                <label class="form-label">Название</label>
                <input type="text" id="videoTitle" class="form-input" placeholder="Введите название">
            </div>
            <div class="form-group">
                <label class="form-label">Описание</label>
                <textarea id="videoDescription" class="form-input" rows="3" placeholder="Опишите ваше видео"></textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Теги (через запятую)</label>
                <input type="text" id="videoTags" class="form-input" placeholder="AI, 2026, технологии">
            </div>
            <div class="form-group">
                <label class="form-label">Видимость</label>
                <select id="videoVisibility" class="form-input">
                    <option value="public">Публичное</option>
                    <option value="unlisted">Ссылочное</option>
                    <option value="private">Приватное</option>
                </select>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button class="btn" style="flex: 1;" onclick="closeModal()">Отмена</button>
                <button class="btn btn-primary" style="flex: 1;" onclick="submitVideo()">Загрузить</button>
            </div>
        </div>
    </div>
    
    <script>
        function showSection(sectionId) {
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
            
            document.getElementById(sectionId).classList.add('active');
            event.target.classList.add('active');
        }
        
        function showUploadModal() {
            document.getElementById('uploadModal').classList.add('active');
        }
        
        function closeModal() {
            document.getElementById('uploadModal').classList.remove('active');
        }
        
        function submitVideo() {
            const title = document.getElementById('videoTitle').value;
            const description = document.getElementById('videoDescription').value;
            
            if (!title) {
                alert('Введите название видео');
                return;
            }
            
            alert(\`Видео "\${title}" отправлено на обработку!\\n\\nОно появится в студии после загрузки.\`);
            closeModal();
            
            // Очистка формы
            document.getElementById('videoTitle').value = '';
            document.getElementById('videoDescription').value = '';
            document.getElementById('videoTags').value = '';
        }
        
        function editVideo(videoId) {
            alert('Редактирование видео ' + videoId);
        }
        
        function analyticsVideo(videoId) {
            alert('Аналитика видео ' + videoId);
        }
        
        function promoteVideo(videoId) {
            alert('Продвижение видео ' + videoId);
        }
    </script>
</body>
</html>`;

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    }

    serveLoginPage(req, res) {
        const html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Вход в систему</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            background: #0f0f0f; 
            color: #fff; 
            font-family: sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .login-container { 
            width: 100%;
            max-width: 400px;
            padding: 20px;
        }
        .logo { 
            text-align: center; 
            color: #ff0000; 
            font-size: 2rem;
            margin-bottom: 30px;
        }
        .login-form { 
            background: #272727; 
            padding: 30px; 
            border-radius: 10px;
        }
        .form-group { margin-bottom: 20px; }
        .form-label { display: block; margin-bottom: 5px; }
        .form-input { 
            width: 100%; 
            padding: 12px; 
            background: #1a1a1a; 
            border: 1px solid #444; 
            border-radius: 5px; 
            color: #fff;
            font-size: 1rem;
        }
        .btn { 
            width: 100%; 
            background: #ff0000; 
            color: white; 
            border: none; 
            padding: 12px; 
            border-radius: 5px; 
            cursor: pointer;
            font-size: 1rem;
            margin-top: 10px;
        }
        .btn:hover { background: #cc0000; }
        .links { 
            margin-top: 20px; 
            text-align: center;
            color: #aaa;
        }
        .links a { 
            color: #065fd4; 
            text-decoration: none;
        }
        .error { 
            color: #ff0000; 
            margin-top: 10px;
            display: none;
        }
        .demo-accounts {
            margin-top: 20px;
            padding: 15px;
            background: #1a1a1a;
            border-radius: 5px;
            font-size: 0.9rem;
        }
        .demo-accounts h4 { margin-bottom: 10px; }
        .demo-account { 
            padding: 5px 0; 
            border-bottom: 1px solid #333;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">🎬 VideoPlatform</div>
        
        <div class="login-form">
            <h2 style="margin-bottom: 20px; text-align: center;">Вход в систему</h2>
            
            <form id="loginForm" onsubmit="return login(event)">
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" id="email" class="form-input" required 
                           value="creator1@example.com">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Пароль</label>
                    <input type="password" id="password" class="form-input" required
                           value="password123">
                </div>
                
                <div id="errorMessage" class="error">Неверный email или пароль</div>
                
                <button type="submit" class="btn">Войти</button>
            </form>
            
            <div class="links">
                <p>Нет аккаунта? <a href="/register">Зарегистрироваться</a></p>
                <p><a href="/">Вернуться на главную</a></p>
            </div>
            
            <div class="demo-accounts">
                <h4>Демо аккаунты:</h4>
                <div class="demo-account">👑 Админ: admin@example.com / admin123</div>
                <div class="demo-account">🎬 Создатель: creator1@example.com / password123</div>
                <div class="demo-account">👁️ Зритель: viewer1@example.com / password123</div>
            </div>
        </div>
    </div>
    
    <script>
        async function login(event) {
            event.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Сохраняем токен
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    
                    alert('Успешный вход!');
                    window.location.href = '/studio';
                } else {
                    document.getElementById('errorMessage').style.display = 'block';
                }
            } catch (error) {
                document.getElementById('errorMessage').style.display = 'block';
            }
        }
        
        // Автозаполнение для демо
        document.addEventListener('DOMContentLoaded', () => {
            const token = localStorage.getItem('token');
            if (token) {
                window.location.href = '/studio';
            }
        });
    </script>
</body>
</html>`;

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    }

    serveRegisterPage(req, res) {
        const html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Регистрация</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            background: #0f0f0f; 
            color: #fff; 
            font-family: sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .register-container { 
            width: 100%;
            max-width: 400px;
            padding: 20px;
        }
        .logo { 
            text-align: center; 
            color: #ff0000; 
            font-size: 2rem;
            margin-bottom: 30px;
        }
        .register-form { 
            background: #272727; 
            padding: 30px; 
            border-radius: 10px;
        }
        .form-group { margin-bottom: 20px; }
        .form-label { display: block; margin-bottom: 5px; }
        .form-input { 
            width: 100%; 
            padding: 12px; 
            background: #1a1a1a; 
            border: 1px solid #444; 
            border-radius: 5px; 
            color: #fff;
        }
        .btn { 
            width: 100%; 
            background: #ff0000; 
            color: white; 
            border: none; 
            padding: 12px; 
            border-radius: 5px; 
            cursor: pointer;
            margin-top: 10px;
        }
        .btn:hover { background: #cc0000; }
        .links { 
            margin-top: 20px; 
            text-align: center;
            color: #aaa;
        }
        .links a { 
            color: #065fd4; 
            text-decoration: none;
        }
        .error { 
            color: #ff0000; 
            margin-top: 10px;
            display: none;
        }
        .role-selector {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        .role-btn {
            flex: 1;
            padding: 10px;
            background: #444;
            border: none;
            color: white;
            border-radius: 5px;
            cursor: pointer;
        }
        .role-btn.active {
            background: #ff0000;
        }
    </style>
</head>
<body>
    <div class="register-container">
        <div class="logo">🎬 VideoPlatform</div>
        
        <div class="register-form">
            <h2 style="margin-bottom: 20px; text-align: center;">Регистрация</h2>
            
            <div class="role-selector">
                <button type="button" class="role-btn active" onclick="selectRole('viewer')">👁️ Зритель</button>
                <button type="button" class="role-btn" onclick="selectRole('creator')">🎬 Создатель</button>
            </div>
            
            <form id="registerForm" onsubmit="return register(event)">
                <div class="form-group">
                    <label class="form-label">Имя пользователя</label>
                    <input type="text" id="username" class="form-input" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" id="email" class="form-input" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Пароль</label>
                    <input type="password" id="password" class="form-input" required minlength="6">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Подтвердите пароль</label>
                    <input type="password" id="confirmPassword" class="form-input" required>
                </div>
                
                <input type="hidden" id="role" value="viewer">
                
                <div id="errorMessage" class="error"></div>
                
                <button type="submit" class="btn">Зарегистрироваться</button>
            </form>
            
            <div class="links">
                <p>Уже есть аккаунт? <a href="/login">Войти</a></p>
                <p><a href="/">Вернуться на главную</a></p>
            </div>
        </div>
    </div>
    
    <script>
        let selectedRole = 'viewer';
        
        function selectRole(role) {
            selectedRole = role;
            document.getElementById('role').value = role;
            
            document.querySelectorAll('.role-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');
        }
        
        async function register(event) {
            event.preventDefault();
            
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const role = selectedRole;
            
            if (password !== confirmPassword) {
                showError('Пароли не совпадают');
                return false;
            }
            
            if (password.length < 6) {
                showError('Пароль должен быть не менее 6 символов');
                return false;
            }
            
            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password, role })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('Регистрация успешна! Выполните вход.');
                    window.location.href = '/login';
                } else {
                    showError(data.message || 'Ошибка регистрации');
                }
            } catch (error) {
                showError('Ошибка подключения к серверу');
            }
            
            return false;
        }
        
        function showError(message) {
            const errorDiv = document.getElementById('errorMessage');
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    </script>
</body>
</html>`;

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    }

    handleApi(req, res, parsedUrl) {
        const path = parsedUrl.pathname;
        const method = req.method;
        
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const data = body ? JSON.parse(body) : {};
                
                // Авторизация
                const authHeader = req.headers.authorization;
                let userId = null;
                if (authHeader && authHeader.startsWith('Bearer ')) {
                    const token = authHeader.substring(7);
                    userId = this.validateSession(token);
                }

                if (path === '/api/stats' && method === 'GET') {
                    this.sendJson(res, {
                        totalUsers: 2.7,
                        totalViews: 200,
                        totalRevenue: 100,
                        totalVideos: 500,
                        platformStats: this.stats
                    });
                    
                } else if (path === '/api/videos' && method === 'GET') {
                    const videos = Array.from(this.videos.values()).map(video => ({
                        ...video,
                        author: this.users.get(video.authorId)?.username || 'Неизвестный автор'
                    }));
                    this.sendJson(res, { videos });
                    
                } else if (path === '/api/video/:id'.replace(':id', parsedUrl.pathname.split('/')[3]) && method === 'GET') {
                    const videoId = parsedUrl.pathname.split('/')[3];
                    const video = this.videos.get(videoId);
                    if (video) {
                        video.views++;
                        this.videos.set(videoId, video);
                        this.stats.totalViews++;
                        this.sendJson(res, { video });
                    } else {
                        this.sendError(res, 'Видео не найдено', 404);
                    }
                    
                } else if (path === '/api/login' && method === 'POST') {
                    const user = Array.from(this.users.values()).find(
                        u => u.email === data.email && u.password === this.hashPassword(data.password)
                    );
                    
                    if (user) {
                        const token = this.createSession(user.id);
                        this.sendJson(res, {
                            success: true,
                            token,
                            user: {
                                id: user.id,
                                username: user.username,
                                email: user.email,
                                role: user.role
                            }
                        });
                    } else {
                        this.sendError(res, 'Неверный email или пароль', 401);
                    }
                    
                } else if (path === '/api/register' && method === 'POST') {
                    const existingUser = Array.from(this.users.values()).find(u => u.email === data.email);
                    if (existingUser) {
                        this.sendError(res, 'Пользователь с таким email уже существует', 400);
                        return;
                    }
                    
                    const newUser = {
                        id: 'user' + (this.users.size + 1),
                        username: data.username,
                        email: data.email,
                        password: this.hashPassword(data.password),
                        role: data.role || 'viewer',
                        createdAt: Date.now()
                    };
                    
                    this.users.set(newUser.id, newUser);
                    this.stats.totalUsers++;
                    
                    this.sendJson(res, {
                        success: true,
                        message: 'Регистрация успешна'
                    });
                    
                } else if (path === '/api/upload' && method === 'POST') {
                    if (!userId) {
                        this.sendError(res, 'Требуется авторизация', 401);
                        return;
                    }
                    
                    const newVideo = {
                        id: 'video' + (this.videos.size + 1),
                        title: data.title || 'Без названия',
                        description: data.description || '',
                        authorId: userId,
                        views: 0,
                        likes: 0,
                        dislikes: 0,
                        duration: data.duration || 0,
                        format: data.format || 'long',
                        tags: data.tags ? data.tags.split(',').map(t => t.trim()) : [],
                        createdAt: Date.now(),
                        thumbnail: 'default_thumb'
                    };
                    
                    this.videos.set(newVideo.id, newVideo);
                    this.stats.totalVideos++;
                    
                    this.sendJson(res, {
                        success: true,
                        videoId: newVideo.id,
                        message: 'Видео успешно загружено'
                    });
                    
                } else if (path.startsWith('/api/video/') && path.endsWith('/like') && method === 'POST') {
                    const videoId = path.split('/')[3];
                    const video = this.videos.get(videoId);
                    if (video) {
                        video.likes++;
                        this.videos.set(videoId, video);
                        this.sendJson(res, { success: true, likes: video.likes });
                    } else {
                        this.sendError(res, 'Видео не найдено', 404);
                    }
                    
                } else if (path.startsWith('/api/video/') && path.endsWith('/comment') && method === 'POST') {
                    const videoId = path.split('/')[3];
                    if (!userId) {
                        this.sendError(res, 'Требуется авторизация', 401);
                        return;
                    }
                    
                    const newComment = {
                        id: 'comment' + (this.comments.size + 1),
                        videoId,
                        userId,
                        text: data.text,
                        likes: 0,
                        createdAt: Date.now()
                    };
                    
                    this.comments.set(newComment.id, newComment);
                    this.stats.totalComments++;
                    
                    this.sendJson(res, {
                        success: true,
                        comment: newComment
                    });
                    
                } else if (path === '/api/health' && method === 'GET') {
                    this.sendJson(res, {
                        status: 'ok',
                        timestamp: Date.now(),
                        stats: this.stats
                    });
                    
                } else {
                    this.sendError(res, 'API endpoint не найден', 404);
                }
            } catch (error) {
                this.sendError(res, 'Ошибка сервера: ' + error.message, 500);
            }
        });
    }

    sendJson(res, data) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data, null, 2));
    }

    sendError(res, message, code = 500) {
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: true, message }, null, 2));
    }

    serve404(req, res) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - Страница не найдена</h1><p><a href="/">Вернуться на главную</a></p>');
    }

    formatNumber(num) {
        if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    timeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        const intervals = [
            { label: 'год', seconds: 31536000 },
            { label: 'месяц', seconds: 2592000 },
            { label: 'день', seconds: 86400 },
            { label: 'час', seconds: 3600 },
            { label: 'минуту', seconds: 60 },
            { label: 'секунду', seconds: 1 }
        ];
        
        for (const interval of intervals) {
            const count = Math.floor(seconds / interval.seconds);
            if (count >= 1) {
                return `${count} ${interval.label}${count >= 5 ? '' : count === 1 ? 'у' : 'а'} назад`;
            }
        }
        
        return 'только что';
    }
}

// Запуск сервера
const server = new VideoPlatformServer(3000);
server.start();

// Экспорт для тестирования
if (require.main === module) {
    console.log('✅ Сервер запущен в standalone режиме');
} else {
    module.exports = server;
}
