class glexperience {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.sourceCodeElement = document.getElementById('sourceCodeOverlay');
        this.introOverlay = document.getElementById('introOverlay');
        this.loadingProgress = document.getElementById('loadingProgress');
        this.loadingPercent = document.getElementById('loadingPercent');
        this.introLabel = document.getElementById('introLabel');

        this.introClickHandler = (e) => {
            if (e.target.closest && e.target.closest('#introSiteLink')) {
                return;
            }
            if (this.assetsReady && !this.isLoading && !this.introDismissed) {
                document.removeEventListener('click', this.introClickHandler);
                document.removeEventListener('touchstart', this.introClickHandler);
                if (this.introOverlay) {
                    this.introOverlay.removeEventListener('click', this.introClickHandler);
                    this.introOverlay.removeEventListener('touchstart', this.introClickHandler);
                }
                this.hideIntroAndStart();
            }
        };

        // Onchain collect credits for looped scenes
        this.collectCredits = {
            video18: {
                title: 'angel in my bedroom',
                owner: '0xEA94DACE59eDe50C55d53cC90c26d8ec4Ff0B685',
                url: 'https://verse.works/items/ethereum/0x245a3c9fb9270097afcca212f1dd6224843ff58e/2'
            },
            video20: {
                title: 'no ugly flowers',
                owner: '0xad18dc2068c0e09d49d9289654829567d734bfee',
                url: 'https://verse.works/items/ethereum/0x245a3c9fb9270097afcca212f1dd6224843ff58e/1'
            },
            video27: {
                title: 'a time long before',
                owner: '0xEA94DACE59eDe50C55d53cC90c26d8ec4Ff0B685',
                url: 'https://verse.works/items/ethereum/0x245a3c9fb9270097afcca212f1dd6224843ff58e/6'
            },
            video29: {
                title: 'follow the error',
                owner: '0xEA94DACE59eDe50C55d53cC90c26d8ec4Ff0B685',
                url: 'https://verse.works/items/ethereum/0x245a3c9fb9270097afcca212f1dd6224843ff58e/4'
            },
            video33: {
                title: 'we can escape this way',
                owner: '0xEA94DACE59eDe50C55d53cC90c26d8ec4Ff0B685',
                url: 'https://verse.works/items/ethereum/0x245a3c9fb9270097afcca212f1dd6224843ff58e/9'
            },
            video36: {
                title: 'everything asks for silence',
                owner: '0xEA94DACE59eDe50C55d53cC90c26d8ec4Ff0B685',
                url: 'https://verse.works/items/ethereum/0x245a3c9fb9270097afcca212f1dd6224843ff58e/5'
            },
            video38: {
                title: 'waiting for the right time',
                owner: '0xad18dc2068c0e09d49d9289654829567d734bfee',
                url: 'https://verse.works/items/ethereum/0x245a3c9fb9270097afcca212f1dd6224843ff58e/10'
            },
            video41: {
                title: 'another moment another angle',
                owner: '0xEA94DACE59eDe50C55d53cC90c26d8ec4Ff0B685',
                url: 'https://verse.works/items/ethereum/0x245a3c9fb9270097afcca212f1dd6224843ff58e/8'
            },
            video44: {
                title: 'system about to crack',
                owner: '0xEA94DACE59eDe50C55d53cC90c26d8ec4Ff0B685',
                url: 'https://verse.works/items/ethereum/0x245a3c9fb9270097afcca212f1dd6224843ff58e/3'
            }
        };
        document.addEventListener('click', this.introClickHandler);
        document.addEventListener('touchstart', this.introClickHandler, { passive: true });
        if (this.introOverlay) {
            this.introOverlay.addEventListener('click', this.introClickHandler);
            this.introOverlay.addEventListener('touchstart', this.introClickHandler, { passive: true });
        }

        if (this.introLabel) {
            this.animateIntroLabel(this.introLabel);
        }

        this.currentVideo = 'video1';
        this.audioStarted = false;
        this.mode = 'video';          // основной сценарий (локации); мини-игра скрыта, код сохранён
        this.miniGame = null;
        this.enableMiniGameFail = false; // после 3 жизней пока продолжаем, потом скажешь что делать
        this.introTime = 0;
        this.lastTimestamp = null;

        this.isLoading = true;
        this.assetsReady = false;
        this.introDismissed = false;
        this.loadingCallsFinished = false;
        this.totalAssets = 0;
        this.loadedAssets = 0;
        this.assets = {};

        this.setupCanvas();
        this.setupClickHandler();
        this.loadAllAssets();

        requestAnimationFrame((t) => this.gameLoop(t));
    }

    updateIntro(dt = 0) {
        this.introTime += dt;
    }

    getLifeLayout(w) {
        const lifeLabel = this.lifeLabelImage;
        if (!lifeLabel || !lifeLabel.complete || !lifeLabel.naturalWidth) return null;
        const labelW = 120;
        const labelH = labelW * (lifeLabel.height / lifeLabel.width || 0.25);
        const lx = w - 12 - labelW;
        const ly = 10;

        // общая ширина ряда сердец 134px, промежутки между ними по 2px
        const totalWidth = 134;
        const gap = 2;
        const heartW = (totalWidth - 2 * gap) / 3; // ≈43.33
        const heartH = 32;
        const rightEdge = lx + labelW;
        const y = ly + labelH + 2 + heartH / 2;

        // выстраиваем слева направо, но блок целиком привязан к правому краю life
        const thirdX = rightEdge - heartW / 2; // третье сердце (справа)
        const secondX = thirdX - (heartW + gap);
        const firstX = secondX - (heartW + gap);

        const hearts = [
            { x: firstX, y },
            { x: secondX, y },
            { x: thirdX, y }
        ];
        return { labelW, labelH, lx, ly, heartW, heartH, hearts };
    }

    setupCanvas() {
        this.miniGameH = 550;
        this.miniGameW = 550 * 6 / 5;  // 660, соотношение 6:5

        const resizeCanvas = () => {
            if (this.mode === 'minigame' || this.mode === 'intro') {
                this.setMinigameCanvasRetina();
                document.body.classList.add('minigame-mode');
            } else {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
                this.canvas.style.width = '';
                this.canvas.style.height = '';
                document.body.classList.remove('minigame-mode');
            }
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    setMinigameCanvasRetina() {
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        this.miniGameDpr = dpr;
        this.canvas.width = this.miniGameW * dpr;
        this.canvas.height = this.miniGameH * dpr;
        this.canvas.style.width = this.miniGameW + 'px';
        this.canvas.style.height = this.miniGameH + 'px';
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);
    }

    setupClickHandler() {
        this.canvas.addEventListener('click', (e) => {
            if (!this.assetsReady || this.isLoading || !this.introDismissed) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.handleClick(x, y);
        });

        // глобальный клик по всему окну для запуска с заставки
        document.addEventListener('click', (e) => {
            if (!this.assetsReady || this.isLoading || !this.introDismissed) return;

            // клик по экрану завершённой мини-игры (game over) — сразу video1
            if (this.mode === 'minigame' && this.miniGame && this.miniGame.gameOver) {
                document.body.classList.remove('minigame-mode');
                this.miniGame = null;
                this.resetToStart();
                return;
            }

            if (this.mode === 'intro') {
                // координаты не важны, заставка реагирует на сам факт клика
                this.handleClick(0, 0);
            }
        });

        this.catchSoundUnlocked = false;
        this.unlockCatchSound = () => {
            if (!this.catchSound || this.catchSoundUnlocked) return;
            this.catchSound.play().then(() => {
                this.catchSound.pause();
                this.catchSound.currentTime = 0;
            }).catch(() => {});
            this.catchSoundUnlocked = true;
        };
        // управление корзиной: реагируем на движение мыши по всему окну (в т.ч. за рамкой игры)
        this.boundMouseMove = (e) => {
            if (this.mode !== 'minigame' || !this.miniGame) return;
            const rect = this.canvas.getBoundingClientRect();
            const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            this.miniGame.playerX = rect.width > 0 ? (x / rect.width) * this.miniGameW : this.miniGameW / 2;
            this.unlockCatchSound();
        };
        document.addEventListener('mousemove', this.boundMouseMove);
        document.addEventListener('mousedown', this.unlockCatchSound);
        document.addEventListener('touchstart', this.unlockCatchSound, { passive: true });
        document.addEventListener('keydown', this.unlockCatchSound);

        if (this.sourceCodeElement) {
            this.sourceCodeElement.addEventListener('click', () => {
                if (this.currentVideo === 'sourceCode') {
                    this.resetToStart();
                }
            });
        }
    }

    async loadAllAssets() {
        console.log('Loading all assets...');

        const videoList = [
            'video1', 'video2', 'video3', 'video4', 'video5', 'video6',
            'video7', 'video8', 'video9', 'video10', 'video11', 'video12',
            'video13', 'video14', 'video15', 'video16', 'video17', 'video18',
            'video19', 'video20', 'video21', 'video22', 'video24', 'video25',
            'video26', 'video27', 'video28', 'video29', 'video30', 'video31'
        ];
        videoList.push('video32', 'video33', 'video34', 'video35', 'video36', 'video37', 'video38', 'video39', 'video40', 'video41', 'video42', 'video43', 'video44', 'video45', 'video46', 'video47', 'video48', 'video49', 'video50', 'video51', 'video52', 'video53');
        const imageList = ['image1', 'image2', 'image3', 'image4', 'image5', 'image6', 'image7', 'image8', 'image9', 'image10', 'image11', 'image12', 'image13', 'image14', 'image15', 'image16', 'image17', 'image18', 'image19', 'image20', 'image21', 'image22'];

        this.flowerAssets = [];
        this.basketImage = null;
        this.basketImageFlash = null;
        this.introLogo = null;
        this.introPlay = null;
        this.scoreLabelImage = null;
        this.scoreDigitImages = [];
        this.lifeLabelImage = null;
        this.lifeHeartImages = [];
        this.gameOverFooterImage = null;
        this.catchSound = null;
        this.loseLifeSound = null;
        this.totalAssets = videoList.length + imageList.length + 1 + 18 + 2 + 2 + 2 + 11 + 4 + 1; // asset28 + остальные
        this.loadedAssets = 0;
        this.updateLoadingProgress();

        try {
            const [startVideo, startBgImage] = await Promise.all([
                this.loadVideo('video/video1.mp4'),
                this.loadImage('image/image1.png')
            ]);
            this.assets['video1'] = startVideo;
            this.assets['image1'] = startBgImage;
            this.loadedAssets += 2;
            this.updateLoadingProgress();
            this.startIntroVideo();

            try {
                this.catchSound = await this.loadSoundOnce('minigame/sound1.mp3');
            } catch (e) {
                this.catchSound = null;
            }
            this.loadedAssets++;
            this.updateLoadingProgress();
            try {
                this.loseLifeSound = await this.loadSoundOnce('minigame/sound2.mp3');
            } catch (e) {
                this.loseLifeSound = null;
            }
            this.loadedAssets++;
            this.updateLoadingProgress();

            for (let i = 1; i <= 18; i++) {
                const img = await this.loadImage(`minigame/asset${i}.svg`);
                this.flowerAssets[i - 1] = img;
                this.loadedAssets++;
                this.updateLoadingProgress();
            }
            // вступительный экран
            try {
                this.introLogo = await this.loadImage('minigame/asset23.svg');
                this.loadedAssets++;
                this.updateLoadingProgress();
            } catch (e) {
                this.introLogo = null;
            }
            try {
                this.introPlay = await this.loadImage('minigame/asset24.svg');
                this.loadedAssets++;
                this.updateLoadingProgress();
            } catch (e) {
                this.introPlay = null;
            }
            this.basketImage = await this.loadImage('minigame/basket1.svg');
            this.loadedAssets++;
            this.updateLoadingProgress();
            try {
                this.basketImageFlash = await this.loadImage('minigame/basket2.svg');
            } catch (e) {
                this.basketImageFlash = null;
            }
            this.loadedAssets++;
            this.updateLoadingProgress();

            // HUD: SCORE и цифры 0–9
            try {
                this.scoreLabelImage = await this.loadImage('minigame/score.svg');
            } catch (e) {
                this.scoreLabelImage = null;
            }
            this.loadedAssets++;
            this.updateLoadingProgress();
            for (let d = 0; d <= 9; d++) {
                try {
                    const img = await this.loadImage(`minigame/${d}.svg`);
                    this.scoreDigitImages[d] = img;
                } catch (e) {
                    this.scoreDigitImages[d] = null;
                }
                this.loadedAssets++;
                this.updateLoadingProgress();
            }

            // HUD: LIFE и сердечки
            try {
                this.lifeLabelImage = await this.loadImage('minigame/life.svg');
            } catch (e) {
                this.lifeLabelImage = null;
            }
            this.loadedAssets++;
            this.updateLoadingProgress();
            for (let i = 0; i < 3; i++) {
                const assetIndex = 25 + i; // asset25, 26, 27
                try {
                    const img = await this.loadImage(`minigame/asset${assetIndex}.svg`);
                    this.lifeHeartImages[i] = img;
                } catch (e) {
                    this.lifeHeartImages[i] = null;
                }
                this.loadedAssets++;
                this.updateLoadingProgress();
            }

            // нижний баннер для экрана с результатом (asset28)
            try {
                this.gameOverFooterImage = await this.loadImage('minigame/asset28.svg');
            } catch (e) {
                this.gameOverFooterImage = null;
            }
            this.loadedAssets++;
            this.updateLoadingProgress();

            for (const videoName of videoList) {
                if (videoName === 'video1') continue;
                const video = await this.loadVideo(`video/${videoName}.mp4`);
                this.assets[videoName] = video;
                this.loadedAssets++;
                this.updateLoadingProgress();
            }

            for (const imageName of imageList) {
                if (imageName === 'image1') continue;
                const image = await this.loadImage(`image/${imageName}.png`);
                this.assets[imageName] = image;
                this.loadedAssets++;
                this.updateLoadingProgress();
            }

            try {
                this.assets['audio1'] = await this.loadAudio('audio/audio1.mp3');
            } catch (e) {
                console.warn('audio/audio1.mp3 failed to load');
                this.assets['audio1'] = null;
            }
            this.loadedAssets++;
            this.updateLoadingProgress();

            console.log('All assets loaded. Click to start.');
            this.loadingCallsFinished = true;
            this.updateLoadingProgress();
            this.isLoading = false;
            this.assetsReady = true;
            this.showClickToStart();

        } catch (error) {
            console.error('Failed to load assets:', error);
            this.loadingCallsFinished = true;
            this.isLoading = false;
            this.showClickToStart();
        }
    }

    updateLoadingProgress() {
        if (!this.loadingPercent) return;
        if (this.totalAssets === 0) return;
        let percent = Math.max(0, Math.min(100, Math.floor((this.loadedAssets / this.totalAssets) * 100)));
        if (!this.loadingCallsFinished) {
            percent = Math.min(percent, 88);
        }
        this.loadingPercent.textContent = `${percent}%`;
    }

    animateIntroLabel(element) {
        if (!element) return;
        const targetText = 'nv86';
        const chars = '0123456789[]{}()+-/*=<>!?@#$%^&*';
        let step = 0;
        const tick = () => {
            const reveal = Math.min(step, targetText.length);
            let out = targetText.slice(0, reveal);
            for (let i = reveal; i < targetText.length; i++) {
                out += chars[Math.floor(Math.random() * chars.length)];
            }
            element.textContent = out;
            step++;
            if (step <= targetText.length) {
                setTimeout(tick, 90);
            } else {
                element.textContent = targetText;
            }
        };
        tick();
    }

    showClickToStart() {
        if (this.loadingProgress) {
            this.loadingProgress.innerHTML = '<span class="click-to-start"> click anywhere to start </span>';
        }
        if (this.introOverlay) {
            this.introOverlay.classList.add('clickable');
        }
    }

    startIntroVideo() {
        const video = this.assets['video1'];
        if (!video || this.mode !== 'video') return;
        video.loop = true;
        this.currentVideo = 'video1';
        video.play().catch(err => console.log('video1 autoplay waiting for interaction'));
    }

    hideIntroAndStart() {
        if (this.introDismissed) return;

        if (this.introOverlay) {
            this.introOverlay.style.display = 'none';
        }
        this.introDismissed = true;

        const video = this.assets['video1'];
        if (video && video.paused) {
            video.play().catch(err => console.log('video1 autoplay waiting for interaction'));
        }

        this.handleClick(this.canvas.width / 2, this.canvas.height / 2);
    }

    loadVideo(src) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.src = src;
            video.muted = true;
            video.preload = 'auto';

            video.addEventListener('canplaythrough', () => {
                console.log(`Loaded: ${src}`);
                resolve(video);
            }, { once: true });

            video.addEventListener('error', () => reject(new Error(`Failed: ${src}`)), { once: true });
            video.load();
        });
    }

    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                console.log(`Loaded: ${src}`);
                resolve(img);
            };
            img.onerror = () => reject(new Error(`Failed: ${src}`));
            img.src = src;
        });
    }

    loadAudio(src) {
        return new Promise((resolve, reject) => {
            const audio = new Audio(src);
            audio.loop = true;
            audio.volume = 0.7;
            audio.preload = 'auto';
            audio.addEventListener('canplaythrough', () => resolve(audio), { once: true });
            audio.addEventListener('error', () => reject(new Error(`Failed: ${src}`)), { once: true });
            audio.load();
        });
    }

    loadSoundOnce(src) {
        return new Promise((resolve, reject) => {
            const audio = new Audio(src);
            audio.loop = false;
            audio.volume = 0.7;
            audio.preload = 'auto';
            audio.addEventListener('canplaythrough', () => resolve(audio), { once: true });
            audio.addEventListener('error', () => reject(new Error(`Failed: ${src}`)), { once: true });
            audio.load();
        });
    }

    gameLoop(timestamp = 0) {
        if (this.lastTimestamp === null) {
            this.lastTimestamp = timestamp;
        }
        const dt = (timestamp - this.lastTimestamp) / 1000; // секунды
        this.lastTimestamp = timestamp;

        if (this.mode === 'minigame') {
            this.updateMiniGame(dt);
        } else if (this.mode === 'intro') {
            this.updateIntro(dt);
        }
        this.draw();
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    playVideo(videoName, loop = false) {
        console.log(`Playing: ${videoName}, loop: ${loop}`);

        if (videoName === 'sourceCode') {
            Object.keys(this.assets).forEach(key => {
                if (key.startsWith('video') && this.assets[key]) {
                    this.assets[key].pause();
                }
            });
            this.currentVideo = 'sourceCode';
            this.updateCollectCredit(null);
            return;
        }

        const video = this.assets[videoName];

        if (!video) {
            console.error(`Video ${videoName} not found!`);
            return;
        }

        video.loop = loop;
        video.currentTime = 0;

        if (!loop) {
            video.onended = () => {
                // особая логика для video21: после него показываем интро (экран с Play)
                if (videoName === 'video21') {
                    this.mode = 'intro';
                    this.updateCollectCredit(null);
                    window.dispatchEvent(new Event('resize'));
                    return;
                }

                const next = this.getNextVideo(videoName);
                if (next) {
                    this.playVideo(next.name, next.loop);
                }
            };
        }

        video.play().catch(err => console.error('Play error:', err));

        Object.keys(this.assets).forEach(key => {
            if (key.startsWith('video') && this.assets[key] && key !== videoName) {
                this.assets[key].pause();
            }
        });

        this.currentVideo = videoName;
        this.updateCollectCredit(videoName);
    }

    shortWallet(address) {
        if (!address || address.length < 10) return address || '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    updateCollectCredit(videoName) {
        const creditElement = document.getElementById('collectCredit');
        if (!creditElement) return;

        const credit = videoName ? this.collectCredits[videoName] : null;
        if (!credit) {
            creditElement.style.display = 'none';
            creditElement.innerHTML = '';
            return;
        }

        const ownerShort = this.shortWallet(credit.owner);
        creditElement.innerHTML = `<a href="${credit.url}" target="_blank" rel="noopener noreferrer">${credit.title} >> presented on verse, owned by ${ownerShort}</a>`;
        creditElement.style.display = 'block';
    }

    getNextVideo(currentVideoName) {
        const transitions = {
            'video2': { name: 'video3', loop: true },
            'video4': { name: 'video5', loop: true },
            'video6': { name: 'video7', loop: true },
            'video8': { name: 'video9', loop: true },
            'video10': { name: 'video11', loop: true },
            'video12': { name: 'video1', loop: true },
            'video13': { name: 'video14', loop: true },
            'video52': { name: 'video14', loop: true },
            'video15': { name: 'video16', loop: true },
            'video17': { name: 'video18', loop: true },
            'video19': { name: 'video20', loop: true },
            'video22': { name: 'video1', loop: true },
            'video24': { name: 'video25', loop: true },
            'video26': { name: 'video27', loop: true },
            'video28': { name: 'video29', loop: true },
            'video30': { name: 'video31', loop: true },
            'video32': { name: 'video33', loop: true },
            'video34': { name: 'video1', loop: true },
            'video35': { name: 'video36', loop: true },
            'video37': { name: 'video38', loop: true },
            'video39': { name: 'video3', loop: true },
            'video40': { name: 'video41', loop: true },
            'video42': { name: 'video3', loop: true },
            'video43': { name: 'video44', loop: true },
            'video45': { name: 'video46', loop: true },
            'video47': { name: 'video48', loop: true },
            'video49': { name: 'video3', loop: true },
            'video50': { name: 'video51', loop: true },
            'video53': { name: 'video1', loop: true }
        };
        return transitions[currentVideoName] || null;
    }

    handleClick(x, y) {
        // вступительный экран (сейчас скрыт) -> запуск мини-игры
        if (this.mode === 'intro') {
            this.startMiniGame();
            this.mode = 'minigame';
            return;
        }

        // в режиме мини-игры клики по видео не обрабатываем
        if (this.mode === 'minigame') {
            return;
        }

        const half = this.canvas.width / 2;

        switch (this.currentVideo) {
            case 'video1':
                if (!this.audioStarted && this.assets['audio1']) {
                    this.assets['audio1'].play().catch(e => console.log('Audio play failed:', e));
                    this.audioStarted = true;
                }
                this.playVideo('video2', false);
                break;

            case 'video3':
                if (x < half) {
                    this.playVideo('video4', false);
                } else if (x >= half) {
                    this.playVideo('video24', false);
                }
                break;

            case 'video5':
                this.playVideo('video6', false);
                break;

            case 'video7':
                this.playVideo('video8', false);
                break;

            case 'video9':
                if (x < half) {
                    this.playVideo('video10', false);
                } else if (x >= half) {
                    this.playVideo('video13', false);
                }
                break;

            case 'video11':
                this.playVideo('video12', false);
                break;

            case 'video14':
                if (x < half) {
                    this.playVideo('video52', false);
                } else if (x >= half) {
                    this.playVideo('video15', false);
                }
                break;

            case 'video16':
                if (x < half) {
                    this.playVideo('video19', false);
                } else if (x >= half) {
                    this.playVideo('video17', false);
                }
                break;

            case 'video20':
                // путь в интро и мини-игру через video21
                this.playVideo('video21', false);
                break;

            case 'video18':
                // при клике запускаем video22, после него в getNextVideo настроен переход на video1
                this.playVideo('video22', false);
                break;

            case 'video25':
                if (x < half) {
                    this.playVideo('video43', false);
                } else if (x >= half) {
                    this.playVideo('video26', false);
                }
                break;

            case 'video44':
                this.playVideo('video45', false);
                break;

            case 'video46':
                if (x < half) {
                    this.playVideo('video47', false);
                } else if (x >= half) {
                    this.playVideo('video50', false);
                }
                break;

            case 'video48':
                this.playVideo('video49', false);
                break;

            case 'video51':
                this.playVideo('video53', false);
                break;

            case 'video27':
                this.playVideo('video28', false);
                break;

            case 'video29':
                this.playVideo('video30', false);
                break;

            case 'video31':
                if (x < half) {
                    this.playVideo('video32', false);
                } else if (x >= half) {
                    this.playVideo('video35', false);
                }
                break;

            case 'video33':
                this.playVideo('video34', false);
                break;

            case 'video36':
                this.playVideo('video37', false);
                break;

            case 'video38':
                if (x < half) {
                    this.playVideo('video40', false);
                } else if (x >= half) {
                    this.playVideo('video39', false);
                }
                break;

            case 'video41':
                this.playVideo('video42', false);
                break;
        }
    }

    draw() {
        if (this.mode === 'intro') {
            this.ctx.clearRect(0, 0, this.miniGameW, this.miniGameH);
            this.drawIntro();
            return;
        }

        if (this.mode === 'minigame') {
            this.ctx.clearRect(0, 0, this.miniGameW, this.miniGameH);
            this.drawMiniGame();
            return;
        }
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.currentVideo || this.currentVideo === 'sourceCode') {
            if (this.currentVideo === 'sourceCode') {
                this.drawSourceCode();
            }
            return;
        }

        const bgImage = this.getBackgroundImage(this.currentVideo);
        if (bgImage) {
            this.drawImage(bgImage);
        }

        const video = this.assets[this.currentVideo];
        if (video && video.readyState >= 2) {
            this.drawVideo(video);
        }
    }

    getBackgroundImage(videoName) {
        const backgrounds = {
            'video1': 'image1', 'video2': 'image1',
            'video3': 'image2', 'video4': 'image2',
            'video5': 'image3', 'video6': 'image3',
            'video7': 'image4', 'video8': 'image4',
            'video9': 'image5', 'video10': 'image5', 'video11': 'image6', 'video12': 'image6',
            'video13': 'image7', 'video14': 'image7', 'video52': 'image7', 'video15': 'image7',
            'video16': 'image8', 'video17': 'image8', 'video18': 'image9',
            'video19': 'image10', 'video20': 'image10', 'video21': 'image10', 'video22': 'image9',
            // video24 — переходное, оставляем фон предыдущей локации чтобы не было вспышки
            'video24': 'image2',
            'video25': 'image11',
            'video43': 'image19',
            'video44': 'image19',
            'video45': 'image20',
            'video46': 'image20',
            'video47': 'image21',
            'video48': 'image21',
            'video50': 'image22',
            'video51': 'image22',
            'video53': 'image1',
            'video49': 'image2',
            'video26': 'image12',
            'video27': 'image12',
            'video28': 'image13',
            'video29': 'image13',
            'video30': 'image14',
            'video31': 'image14',
            'video32': 'image14',
            'video33': 'image15',
            'video34': 'image15',
            'video35': 'image16',
            'video36': 'image16',
            'video37': 'image17',
            'video38': 'image17',
            'video39': 'image2',
            'video40': 'image17',
            'video41': 'image18',
            'video42': 'image18'
        };
        // Пока переходное видео не готово — оставляем фон предыдущей локации, чтобы не было вспышки
        const fallbackUntilReady = {
            'video13': 'image5', 'video52': 'image7', 'video15': 'image7', 'video17': 'image8',
            'video10': 'image5', 'video12': 'image6',
            'video19': 'image8', 'video21': 'image10',
            'video26': 'image11',
            'video43': 'image11',
            'video44': 'image19',
            'video45': 'image19',
            'video46': 'image20',
            'video47': 'image20',
            'video48': 'image21',
            'video50': 'image20',
            'video51': 'image22',
            'video53': 'image22',
            'video49': 'image21',
            'video28': 'image12',
            'video30': 'image13',
            'video35': 'image14',
            'video37': 'image16',
            'video39': 'image17',
            'video40': 'image17',
            'video41': 'image18',
            'video42': 'image18'
        };
        let imageName = backgrounds[videoName];
        if (imageName && fallbackUntilReady[videoName]) {
            const video = this.assets[videoName];
            if (video && video.readyState < 2) {
                imageName = fallbackUntilReady[videoName];
            }
        }
        return imageName ? this.assets[imageName] : null;
    }

    drawImage(img) {
        if (!img) return;

        const canvasAspect = this.canvas.width / this.canvas.height;
        const imgAspect = img.width / img.height;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (canvasAspect > imgAspect) {
            drawWidth = this.canvas.width;
            drawHeight = this.canvas.width / imgAspect;
            offsetX = 0;
            offsetY = (this.canvas.height - drawHeight) / 2;
        } else {
            drawHeight = this.canvas.height;
            drawWidth = this.canvas.height * imgAspect;
            offsetX = (this.canvas.width - drawWidth) / 2;
            offsetY = 0;
        }

        this.ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    }

    drawVideo(video) {
        if (!video || video.readyState < 2) return;

        const canvasAspect = this.canvas.width / this.canvas.height;
        const videoAspect = video.videoWidth / video.videoHeight;

        let drawWidth, drawHeight, offsetX, offsetY;

        if (canvasAspect > videoAspect) {
            drawWidth = this.canvas.width;
            drawHeight = this.canvas.width / videoAspect;
            offsetX = 0;
            offsetY = (this.canvas.height - drawHeight) / 2;
        } else {
            drawHeight = this.canvas.height;
            drawWidth = this.canvas.height * videoAspect;
            offsetX = (this.canvas.width - drawWidth) / 2;
            offsetY = 0;
        }

        this.ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
    }

    drawIntroFrame(ctx, w, h, time) {
        // рамка из цветков по периметру: только asset14–asset16, равномерный шаг
        if (!this.introBorder && this.flowerAssets && this.flowerAssets.length >= 16) {
            this.introBorder = [];
            const margin = 26;
            const desiredStep = 60;
            const pickBorderAsset = (prev = null) => {
                // индексы 13,14,15 → asset14–16, избегаем повтора подряд
                let idx;
                do {
                    idx = 13 + Math.floor(Math.random() * 3);
                } while (prev !== null && idx === prev);
                return idx;
            };

            // горизонтальный шаг (оставляем как есть, максимально близко к desiredStep)
            for (let x = margin; x <= w - margin + 1e-3; x += desiredStep) {
                this.introBorder.push({
                    x,
                    y: margin,
                    assetIndex: pickBorderAsset(),
                    nextChangeAt: time + 0.4 + Math.random() * 0.6
                });
                this.introBorder.push({
                    x,
                    y: h - margin,
                    assetIndex: pickBorderAsset(),
                    nextChangeAt: time + 0.4 + Math.random() * 0.6
                });
            }

            // вертикальный шаг пересчитываем, чтобы интервалы сверху/снизу были одинаковые
            const availableH = h - 2 * margin;
            const approxCount = Math.max(1, Math.round(availableH / desiredStep));
            const sideCount = Math.max(1, approxCount - 1); // без углов
            const stepV = availableH / (sideCount + 1);

            for (let i = 1; i <= sideCount; i++) {
                const y = margin + stepV * i;
                this.introBorder.push({
                    x: margin,
                    y,
                    assetIndex: pickBorderAsset(),
                    nextChangeAt: time + 0.4 + Math.random() * 0.6
                });
                this.introBorder.push({
                    x: w - margin,
                    y,
                    assetIndex: pickBorderAsset(),
                    nextChangeAt: time + 0.4 + Math.random() * 0.6
                });
            }
        }

        if (this.introBorder) {
            const baseSize = 30;
            for (const f of this.introBorder) {
                // плавная смена цветка на другой с интервалом ~0.4–1.0 сек
                if (time >= f.nextChangeAt) {
                    f.assetIndex = 13 + Math.floor(Math.random() * 3);
                    f.nextChangeAt = time + 0.4 + Math.random() * 0.6;
                }

                const img = this.flowerAssets && this.flowerAssets[f.assetIndex];
                const dx = f.x - baseSize / 2;
                const dy = f.y - baseSize / 2;
                if (img && img.complete && img.naturalWidth) {
                    ctx.drawImage(img, dx, dy, baseSize, baseSize);
                } else {
                    this.drawPixelFlower(ctx, f.x, f.y, '#FFFFFF');
                }
            }
        }
    }

    drawIntro() {
        const ctx = this.ctx;
        const w = this.miniGameW;
        const h = this.miniGameH;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);

        const logo = this.introLogo;
        const play = this.introPlay;

        this.drawIntroFrame(ctx, w, h, this.introTime);

        if (logo) {
            const logoW = w * 0.7;
            const logoH = logoW * (logo.height / logo.width || 0.25);
            const lx = (w - logoW) / 2;
            const ly = h * 0.25;
            ctx.drawImage(logo, lx, ly, logoW, logoH);
        }

        if (play) {
            // мигание раз в 0.5 секунды
            const blinkOn = Math.floor(this.introTime * 2) % 2 === 0;
            if (blinkOn) {
                const playW = w * 0.15; // в 2 раза меньше
                const playH = playW * (play.height / play.width || 0.2);
                const px = (w - playW) / 2;
                const py = h * 0.7 - 15; // ещё на 15px выше
                ctx.drawImage(play, px, py, playW, playH);
            }
        }
    }

    // ---------------- Мини-игра: ретро, пиксельные цветы ----------------

    static FLOWER_COLORS = ['#FF69B4', '#FFB6C1', '#E6A8B8', '#87CEEB', '#FF7F7F'];
    static PIXEL = 4;  // размер «пикселя» для цветов и корзины

    startMiniGame() {
        this.setMinigameCanvasRetina();
        document.body.classList.add('minigame-mode');

        Object.keys(this.assets).forEach(key => {
            if (key.startsWith('video') && this.assets[key]) {
                this.assets[key].pause();
            }
        });
        this.currentVideo = null;
        this.updateCollectCredit(null);

        this.miniGame = {
            playerWidth: 140,
            playerHeight: 75,
            playerY: this.miniGameH - 48,
            playerX: this.miniGameW / 2,
            flowers: [],
            score: 0,
            lives: 3,
            maxLives: 3,
            time: 0,
            nextSpawnAt: 0.8,      // секунда до первого цветка
            basketFlashUntil: 0,   // время в секундах
            fallingHearts: [],
            gameOver: false
        };
        this.catchSoundUnlocked = false;
    }

    flashFrame(className) {
        if (this.frameFlashTimeout) clearTimeout(this.frameFlashTimeout);
        document.body.classList.remove('frame-catch', 'frame-miss');
        document.body.classList.add(className);
        this.frameFlashTimeout = setTimeout(() => {
            document.body.classList.remove('frame-catch', 'frame-miss');
            this.frameFlashTimeout = null;
        }, 220);
    }

    updateMiniGame(dt = 0) {
        if (!this.miniGame) return;
        const mg = this.miniGame;
        const w = this.miniGameW;
        const h = this.miniGameH;

        mg.time += dt;
        // на экране game over обновляем только таймер (для мигания SCORE)
        if (mg.gameOver) {
            return;
        }

        mg.playerY = h - 48;

        const t = Math.min(1, mg.time / 75); // 75 секунд до максимальной сложности
        if (mg.time >= mg.nextSpawnAt) {
            const size = 14;
            // пикселей в секунду (чуть быстрее стартовое падение)
            const speedMin = (3.2 + 2.3 * t) * 60;
            const speedMax = (5.0 + 3.3 * t) * 60;
            const willRotate = Math.random() < 0.5;
            mg.flowers.push({
                x: size + Math.random() * (w - size * 2),
                y: -size * 2,
                speed: speedMin + Math.random() * (speedMax - speedMin), // px/сек
                color: glexperience.FLOWER_COLORS[Math.floor(Math.random() * glexperience.FLOWER_COLORS.length)],
                assetIndex: Math.floor(Math.random() * 18),
                angle: 0,
                rotationSpeed: willRotate ? (Math.random() - 0.5) * 0.2 * 60 : 0 // рад/сек
            });
            const interval = Math.max(0.47, 1.25 - (1.25 - 0.47) * t); // сек, от 1.25 до 0.47
            mg.nextSpawnAt = mg.time + interval;
        }

        const newFlowers = [];
        const catchY = mg.playerY;
        const halfW = mg.playerWidth / 2;
        const left = mg.playerX - halfW;
        const right = mg.playerX + halfW;
        const flowerHitH = 16;

        for (const f of mg.flowers) {
            f.y += f.speed * dt;
            if (f.rotationSpeed) f.angle = (f.angle || 0) + f.rotationSpeed * dt;
            const flowerHalfH = (f.assetIndex >= 16 ? 22 : f.assetIndex >= 14 ? 9 : f.assetIndex >= 12 ? 12 : 18);

            if (f.y >= catchY - flowerHitH && f.y <= catchY + mg.playerHeight) {
                if (f.x >= left && f.x <= right) {
                    mg.score += 1;
                    mg.basketFlashUntil = mg.time + 0.3; // 0.3 сек мигания
                    if (this.catchSound) {
                        this.catchSound.currentTime = 0;
                        this.catchSound.play().catch(() => {});
                    }
                    this.flashFrame('frame-catch');
                }
                if (f.x < left || f.x > right) {
                    newFlowers.push(f);
                }
                continue;
            }
            if (f.y + flowerHalfH > h) {
                // потеря жизни и запуск анимации падающего сердечка
                if (mg.lives > 0) {
                    const livesBefore = mg.lives;
                    // индекс теряемого сердца слева направо: сначала 0, затем 1, затем 2
                    const lostIndex = mg.maxLives - livesBefore;
                    mg.lives = livesBefore - 1;
                    if (this.loseLifeSound) {
                        this.loseLifeSound.currentTime = 0;
                        this.loseLifeSound.play().catch(() => {});
                    }
                    this.flashFrame('frame-miss');

                    const layout = this.getLifeLayout(w);
                    if (layout && layout.hearts[lostIndex]) {
                        const pos = layout.hearts[lostIndex];
                        const assetIdx = 25 + lostIndex; // asset25–27
                        mg.fallingHearts.push({
                            x: pos.x,
                            y: pos.y,
                            vy: 160,                         // скорость падения
                            ay: 320,                         // "гравитация"
                            angle: 0,
                            vr: (Math.random() - 0.5) * 3,   // скорость вращения
                            assetIndex: assetIdx
                        });
                    }
                }

                // если жизней больше не осталось — фиксируем состояние game over
                if (mg.lives <= 0) {
                    mg.gameOver = true;
                }
                continue;
            }
            newFlowers.push(f);
        }
        mg.flowers = newFlowers;

        if (this.enableMiniGameFail && mg.lives <= 0) {
            this.mode = 'video';
            this.miniGame = null;
            document.body.classList.remove('minigame-mode');
            this.resetToStart();
        }

        // обновление анимации падающих сердечек (только визуальный эффект)
        if (mg.fallingHearts.length) {
            const still = [];
            for (const hObj of mg.fallingHearts) {
                hObj.vy += hObj.ay * dt;
                hObj.y += hObj.vy * dt;
                hObj.angle += hObj.vr * dt;
                if (hObj.y < this.miniGameH + 40) {
                    still.push(hObj);
                }
            }
            mg.fallingHearts = still;
        }
    }

    drawPixelFlower(ctx, x, y, petalColor) {
        const P = glexperience.PIXEL;
        const stem = '#228B22';
        // пиксельный цветок: лепестки 5x3, стебель 1x3
        const grid = [
            [0,0,1,0,0],
            [0,1,1,1,0],
            [1,1,1,1,1],
            [0,1,1,1,0],
            [0,0,1,0,0],
            [0,0,1,0,0],
            [0,0,1,0,0]
        ];
        const cx = x - (5 * P) / 2;
        const cy = y - (7 * P) / 2;
        for (let row = 0; row < 7; row++) {
            for (let col = 0; col < 5; col++) {
                if (!grid[row][col]) continue;
                const isStem = row >= 4;
                ctx.fillStyle = isStem ? stem : petalColor;
                ctx.fillRect(cx + col * P, cy + row * P, P, P);
            }
        }
    }

    drawMiniGame() {
        if (!this.miniGame) return;
        const mg = this.miniGame;
        const ctx = this.ctx;
        const w = this.miniGameW;
        const h = this.miniGameH;
        const P = glexperience.PIXEL;

        // экран завершения мини-игры (game over): чёрный фон, мигающий счёт по центру, баннер снизу
        if (mg.gameOver) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, w, h);

            // блок SCORE + число по центру: мигает только слово SCORE, цифры статичны
            const scoreLabel = this.scoreLabelImage;
            const scoreStr = String(mg.score).padStart(4, '0');

            const blinkOn = Math.floor((mg.time || 0) * 2) % 2 === 0; // ~2 раза в секунду

            if (scoreLabel && scoreLabel.complete && scoreLabel.naturalWidth) {
                // те же размеры и отступ между SCORE и цифрами, как в HUD,
                // но весь блок центрируется по горизонтали
                const labelW = 120;
                const labelH = labelW * (scoreLabel.height / scoreLabel.width || 0.25);
                const digitW = 32;
                const digitH = 32;
                const digitsWidth = scoreStr.length * digitW + (scoreStr.length - 1) * 2;

                const groupWidth = Math.max(labelW, digitsWidth);
                const groupX = (w - groupWidth) / 2;
                const groupTopY = h * 0.33; // чуть выше середины

                // SCORE мигает
                if (blinkOn) {
                    const lx = groupX + (groupWidth - labelW) / 2;
                    const ly = groupTopY;
                    ctx.drawImage(scoreLabel, lx, ly, labelW, labelH);
                }

                // цифры всегда видимы, центрируются относительно блока; вертикальный зазор 2px как в HUD
                let dx = groupX + (groupWidth - digitsWidth) / 2;
                const dy = groupTopY + labelH + 2;
                for (let i = 0; i < scoreStr.length; i++) {
                    const d = Number(scoreStr[i]);
                    const img = this.scoreDigitImages[d];
                    if (img && img.complete && img.naturalWidth) {
                        ctx.drawImage(img, dx, dy, digitW, digitH);
                    }
                    dx += digitW + 2;
                }
            } else {
                // fallback на текст, по центру: мигает только слово SCORE, цифры всегда видимы
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 28px monospace';
                ctx.textAlign = 'center';
                if (blinkOn) {
                    ctx.fillText('SCORE', w / 2, h * 0.4);
                }
                ctx.fillText(scoreStr, w / 2, h * 0.5);
            }

            // нижний баннер asset28 на всю ширину, привязан к низу
            const footer = this.gameOverFooterImage;
            if (footer && footer.complete && footer.naturalWidth) {
                const footerW = w;
                const footerH = footerW * (footer.height / footer.width || 0.2);
                const fx = 0;
                const fy = h - footerH;
                ctx.drawImage(footer, fx, fy, footerW, footerH);
            }

            return;
        }

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);

        // корзина: basket1, при поимке на долю сек — basket2
        const halfW = mg.playerWidth / 2;
        const bx = Math.round(mg.playerX - halfW);
        const by = Math.round(mg.playerY - mg.playerHeight / 2);
        const bw = mg.playerWidth;
        const bh = mg.playerHeight;
        const showFlash = mg.basketFlashUntil && mg.time < mg.basketFlashUntil
            && this.basketImageFlash && this.basketImageFlash.complete && this.basketImageFlash.naturalWidth;
        const basketImg = showFlash ? this.basketImageFlash : this.basketImage;
        if (basketImg && basketImg.complete && basketImg.naturalWidth) {
            ctx.drawImage(basketImg, bx, by, bw, bh);
        } else {
            ctx.fillStyle = '#000000';
            ctx.fillRect(bx, by, bw, bh);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.strokeRect(bx, by, bw, bh);
        }

        const baseSize = 36;
        for (const f of mg.flowers) {
            const img = this.flowerAssets && this.flowerAssets[f.assetIndex];
            const i = f.assetIndex;
            const size = i >= 16 ? 44 : (i >= 14 ? baseSize / 2 : (i >= 12 ? baseSize / 1.5 : baseSize));
            const rot = f.rotationSpeed && (f.angle !== undefined);
            if (rot) {
                ctx.save();
                ctx.translate(f.x, f.y);
                ctx.rotate(f.angle || 0);
                ctx.translate(-size / 2, -size / 2);
                if (img && img.complete && img.naturalWidth) {
                    ctx.drawImage(img, 0, 0, size, size);
                } else {
                    this.drawPixelFlower(ctx, size / 2, size / 2, f.color);
                }
                ctx.restore();
            } else {
                if (img && img.complete && img.naturalWidth) {
                    ctx.drawImage(img, f.x - size / 2, f.y - size / 2, size, size);
                } else {
                    this.drawPixelFlower(ctx, f.x, f.y, f.color);
                }
            }
        }

        // HUD: SCORE
        const scoreLabel = this.scoreLabelImage;
        if (scoreLabel && scoreLabel.complete && scoreLabel.naturalWidth) {
            const labelW = 120; // в 1.5 раза больше
            const labelH = labelW * (scoreLabel.height / scoreLabel.width || 0.25);
            const lx = 12;
            const ly = 10;
            ctx.drawImage(scoreLabel, lx, ly, labelW, labelH);

            const scoreStr = String(mg.score).padStart(4, '0');
            const digitW = 32; // в 2 раза больше
            const digitH = 32;
            let dx = lx;
            let dy = ly + labelH + 2;
            for (let i = 0; i < scoreStr.length; i++) {
                const d = Number(scoreStr[i]);
                const img = this.scoreDigitImages[d];
                if (img && img.complete && img.naturalWidth) {
                    ctx.drawImage(img, dx, dy, digitW, digitH);
                }
                dx += digitW + 2;
            }
        } else {
            // fallback на текст, если ассеты не загрузились
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'left';
            ctx.fillText('SCORE', 12, 22);
            ctx.fillText(String(mg.score).padStart(4, '0'), 12, 38);
        }

        // HUD: LIFE + сердечки asset25–asset27
        const lifeLabel = this.lifeLabelImage;
        if (lifeLabel && lifeLabel.complete && lifeLabel.naturalWidth) {
            const labelW = 120; // такой же, как у SCORE
            const labelH = labelW * (lifeLabel.height / lifeLabel.width || 0.25);
            const lx = w - 12 - labelW;
            const ly = 10;
            ctx.drawImage(lifeLabel, lx, ly, labelW, labelH);

            const layout = this.getLifeLayout(w);
            const heartW = layout.heartW;
            const heartH = layout.heartH;
            // показываем только оставшиеся жизни,
            // позиции слева направо всегда те же (hearts[0..2]),
            // исчезают только соответствующие ассеты (без сдвига остальных)
            const firstAliveIndex = mg.maxLives - mg.lives; // сколько уже потеряно
            for (let i = 0; i < mg.maxLives; i++) {
                if (i < firstAliveIndex) continue; // эта жизнь уже потеряна, слот остаётся пустым
                const img = this.lifeHeartImages[i] || null; // asset25,26,27 по порядку
                const pos = layout.hearts[i];
                if (img && img.complete && img.naturalWidth && pos) {
                    ctx.save();
                    ctx.drawImage(img, pos.x - heartW / 2, pos.y - heartH / 2, heartW, heartH);
                    ctx.restore();
                }
            }
        } else {
            // fallback на текстовые LIFE и сердечки
            ctx.textAlign = 'right';
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px monospace';
            ctx.fillText('LIFE', w - 12, 22);
            const heart = '♥';
            ctx.font = '16px monospace';
            for (let i = 0; i < mg.maxLives; i++) {
                ctx.fillStyle = i < mg.lives ? '#FF4444' : '#333333';
                ctx.fillText(heart, w - 12 - (mg.maxLives - 1 - i) * 18, 40);
            }
        }

        // анимированные падающие сердечки
        if (mg.fallingHearts && mg.fallingHearts.length) {
            const layout = this.getLifeLayout(w);
            const size = layout ? layout.heartW : 32;
            for (const hObj of mg.fallingHearts) {
                const idx = hObj.assetIndex - 25;
                const img = this.lifeHeartImages[idx] || null;
                if (!img || !img.complete || !img.naturalWidth) continue;
                ctx.save();
                ctx.translate(hObj.x, hObj.y);
                ctx.rotate(hObj.angle);
                ctx.drawImage(img, -size / 2, -size / 2, size, size);
                ctx.restore();
            }
        }
    }

    drawSourceCode() {
        if (!this.sourceCodeElement) return;

        if (this.sourceCodeElement.style.display !== 'block') {
            this.sourceCodeElement.style.display = 'block';

            const sourceCodeLines = [
                '$ cat index.html',
                '================================================================================',
                '<!DOCTYPE html>',
                '<html lang="ru">',
                '<head>',
                '    <meta charset="UTF-8">',
                '    <title>genius_loci_nv86</title>',
                '    ...',
                '</head>',
                '<body>',
                '    <canvas id="gameCanvas"></canvas>',
                '    <script src="game.js"></script>',
                '</body>',
                '</html>',
                '',
                '$ # click anywhere to restart',
                ''
            ];

            const clickMessage = '<div class="click-message">$ # &gt;&gt; click anywhere to restart &lt;&lt;</div>';

            this.sourceCodeElement.innerHTML = '<pre class="code-display"></pre>' + clickMessage;
            const preElement = this.sourceCodeElement.querySelector('.code-display');

            let lineIndex = 0;
            const lineDelay = 30;

            const typeInterval = setInterval(() => {
                if (lineIndex < sourceCodeLines.length) {
                    if (lineIndex > 0) {
                        preElement.textContent += '\n';
                    }
                    preElement.textContent += sourceCodeLines[lineIndex];
                    lineIndex++;
                    this.sourceCodeElement.scrollTop = this.sourceCodeElement.scrollHeight;
                } else {
                    clearInterval(typeInterval);
                }
            }, lineDelay);
        }
    }

    resetToStart(firstVideo = 'video1', loop = true) {
        console.log('Resetting to start...');

        if (this.sourceCodeElement) {
            this.sourceCodeElement.style.display = 'none';
            this.sourceCodeElement.innerHTML = '';
        }

        Object.keys(this.assets).forEach(key => {
            if (key.startsWith('video') && this.assets[key]) {
                this.assets[key].pause();
                this.assets[key].currentTime = 0;
            }
        });
        // музыку audio1 больше не останавливаем — она должна играть сквозь весь опыт

        this.mode = 'video';
        this.miniGame = null;

        // вернуть canvas в режим полноэкранного видео
        window.dispatchEvent(new Event('resize'));

        this.playVideo(firstVideo, loop);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new glexperience();
});
