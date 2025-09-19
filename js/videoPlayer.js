class VideoPlayer {
    constructor(selector) {
        this.video = document.querySelector(selector);
        this.playing = false;
        this.playAttempted = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        if (!this.video) {
            console.error(`Video element not found: ${selector}`);
            return;
        }

        // iOS Safari対応のための設定
        this.video.setAttribute('webkit-playsinline', 'true');
        this.video.setAttribute('playsinline', 'true');
        this.video.muted = true; // 自動再生のためミュート必須
        
        // 動画の状態をログ出力
        this.setupVideoEvents();
        
        console.log(`VideoPlayer initialized: ${this.video.id}`);
    }

    /**
     * 動画イベントリスナー設定（デバッグ用）
     */
    setupVideoEvents() {
        this.video.addEventListener('loadstart', () => {
            console.log(`Video ${this.video.id}: Load started`);
        });

        this.video.addEventListener('loadedmetadata', () => {
            console.log(`Video ${this.video.id}: Metadata loaded`);
        });

        this.video.addEventListener('canplay', () => {
            console.log(`Video ${this.video.id}: Can start playing`);
        });

        this.video.addEventListener('playing', () => {
            console.log(`Video ${this.video.id}: Started playing`);
            this.playing = true;
            this.retryCount = 0; // 成功時はリトライカウントをリセット
        });

        this.video.addEventListener('pause', () => {
            console.log(`Video ${this.video.id}: Paused`);
            this.playing = false;
        });

        this.video.addEventListener('ended', () => {
            console.log(`Video ${this.video.id}: Ended`);
            this.playing = false;
        });

        this.video.addEventListener('error', (e) => {
            console.error(`Video ${this.video.id} error:`, e);
            this.playing = false;
        });

        this.video.addEventListener('stalled', () => {
            console.warn(`Video ${this.video.id}: Playback stalled`);
        });

        this.video.addEventListener('waiting', () => {
            console.warn(`Video ${this.video.id}: Waiting for data`);
        });
    }

    /**
     * 動画再生（エラーハンドリング強化）
     */
    async play() {
        if (!this.video || this.playing) {
            return;
        }

        try {
            // 動画が準備できるまで待機
            if (this.video.readyState < 2) { // HAVE_CURRENT_DATAまで待つ
                await this.waitForVideoReady();
            }

            console.log(`Attempting to play video: ${this.video.id} (attempt ${this.retryCount + 1})`);
            
            // 再生試行
            const playPromise = this.video.play();
            
            if (playPromise !== undefined) {
                await playPromise;
                this.playing = true;
                this.playAttempted = true;
                console.log(`Successfully playing video: ${this.video.id}`);
            }

        } catch (error) {
            console.warn(`Video play failed for ${this.video.id} (attempt ${this.retryCount + 1}):`, error.message);
            
            // リトライ処理
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                setTimeout(() => this.play(), 500 * this.retryCount); // 指数バックオフ
                return;
            }
            
            // 自動再生失敗時の対策
            if (error.name === 'NotAllowedError') {
                console.log("Autoplay blocked - user interaction required");
                this.requestUserInteraction();
            }
        }
    }

    /**
     * 動画準備完了まで待機
     */
    async waitForVideoReady() {
        return new Promise((resolve) => {
            const checkReady = () => {
                if (this.video.readyState >= 2) {
                    resolve();
                } else {
                    setTimeout(checkReady, 100);
                }
            };
            
            if (this.video.readyState >= 2) {
                resolve();
            } else {
                this.video.addEventListener('canplay', resolve, { once: true });
                checkReady();
            }
        });
    }

    /**
     * 動画一時停止
     */
    pause() {
        if (!this.video || !this.playing) {
            return;
        }

        try {
            this.video.pause();
            this.playing = false;
            console.log(`Paused video: ${this.video.id}`);
        } catch (error) {
            console.warn(`Video pause failed for ${this.video.id}:`, error);
        }
    }

    /**
     * 動画を先頭に戻す
     */
    reset() {
        if (!this.video) return;
        
        try {
            this.video.currentTime = 0;
            console.log(`Reset video: ${this.video.id}`);
        } catch (error) {
            console.warn(`Video reset failed for ${this.video.id}:`, error);
        }
    }

    /**
     * ユーザーインタラクションが必要な場合の処理
     */
    requestUserInteraction() {
        // 動画要素をクリック可能にする
        this.video.style.pointerEvents = 'auto';
        this.video.style.zIndex = '1000';
        this.video.style.cursor = 'pointer';
        
        // ワンタイムクリックイベントを追加
        const handleClick = async () => {
            try {
                await this.video.play();
                this.playing = true;
                this.video.style.pointerEvents = '';
                this.video.style.zIndex = '';
                this.video.style.cursor = '';
                console.log(`User interaction enabled playback for: ${this.video.id}`);
            } catch (error) {
                console.error(`User interaction play failed: ${error}`);
            }
            this.video.removeEventListener('click', handleClick);
        };
        
        this.video.addEventListener('click', handleClick, { once: true });
        console.log(`Click to play enabled for: ${this.video.id}`);
    }

    /**
     * イベントリスナー追加
     */
    on(event, callback) {
        if (!this.video) return;
        this.video.addEventListener(event, callback);
    }

    /**
     * 動画の準備状態確認
     */
    isReady() {
        return this.video && this.video.readyState >= 2; // HAVE_CURRENT_DATA
    }

    /**
     * 動画の再生状態確認
     */
    isPlaying() {
        return this.playing && !this.video.paused;
    }

    /**
     * 動画の現在時刻取得
     */
    getCurrentTime() {
        return this.video ? this.video.currentTime : 0;
    }

    /**
     * 動画の長さ取得
     */
    getDuration() {
        return this.video ? this.video.duration : 0;
    }

    /**
     * 音量設定
     */
    setVolume(volume) {
        if (!this.video) return;
        this.video.volume = Math.max(0, Math.min(1, volume));
    }

    /**
     * リソース解放
     */
    destroy() {
        if (this.video) {
            this.pause();
            this.reset();
            this.video.style.pointerEvents = '';
            this.video.style.zIndex = '';
            this.video.style.cursor = '';
        }
        console.log(`VideoPlayer destroyed: ${this.video ? this.video.id : 'unknown'}`);
    }
}