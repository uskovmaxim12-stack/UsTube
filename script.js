class USTubeApp {
    constructor() {
        this.currentUser = null;
        this.baseURL = window.location.origin;
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        this.loadTheme();
        await this.checkAuth();
        await this.loadVideos();
    }
    
    loadTheme() {
        const savedTheme = localStorage.getItem('ustube-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }
    
    updateThemeIcon(theme) {
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        }
    }
    
    setupEventListeners() {
        // Тема
        document.getElementById('themeToggle')?.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('ustube-theme', newTheme);
            this.updateThemeIcon(newTheme);
        });
        
        // Авторизация
        document.getElementById('userAvatar')?.addEventListener('click', () => {
            if (this.currentUser) {
                this.showProfile();
            } else {
                this.showAuthModal();
            }
        });
        
        // Модальное окно авторизации
        document.getElementById('closeAuthModal')?.addEventListener('click', () => {
            document.getElementById('authModal').classList.remove('active');
        });
        
        document.getElementById('authToggleBtn')?.addEventListener('click', () => {
            this.toggleAuthMode();
        });
        
        document.getElementById('authSubmitBtn')?.addEventListener('click', () => {
            this.handleAuth();
        });
        
        // Загрузка видео
        document.getElementById('createVideoBtn')?.addEventListener('click', () => {
            if (this.currentUser) {
                this.showUploadModal();
            } else {
                this.showAuthModal();
            }
        });
        
        // Поиск
        document.getElementById('searchForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = document.getElementById('searchInput').value;
            if (query) {
                this.searchVideos(query);
            }
        });
    }
    
    async checkAuth() {
        try {
            const token = localStorage.getItem('ustube-token');
            if (token) {
                const response = await this.apiRequest('GET', '/api/auth/me', null, token);
                if (response.success) {
                    this.currentUser = response.user;
                    this.updateUserUI();
                } else {
                    localStorage.removeItem('ustube-token');
                }
            }
        } catch (error) {
            console.error('Auth check error:', error);
        }
    }
    
    showAuthModal() {
        document.getElementById('authModal').classList.add('active');
        document.getElementById('authModalTitle').textContent = 'Вход в USTube';
        document.getElementById('authSubmitBtn').textContent = 'Войти';
        document.getElementById('authToggleBtn').textContent = 'Создать аккаунт';
        document.getElementById('authUsernameGroup').style.display = 'none';
        document.getElementById('authError').style.display = 'none';
        document.getElementById('authEmail').value = '';
        document.getElementById('authPassword').value = '';
        document.getElementById('authUsername').value = '';
    }
    
    toggleAuthMode() {
        const isLogin = document.getElementById('authSubmitBtn').textContent === 'Войти';
        
        if (isLogin) {
            document.getElementById('authModalTitle').textContent = 'Создать аккаунт';
            document.getElementById('authSubmitBtn').textContent = 'Зарегистрироваться';
            document.getElementById('authToggleBtn').textContent = 'Уже есть аккаунт';
            document.getElementById('authUsernameGroup').style.display = 'block';
        } else {
            document.getElementById('authModalTitle').textContent = 'Вход в USTube';
            document.getElementById('authSubmitBtn').textContent = 'Войти';
            document.getElementById('authToggleBtn').textContent = 'Создать аккаунт';
            document.getElementById('authUsernameGroup').style.display = 'none';
        }
    }
    
    async handleAuth() {
        const email = document.getElementById('authEmail').value.trim();
        const password = document.getElementById('authPassword').value.trim();
        const isLogin = document.getElementById('authSubmitBtn').textContent === 'Войти';
        
        if (!email || !password) {
            this.showAuthError('Заполните все поля');
            return;
        }
        
        try {
            let response;
            const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
            const data = isLogin ? { email, password } : {
                email,
                password,
                username: document.getElementById('authUsername').value.trim()
            };
            
            response = await this.apiRequest('POST', endpoint, data);
            
            if (response.success) {
                this.currentUser = response.user;
                this.updateUserUI();
                
                if (response.token) {
                    localStorage.setItem('ustube-token', response.token);
                }
                
                document.getElementById('authModal').classList.remove('active');
                this.showToast(isLogin ? 'Успешный вход!' : 'Аккаунт создан!');
                await this.loadVideos();
            } else {
                this.showAuthError(response.message);
            }
        } catch (error) {
            this.showAuthError('Ошибка соединения');
        }
    }
    
    showAuthError(message) {
        const errorElement = document.getElementById('authError');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
    
    updateUserUI() {
        const avatar = document.getElementById('userAvatar');
        if (this.currentUser) {
            avatar.textContent = this.currentUser.username.charAt(0).toUpperCase();
            avatar.title = this.currentUser.username;
        } else {
            avatar.textContent = '?';
            avatar.title = 'Войти';
        }
    }
    
    async loadVideos() {
        try {
            const response = await this.apiRequest('GET', '/api/videos');
            if (response.success) {
                this.renderVideos(response.videos);
            }
        } catch (error) {
            console.error('Error loading videos:', error);
        }
    }
    
    renderVideos(videos) {
        const container = document.getElementById('videoGrid');
        if (!container) return;
        
        if (videos && videos.length > 0) {
            container.innerHTML = videos.map(video => `
                <div class="yt-video-card">
                    <div class="yt-video-thumbnail">
                        <div style="width: 100%; height: 100%; background: linear-gradient(45deg, #${Math.floor(Math.random()*16777215).toString(16)}, #${Math.floor(Math.random()*16777215).toString(16)}); display: flex; align-items: center; justify-content: center; color: white;">
                            <i class="fas fa-play" style="font-size: 48px;"></i>
                        </div>
                        <div class="yt-video-duration">${this.formatDuration(video.duration)}</div>
                    </div>
                    <div class="yt-video-info">
                        <div class="yt-channel-avatar">${video.channel.username.charAt(0).toUpperCase()}</div>
                        <div class="yt-video-details">
                            <div class="yt-video-title">${video.title}</div>
                            <div class="yt-channel-name">${video.channel.username}</div>
                            <div class="yt-video-stats">
                                <span>${this.formatNumber(video.views)} просмотров</span>
                                <span> • ${this.timeAgo(video.createdAt)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #AAAAAA; grid-column: 1 / -1;">
                    <i class="fas fa-video-slash" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <h3 style="margin-bottom: 8px;">Видео не найдены</h3>
                    <p>Создайте первое видео!</p>
                </div>
            `;
        }
    }
    
    async searchVideos(query) {
        // В демо-версии просто фильтруем текущие видео
        try {
            const response = await this.apiRequest('GET', '/api/videos');
            if (response.success) {
                const filteredVideos = response.videos.filter(video =>
                    video.title.toLowerCase().includes(query.toLowerCase()) ||
                    video.description.toLowerCase().includes(query.toLowerCase())
                );
                this.renderVideos(filteredVideos);
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }
    
    showProfile() {
        alert(`Профиль: ${this.currentUser.username}\nEmail: ${this.currentUser.email}`);
    }
    
    showUploadModal() {
        const title = prompt('Введите название видео:');
        if (title) {
            this.uploadVideo(title);
        }
    }
    
    async uploadVideo(title) {
        if (!this.currentUser) return;
        
        try {
            const response = await this.apiRequest('POST', '/api/videos/upload', {
                title,
                description: 'Новое видео на USTube'
            });
            
            if (response.success) {
                this.showToast('Видео загружено!');
                await this.loadVideos();
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showToast('Ошибка загрузки видео');
        }
    }
    
    async apiRequest(method, endpoint, data = null, token = null) {
        const url = this.baseURL + endpoint;
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else {
            const storedToken = localStorage.getItem('ustube-token');
            if (storedToken) {
                headers['Authorization'] = `Bearer ${storedToken}`;
            }
        }
        
        const options = {
            method,
            headers,
            body: data ? JSON.stringify(data) : null
        };
        
        try {
            const response = await fetch(url, options);
            return await response.json();
        } catch (error) {
            console.error('API Request error:', error);
            throw error;
        }
    }
    
    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }
    
    timeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'только что';
        if (seconds < 3600) return Math.floor(seconds / 60) + ' мин. назад';
        if (seconds < 86400) return Math.floor(seconds / 3600) + ' ч. назад';
        if (seconds < 604800) return Math.floor(seconds / 86400) + ' дн. назад';
        return Math.floor(seconds / 604800) + ' нед. назад';
    }
    
    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    
    showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #FF0000;
            color: white;
            padding: 12px 24px;
            border-radius: 20px;
            z-index: 3000;
            animation: fadeInOut 3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 3000);
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.app = new USTubeApp();
});
