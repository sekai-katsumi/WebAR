class VideoPlane {
    constructor(selector, videoPlayer, markerOffset = null) {
        this.plane = document.querySelector(selector);
        this.videoPlayer = videoPlayer;
        this.isVisible = false;
        this.animating = false;
        
        // マーカー固有のオフセット（強制的な位置分離用）
        this.markerOffset = markerOffset || { x: 0, y: 0, z: 0 };
        
        if (!this.plane) {
            console.error(`Video plane not found: ${selector}`);
            return;
        }

        if (!this.videoPlayer) {
            console.error(`Video player not provided for plane: ${selector}`);
            return;
        }

        // 初期状態設定: オフセット適用済みの位置
        this.plane.setAttribute("visible", false);
        this.plane.setAttribute("material", "opacity", 0);
        
        // オフセット適用のデフォルト位置を設定
        this.setDefaultPosition();
        
        console.log(`VideoPlane initialized: ${this.plane.id} with offset:`, this.markerOffset);
    }

    /**
     * オフセット適用のデフォルト位置設定（中央オーバーラップ用）
     */
    setDefaultPosition() {
        // マーカー固有のオフセットを適用した位置設定
        // const x = 0 + this.markerOffset.x;
        // const y = 0 + this.markerOffset.y;
        // const z = 0 + this.markerOffset.z;
        
        // 中央オーバーラップ表示用：オフセットを無視して中央配置
        const x = 0; // 中央配置
        const y = 0; // 中央配置  
        const z = 0.01; // マーカー面からわずかに浮上
        
        this.plane.setAttribute("position", `${x} ${y} ${z}`);
        this.plane.setAttribute("rotation", "-90 0 0");
        
        // 16:9アスペクト比でサイズ設定（マーカーサイズに合わせて調整）
        // this.plane.setAttribute("width", "2");
        // this.plane.setAttribute("height", "1.125");
        
        // マーカーサイズに合わせたサイズ設定
        this.plane.setAttribute("width", "1.8");   // マーカーより少し小さめ
        this.plane.setAttribute("height", "1.0125"); // 16:9比率を維持
        
        // マテリアル設定
        this.plane.setAttribute("material", "shader", "flat");
        this.plane.setAttribute("material", "transparent", true);
        this.plane.setAttribute("material", "alphaTest", 0.5);
        
        console.log(`Position set for ${this.plane.id} (center overlap): (${x}, ${y}, ${z})`);
    }

    /**
     * マーカーに最適化された位置設定（中央オーバーラップ版）
     */
    setMarkerOptimalPosition() {
        // オフセット適用済みの中央配置
        // this.setPosition(0, 1, 0.01);
        // this.setRotation(-90, 0, 0);
        
        // 中央オーバーラップ配置
        this.setPosition(0, 0, 0.01);
        this.setRotation(-90, 0, 0);
        
        // 16:9比率、マーカーサイズに適したサイズ
        // this.setSize(2, 1.125);
        this.setSize(1.8, 1.0125);
        
        console.log(`Marker optimal position set (center overlap): ${this.plane.id}`);
    }

    /**
     * 動的オフセット更新（実行時に位置を強制変更）
     */
    updateOffset(newOffset) {
        this.markerOffset = { ...this.markerOffset, ...newOffset };
        this.setDefaultPosition();
        console.log(`Offset updated for ${this.plane.id}:`, this.markerOffset);
    }

    /**
     * 強制位置リセット（マーカー重複時の緊急対応）
     */
    forcePositionSeparation() {
        const currentTime = Date.now();
        const randomZ = (Math.random() - 0.05) * 2; // -0.1から+0.1のランダム
        
        this.updateOffset({
            x: this.markerOffset.x,
            y: this.markerOffset.y,
            z: this.markerOffset.z + randomZ
        });
        
        console.log(`Force separation applied to ${this.plane.id}: random offset added`);
    }

    /**
     * プレーン表示（フェードイン効果付き）
     */
    show(fadeDuration = 300) {
        if (this.isVisible || this.animating) {
            return;
        }

        console.log(`Showing video plane: ${this.plane.id} at offset position`);
        
        // 表示前に位置を再確認・再適用
        this.setDefaultPosition();
        
        this.animating = true;

        // 既存のアニメーションをクリア
        this.clearAnimations();

        // プレーンを可視化
        this.plane.setAttribute("visible", true);
        
        // フェードインアニメーション
        this.plane.setAttribute("animation__fadein", {
            property: "material.opacity",
            from: 0,
            to: 1,
            dur: fadeDuration,
            easing: "easeInOutQuad"
        });

        // アニメーション完了後の処理
        setTimeout(() => {
            this.isVisible = true;
            this.animating = false;
            this.plane.removeAttribute("animation__fadein");
            console.log(`Video plane visible: ${this.plane.id} at final position`);
        }, fadeDuration);
    }

    /**
     * プレーン非表示（フェードアウト効果付き）
     */
    hide(fadeDuration = 500) {
        if (!this.isVisible || this.animating) {
            return;
        }

        console.log(`Hiding video plane: ${this.plane.id}`);
        
        this.animating = true;

        // 既存のアニメーションをクリア
        this.clearAnimations();

        // フェードアウトアニメーション
        this.plane.setAttribute("animation__fadeout", {
            property: "material.opacity",
            from: 1,
            to: 0,
            dur: fadeDuration,
            easing: "easeInOutQuad"
        });

        // アニメーション完了後の処理
        setTimeout(() => {
            // 動画を一時停止
            this.videoPlayer.pause();
            this.videoPlayer.reset(); // 先頭に戻す
            
            // プレーンを非可視化
            this.plane.setAttribute("visible", false);
            this.plane.removeAttribute("animation__fadeout");
            
            this.isVisible = false;
            this.animating = false;
            
            console.log(`Video plane hidden: ${this.plane.id}`);
        }, fadeDuration);
    }

    /**
     * 即座に表示（アニメーションなし）
     */
    showImmediate() {
        this.clearAnimations();
        this.setDefaultPosition(); // 位置再適用
        this.plane.setAttribute("visible", true);
        this.plane.setAttribute("material", "opacity", 1);
        this.isVisible = true;
        this.animating = false;
        console.log(`Video plane shown immediately: ${this.plane.id}`);
    }

    /**
     * 即座に非表示（アニメーションなし）
     */
    hideImmediate() {
        this.clearAnimations();
        this.videoPlayer.pause();
        this.videoPlayer.reset();
        this.plane.setAttribute("visible", false);
        this.plane.setAttribute("material", "opacity", 0);
        this.isVisible = false;
        this.animating = false;
        console.log(`Video plane hidden immediately: ${this.plane.id}`);
    }

    /**
     * アニメーション属性をクリア
     */
    clearAnimations() {
        this.plane.removeAttribute("animation__fadein");
        this.plane.removeAttribute("animation__fadeout");
    }

    /**
     * プレーンの可視状態確認
     */
    getVisibility() {
        return this.isVisible;
    }

    /**
     * アニメーション中かどうか確認
     */
    isAnimating() {
        return this.animating;
    }

    /**
     * 不透明度を直接設定
     */
    setOpacity(opacity) {
        if (opacity < 0) opacity = 0;
        if (opacity > 1) opacity = 1;
        
        this.plane.setAttribute("material", "opacity", opacity);
        
        if (opacity > 0 && !this.isVisible) {
            this.plane.setAttribute("visible", true);
            this.isVisible = true;
        } else if (opacity === 0 && this.isVisible) {
            this.plane.setAttribute("visible", false);
            this.isVisible = false;
        }
    }

    /**
     * プレーンのサイズ変更
     */
    setSize(width, height) {
        this.plane.setAttribute("width", width);
        this.plane.setAttribute("height", height);
        console.log(`Video plane size changed: ${this.plane.id} - ${width}x${height}`);
    }

    /**
     * プレーンの位置変更（オフセット考慮版）
     */
    setPosition(x, y, z) {
        // 基本位置にオフセットを加算
        const finalX = x + this.markerOffset.x;
        const finalY = y + this.markerOffset.y;
        const finalZ = z + this.markerOffset.z;
        
        this.plane.setAttribute("position", `${finalX} ${finalY} ${finalZ}`);
        console.log(`Video plane position changed: ${this.plane.id} - (${finalX}, ${finalY}, ${finalZ})`);
    }

    /**
     * プレーンの回転変更
     */
    setRotation(x, y, z) {
        this.plane.setAttribute("rotation", `${x} ${y} ${z}`);
        console.log(`Video plane rotation changed: ${this.plane.id} - (${x}, ${y}, ${z})`);
    }

    /**
     * マーカーに最適化された位置設定（オフセット適用版）
     */
    setMarkerOptimalPosition() {
        // オフセット適用済みの中央配置
        this.setPosition(0, 1, 0.01);
        this.setRotation(-90, 0, 0);
        
        // 16:9比率、適切なサイズ
        this.setSize(2, 1.125);
        
        console.log(`Marker optimal position set: ${this.plane.id} with offset`);
    }

    /**
     * 立体的な位置設定（浮遊効果）
     */
    setFloatingPosition(height = 0.01) {
        this.setPosition(0, 1, height);
        this.setRotation(-90, 0, 0);
        console.log(`Floating position set: ${this.plane.id} at height ${height} with offset`);
    }

    /**
     * 垂直立て掛け位置設定
     */
    setVerticalPosition() {
        this.setPosition(0, 1, 0);
        this.setRotation(0, 0, 0);
        console.log(`Vertical position set: ${this.plane.id} with offset`);
    }

    /**
     * マテリアル設定の更新
     */
    updateMaterial(properties) {
        Object.keys(properties).forEach(key => {
            this.plane.setAttribute("material", key, properties[key]);
        });
        console.log(`Video plane material updated: ${this.plane.id}`, properties);
    }

    /**
     * 動画テクスチャを強制更新
     */
    refreshVideoTexture() {
        if (this.videoPlayer && this.videoPlayer.video) {
            const videoSrc = this.videoPlayer.video.id;
            this.plane.setAttribute("material", "src", `#${videoSrc}`);
            console.log(`Video texture refreshed: ${this.plane.id} -> ${videoSrc}`);
        }
    }

    /**
     * デバッグ情報表示（オフセット情報含む）
     */
    debugInfo() {
        const position = this.plane.getAttribute("position");
        const rotation = this.plane.getAttribute("rotation");
        const scale = this.plane.getAttribute("scale");
        const visible = this.plane.getAttribute("visible");
        
        console.log(`Debug Info for ${this.plane.id}:`, {
            position,
            rotation,
            scale,
            visible,
            isVisible: this.isVisible,
            animating: this.animating,
            markerOffset: this.markerOffset
        });
    }

    /**
     * リソース解放
     */
    destroy() {
        this.clearAnimations();
        this.hideImmediate();
        console.log(`VideoPlane destroyed: ${this.plane.id}`);
    }
}