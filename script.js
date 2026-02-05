class USTube {
    constructor() {
        this.apiUrl = window.location.origin;
        this.user = null;
        this.currentVideo = null;
        this.videos = [];
        this.page = 1;
        this.limit = 20;
        this.hasMore = true;
        this.loading = false;
        this.currentCategory = 'all';
        this.searchQuery = '';
        
        this.init();
    }
    
    async init() {
        this.loadTheme();
        this.setupEventListeners();
        await this.checkAuth();
        await this.loadStats();
        await this.loadVideos();
        this.updateUI();
    }
    
    loadTheme() {
        const theme = localStorage.getItem('ustube-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        this.updateThemeIcon(theme);
    }
    
    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const newTheme = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('ustube-theme', newTheme);
        this.updateThemeIcon(newTheme);
    }
    
    updateThemeIcon(theme) {
        const icon = document.getElementById('themeIcon');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        }
    }
    
    setupEventListeners() {
        // Поиск
        document.getElementById('searchForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.searchVideos();
        });
        
        // Загрузка видео
        document.getElementById('videoFile')?.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0]);
        });
        
        // Шаги загрузки
        document.getElementById('nextStep')?.addEventListener('click', () => {
            this.nextUploadStep();
        });
        
        document.getElementById('prevStep')?.addEventListener('click', () => {
            this.prevUploadStep();
        });
        
        document.getElementById('uploadBtn')?.addEventListener('click', () => {
            this.uploadVideo();
        });
        
        // Авторизация
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });
        
        document.getElementById('registerForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.register();
        });
        
        // Комментарии
        document.getElementById('commentInput')?.addEventListener('input', (e) => {
            document.getElementById('submitComment').disabled = !e.target.value.trim();
        });
        
        // Бесконечный скролл
        window.addEventListener('scroll', () => {
            if (this.loading || !this.hasMore) return;
            
            const scrollPosition = window.innerHeight + window.scrollY;
            const pageHeight = document.documentElement.scrollHeight - 100;
            
            if (scrollPosition >= pageHeight) {
                this.loadMoreVideos();
            }
        });
    }
    
    async checkAuth() {
        const token = localStorage.getItem('ustube-token');
        if (!token) return;
        
        try {
            const response = await this.apiRequest('GET', '/api/auth/me', null, token);
            if (response.success) {
                this.user = response.user;
                this.updateUserUI();
            }
        } catch (error) {
            localStorage.removeItem('ustube-token');
        }
    }
    
    updateUserUI() {
        const avatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userInfo')?.querySelector('.user-name');
        const userEmail = document.getElementById('userInfo')?.querySelector('.user-email');
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (this.user) {
            if (avatar) {
                avatar.textContent = this.user.username.charAt(0).toUpperCase();
                avatar.style.background = `linear-gradient(45deg, #ff0000, #065fd4)`;
            }
            if (userName) userName.textContent = this.user.username;
            if (userEmail) userEmail.textContent = this.user.email;
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'block';
        } else {
            if (avatar) avatar.textContent = '?';
            if (userName) userName.textContent = 'Гость';
            if (userEmail) userEmail.textContent = 'Войдите в аккаунт';
            if (loginBtn) loginBtn.style.display = 'block';
            if (logoutBtn) logoutBtn.style.display = 'none';
        }
    }
    
    async loadStats() {
        try {
            const response = await this.apiRequest('GET', '/api/stats');
            if (response.success) {
                const stats = response.stats;
                document.getElementById('totalVideos').textContent = stats.totalVideos;
                document.getElementById('totalUsers').textContent = stats.totalUsers;
                document.getElementById('totalViews').textContent = this.formatNumber(stats.totalViews);
            }
        } catch (error) {
            console.error('Stats error:', error);
        }
    }
    
    async loadVideos(reset = true) {
        if (this.loading) return;
        
        this.loading = true;
        if (reset) {
            this.page = 1;
            this.videos = [];
            document.getElementById('videosGrid').innerHTML = '';
        }
        
        document.getElementById('loading').style.display = 'block';
        document.getElementById('loadMore').style.display = 'none';
        
        try {
            let url = `/api/videos?page=${this.page}&limit=${this.limit}`;
            if (this.currentCategory !== 'all') url += `&category=${this.currentCategory}`;
            if (this.searchQuery) url += `&search=${encodeURIComponent(this.searchQuery)}`;
            
            const response = await this.apiRequest('GET', url);
            
            if (response.success) {
                const newVideos = response.videos;
                this.videos = reset ? newVideos : [...this.videos, ...newVideos];
                this.hasMore = response.videos.length === this.limit;
                
                this.renderVideos();
                
                if (this.hasMore) {
                    document.getElementById('loadMore').style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Load videos error:', error);
            this.showToast('Ошибка загрузки видео', 'error');
        } finally {
            this.loading = false;
            document.getElementById('loading').style.display = 'none';
        }
    }
    
    renderVideos() {
        const container = document.getElementById('videosGrid');
        
        if (this.videos.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-video-slash"></i>
                    <h3>Видео не найдены</h3>
                    <p>Попробуйте изменить параметры поиска</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.videos.map(video => `
            <div class="video-card" onclick="ustube.watchVideo('${video._id}')">
                <div class="video-thumbnail">
                    <div style="width: 100%; height: 100%; background: linear-gradient(45deg, #ff0000, #065fd4); 
                         display: flex; align-items: center; justify-content: center; color: white; font-size: 48px;">
                        <i class="fas fa-play"></i>
                    </div>
                    <div class="video-duration">${this.formatDuration(video.duration)}</div>
                </div>
                <div class="video-info">
                    <h3 class="video-title">${this.escapeHtml(video.title)}</h3>
                    <div class="video-channel">
                        <div class="channel-avatar-small">
                            ${video.userId?.username?.charAt(0) || 'C'}
                        </div>
                        <div class="channel-name">
                            ${video.userId?.username || 'Неизвестный автор'}
                        </div>
                    </div>
                    <div class="video-stats">
                        <span>${this.formatNumber(video.views)} просмотров</span>
                        <span>•</span>
                        <span>${this.timeAgo(video.createdAt)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    async watchVideo(id) {
        try {
            const response = await this.apiRequest('GET', `/api/videos/${id}`);
            if (response.success) {
                this.currentVideo = response.video;
                this.showVideoModal();
            }
        } catch (error) {
            console.error('Watch video error:', error);
            this.showToast('Ошибка загрузки видео', 'error');
        }
    }
    
    showVideoModal() {
        const video = this.currentVideo;
        const modal = document.getElementById('videoModal');
        
        // Заполняем информацию
        document.getElementById('videoModalTitle').textContent = video.title;
        document.getElementById('videoViews').textContent = `${this.formatNumber(video.views)} просмотров`;
        document.getElementById('videoDate').textContent = this.formatDate(video.createdAt);
        document.getElementById('likeCount').textContent = this.formatNumber(video.likes);
        document.getElementById('dislikeCount').textContent = this.formatNumber(video.dislikes);
        document.getElementById('channelName').textContent = video.userId?.username || 'Неизвестный автор';
        document.getElementById('channelSubs').textContent = `${this.formatNumber(video.userId?.subscribers || 0)} подписчиков`;
        document.getElementById('videoDescriptionText').textContent = video.description || 'Нет описания';
        
        // Аватар канала
        const avatar = document.getElementById('channelAvatar');
        if (avatar) {
            avatar.textContent = video.userId?.username?.charAt(0) || 'C';
        }
        
        // Видео плеер
        const container = document.getElementById('videoContainer');
        container.innerHTML = `
            <div style="width: 100%; height: 100%; background: #000; display: flex; align-items: center; justify-content: center; color: white;">
                <div style="text-align: center;">
                    <i class="fas fa-play-circle" style="font-size: 64px; margin-bottom: 16px;"></i>
                    <h3 style="margin-bottom: 8px;">${this.escapeHtml(video.title)}</h3>
                    <p style="color: #aaa;">USTube Video Player</p>
                </div>
            </div>
        `;
        
        // Загружаем комментарии
        this.loadComments(video._id);
        
        // Открываем модальное окно
        this.openModal('videoModal');
    }
    
    async loadComments(videoId) {
        try {
            const response = await this.apiRequest('GET', `/api/videos/${videoId}/comments`);
            const container = document.getElementById('commentsList');
            
            if (response.success && response.comments.length > 0) {
                container.innerHTML = response.comments.map(comment => `
                    <div class="comment">
                        <div class="comment-avatar-small">
                            ${comment.userId?.username?.charAt(0) || 'U'}
                        </div>
                        <div class="comment-content">
                            <div class="comment-header">
                                <span class="comment-author">${comment.userId?.username || 'Пользователь'}</span>
                                <span class="comment-time">${this.timeAgo(comment.createdAt)}</span>
                            </div>
                            <div class="comment-text">${this.escapeHtml(comment.text)}</div>
                            <div class="comment-actions">
                                <button class="comment-action">
                                    <i class="fas fa-thumbs-up"></i>
                                    <span>${comment.likes}</span>
                                </button>
                                <button class="comment-action">Ответить</button>
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-comment-slash"></i>
                        <p>Комментариев пока нет</p>
                    </div>
                `;
            }
            
            // Аватар для комментария
            const commentAvatar = document.getElementById('commentAvatar');
            if (commentAvatar) {
                commentAvatar.textContent = this.user?.username?.charAt(0) || '?';
            }
        } catch (error) {
            console.error('Load comments error:', error);
        }
    }
    
    async addComment() {
        const input = document.getElementById('commentInput');
        const text = input.value.trim();
        
        if (!text || !this.currentVideo) return;
        
        if (!this.user) {
            this.openLogin();
            return;
        }
        
        try {
            const response = await this.apiRequest('POST', `/api/videos/${this.currentVideo._id}/comments`, { text });
            if (response.success) {
                input.value = '';
                document.getElementById('submitComment').disabled = true;
                this.showToast('Комментарий добавлен', 'success');
                this.loadComments(this.currentVideo._id);
            }
        } catch (error) {
            console.error('Add comment error:', error);
            this.showToast('Ошибка добавления комментария', 'error');
        }
    }
    
    async likeVideo() {
        if (!this.user) {
            this.openLogin();
            return;
        }
        
        try {
            const response = await this.apiRequest('POST', `/api/videos/${this.currentVideo._id}/like`);
            if (response.success) {
                document.getElementById('likeCount').textContent = this.formatNumber(response.likes);
            }
        } catch (error) {
            console.error('Like video error:', error);
        }
    }
    
    async dislikeVideo() {
        if (!this.user) {
            this.openLogin();
            return;
        }
        
        this.showToast('Функция в разработке', 'info');
    }
    
    async toggleSubscribe() {
        if (!this.user) {
            this.openLogin();
            return;
        }
        
        if (!this.currentVideo?.userId?._id) return;
        
        try {
            const response = await this.apiRequest('POST', `/api/channels/${this.currentVideo.userId._id}/subscribe`);
            if (response.success) {
                const btn = document.getElementById('subscribeBtn');
                btn.textContent = response.subscribed ? 'Вы подписаны' : 'Подписаться';
                btn.classList.toggle('subscribed', response.subscribed);
                this.showToast(response.subscribed ? 'Вы подписались!' : 'Вы отписались', 'success');
            }
        } catch (error) {
            console.error('Subscribe error:', error);
        }
    }
    
    // Аутентификация
    async login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            this.showAuthError('Заполните все поля', 'loginError');
            return;
        }
        
        try {
            const response = await this.apiRequest('POST', '/api/auth/login', { email, password });
            
            if (response.success) {
                this.user = response.user;
                localStorage.setItem('ustube-token', response.token);
                this.updateUserUI();
                this.closeModal('loginModal');
                this.showToast('Успешный вход!', 'success');
                await this.loadVideos(true);
            } else {
                this.showAuthError(response.error || 'Ошибка входа', 'loginError');
            }
        } catch (error) {
            this.showAuthError('Ошибка соединения', 'loginError');
        }
    }
    
    async register() {
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        
        if (!username || !email || !password) {
            this.showAuthError('Заполните все поля', 'registerError');
            return;
        }
        
        if (password.length < 6) {
            this.showAuthError('Пароль должен быть не менее 6 символов', 'registerError');
            return;
        }
        
        try {
            const response = await this.apiRequest('POST', '/api/auth/register', { username, email, password });
            
            if (response.success) {
                this.user = response.user;
                localStorage.setItem('ustube-token', response.token);
                this.updateUserUI();
                this.closeModal('loginModal');
                this.showToast('Регистрация успешна!', 'success');
                await this.loadVideos(true);
            } else {
                this.showAuthError(response.error || 'Ошибка регистрации', 'registerError');
            }
        } catch (error) {
            this.showAuthError('Ошибка соединения', 'registerError');
        }
    }
    
    async logout() {
        try {
            await this.apiRequest('POST', '/api/auth/logout');
        } catch (error) {
            // Игнорируем ошибки
        }
        
        this.user = null;
        localStorage.removeItem('ustube-token');
        this.updateUserUI();
        this.showToast('Вы вышли из аккаунта', 'success');
    }
    
    showAuthError(message, elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
            setTimeout(() => element.style.display = 'none', 5000);
        }
    }
    
    // Загрузка видео
    handleFileSelect(file) {
        if (!file) return;
        
        if (!file.type.startsWith('video/')) {
            this.showToast('Выберите видео файл', 'error');
            return;
        }
        
        if (file.size > 100 * 1024 * 1024) { // 100MB
            this.showToast('Файл слишком большой (макс. 100MB)', 'error');
            return;
        }
        
        const fileInfo = document.getElementById('fileInfo');
        fileInfo.innerHTML = `
            <strong>Выбран файл:</strong> ${file.name}<br>
            <strong>Размер:</strong> ${this.formatFileSize(file.size)}
        `;
        
        document.getElementById('nextStep').disabled = false;
    }
    
    nextUploadStep() {
        const currentStep = document.querySelector('.upload-step.active');
        const nextStep = currentStep.nextElementSibling;
        
        if (!nextStep) return;
        
        currentStep.classList.remove('active');
        nextStep.classList.add('active');
        
        document.getElementById('prevStep').disabled = false;
        
        if (!nextStep.nextElementSibling) {
            document.getElementById('nextStep').style.display = 'none';
            document.getElementById('uploadBtn').style.display = 'block';
        }
    }
    
    prevUploadStep() {
        const currentStep = document.querySelector('.upload-step.active');
        const prevStep = currentStep.previousElementSibling;
        
        if (!prevStep) return;
        
        currentStep.classList.remove('active');
        prevStep.classList.add('active');
        
        if (!prevStep.previousElementSibling) {
            document.getElementById('prevStep').disabled = true;
        }
        
        document.getElementById('nextStep').style.display = 'block';
        document.getElementById('uploadBtn').style.display = 'none';
    }
    
    async uploadVideo() {
        if (!this.user) {
            this.openLogin();
            return;
        }
        
        const title = document.getElementById('videoTitle').value;
        const description = document.getElementById('videoDescription').value;
        const category = document.getElementById('videoCategory').value;
        const visibility = document.querySelector('input[name="visibility"]:checked')?.value || 'public';
        
        if (!title) {
            this.showToast('Введите название видео', 'error');
            return;
        }
        
        const fileInput = document.getElementById('videoFile');
        if (!fileInput.files[0]) {
            this.showToast('Выберите видео файл', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('video', fileInput.files[0]);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('visibility', visibility);
        formData.append('duration', 180); // В реальном приложении вычисляем длительность
        
        try {
            const response = await this.apiRequest('POST', '/api/videos', formData, true);
            
            if (response.success) {
                this.closeModal('uploadModal');
                this.showToast('Видео успешно загружено!', 'success');
                await this.loadVideos(true);
            } else {
                this.showToast(response.error || 'Ошибка загрузки', 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showToast('Ошибка загрузки видео', 'error');
        }
    }
    
    // Поиск
    searchVideos() {
        const query = document.getElementById('searchInput').value.trim();
        this.searchQuery = query;
        this.loadVideos(true);
    }
    
    filterVideos(category) {
        this.currentCategory = category;
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        this.loadVideos(true);
    }
    
    loadMoreVideos() {
        this.page++;
        this.loadVideos(false);
    }
    
    // Утилиты
    async apiRequest(method, endpoint, data = null, isFormData = false) {
        const url = this.apiUrl + endpoint;
        const headers = {};
        
        const token = localStorage.getItem('ustube-token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        if (!isFormData && method !== 'GET') {
            headers['Content-Type'] = 'application/json';
        }
        
        const options = {
            method,
            headers
        };
        
        if (data) {
            if (isFormData) {
                options.body = data;
            } else {
                options.body = JSON.stringify(data);
            }
        }
        
        try {
            const response = await fetch(url, options);
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Ошибка сервера');
            }
            
            return result;
        } catch (error) {
            console.error('API Request error:', error);
            throw error;
        }
    }
    
    openModal(id) {
        document.getElementById(id).classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    
    closeModal(id) {
        document.getElementById(id).classList.remove('show');
        document.body.style.overflow = 'auto';
    }
    
    openLogin() {
        this.openModal('loginModal');
    }
    
    openUpload() {
        if (!this.user) {
            this.openLogin();
            return;
        }
        this.openModal('uploadModal');
    }
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast';
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle',
            warning: 'fas fa-exclamation-triangle'
        };
        
        toast.innerHTML = `
            <i class="${icons[type] || icons.info}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
    
    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num;
    }
    
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    
    timeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        
        if (diffDay > 365) return Math.floor(diffDay / 365) + ' г. назад';
        if (diffDay > 30) return Math.floor(diffDay / 30) + ' мес. назад';
        if (diffDay > 0) return diffDay + ' дн. назад';
        if (diffHour > 0) return diffHour + ' ч. назад';
        if (diffMin > 0) return diffMin + ' мин. назад';
        return 'только что';
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
    
    formatFileSize(bytes) {
        if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
        if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
        if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return bytes + ' bytes';
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // UI методы для HTML onclick
    updateUI() {
        // Обновление состояния UI
    }
}

// Глобальные методы для HTML onclick
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('show');
}

function toggleUserMenu() {
    document.getElementById('userMenu').classList.toggle('show');
}

function toggleNotifications() {
    // Реализация уведомлений
    ustube.showToast('Уведомления в разработке', 'info');
}

function openStudio() {
    ustube.showToast('Студия в разработке', 'info');
}

function openSettings() {
    ustube.showToast('Настройки в разработке', 'info');
}

function shareVideo() {
    if (!ustube.currentVideo) return;
    
    const url = `${window.location.origin}/video/${ustube.currentVideo._id}`;
    if (navigator.share) {
        navigator.share({
            title: ustube.currentVideo.title,
            text: 'Посмотрите это видео на USTube!',
            url: url
        });
    } else {
        navigator.clipboard.writeText(url)
            .then(() => ustube.showToast('Ссылка скопирована', 'success'))
            .catch(() => ustube.showToast('Ошибка копирования', 'error'));
    }
}

function saveVideo() {
    if (!ustube.user) {
        ustube.openLogin();
        return;
    }
    ustube.showToast('Видео сохранено', 'success');
}

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = event.target.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// Инициализация приложения
let ustube;

document.addEventListener('DOMContentLoaded', () => {
    ustube = new USTube();
    window.ustube = ustube;
    
    // Глобальные методы
    window.toggleTheme = () => ustube.toggleTheme();
    window.openLogin = () => ustube.openLogin();
    window.openUpload = () => ustube.openUpload();
    window.logout = () => ustube.logout();
    window.closeModal = (id) => ustube.closeModal(id);
    window.likeVideo = () => ustube.likeVideo();
    window.dislikeVideo = () => ustube.dislikeVideo();
    window.toggleSubscribe = () => ustube.toggleSubscribe();
    window.addComment = () => ustube.addComment();
    window.filterVideos = (category) => ustube.filterVideos(category);
    window.loadMoreVideos = () => ustube.loadMoreVideos();
});
