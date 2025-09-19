class ARSceneManager {
    constructor({ loadingSelector, statusSelector, interactionOverlaySelector }) {
        this.statusDisplay = new StatusDisplay(statusSelector);
        this.loadingManager = new LoadingManager(loadingSelector);
        this.interactionOverlay = document.querySelector(interactionOverlaySelector);
        this.arScene = document.querySelector("#ar-scene");
        
        // 初期化フラグ
        this.isInitialized = false;
        this.isARReady = false;
        
        // マーカーと動画のマッピング（修正されたファイル名に対応）
        this.markerVideoMap = {
            "marker-01": { video: "#video-01", plane: "#plane-01" },
            "marker-02": { video: "#video-02", plane: "#plane-02" },
            "marker-03": { video: "#video-03", plane: "#plane-03" }
        };

        // マーカー別の強制位置オフセット設定
        // this.markerOffsets = {
        //     "marker-01": { x: 0, y: 0, z: 0 },      // 中央（基準マーカー）
        //     "marker-02": { x: 1, y: 0, z: 0 },      // 右に1単位移動
        //     "marker-03": { x: -1, y: 0, z: 0 }      // 左に1単位移動
        // };
        // 1件表示用：全てのマーカーを中央に配置
        this.markerOffsets = {
            "marker-01": { x: 0, y: 0, z: 0 },      // 中央配置
            "marker-02": { x: 0, y: 0, z: 0 },      // 中央配置
            "marker-03": { x: 0, y: 0, z: 0 }       // 中央配置
        };

        // 動的オフセット調整フラグ（1件表示用に無効化）
        // this.enableDynamicSeparation = true;
        // this.conflictDetectionEnabled = true;
        this.enableDynamicSeparation = false;  // 1件表示時は位置調整不要
        this.conflictDetectionEnabled = false; // 競合検出も無効化

        // 1件表示制御用プロパティ
        this.maxSimultaneousMarkers = 1;  // 同時表示マーカー数制限
        this.currentActiveMarker = null;  // 現在アクティブなマーカー
        this.markerQueue = [];            // マーカー検出キュー

        this.instances = [];

        console.log("ARSceneManager initialized with marker offsets:", this.markerOffsets);
    }

    /**
     * AR体験を開始（ユーザーインタラクション後）
     */
    async startAR() {
        try {
            console.log("Starting AR experience...");
            
            // カメラ権限を明示的に要求
            try {
                await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        facingMode: 'environment',
                        width: { ideal: 1280, min: 640, max: 1920 },
                        height: { ideal: 960, min: 480, max: 1080 },
                        aspectRatio: { ideal: 4/3 }
                    } 
                });
                console.log("Camera permission granted");
            } catch (error) {
                console.error("Camera permission denied:", error);
                this.statusDisplay.showError("カメラアクセス許可が必要です");
                return;
            }
            
            // インタラクションオーバーレイを非表示
            this.interactionOverlay.style.display = "none";
            
            // ローディング表示
            this.loadingManager.show();
            this.statusDisplay.update("ステータス: AR初期化中...");

            // A-Frameシーンを表示
            this.arScene.style.display = "block";

            // 動画要素の準備とユーザーインタラクション設定
            await this.prepareVideos();
            
            // ARコンポーネントとインスタンス初期化（オフセット適用）
            this.initializeInstances();
            
            // AR.jsイベントリスナー設定
            this.setupAREvents();

            // 衝突検出システム開始
            if (this.conflictDetectionEnabled) {
                this.startConflictDetection();
            }
            
        } catch (error) {
            console.error("AR initialization failed:", error);
            this.statusDisplay.showError("AR初期化失敗");
        }
    }

    /**
     * 動画要素の準備（メタデータ読み込み完了まで待機）
     */
    async prepareVideos() {
        const videoElements = Object.values(this.markerVideoMap).map(refs => 
            document.querySelector(refs.video)
        );

        const loadPromises = videoElements.map(video => {
            return new Promise((resolve, reject) => {
                if (video.readyState >= 1) { // HAVE_METADATA以上
                    resolve();
                } else {
                    const onLoad = () => {
                        video.removeEventListener("loadedmetadata", onLoad);
                        video.removeEventListener("error", onError);
                        resolve();
                    };
                    const onError = (e) => {
                        video.removeEventListener("loadedmetadata", onLoad);
                        video.removeEventListener("error", onError);
                        console.warn(`Video load failed: ${video.src}`, e);
                        resolve(); // エラーでも続行
                    };
                    
                    video.addEventListener("loadedmetadata", onLoad);
                    video.addEventListener("error", onError);
                    video.load(); // 再読み込みを強制
                }
            });
        });

        await Promise.all(loadPromises);
        console.log("All videos metadata loaded");
    }

    /**
     * VideoPlayer + VideoPlane + ARMarker インスタンス作成（オフセット適用版）
     */
    initializeInstances() {
        Object.entries(this.markerVideoMap).forEach(([markerId, refs]) => {
            // マーカー固有のオフセットを取得
            const markerOffset = this.markerOffsets[markerId] || { x: 0, y: 0, z: 0 };
            
            const videoPlayer = new VideoPlayer(refs.video);
            
            // VideoPlaneにオフセットを渡して初期化
            const videoPlane = new VideoPlane(refs.plane, videoPlayer, markerOffset);
            
            const arMarker = new ARMarker(`#${markerId}`, videoPlane, this.statusDisplay);

            this.instances.push({ 
                markerId, 
                videoPlayer, 
                videoPlane, 
                arMarker,
                offset: markerOffset
            });

            console.log(`Instance initialized: ${markerId} with offset:`, markerOffset);
        });
        
        console.log("All instances initialized with offsets:", this.instances.length);
    }

    /**
     * AR.jsイベントリスナー設定
     */
    setupAREvents() {
        // A-Frameシーン開始イベント
        this.arScene.addEventListener("renderstart", () => {
            console.log("A-Frame render started");
            if (!this.isARReady) {
                setTimeout(() => this.onARReady(), 1000);
            }
        });

        // カメラソース準備完了イベント
        this.arScene.addEventListener("sourceReady", () => {
            console.log("AR.js camera ready");
            this.onARReady();
        });

        // エラーハンドリング
        this.arScene.addEventListener("arError", (event) => {
            console.error("AR Error:", event.detail);
            this.statusDisplay.showError("カメラアクセス失敗");
        });

        // カメラアクセス成功の検知（代替手段）
        setTimeout(() => {
            if (!this.isARReady) {
                console.log("Force AR ready after timeout");
                this.onARReady();
            }
        }, 3000);
    }

    /**
     * AR準備完了時の処理
     */
        onARReady() {
        if (this.isARReady) return; // 重複実行防止
        
        this.isARReady = true;
        console.log("AR ready, binding marker events with single display mode");

        // マーカーイベントをバインド（1件表示モード）
        this.instances.forEach(({ arMarker, markerId, offset }) => {
            arMarker.bindEvents();
            console.log(`Marker events bound: ${markerId} in single display mode`);
        });

        // ローディング非表示
        this.loadingManager.hide();
        this.statusDisplay.update("ステータス: マーカーを探しています...");
        
        console.log("AR Scene Manager fully initialized with single marker display mode");
    }

    /**
     * 衝突検出・位置調整システム（1件表示用に無効化）
     */
    startConflictDetection() {
        // console.log("Starting conflict detection system");
        console.log("Conflict detection disabled in single marker mode");
        
        // setInterval(() => {
        //     this.detectAndResolveConflicts();
        // }, 2000); // 2秒毎に衝突チェック
    }

    /**
     * マーカー位置衝突の検出と解決
     */
    detectAndResolveConflicts() {
        const activeInstances = this.instances.filter(instance => 
            instance.arMarker.isMarkerDetected()
        );

        if (activeInstances.length <= 1) {
            return; // 衝突なし
        }

        console.log(`Potential conflict detected: ${activeInstances.length} active markers`);

        // 動的位置分離を実行
        activeInstances.forEach((instance, index) => {
            if (index === 0) return; // 最初のマーカーは基準として維持
            
            // 追加のランダムオフセットを適用
            const additionalOffset = {
                x: (Math.random() - 0.5) * 2, // -1から+1
                y: 0,
                z: (Math.random() - 0.5) * 1  // -0.5から+0.5
            };

            const newOffset = {
                x: instance.offset.x + additionalOffset.x,
                y: instance.offset.y + additionalOffset.y,
                z: instance.offset.z + additionalOffset.z
            };

            instance.videoPlane.updateOffset(newOffset);
            console.log(`Conflict resolution: ${instance.markerId} moved to:`, newOffset);
        });

        this.statusDisplay.update("ステータス: 複数マーカー検出 - 位置調整中");
    }

    /**
     * 手動オフセット調整（デバッグ・テスト用）
     */
    adjustMarkerOffset(markerId, newOffset) {
        const instance = this.instances.find(inst => inst.markerId === markerId);
        if (instance) {
            instance.videoPlane.updateOffset(newOffset);
            instance.offset = { ...instance.offset, ...newOffset };
            console.log(`Manual offset adjustment: ${markerId}`, newOffset);
        }
    }

    /**
     * 全マーカーの位置リセット
     */
    resetAllPositions() {
        this.instances.forEach(instance => {
            const originalOffset = this.markerOffsets[instance.markerId];
            instance.videoPlane.updateOffset(originalOffset);
            instance.offset = { ...originalOffset };
        });
        console.log("All marker positions reset to original offsets");
        this.statusDisplay.update("ステータス: マーカー位置をリセット");
    }

    /**
     * デバッグ情報出力
     */
    debugMarkerPositions() {
        console.log("=== Marker Position Debug Info ===");
        this.instances.forEach(instance => {
            console.log(`${instance.markerId}:`, {
                detected: instance.arMarker.isMarkerDetected(),
                visible: instance.videoPlane.getVisibility(),
                offset: instance.offset
            });
            instance.videoPlane.debugInfo();
        });
        console.log("==================================");
    }

    /**
     * NEW: 単一マーカー表示制御
     */
    handleMarkerActivation(markerId, arMarker) {
        // 既に同じマーカーがアクティブな場合は何もしない
        if (this.currentActiveMarker === markerId) {
            return true;
        }
        
        // 他のマーカーがアクティブな場合は非アクティブ化
        if (this.currentActiveMarker) {
            console.log(`Deactivating current marker: ${this.currentActiveMarker} to show: ${markerId}`);
            const currentInstance = this.instances.find(inst => inst.markerId === this.currentActiveMarker);
            if (currentInstance) {
                currentInstance.arMarker.forceDeactivate(); // 強制非アクティブ化
            }
        }
        
        // 新しいマーカーをアクティブ化
        this.currentActiveMarker = markerId;
        this.statusDisplay.update(`ステータス: ${markerId} 表示中（単一表示モード）`);
        console.log(`Single marker mode: Activated ${markerId}`);
        return true;
    }

    /**
     * NEW: マーカー非アクティブ化処理
     */
    handleMarkerDeactivation(markerId) {
        if (this.currentActiveMarker === markerId) {
            this.currentActiveMarker = null;
            console.log(`Single marker mode: Deactivated ${markerId}`);
            
            // 待機状態に戻す
            setTimeout(() => {
                if (!this.currentActiveMarker) {
                    this.statusDisplay.update("ステータス: マーカーを探しています...");
                }
            }, 500);
        }
    }

    /**
     * リソース解放
     */
    destroy() {
        this.instances.forEach(({ arMarker }) => {
            arMarker.destroy();
        });
        this.instances = [];
        
        if (this.loadingManager) {
            this.loadingManager.hide();
        }
        
        if (this.statusDisplay) {
            this.statusDisplay.destroy();
        }
        
        console.log("ARSceneManager destroyed");
    }
}