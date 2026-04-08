import './style.css'
import gameData from './data.json'
import { LanguageManager } from './lang.js'

// ─── Core Setup ──────────────────────────────────────────────────────────────
const lang = new LanguageManager(gameData);
lang.updateUI();

// ─── Sound Manager (placeholder — swap .mp3 paths to add real audio) ─────────
class SoundManager {
    static ctx = null;

    static getCtx() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        return this.ctx;
    }

    static beep(freq = 440, dur = 0.15, type = 'sine', vol = 0.3) {
        try {
            const ctx = this.getCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(vol, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + dur);
        } catch(e) { /* silently fail on browsers that block autoplay */ }
    }

    static play(effect) {
        switch(effect) {
            case 'pop':         this.beep(660, 0.1, 'sine'); break;
            case 'success':     this.beep(523, 0.1); setTimeout(() => this.beep(659, 0.1), 120); setTimeout(() => this.beep(784, 0.2), 240); break;
            case 'error':       this.beep(220, 0.3, 'sawtooth', 0.2); break;
            case 'flip':        this.beep(880, 0.08, 'triangle'); break;
        }
    }
}

// ─── Voice Manager (Web Speech API) ──────────────────────────────────────────
class VoiceManager {
    static synth = window.speechSynthesis;
    static voices = [];

    static init() {
        this.loadVoices();
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => this.loadVoices();
        }
    }

    static loadVoices() {
        this.voices = this.synth.getVoices();
    }

    static speak(text, locale) {
        if (!text) return;
        this.synth.cancel(); // Stop any current speech
        const utter = new SpeechSynthesisUtterance(text);
        
        // Try to find a matching voice
        const langCode = locale === 'fr' ? 'fr-FR' : 'en-US';
        const voice = this.voices.find(v => v.lang.startsWith(langCode)) || this.voices[0];
        if (voice) utter.voice = voice;
        utter.lang = langCode;
        utter.rate = 0.9; // Slightly slower for kids
        utter.pitch = 1.1; // Slightly higher/cuter
        
        this.synth.speak(utter);
    }
}
VoiceManager.init();

// ─── Game State ──────────────────────────────────────────────────────────────
class GameState {
    constructor() {
        this.stars = parseInt(localStorage.getItem('ludikids_stars') || '0');
        this.unlockedStickers = JSON.parse(localStorage.getItem('ludikids_stickers') || '[]');
        this.currentScene = 'intro-scene';
        this.updateStarDisplay();
    }

    addStar() {
        this.stars++;
        localStorage.setItem('ludikids_stars', this.stars);
        this.updateStarDisplay();
        SoundManager.play('success');
        this.showReward();
    }

    removeStars(n) {
        this.stars -= n;
        localStorage.setItem('ludikids_stars', this.stars);
        this.updateStarDisplay();
    }

    updateStarDisplay() {
        document.getElementById('star-count').textContent = this.stars;
    }

    unlockSticker(id) {
        if (!this.unlockedStickers.includes(id)) {
            this.unlockedStickers.push(id);
            localStorage.setItem('ludikids_stickers', JSON.stringify(this.unlockedStickers));
            return true;
        }
        return false;
    }

    showReward() {
        const overlay = document.getElementById('reward-overlay');
        overlay.querySelector('h2').textContent = lang.t('bravo');
        overlay.classList.remove('hidden');
        this.createConfetti();
        setTimeout(() => overlay.classList.add('hidden'), 2200);
    }

    createConfetti() {
        const overlay = document.getElementById('reward-overlay');
        const colors = ['#ffde59','#5ce1e6','#ff914d','#a855f7','#22c55e','#ffffff'];
        for (let i = 0; i < 40; i++) {
            const c = document.createElement('div');
            c.className = 'confetti';
            c.style.cssText = `left:${Math.random()*100}%; background:${colors[Math.floor(Math.random()*colors.length)]}; width:${6+Math.random()*8}px; height:${6+Math.random()*8}px; animation-delay:${Math.random()*0.8}s; animation-duration:${1.5+Math.random()*0.8}s`;
            overlay.appendChild(c);
            setTimeout(() => c.remove(), 2200);
        }
    }

    showOops() {
        SoundManager.play('error');
        const overlay = document.getElementById('reward-overlay');
        overlay.querySelector('h2').textContent = lang.t('oops');
        overlay.querySelector('h2').style.color = '#ef4444';
        overlay.querySelector('.big-star').style.display = 'none';
        overlay.classList.remove('hidden');
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.querySelector('h2').style.color = '';
            overlay.querySelector('.big-star').style.display = '';
        }, 800);
    }
}

const state = new GameState();

// ─── Scene Manager ───────────────────────────────────────────────────────────
const SceneManager = {
    showScene(id) {
        const viewport = document.getElementById('game-viewport');
        const oldScene = document.querySelector('.scene.active');
        const newScene = document.getElementById(id);

        if (!newScene) {
            console.error(`Scene not found: ${id}`);
            return;
        }

        if (oldScene && oldScene.id !== id) {
            oldScene.classList.add('scene-transition-exit');
            oldScene.classList.remove('active');
            setTimeout(() => {
                oldScene.classList.remove('scene-transition-exit');
            }, 400);
        }

        newScene.classList.add('active');
        newScene.classList.add('scene-transition-enter');
        setTimeout(() => {
            newScene.classList.remove('scene-transition-enter');
        }, 400);

        state.currentScene = id;
    }
};

// ─── Math Game ───────────────────────────────────────────────────────────────
const MathGame = {
    difficulty: 'easy',  // easy | medium | hard
    target: 0,
    tens: 0,
    units: 0,
    initialized: false,

    init() {
        if (!this.initialized) { this.createScene(); this.initialized = true; }
        this.showDifficultyPicker();
        SceneManager.showScene('math-scene');
    },

    createScene() {
        const s = document.createElement('div');
        s.id = 'math-scene';
        s.className = 'scene';
        document.getElementById('game-viewport').appendChild(s);
    },

    showDifficultyPicker() {
        document.getElementById('math-scene').innerHTML = `
            <div class="task-info"><p>${lang.t('difficulty')}</p></div>
            <div class="diff-grid">
                <button class="diff-btn easy-btn" onclick="MathGame.startWithDiff('easy')">
                    <span class="diff-icon">🌱</span>
                    <span>${lang.t('easy')}</span>
                </button>
                <button class="diff-btn medium-btn" onclick="MathGame.startWithDiff('medium')">
                    <span class="diff-icon">🌻</span>
                    <span>${lang.t('medium')}</span>
                </button>
                <button class="diff-btn hard-btn" onclick="MathGame.startWithDiff('hard')">
                    <span class="diff-icon">🦁</span>
                    <span>${lang.t('hard')}</span>
                </button>
            </div>
        `;
    },

    startWithDiff(diff) {
        this.difficulty = diff;
        this.startEasyLevel();
    },

    // Easy: count visible apples (1–10)
    startEasyLevel() {
        this.target = Math.floor(Math.random() * (this.difficulty === 'easy' ? 6 : this.difficulty === 'medium' ? 9 : 12)) + 2;
        const scene = document.getElementById('math-scene');
        scene.innerHTML = `
            <div class="task-info"><p>${lang.t('math_task_easy')}</p></div>
            <div class="count-grid">
                ${Array.from({length: this.target}, () => `<img src="assets/apple.png" class="count-apple" alt="apple">`).join('')}
            </div>
            <div class="answer-row">
                ${[...Array(this.target + 3).keys()].slice(1).sort(() => Math.random()-0.5).slice(0,4).concat([this.target])
                    .filter((v,i,a) => a.indexOf(v)===i).sort(() => Math.random()-0.5)
                    .map(n => `<button class="answer-btn" onclick="MathGame.checkCount(${n})">${n}</button>`).join('')}
            </div>
        `;
    },

    checkCount(n) {
        if (n === this.target) {
            state.addStar();
            setTimeout(() => this.startEasyLevel(), 2300);
        } else {
            state.showOops();
        }
    },

    // Hard mode: build the number with tens bars and unit beads
    startBuildLevel() {
        const ranges = { easy: [5,15], medium: [10,50], hard: [20,99] };
        const [min, max] = ranges[this.difficulty];
        this.target = Math.floor(Math.random() * (max - min)) + min;
        this.tens = 0; this.units = 0;
        const scene = document.getElementById('math-scene');
        scene.innerHTML = `
            <div class="task-info"><p>${lang.t('math_task_hard', { n: `<span class="big-num">${this.target}</span>` })}</p></div>
            <div class="current-total" id="math-total">0</div>
            <div class="math-display">
                <div id="tens-display" class="tens-container"></div>
                <div id="units-display" class="units-container"></div>
            </div>
            <div class="math-buttons">
                <button class="math-tool-btn" onclick="MathGame.addItem('ten')">📦<br><small>+10</small></button>
                <button class="math-tool-btn" onclick="MathGame.addItem('unit')">🍎<br><small>+1</small></button>
                <button class="math-tool-btn danger" onclick="MathGame.removeItem()">↩️<br><small>-1</small></button>
                <button class="math-tool-btn" onclick="MathGame.startBuildLevel()">🔄</button>
            </div>
        `;
    },

    addItem(type) {
        if (type === 'ten') this.tens++;
        else this.units++;
        SoundManager.play('pop');
        this.updateBuildDisplay();
        this.checkBuildWin();
    },

    removeItem() {
        if (this.units > 0) this.units--;
        else if (this.tens > 0) { this.tens--; this.units = 9; }
        this.updateBuildDisplay();
    },

    updateBuildDisplay() {
        const total = this.tens * 10 + this.units;
        document.getElementById('math-total').textContent = total;

        const tensDiv = document.getElementById('tens-display');
        const unitsDiv = document.getElementById('units-display');
        tensDiv.innerHTML = '';
        unitsDiv.innerHTML = '';

        for (let i = 0; i < this.tens; i++) {
            const bar = document.createElement('div');
            bar.className = 'ten-bar';
            bar.innerHTML = Array(10).fill('<div class="bead-pip"></div>').join('');
            tensDiv.appendChild(bar);
        }
        for (let i = 0; i < this.units; i++) {
            const bead = document.createElement('div');
            bead.className = 'unit-bead-dot';
            unitsDiv.appendChild(bead);
        }
    },

    checkBuildWin() {
        const total = this.tens * 10 + this.units;
        if (total === this.target) {
            state.addStar();
            setTimeout(() => this.startBuildLevel(), 2300);
        } else if (total > this.target) {
            state.showOops();
            setTimeout(() => this.startBuildLevel(), 900);
        }
    }
};
window.MathGame = MathGame;

// ─── Vocabulary Game ─────────────────────────────────────────────────────────
const VocabularyGame = {
    initialized: false,
    category: null,
    target: null,
    mode: 'quiz',  // quiz | flash
    flashIndex: 0,

    init() {
        if (!this.initialized) { this.createScene(); this.initialized = true; }
        this.showCategorySelect();
        SceneManager.showScene('vocab-scene');
    },

    createScene() {
        const s = document.createElement('div');
        s.id = 'vocab-scene';
        s.className = 'scene';
        document.getElementById('game-viewport').appendChild(s);
    },

    showCategorySelect() {
        document.getElementById('vocab-scene').innerHTML = `
            <div class="task-info"><p>${lang.t('play_together')}</p></div>
            <div class="category-grid">
                ${gameData.categories.map(c => `
                    <button class="category-btn" style="background:${c.color || '#fff'}" onclick="VocabularyGame.startCategory('${c.id}')">
                        <span class="cat-icon">${c.icon}</span>
                        <span class="btn-text">${c.name[lang.locale]}</span>
                    </button>
                `).join('')}
            </div>
        `;
    },

    startCategory(catId) {
        this.category = lang.getCategory(catId);
        this.showModePicker();
    },

    showModePicker() {
        document.getElementById('vocab-scene').innerHTML = `
            <div class="task-info"><p>${this.category.name[lang.locale]}</p></div>
            <div class="mode-grid">
                <button class="mode-btn flash-btn" onclick="VocabularyGame.startFlash()">
                    <span class="mode-icon">📖</span>
                    <span>${lang.t('flash_mode')}</span>
                </button>
                <button class="mode-btn quiz-btn" onclick="VocabularyGame.startQuiz()">
                    <span class="mode-icon">❓</span>
                    <span>${lang.t('quiz_mode')}</span>
                </button>
            </div>
            <button class="back-btn" onclick="VocabularyGame.showCategorySelect()">⬅️</button>
        `;
    },

    // ── Flashcard mode ───────────────────────────────────────────────────────
    startFlash() {
        this.mode = 'flash';
        this.flashIndex = 0;
        this.showFlashcard();
    },

    showFlashcard() {
        const items = this.category.items;
        if (this.flashIndex >= items.length) {
            // Completed all flashcards
            state.addStar();
            setTimeout(() => this.showModePicker(), 2300);
            return;
        }
        const item = items[this.flashIndex];
        const visual = item.image
            ? `<img class="flash-img" src="${item.image}" alt="${item.name[lang.locale]}" onerror="this.parentNode.innerHTML='<span class=flash-emoji>${item.emoji||'❓'}</span>'">`
            : `<span class="flash-emoji">${item.emoji || '❓'}</span>`;

        document.getElementById('vocab-scene').innerHTML = `
            <div class="task-info"><p>${lang.t('learn_item', { name: `<span class="big-sound">${item.name[lang.locale]}</span>` })}</p></div>
            <div class="flash-card" onclick="VocabularyGame.nextFlash()">
                ${visual}
                <div class="flash-label">${item.name[lang.locale]}</div>
                ${lang.locale !== 'fr' ? `<div class="flash-sublabel">${item.name['fr']}</div>` : ''}
            </div>
            <div class="flash-progress">${this.flashIndex + 1} / ${items.length}</div>
            <button class="back-btn" onclick="VocabularyGame.showModePicker()">⬅️</button>
        `;
        SoundManager.play('flip');
        // Auto-speak the word
        setTimeout(() => VoiceManager.speak(item.name[lang.locale], lang.locale), 300);
    },

    nextFlash() {
        this.flashIndex++;
        this.showFlashcard();
    },

    // ── Quiz mode ────────────────────────────────────────────────────────────
    startQuiz() {
        this.mode = 'quiz';
        this.nextQuizRound();
    },

    nextQuizRound() {
        const items = this.category.items;
        // Build a pool of 4 choices (always includes the target)
        const shuffled = [...items].sort(() => Math.random() - 0.5);
        const pool = shuffled.slice(0, Math.min(4, items.length));
        this.target = pool[Math.floor(Math.random() * pool.length)];

        const visual = (item) => item.image
            ? `<img class="item-img" src="${item.image}" alt="${item.name[lang.locale]}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">${item.emoji ? `<span class="emoji-fallback" style="display:none">${item.emoji}</span>` : ''}`
            : `<span class="item-emoji">${item.emoji || '❓'}</span>`;

        document.getElementById('vocab-scene').innerHTML = `
            <div class="task-info">
                <p>${lang.t('touch_item', { name: `<span class="big-sound">${this.target.name[lang.locale]}</span>` })}</p>
            </div>
            <div class="item-grid grid-${pool.length}">
                ${pool.map(item => `
                    <div class="item-card" role="button" onclick="VocabularyGame.checkItem('${item.id}')">
                        ${visual(item)}
                        <span class="item-label">${item.name[lang.locale]}</span>
                    </div>
                `).join('')}
            </div>
            <button class="back-btn" onclick="VocabularyGame.showModePicker()">⬅️</button>
        `;
        // Speak the target word question
        setTimeout(() => VoiceManager.speak(this.target.name[lang.locale], lang.locale), 200);
    },

    checkItem(id) {
        if (id === this.target.id) {
            state.addStar();
            setTimeout(() => this.nextQuizRound(), 2300);
        } else {
            state.showOops();
        }
    }
};
window.VocabularyGame = VocabularyGame;

// ─── Sticker Book ────────────────────────────────────────────────────────────
const StickerBook = {
    initialized: false,
    init() {
        if (!this.initialized) {
            const s = document.createElement('div');
            s.id = 'sticker-scene';
            s.className = 'scene';
            document.getElementById('game-viewport').appendChild(s);
            this.initialized = true;
        }
        this.render();
        SceneManager.showScene('sticker-scene');
    },

    render() {
        const scene = document.getElementById('sticker-scene');
        const total = gameData.stickers.length;
        const unlocked = state.unlockedStickers.length;

        scene.innerHTML = `
            <div class="task-info"><p>${lang.t('book')}</p></div>
            <div class="sticker-grid">
                ${gameData.stickers.map(s => {
                    const isUnlocked = state.unlockedStickers.includes(s.id);
                    return `<div class="sticker-item ${isUnlocked ? '' : 'locked'}" title="${isUnlocked ? s.name[lang.locale] : '?'}">
                        ${isUnlocked ? s.emoji : '❓'}
                    </div>`;
                }).join('')}
            </div>
            ${unlocked < total ? `
                <button class="unlock-btn ${state.stars >= 5 ? '' : 'disabled'}" onclick="StickerBook.unlock()">
                    ${state.stars >= 5 ? lang.t('get_sticker') : lang.t('need_stars')}
                </button>
            ` : `<p class="bravo-text">${lang.t('unlock_all')}</p>`}
            <button class="back-btn" onclick="SceneManager.showScene('intro-scene')">🏠</button>
        `;
    },

    unlock() {
        if (state.stars < 5) {
            SoundManager.play('error');
            return;
        }

        const locked = gameData.stickers.filter(s => !state.unlockedStickers.includes(s.id));
        if (locked.length === 0) return;

        const random = locked[Math.floor(Math.random() * locked.length)];
        state.removeStars(5);
        state.unlockSticker(random.id);
        SoundManager.play('success');
        this.render();
        
        // Add pop animation to the newly unlocked sticker
        setTimeout(() => {
            const items = document.querySelectorAll('.sticker-item');
            const index = gameData.stickers.findIndex(s => s.id === random.id);
            if (items[index]) items[index].classList.add('new-pop');
        }, 50);
    }
};
window.StickerBook = StickerBook;

// ─── Intro scene language update ──────────────────────────────────────────────
function refreshIntro() {
    const greeting = document.querySelector('.greeting');
    if (greeting) greeting.textContent = lang.t('play_together');
    const mathTxt = document.querySelector('#math-btn .btn-text');
    if (mathTxt) mathTxt.textContent = lang.t('math');
    const wordTxt = document.querySelector('#french-btn .btn-text');
    if (wordTxt) wordTxt.textContent = lang.t('words');
}

// ─── Playground ─────────────────────────────────────────────────────────────
const Playground = {
    initialized: false,
    positions: JSON.parse(localStorage.getItem('ludikids_playground') || '{}'),

    init() {
        if (!this.initialized) {
            const s = document.createElement('div');
            s.id = 'playground-scene';
            s.className = 'scene';
            document.getElementById('game-viewport').appendChild(s);
            this.initialized = true;
        }
        this.render();
        SceneManager.showScene('playground-scene');
    },

    render() {
        const scene = document.getElementById('playground-scene');
        const unlockedStickers = state.unlockedStickers.map(id => gameData.stickers.find(s => s.id === id));
        
        scene.innerHTML = `
            <div class="playground-hint">${lang.t('playground_hint')}</div>
            ${unlockedStickers.map(s => {
                const pos = this.positions[s.id] || { x: Math.random() * 70 + 15, y: Math.random() * 70 + 15 };
                return `<div class="draggable-sticker" 
                             data-id="${s.id}" 
                             style="left:${pos.x}%; top:${pos.y}%"
                             onpointerdown="Playground.startDrag(event)">
                    ${s.emoji}
                </div>`;
            }).join('')}
            <button class="back-btn" style="position:absolute; bottom:10px; left:10px;" onclick="SceneManager.showScene('intro-scene')">🏠</button>
        `;
    },

    startDrag(e) {
        const el = e.target;
        el.setPointerCapture(e.pointerId);
        
        const onMove = (me) => {
            const rect = el.parentElement.getBoundingClientRect();
            const x = ((me.clientX - rect.left) / rect.width) * 100;
            const y = ((me.clientY - rect.top) / rect.height) * 100;
            
            // Constrain
            const cx = Math.max(5, Math.min(90, x));
            const cy = Math.max(5, Math.min(90, y));
            
            el.style.left = `${cx}%`;
            el.style.top = `${cy}%`;
            
            this.positions[el.dataset.id] = { x: cx, y: cy };
        };

        const onUp = () => {
            el.removeEventListener('pointermove', onMove);
            el.removeEventListener('pointerup', onUp);
            localStorage.setItem('ludikids_playground', JSON.stringify(this.positions));
            SoundManager.play('pop');
        };

        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerup', onUp);
    }
};
window.Playground = Playground;

// ─── Event Listeners ──────────────────────────────────────────────────────────
document.getElementById('math-btn').onclick    = () => MathGame.init();
document.getElementById('french-btn').onclick  = () => VocabularyGame.init();
document.getElementById('sticker-book-btn').onclick = () => StickerBook.init();
document.getElementById('playground-btn').onclick   = () => Playground.init();
document.getElementById('home-btn').onclick    = () => {
    SceneManager.showScene('intro-scene');
    refreshIntro();
};
document.getElementById('lang-toggle').onclick = () => {
    const next = lang.locale === 'fr' ? 'en' : 'fr';
    lang.setLocale(next);
    refreshIntro();
    if (state.currentScene === 'vocab-scene') VocabularyGame.showCategorySelect();
    if (state.currentScene === 'math-scene')  MathGame.showDifficultyPicker();
    if (state.currentScene === 'playground-scene') Playground.render();
};
