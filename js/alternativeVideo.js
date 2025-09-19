// 特典動画再生システム（クロマキー対応・管理者設定版）
class AlternativeVideoPlayer {
    constructor() {
        this.videoPlayer = document.getElementById('videoPlayer');
        this.videoCodeInput = document.getElementById('videoCode');
        this.playBtn = document.getElementById('playBtn');
        this.errorMsg = document.getElementById('error-msg');
        this.videoOverlay = document.querySelector('.video-overlay');

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.canvas.id = 'chromaCanvas';
        this.canvas.style.display = 'none';

        // 動画と設定のマッピングを拡張
        this.videoMapping = {
            '1111': {
                src: './assets/video-01.mp4',
                chromaKeyColor: { r: 43, g: 69, b: 81 }    // 例: video-01の背景色 (#2B4551)
            },
            '2222': {
                src: './assets/video-02.mp4',
                chromaKeyColor: { r: 251, g: 238, b: 103 } // 例: video-02の背景色 (#FBEE67)
            },
            '3333': {
                src: './assets/video-03.mp4',
                chromaKeyColor: { r: 81, g: 218, b: 93 }   // 例: video-03の背景色 (#51DA5D)
            }
        };

        // 管理者設定：クロマキー設定（初期値として設定）
        this.chromaKeySettings = {
            enabled: true,
            color: { r: 0, g: 0, b: 0 }, // 初期値
            sensitivity: 0.12               // 透過色指定の感度
        };

        this.animationId = null;
        this.currentVideoSrc = null;
        this.isLoading = false;

        this.init();
    }

    init() {
        this.setupCanvas();
        this.bindEvents();
        this.setupVideoPlayer();
        this.updatePlayButtonState();
    }

    setupCanvas() {
        this.videoPlayer.parentNode.insertBefore(this.canvas, this.videoPlayer.nextSibling);
    }

    bindEvents() {
        this.playBtn.addEventListener('click', () => this.handlePlay());
        this.videoCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handlePlay();
            }
        });
        this.videoCodeInput.addEventListener('input', () => {
            this.clearError();
            this.updatePlayButtonState();
        });

        this.videoPlayer.addEventListener('loadstart', () => this.onVideoLoadStart());
        this.videoPlayer.addEventListener('canplay', () => this.onVideoCanPlay());
        this.videoPlayer.addEventListener('error', () => this.onVideoError());
        this.videoPlayer.addEventListener('ended', () => this.onVideoEnded());
        this.videoPlayer.addEventListener('play', () => this.startChromaKeyProcessing());
        this.videoPlayer.addEventListener('pause', () => this.stopChromaKeyProcessing());
        this.videoPlayer.addEventListener('loadedmetadata', () => this.setupCanvasSize());
    }

    setupCanvasSize() {
        if (this.videoPlayer.videoWidth && this.videoPlayer.videoHeight) {
            this.canvas.width = this.videoPlayer.videoWidth;
            this.canvas.height = this.videoPlayer.videoHeight;

            const videoRatio = this.videoPlayer.videoWidth / this.videoPlayer.videoHeight;
            const containerWidth = this.videoPlayer.parentNode.offsetWidth;
            const containerHeight = this.videoPlayer.parentNode.offsetHeight;
            const containerRatio = containerWidth / containerHeight;

            if (videoRatio > containerRatio) {
                this.canvas.style.width = containerWidth + 'px';
                this.canvas.style.height = (containerWidth / videoRatio) + 'px';
            } else {
                this.canvas.style.height = containerHeight + 'px';
                this.canvas.style.width = (containerHeight * videoRatio) + 'px';
            }

            this.canvas.style.position = 'absolute';
            this.canvas.style.top = '50%';
            this.canvas.style.left = '50%';
            this.canvas.style.transform = 'translate(-50%, -50%)';
        }
    }

    startChromaKeyProcessing() {
        if (this.chromaKeySettings.enabled && !this.animationId) {
            this.processChromaKey();
        }
    }

    stopChromaKeyProcessing() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    processChromaKey() {
        if (this.videoPlayer.paused || this.videoPlayer.ended) {
            this.stopChromaKeyProcessing();
            return;
        }

        this.ctx.drawImage(this.videoPlayer, 0, 0, this.canvas.width, this.canvas.height);

        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        const targetColor = this.chromaKeySettings.color;
        const sensitivity = this.chromaKeySettings.sensitivity * Math.sqrt(255 * 255 * 3);

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const distance = Math.sqrt(
                Math.pow(r - targetColor.r, 2) +
                Math.pow(g - targetColor.g, 2) +
                Math.pow(b - targetColor.b, 2)
            );

            if (distance < sensitivity) {
                data[i + 3] = 0;
            }
        }

        this.ctx.putImageData(imageData, 0, 0);

        this.animationId = requestAnimationFrame(() => this.processChromaKey());
    }

    setupVideoPlayer() {
        this.videoPlayer.style.display = 'none';
        this.canvas.style.display = 'none';
        this.showVideoOverlay();
    }

    updatePlayButtonState() {
        const code = this.videoCodeInput.value.trim();
        const isValidCode = code.length === 4 && /^\d{4}$/.test(code);
        
        this.playBtn.disabled = !isValidCode || this.isLoading;
        this.playBtn.textContent = this.isLoading ? '読み込み中...' : '再生';
    }

    async handlePlay() {
        const code = this.videoCodeInput.value.trim();
        
        if (!this.isValidCode(code)) {
            this.showError('4桁の数字を正しく入力してください');
            return;
        }
        
        const videoData = this.videoMapping[code];
        if (!videoData) {
            this.showError('入力されたコードは無効です。正しいコードを入力してください。');
            return;
        }
        
        // 動画に応じてクロマキーの色を更新
        this.chromaKeySettings.color = videoData.chromaKeyColor;
        
        await this.loadAndPlayVideo(videoData.src);
    }

    isValidCode(code) {
        return code.length === 4 && /^\d{4}$/.test(code);
    }

    async loadAndPlayVideo(videoSrc) {
        try {
            this.isLoading = true;
            this.updatePlayButtonState();
            this.clearError();

            if (this.currentVideoSrc === videoSrc) {
                this.videoPlayer.currentTime = 0;
                await this.videoPlayer.play();
                return;
            }

            this.currentVideoSrc = videoSrc;
            this.videoPlayer.src = videoSrc;
            this.videoPlayer.load();
        } catch (error) {
            console.error('Video loading error:', error);
            this.showError('動画の読み込みに失敗しました。しばらく待ってから再試行してください。');
            this.isLoading = false;
            this.updatePlayButtonState();
        }
    }

    onVideoLoadStart() {
        this.showMessage('動画を読み込み中...');
    }

    async onVideoCanPlay() {
        try {
            this.hideVideoOverlay();
            this.setupCanvasSize();

            if (this.chromaKeySettings.enabled) {
                this.canvas.style.display = 'block';
                this.videoPlayer.style.display = 'none';
            } else {
                this.videoPlayer.style.display = 'block';
                this.canvas.style.display = 'none';
            }

            await this.videoPlayer.play();
            this.showMessage('');

        } catch (error) {
            console.warn('Autoplay failed:', error);
            this.showMessage('再生ボタンをクリックして動画を開始してください');
        } finally {
            this.isLoading = false;
            this.updatePlayButtonState();
        }
    }

    onVideoError() {
        this.showError('動画の再生に失敗しました。ネットワーク接続を確認してください。');
        this.isLoading = false;
        this.updatePlayButtonState();
        this.showVideoOverlay();
        this.stopChromaKeyProcessing();
    }

    onVideoEnded() {
        this.stopChromaKeyProcessing();
        this.showMessage('動画が終了しました。');
    }

    showError(message) {
        this.errorMsg.textContent = message;
        this.errorMsg.style.display = 'block';
        this.errorMsg.className = 'error-message show';
    }

    clearError() {
        this.errorMsg.textContent = '';
        this.errorMsg.style.display = 'none';
        this.errorMsg.className = 'error-message';
    }

    showMessage(message) {
        if (message) {
            this.errorMsg.textContent = message;
            this.errorMsg.style.display = 'block';
            this.errorMsg.className = 'info-message show';
        } else {
            this.clearError();
        }
    }

    showVideoOverlay() {
        if (this.videoOverlay) {
            this.videoOverlay.style.display = 'flex';
        }
    }

    hideVideoOverlay() {
        if (this.videoOverlay) {
            this.videoOverlay.style.display = 'none';
        }
    }

    updateChromaKeySettings(enabled = true, color = { r: 0, g: 255, b: 0 }, sensitivity = 0.3) {
        this.chromaKeySettings = {
            enabled: enabled,
            color: color,
            sensitivity: sensitivity
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Alternative video player with chroma key (admin controlled) initializing...');
    window.videoPlayer = new AlternativeVideoPlayer();
});