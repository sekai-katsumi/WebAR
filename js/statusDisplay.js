/**
 * ステータス表示管理クラス
 */
class StatusDisplay {
    constructor(selector) {
        this.el = document.querySelector(selector);
        this.fadeTimeout = null;
        
        if (!this.el) {
            console.error(`Status element not found: ${selector}`);
            return;
        }

        console.log("StatusDisplay initialized");
    }

    /**
     * ステータステキストを更新
     */
    update(text, temporary = false, duration = 3000) {
        if (!this.el) return;
        
        // 既存のフェードタイマーをクリア
        if (this.fadeTimeout) {
            clearTimeout(this.fadeTimeout);
            this.fadeTimeout = null;
        }

        // テキスト更新
        this.el.innerText = text;
        this.show();
        
        console.log(`Status updated: ${text}`);

        // 一時的表示の場合、指定時間後に非表示
        if (temporary) {
            this.fadeTimeout = setTimeout(() => {
                this.hide();
            }, duration);
        }
    }

    /**
     * ステータス表示を表示
     */
    show() {
        if (!this.el) return;
        
        this.el.style.display = "block";
        this.el.style.opacity = "1";
        this.el.style.transition = "opacity 0.3s ease-in";
    }

    /**
     * ステータス表示を非表示
     */
    hide() {
        if (!this.el) return;
        
        this.el.style.transition = "opacity 0.3s ease-out";
        this.el.style.opacity = "0";
        
        setTimeout(() => {
            if (this.el.style.opacity === "0") {
                this.el.style.display = "none";
            }
        }, 300);
    }

    /**
     * エラーメッセージを表示
     */
    showError(message, duration = 5000) {
        this.el.style.color = "#ff4444";
        this.el.style.backgroundColor = "rgba(255, 68, 68, 0.1)";
        this.update(`エラー: ${message}`, true, duration);
        
        // 色をリセット
        setTimeout(() => {
            this.el.style.color = "";
            this.el.style.backgroundColor = "";
        }, duration);
    }

    /**
     * 成功メッセージを表示
     */
    showSuccess(message, duration = 3000) {
        this.el.style.color = "#44ff44";
        this.el.style.backgroundColor = "rgba(68, 255, 68, 0.1)";
        this.update(`成功: ${message}`, true, duration);
        
        // 色をリセット
        setTimeout(() => {
            this.el.style.color = "";
            this.el.style.backgroundColor = "";
        }, duration);
    }

    /**
     * 警告メッセージを表示
     */
    showWarning(message, duration = 4000) {
        this.el.style.color = "#ffaa44";
        this.el.style.backgroundColor = "rgba(255, 170, 68, 0.1)";
        this.update(`警告: ${message}`, true, duration);
        
        // 色をリセット
        setTimeout(() => {
            this.el.style.color = "";
            this.el.style.backgroundColor = "";
        }, duration);
    }

    /**
     * 現在のステータステキストを取得
     */
    getCurrentText() {
        return this.el ? this.el.innerText : "";
    }

    /**
     * ステータス表示がvisibleかどうか
     */
    isVisible() {
        return this.el && this.el.style.display !== "none" && this.el.style.opacity !== "0";
    }

    /**
     * リソース解放
     */
    destroy() {
        if (this.fadeTimeout) {
            clearTimeout(this.fadeTimeout);
            this.fadeTimeout = null;
        }
        console.log("StatusDisplay destroyed");
    }
}