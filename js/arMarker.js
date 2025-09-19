class ARMarker {
    constructor(selector, videoPlane, statusDisplay) {
        this.marker = document.querySelector(selector);
        this.videoPlane = videoPlane;
        this.statusDisplay = statusDisplay;
        this.isDetected = false;
        this.lastDetectionTime = 0;
        
        // デバウンス用のタイマー
        this.foundTimeout = null;
        this.lostTimeout = null;
        
        if (!this.marker) {
            console.error(`Marker not found: ${selector}`);
            return;
        }

        console.log(`ARMarker initialized for: ${this.marker.id}`);
    }

    /**
     * マーカーイベントをバインド
     */
    bindEvents() {
        if (!this.marker) return;

        // マーカー検出イベント（デバウンス付き）
        this.marker.addEventListener("markerFound", (event) => {
            console.log(`Marker found: ${this.marker.id}`);
            this.handleMarkerFound();
        });

        // マーカー消失イベント（デバウンス付き）
        this.marker.addEventListener("markerLost", (event) => {
            console.log(`Marker lost: ${this.marker.id}`);
            this.handleMarkerLost();
        });

        console.log(`Events bound for marker: ${this.marker.id}`);
    }

    /**
     * マーカー検出時の処理（デバウンス機能付き）
     */
    handleMarkerFound() {
        // 既に検出状態の場合は何もしない
        if (this.isDetected) return;

        // 消失タイマーをクリア
        if (this.lostTimeout) {
            clearTimeout(this.lostTimeout);
            this.lostTimeout = null;
        }

        // 検出タイマー設定（短時間で複数発火を防ぐ）
        if (this.foundTimeout) {
            clearTimeout(this.foundTimeout);
        }

        this.foundTimeout = setTimeout(() => {
            this.activateMarker();
            this.foundTimeout = null;
        }, 100); // 100ms のデバウンス
    }

    /**
     * マーカー消失時の処理（デバウンス機能付き）
     */
    handleMarkerLost() {
        // 検出タイマーをクリア
        if (this.foundTimeout) {
            clearTimeout(this.foundTimeout);
            this.foundTimeout = null;
        }

        // 消失タイマー設定（一時的な消失を無視）
        if (this.lostTimeout) {
            clearTimeout(this.lostTimeout);
        }

        this.lostTimeout = setTimeout(() => {
            this.deactivateMarker();
            this.lostTimeout = null;
        }, 500); // 500ms の遅延で消失処理
    }

    /**
     * マーカーアクティベーション（1件表示対応）
     */
    activateMarker() {
        if (this.isDetected) return;
        
        // 🆕 ARSceneManagerで単一表示制御をチェック
        if (window.arSceneManager && !window.arSceneManager.handleMarkerActivation(this.marker.id, this)) {
            console.log(`Marker activation blocked by single display mode: ${this.marker.id}`);
            return;
        }
        
        this.isDetected = true;
        this.lastDetectionTime = Date.now();
        
        console.log(`Activating marker (single mode): ${this.marker.id}`);
        
        // ステータス更新（1件表示モード表示）
        // this.statusDisplay.update(`ステータス: ${this.marker.id} 検出中`);
        
        // 動画プレーンを表示・再生（中央配置）
        this.videoPlane.show();
        
        // 少し遅延を入れて動画再生（プレーン表示完了後）
        setTimeout(async () => {
            try {
                await this.videoPlane.videoPlayer.play();
                console.log(`Video started for marker (single mode): ${this.marker.id}`);
            } catch (error) {
                console.warn(`Failed to start video for marker ${this.marker.id}:`, error);
                // this.statusDisplay.update(`エラー: ${this.marker.id} 動画再生失敗`);
            }
        }, 200);
    }

    /**
     * マーカー非アクティベーション（1件表示対応）
     */
    deactivateMarker() {
        if (!this.isDetected) return;
        
        this.isDetected = false;
        
        console.log(`Deactivating marker (single mode): ${this.marker.id}`);
        
        // 🆕 ARSceneManagerに非アクティブ化を通知
        if (window.arSceneManager) {
            window.arSceneManager.handleMarkerDeactivation(this.marker.id);
        }
        
        // 動画プレーンを非表示・一時停止
        this.videoPlane.hide();
    }

    /**
     * NEW: 強制非アクティブ化（他マーカー表示時の強制切り替え用）
     */
    forceDeactivate() {
        if (!this.isDetected) return;
        
        console.log(`Force deactivating marker: ${this.marker.id}`);
        
        // タイマーをクリア
        if (this.foundTimeout) {
            clearTimeout(this.foundTimeout);
            this.foundTimeout = null;
        }
        
        if (this.lostTimeout) {
            clearTimeout(this.lostTimeout);
            this.lostTimeout = null;
        }
        
        // 即座に非アクティブ化
        this.isDetected = false;
        this.videoPlane.hideImmediate(); // アニメーションなしで即座に非表示
        
        console.log(`Force deactivated marker: ${this.marker.id}`);
    }

    /**
     * マーカーの検出状態確認
     */
    isMarkerDetected() {
        return this.isDetected;
    }

    /**
     * 最後の検出時刻取得
     */
    getLastDetectionTime() {
        return this.lastDetectionTime;
    }

    /**
     * リソース解放
     */
    destroy() {
        if (this.foundTimeout) {
            clearTimeout(this.foundTimeout);
            this.foundTimeout = null;
        }
        
        if (this.lostTimeout) {
            clearTimeout(this.lostTimeout);
            this.lostTimeout = null;
        }
        
        console.log(`ARMarker destroyed: ${this.marker.id}`);
    }
}