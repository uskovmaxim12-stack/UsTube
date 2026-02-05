class USTubeApp {
    constructor() {
        this.baseURL = window.location.origin;
        this.currentUser = null;
        this.currentVideo = null;
        this.videos = [];
        this.currentPage = 1;
        this.pageSize = 20;
        this.isLoading = false;
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        this.loadTheme();
        this.loadStats();
        await this.checkAuth();
        await this.loadVideos();
        this.setupVideoGrid();
    }
    
    setupEventListeners() {
        // Тема
        document.getElementById('themeToggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Поиск
        document.getElementById('searchForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = document.getElementById('searchInput').value;
            if (query) this.searchVideos(query);
        });
        
        // Навигация
        document.querySelectorAll('.sidebar-item[data-page]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                this.navigateTo(page);
            });
        });
        
        // Категории
        document.querySelectorAll('.category').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.category').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                this.filterByCategory(btn.dataset.category);
            });
        });
        
        // Загрузка видео
        document.getElementById('uploadBtn')?.addEventListener('click', () => {
            this.showUploadModal();
        });
        
        // Авторизация
        document.getElementById('loginBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showAuthModal();
        });
        
        document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
            e.preventDefault();
            await this.logout();
        });
        
        // Модальные окна
        document.getElementById('closeAuthModal')?.addEventListener('click', () => {
            this.hideModal('authModal');
        });
        
        document.getElementById('closeUploadModal')?.addEventListener('click', () => {
            this.hideModal('uploadModal');
            this.resetUploadForm();
        });
        
        document.getElementById('closeVideoModal')?.addEventListener('click', () => {
            this.hideModal('videoModal');
        });
        
        // Авторизация формы
        document.getElementById('authToggleBtn')?.addEventListener('click', () => {
            this.toggleAuthMode();
        });
        
        document.getElementById('authSubmitBtn')?.addEventListener('click', async () => {
            await this.handleAuth();
        });
        
        document.getElementById('togglePassword')?.addEventListener('click', () => {
            this.togglePasswordVisibility();
        });
        
        // Загрузка видео wizard
        document.getElementById('selectFileBtn')?.addEventListener('click', () => {
            document.getElementById('videoFile').click();
        });
        
        document.getElementById('videoFile')?.addEventListener('change', (e) => {
            this.handleFileSelect(e);
        });
        
        document.getElementById('prevStep')?.addEventListener('click', () => {
            this.prevUploadStep();
        });
        
        document.getElementById('nextStep')?.addEventListener('click', () => {
            this.nextUploadStep();
        });
        
        document.getElementById('uploadSubmit')?.addEventListener('click', async () => {
            await this.submitUpload();
        });
        
        // Закрытие модальных окон при клике вне
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
        
        // Бесконечный скролл
        window.addEventListener('scroll', () => {
            if (this.isLoading) return;
            
            const scrollPosition = window.innerHeight + window.scrollY;
            const pageHeight = document.documentElement.scrollHeight - 100;
            
            if (scrollPosition >= pageHeight) {
                this.loadMoreVideos();
            }
        });
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
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        }
    }
    
    async checkAuth() {
        try {
            const token = localStorage.getItem('ustube-token');
            if (!token) return;
            
            const response = await this.apiRequest('GET', '/api/auth/me', null, token);
            if (response.success) {
                this.currentUser = response.user;
                this.updateUserUI();
            } else {
                localStorage.removeItem('ustube-token');
            }
        } catch (error) {
            console.error('Auth check error:', error);
        }
    }
    
    updateUserUI() {
        const avatar = document.getElementById('userAvatar');
        const userName = document.getElementById('dropdownHeader')?.querySelector('.user-name');
        const userEmail = document.getElementById('dropdownHeader')?.querySelector('.user-email');
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (this.currentUser) {
            // Аватар
            if (avatar) {
                avatar.textContent = this.currentUser.username?.charAt(0).toUpperCase() || '?';
                avatar.style.background = `linear-gradient(45deg, #${Math.floor(Math.random()*16777215).toString(16)}, #${Math.floor(Math.random()*16777215).toString(16)})`;
            }
            
            // Имя и email
            if (userName) userName.textContent = this.currentUser.username || 'Пользователь';
            if (userEmail) userEmail.textContent = this.currentUser.email || '';
            
            // Кнопки
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
                document.getElementById('totalVideos').textContent = `${stats.totalVideos}+`;
                document.getElementById('totalUsers').textContent = `${stats.totalUsers}+`;
                document.getElementById('totalViews').textContent = this.formatNumber(stats.totalViews) + '+';
            }
        } catch (error) {
            console.error('Stats error:', error);
        }
    }
    
    async loadVideos() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        document.getElementById('loading').style.display = 'block';
        
        try {
            const response = await this.apiRequest('GET', `/api/videos?limit=${this.pageSize}&skip=${(this.currentPage - 1) * this.pageSize}`);
            
            if (response.success) {
                const newVideos = response.videos || [];
                
                if (this.currentPage === 1) {
                    this.videos = newVideos;
                } else {
                    this.videos = [...this.videos, ...newVideos];
                }
                
                this.renderVideos();
                
                if (newVideos.length < this.pageSize) {
                    // Больше нет видео для загрузки
                    window.removeEventListener('scroll', this.scrollHandler);
                }
            }
        } catch (error) {
            console.error('Load videos error:', error);
            this.showToast('Ошибка загрузки видео', 'error');
        } finally {
            this.isLoading = false;
            document.getElementById('loading').style.display = 'none';
        }
    }
    
    renderVideos() {
        const container = document.getElementById('videoGrid');
        if (!container) return;
        
        if (this.currentPage === 1) {
            container.innerHTML = '';
        }
        
        this.videos.forEach((video, index) => {
            const videoElement = this.createVideoElement(video);
            container.appendChild(videoElement);
        });
    }
    
    createVideoElement(video) {
        const div = document.createElement('div');
        div.className = 'video-card';
        div.dataset.videoId = video._id;
        
        const views = this.formatNumber(video.views || 0);
        const date = this.timeAgo(video.createdAt);
        const duration = this.formatDuration(video.duration || 0);
        const channelInitial = video.channel?.username?.charAt(0) || 'C';
        
        div.innerHTML = `
            <div class="video-thumbnail" onclick="app.watchVideo('${video._id}')">
                <div style="width: 100%; height: 100%; background: linear-gradient(45deg, #${Math.floor(Math.random()*16777215).toString(16)}, #${Math.floor(Math.random()*16777215).toString(16)}); display: flex; align-items: center; justify-content: center; color: white; font-size: 48px;">
                    <i class="fas fa-play"></i>
                </div>
                <div class="video-duration">${duration}</div>
            </div>
            <div class="video-info">
                <h3 class="video-title" onclick="app.watchVideo('${video._id}')">${video.title || 'Без названия'}</h3>
                <div class="video-channel">
                    <div class="channel-avatar-small">${channelInitial}</div>
                    <div class="channel-name">${video.channel?.username || 'Неизвестный автор'}</div>
                </div>
                <div class="video-stats">
                    <span>${views} просмотров</span>
                    <span>•</span>
                    <span>${date}</span>
                </div>
            </div>
        `;
        
        return div;
    }
    
    setupVideoGrid() {
        const container = document.getElementById('videoGrid');
        if (!container) return;
        
        // Используем делегирование событий
        container.addEventListener('click', (e) => {
            const videoCard = e.target.closest('.video-card');
            if (videoCard) {
                const videoId = videoCard.dataset.videoId;
                this.watchVideo(videoId);
            }
        });
    }
    
    async watchVideo(videoId) {
        try {
            const response = await this.apiRequest('GET', `/api/videos/${videoId}`);
            if (response.success) {
                this.currentVideo = response.video;
                this.showVideoModal();
            }
        } catch (error) {
            console.error('Watch video error:', error);
            this.showToast('Не удалось загрузить видео', 'error');
        }
    }
    
    showVideoModal() {
        if (!this.currentVideo) return;
        
        const video = this.currentVideo;
        const modal = document.getElementById('videoModal');
        
        // Заполняем информацию
        document.getElementById('videoModalTitle').textContent = video.title;
        document.getElementById('videoViews').textContent = `${this.formatNumber(video.views)} просмотров`;
        document.getElementById('videoDate').textContent = this.formatDate(video.createdAt);
        document.getElementById('likeCount').textContent = this.formatNumber(video.likes || 0);
        document.getElementById('dislikeCount').textContent = this.formatNumber(video.dislikes || 0);
        document.getElementById('channelName').textContent = video.channel?.username;
        document.getElementById('channelSubs').textContent = `${this.formatNumber(video.channel?.subscribers || 0)} подписчиков`;
        document.getElementById('videoDescriptionText').textContent = video.description;
        
        // Аватар канала
        const avatar = document.getElementById('channelAvatar');
        if (avatar) {
            avatar.textContent = video.channel?.username?.charAt(0) || 'C';
        }
        
        // Видео плеер
        const player = document.getElementById('videoPlayer');
        player.innerHTML = `
            <div style="width: 100%; height: 100%; background: #000; display: flex; align-items: center; justify-content: center; color: white;">
                <div style="text-align: center;">
                    <i class="fas fa-play-circle" style="font-size: 64px; margin-bottom: 16px;"></i>
                    <h3 style="margin-bottom: 8px;">${video.title}</h3>
                    <p style="color: #aaa;">Встроенный видео плеер USTube</p>
                </div>
            </div>
        `;
        
        // Подписка
        const subscribeBtn = document.getElementById('subscribeBtn');
        subscribeBtn.onclick = () => this.toggleSubscribe(video.channel._id);
        
        // Лайки
        document.getElementById('likeBtn').onclick = () => this.likeVideo(video._id);
        document.getElementById('dislikeBtn').onclick = () => this.dislikeVideo(video._id);
        
        // Поделиться
        document.getElementById('shareBtn').onclick = () => this.shareVideo(video._id);
        
        // Комментарии
        this.loadComments(video._id);
        
        // Показываем модальное окно
        modal.classList.add('active');
    }
    
    async loadComments(videoId) {
        try {
            const response = await this.apiRequest('GET', `/api/videos/${videoId}/comments`);
            const container = document.getElementById('commentsList');
            
            if (response.success && response.comments) {
                container.innerHTML = response.comments.map(comment => `
                    <div class="comment">
                        <div class="comment-avatar-small">
                            ${comment.user?.username?.charAt(0) || 'U'}
                        </div>
                        <div class="comment-content">
                            <div class="comment-header">
                                <span class="comment-author">${comment.user?.username || 'Пользователь'}</span>
                                <span class="comment-time">${this.timeAgo(comment.createdAt)}</span>
                            </div>
                            <div class="comment-text">${comment.text}</div>
                            <div class="comment-actions">
                                <button class="comment-action" onclick="app.likeComment('${comment._id}')">
                                    <i class="fas fa-thumbs-up"></i>
                                    <span>${comment.likes || 0}</span>
                                </button>
                                <button class="comment-action">Ответить</button>
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p style="text-align: center; color: var(--yt-text-secondary);">Комментариев пока нет</p>';
            }
            
            // Форма комментария
            const commentAvatar = document.getElementById('commentAvatar');
            if (commentAvatar) {
                commentAvatar.textContent = this.currentUser?.username?.charAt(0) || '?';
            }
            
            const commentInput = document.getElementById('commentInput');
            const submitComment = document.getElementById('submitComment');
            
            if (commentInput && submitComment) {
                commentInput.oninput = () => {
                    submitComment.disabled = !commentInput.value.trim();
                };
                
                submitComment.onclick = async () => {
                    if (!commentInput.value.trim()) return;
                    
                    if (!this.currentUser) {
                        this.showAuthModal();
                        return;
                    }
                    
                    await this.addComment(videoId, commentInput.value.trim());
                    commentInput.value = '';
                    submitComment.disabled = true;
                };
                
                commentInput.onkeypress = (e) => {
                    if (e.key === 'Enter' && commentInput.value.trim()) {
                        submitComment.click();
                    }
                };
            }
            
        } catch (error) {
            console.error('Load comments error:', error);
        }
    }
    
    async addComment(videoId, text) {
        try {
            const response = await this.apiRequest('POST', `/api/videos/${videoId}/comments`, { text });
            if (response.success) {
                this.showToast('Комментарий добавлен', 'success');
                this.loadComments(videoId);
            }
        } catch (error) {
            console.error('Add comment error:', error);
            this.showToast('Ошибка добавления комментария', 'error');
        }
    }
    
    async likeComment(commentId) {
        // Реализация лайков комментариев
        this.showToast('Функция в разработке', 'info');
    }
    
    async likeVideo(videoId) {
        if (!this.currentUser) {
            this.showAuthModal();
            return;
        }
        
        try {
            const response = await this.apiRequest('POST', `/api/videos/${videoId}/like`);
            if (response.success) {
                document.getElementById('likeCount').textContent = this.formatNumber(response.likes);
                document.getElementById('dislikeCount').textContent = this.formatNumber(response.dislikes);
            }
        } catch (error) {
            console.error('Like video error:', error);
        }
    }
    
    async dislikeVideo(videoId) {
        if (!this.currentUser) {
            this.showAuthModal();
            return;
        }
        
        try {
            const response = await this.apiRequest('POST', `/api/videos/${videoId}/dislike`);
            if (response.success) {
                document.getElementById('likeCount').textContent = this.formatNumber(response.likes);
                document.getElementById('dislikeCount').textContent = this.formatNumber(response.dislikes);
            }
        } catch (error) {
            console.error('Dislike video error:', error);
        }
    }
    
    async toggleSubscribe(channelId) {
        if (!this.currentUser) {
            this.showAuthModal();
            return;
        }
        
        try {
            const response = await this.apiRequest('POST', `/api/channels/${channelId}/subscribe`);
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
    
    shareVideo(videoId) {
        const url = `${window.location.origin}/watch?v=${videoId}`;
        if (navigator.share) {
            navigator.share({
                title: this.currentVideo?.title,
                text: 'Посмотрите это видео на USTube!',
                url: url
            });
        } else {
            navigator.clipboard.writeText(url)
                .then(() => this.showToast('Ссылка скопирована', 'success'))
                .catch(() => this.showToast('Ошибка копирования', 'error'));
        }
    }
    
    // АВТОРИЗАЦИЯ
    showAuthModal() {
        const modal = document.getElementById('authModal');
        document.getElementById('authModalTitle').textContent = 'Вход в USTube';
        document.getElementById('authSubmitBtn').textContent = 'Войти';
        document.getElementById('authToggleBtn').textContent = 'Создать аккаунт';
        document.getElementById('authUsernameGroup').style.display = 'none';
        document.getElementById('authError').style.display = 'none';
        document.getElementById('authEmail').value = '';
        document.getElementById('authPassword').value = '';
        document.getElementById('authUsername').value = '';
        modal.classList.add('active');
    }
    
    toggleAuthMode() {
        const isLogin = document.getElementById('authSubmitBtn').textContent === 'Войти';
        
        if (isLogin) {
            // Переключаем на регистрацию
            document.getElementById('authModalTitle').textContent = 'Создать аккаунт';
            document.getElementById('authSubmitBtn').textContent = 'Зарегистрироваться';
            document.getElementById('authToggleBtn').textContent = 'Уже есть аккаунт';
            document.getElementById('authUsernameGroup').style.display = 'block';
        } else {
            // Переключаем на вход
            document.getElementById('authModalTitle').textContent = 'Вход в USTube';
            document.getElementById('authSubmitBtn').textContent = 'Войти';
            document.getElementById('authToggleBtn').textContent = 'Создать аккаунт';
            document.getElementById('authUsernameGroup').style.display = 'none';
        }
    }
    
    togglePasswordVisibility() {
        const input = document.getElementById('authPassword');
        const icon = document.getElementById('togglePassword');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
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
        
        if (!isLogin) {
            const username = document.getElementById('authUsername').value.trim();
            if (!username) {
                this.showAuthError('Введите имя пользователя');
                return;
            }
        }
        
        try {
            const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
            const data = isLogin ? { email, password } : {
                email,
                password,
                username: document.getElementById('authUsername').value.trim()
            };
            
            const response = await this.apiRequest('POST', endpoint, data);
            
            if (response.success) {
                this.currentUser = response.user;
                
                if (response.token) {
                    localStorage.setItem('ustube-token', response.token);
                }
                
                this.updateUserUI();
                this.hideModal('authModal');
                this.showToast(isLogin ? 'Успешный вход!' : 'Аккаунт создан!', 'success');
                
                // Обновляем страницу
                this.currentPage = 1;
                await this.loadVideos();
            } else {
                this.showAuthError(response.message);
            }
        } catch (error) {
            console.error('Auth error:', error);
            this.showAuthError('Ошибка соединения');
        }
    }
    
    showAuthError(message) {
        const errorElement = document.getElementById('authError');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
    
    async logout() {
        try {
            await this.apiRequest('POST', '/api/auth/logout');
        } catch (error) {
            // Игнорируем ошибки при выходе
        }
        
        this.currentUser = null;
        localStorage.removeItem('ustube-token');
        this.updateUserUI();
        this.showToast('Вы вышли из аккаунта', 'success');
    }
    
    // ЗАГРУЗКА ВИДЕО
    showUploadModal() {
        if (!this.currentUser) {
            this.showAuthModal();
            return;
        }
        
        const modal = document.getElementById('uploadModal');
        this.resetUploadForm();
        modal.classList.add('active');
    }
    
    resetUploadForm() {
        // Сбрасываем шаги
        document.querySelectorAll('.wizard-step').forEach(step => step.classList.remove('active'));
        document.getElementById('step1').classList.add('active');
        
        // Сбрасываем элементы
        document.getElementById('videoFile').value = '';
        document.getElementById('fileInfo').innerHTML = '';
        document.getElementById('videoTitle').value = '';
        document.getElementById('videoDescription').value = '';
        document.getElementById('videoTags').value = '';
        document.getElementById('videoVisibility').value = 'public';
        document.getElementById('previewTitle').textContent = '';
        document.getElementById('previewDescription').textContent = '';
        document.getElementById('previewTags').innerHTML = '';
        document.getElementById('uploadProgress').style.display = 'none';
        document.getElementById('uploadError').style.display = 'none';
        
        // Сбрасываем навигацию
        document.getElementById('prevStep').disabled = true;
        document.getElementById('nextStep').style.display = 'block';
        document.getElementById('uploadSubmit').style.display = 'none';
        
        this.currentUploadStep = 1;
        this.selectedFile = null;
    }
    
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Проверяем тип файла
        if (!file.type.startsWith('video/')) {
            this.showUploadError('Пожалуйста, выберите видео файл');
            return;
        }
        
        // Проверяем размер (макс 2GB)
        if (file.size > 2 * 1024 * 1024 * 1024) {
            this.showUploadError('Файл слишком большой. Максимальный размер: 2GB');
            return;
        }
        
        this.selectedFile = file;
        
        // Показываем информацию о файле
        const fileInfo = document.getElementById('fileInfo');
        fileInfo.innerHTML = `
            <strong>Выбран файл:</strong> ${file.name}<br>
            <strong>Размер:</strong> ${this.formatFileSize(file.size)}<br>
            <strong>Тип:</strong> ${file.type}
        `;
        
        // Включаем кнопку "Далее"
        document.getElementById('nextStep').disabled = false;
    }
    
    nextUploadStep() {
        if (this.currentUploadStep === 1 && !this.selectedFile) {
            this.showUploadError('Пожалуйста, выберите видео файл');
            return;
        }
        
        if (this.currentUploadStep === 2) {
            const title = document.getElementById('videoTitle').value.trim();
            if (!title) {
                this.showUploadError('Введите название видео');
                return;
            }
            
            // Обновляем предпросмотр
            document.getElementById('previewTitle').textContent = title;
            document.getElementById('previewDescription').textContent = document.getElementById('videoDescription').value;
            
            const tags = document.getElementById('videoTags').value.split(',').map(t => t.trim()).filter(t => t);
            const tagsHtml = tags.map(tag => `<span class="tag">${tag}</span>`).join('');
            document.getElementById('previewTags').innerHTML = tagsHtml;
        }
        
        // Переключаем шаг
        document.getElementById(`step${this.currentUploadStep}`).classList.remove('active');
        this.currentUploadStep++;
        document.getElementById(`step${this.currentUploadStep}`).classList.add('active');
        
        // Обновляем навигацию
        document.getElementById('prevStep').disabled = this.currentUploadStep === 1;
        
        if (this.currentUploadStep === 3) {
            document.getElementById('nextStep').style.display = 'none';
            document.getElementById('uploadSubmit').style.display = 'block';
        }
    }
    
    prevUploadStep() {
        document.getElementById(`step${this.currentUploadStep}`).classList.remove('active');
        this.currentUploadStep--;
        document.getElementById(`step${this.currentUploadStep}`).classList.add('active');
        
        document.getElementById('prevStep').disabled = this.currentUploadStep === 1;
        document.getElementById('nextStep').style.display = 'block';
        document.getElementById('uploadSubmit').style.display = 'none';
    }
    
    async submitUpload() {
        const title = document.getElementById('videoTitle').value.trim();
        const description = document.getElementById('videoDescription').value;
        const tags = document.getElementById('videoTags').value;
        const visibility = document.getElementById('videoVisibility').value;
        
        // Оцениваем длительность (в реальном приложении нужно анализировать файл)
        const duration = Math.floor(Math.random() * 600) + 60; // 1-10 минут для демо
        
        try {
            // Показываем прогресс
            document.getElementById('uploadProgress').style.display = 'block';
            document.getElementById('uploadError').style.display = 'none';
            
            // Симуляция прогресса загрузки
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                document.getElementById('progressFill').style.width = `${progress}%`;
                document.getElementById('progressPercent').textContent = `${progress}%`;
                
                if (progress >= 100) {
                    clearInterval(interval);
                    
                    // Отправляем данные на сервер
                    this.uploadVideoData({
                        title,
                        description,
                        tags,
                        visibility,
                        duration
                    });
                }
            }, 200);
            
        } catch (error) {
            this.showUploadError('Ошибка загрузки видео');
        }
    }
    
    async uploadVideoData(videoData) {
        try {
            const response = await this.apiRequest('POST', '/api/videos', videoData);
            
            if (response.success) {
                this.showToast('Видео успешно загружено!', 'success');
                this.hideModal('uploadModal');
                
                // Добавляем новое видео в начало списка
                if (response.video) {
                    this.videos.unshift(response.video);
                    this.renderVideos();
                }
            } else {
                this.showUploadError(response.message);
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showUploadError('Ошибка загрузки видео');
        }
    }
    
    showUploadError(message) {
        const errorElement = document.getElementById('uploadError');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
    
    // ПОИСК И ФИЛЬТРАЦИЯ
    async searchVideos(query) {
        try {
            const response = await this.apiRequest('GET', `/api/videos?search=${encodeURIComponent(query)}`);
            if (response.success) {
                this.videos = response.videos;
                this.currentPage = 1;
                this.renderVideos();
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }
    
    filterByCategory(category) {
        if (category === 'all') {
            this.loadVideos();
        } else {
            // В реальном приложении здесь будет фильтрация по категории
            this.showToast(`Фильтр: ${category}`, 'info');
        }
    }
    
    navigateTo(page) {
        // Обновляем активный пункт меню
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === page) {
                item.classList.add('active');
            }
        });
        
        // Показываем соответствующий контент
        this.showToast(`Переход на: ${page}`, 'info');
        
        // В реальном приложении здесь будет загрузка соответствующего контента
    }
    
    async loadMoreVideos() {
        this.currentPage++;
        await this.loadVideos();
    }
    
    // УТИЛИТЫ
    async apiRequest(method, endpoint, data = null, token = null) {
        const url = this.baseURL + endpoint;
        const headers = {
            'Content-Type': 'application/json'
        };
        
        const authToken = token || localStorage.getItem('ustube-token');
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        const options = {
            method,
            headers
        };
        
        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, options);
            return await response.json();
        } catch (error) {
            console.error('API Request error:', error);
            throw error;
        }
    }
    
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
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
        
        // Удаляем через 5 секунд
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
    
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        }
        return num.toString();
    }
    
    formatFileSize(bytes) {
        if (bytes >= 1073741824) {
            return (bytes / 1073741824).toFixed(2) + ' GB';
        }
        if (bytes >= 1048576) {
            return (bytes / 1048576).toFixed(2) + ' MB';
        }
        if (bytes >= 1024) {
            return (bytes / 1024).toFixed(2) + ' KB';
        }
        return bytes + ' bytes';
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
        const diffMonth = Math.floor(diffDay / 30);
        const diffYear = Math.floor(diffDay / 365);
        
        if (diffYear > 0) return `${diffYear} г. назад`;
        if (diffMonth > 0) return `${diffMonth} мес. назад`;
        if (diffDay > 0) return `${diffDay} дн. назад`;
        if (diffHour > 0) return `${diffHour} ч. назад`;
        if (diffMin > 0) return `${diffMin} мин. назад`;
        return 'только что';
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

// Инициализация приложения
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new USTubeApp();
    window.app = app; // Делаем глобальным для обработчиков в HTML
});
