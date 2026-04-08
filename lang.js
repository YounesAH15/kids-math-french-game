// LudiKids — Language & Data Manager
export class LanguageManager {
    constructor(data) {
        this.data = data;
        this.locale = 'fr';
    }

    setLocale(lang) {
        this.locale = lang;
        this.updateUI();
    }

    t(key, params = {}) {
        const entry = this.data.ui[key];
        if (!entry) return key;
        let text = entry[this.locale] || entry['fr'] || key;
        for (const [k, v] of Object.entries(params)) {
            text = text.replace(`{${k}}`, v);
        }
        return text;
    }

    getCategory(id) {
        return this.data.categories.find(c => c.id === id);
    }

    updateUI() {
        const title = document.getElementById('game-title');
        if (title) title.textContent = this.t('greeting');

        const greeting = document.querySelector('.greeting');
        if (greeting) greeting.textContent = this.t('play_together');

        const mathText = document.querySelector('#math-btn .btn-text');
        if (mathText) mathText.textContent = this.t('math');

        const wordText = document.querySelector('#french-btn .btn-text');
        if (wordText) wordText.textContent = this.t('words');

        const toggle = document.getElementById('lang-toggle');
        if (toggle) toggle.textContent = this.locale === 'fr' ? '🌐 EN' : '🌐 FR';
    }
}
