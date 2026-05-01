
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
        } catch (e) { /* silently fail on browsers that block autoplay */ }
    }

    static play(effect) {
        switch (effect) {
            case 'pop': this.beep(660, 0.1, 'sine'); break;
            case 'success': this.beep(523, 0.1); setTimeout(() => this.beep(659, 0.1), 120); setTimeout(() => this.beep(784, 0.2), 240); break;
            case 'error': this.beep(220, 0.3, 'sawtooth', 0.2); break;
            case 'flip': this.beep(880, 0.08, 'triangle'); break;
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

    /**
     * Finds the most "human-like" voice available for the given locale.
     * Prioritizes Google, Natural, and High-Quality online voices.
     */
    static getBestVoice(locale) {
        const langPrefix = locale === 'fr' ? 'fr' : 'en';
        const candidates = this.voices.filter(v => v.lang.toLowerCase().startsWith(langPrefix));

        if (candidates.length === 0) return null;

        // Scoring system for "human-likeness"
        const getScore = (v) => {
            let score = 0;
            const name = v.name.toLowerCase();
            if (name.includes('google')) score += 10;
            if (name.includes('natural')) score += 15;
            if (name.includes('online')) score += 5;
            if (name.includes('premium') || name.includes('enhanced')) score += 8;
            
            // Prefer exact locale matches (fr-FR over fr-CA for a general French app, unless user is in CA)
            const exactCode = locale === 'fr' ? 'fr-fr' : 'en-us';
            if (v.lang.toLowerCase() === exactCode) score += 3;
            
            return score;
        };

        return candidates.sort((a, b) => getScore(b) - getScore(a))[0];
    }

    /**
     * Speak a word using the best available voice for the given locale.
     * Uses a multi-tier selection and adds subtle prosody variation.
     */
    static speak(text, locale) {
        if (!text) return;

        // Lazy reload voices if needed
        if (this.voices.length === 0) this.loadVoices();

        this.synth.cancel();

        const utter = new SpeechSynthesisUtterance(text);
        const voice = this.getBestVoice(locale);

        if (voice) {
            utter.voice = voice;
            utter.lang = voice.lang;
        } else {
            utter.lang = locale === 'fr' ? 'fr-FR' : 'en-US';
        }

        // Subtle prosody randomization to make it feel less "robotic"
        // Random pitch between 1.05 and 1.15 (cute but varied)
        utter.pitch = 1.05 + (Math.random() * 0.1);
        // Random rate between 0.85 and 0.95 (steady but not fixed)
        utter.rate = 0.85 + (Math.random() * 0.1);
        utter.volume = 1.0;

        // Small delay ensures previous cancel() is fully processed by the browser audio engine
        setTimeout(() => this.synth.speak(utter), 50);
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
        const colors = ['#ffde59', '#5ce1e6', '#ff914d', '#a855f7', '#22c55e', '#ffffff'];
        for (let i = 0; i < 40; i++) {
            const c = document.createElement('div');
            c.className = 'confetti';
            c.style.cssText = `left:${Math.random() * 100}%; background:${colors[Math.floor(Math.random() * colors.length)]}; width:${6 + Math.random() * 8}px; height:${6 + Math.random() * 8}px; animation-delay:${Math.random() * 0.8}s; animation-duration:${1.5 + Math.random() * 0.8}s`;
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
window.SceneManager = SceneManager;

// ─── Math Game ───────────────────────────────────────────────────────────────
const MathGame = {
    difficulty: 'easy',  // easy | medium | hard
    target: 0,
    tens: 0,
    units: 0,
    initialized: false,
    currentItem: null,

    getRandomItem() {
        const categories = ["food", "animals", "vehicles", "household", "farm_friends", "wild_bunch", "feathered_friends", "forest_life", "flower_garden"];
        const pool = gameData.categories
            .filter(c => categories.includes(c.id))
            .flatMap(c => c.items);
        return pool[Math.floor(Math.random() * pool.length)] || { id: 'apple', name: { fr: 'Pomme', en: 'Apple' }, emoji: '🍎', image: '/assets/apple.png' };
    },

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

    // Easy: count visible items (1–10)
    startEasyLevel() {
        this.currentItem = this.getRandomItem();
        this.target = Math.floor(Math.random() * (this.difficulty === 'easy' ? 6 : this.difficulty === 'medium' ? 9 : 12)) + 2;
        const scene = document.getElementById('math-scene');

        const itemName = this.currentItem.name[lang.locale];
        const visual = this.currentItem.image
            ? `<img src="${this.currentItem.image.startsWith('/') ? '' : '/'}${this.currentItem.image}" class="count-apple" alt="${itemName}" onerror="this.outerHTML='<span class=count-emoji>${this.currentItem.emoji}</span>'">`
            : `<span class="count-emoji">${this.currentItem.emoji}</span>`;

        scene.innerHTML = `
            <div class="task-info">
                <p>${lang.t('math_task_easy').replace('🍎', this.currentItem.emoji)}</p>
                <p><small style="opacity:0.6">(${itemName})</small></p>
            </div>
            <div class="count-grid" style="grid-template-columns: repeat(${this.target > 6 ? 5 : 4}, 1fr)">
                ${Array.from({ length: this.target }, () => visual).join('')}
            </div>
            <div class="answer-row">
                ${[...Array(this.target + 3).keys()].slice(1).sort(() => Math.random() - 0.5).slice(0, 4).concat([this.target])
                .filter((v, i, a) => a.indexOf(v) === i).sort(() => Math.random() - 0.5)
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
        const ranges = { easy: [5, 15], medium: [10, 50], hard: [20, 99] };
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

// LOCAL VOCAB TRANSLATIONS
const _VT = {
    fr: { title:'Choisis ton niveau', l1:'Niveau 1', l1d:'Avec les étiquettes', l2:'Niveau 2', l2d:'Sans étiquettes', l3:'Niveau 3', l3d:'Épelle le mot', q3:'Touche la bonne image 👇', spellTitle:'Épelle le mot !', spellHint:"Touche les lettres dans l'ordre" },
    en: { title:'Choose your level',  l1:'Level 1',  l1d:'With labels',         l2:'Level 2',  l2d:'No labels',       l3:'Level 3',  l3d:'Spell the word', q3:'Tap the right image 👇',   spellTitle:'Spell the word!', spellHint:'Tap the letters in order' }
};
const _vt = (k) => (_VT[lang.locale]||_VT.fr)[k];

// ─── Vocabulary Game ─────────────────────────────────────────────────────────
const VocabularyGame = {
    initialized: false, category: null, target: null, difficulty: 1,
    mode: 'quiz', flashIndex: 0, spellState: null,

    init() {
        if (!this.initialized) { this.createScene(); this.initialized = true; }
        this.showCategorySelect();
        SceneManager.showScene('vocab-scene');
    },
    createScene() {
        const s = document.createElement('div');
        s.id = 'vocab-scene'; s.className = 'scene';
        document.getElementById('game-viewport').appendChild(s);
    },

    showCategorySelect() {
        document.getElementById('vocab-scene').innerHTML = `
            <div class="task-info"><p>${lang.t('play_together')}</p></div>
            <div class="category-grid">
                ${gameData.categories.map(c => `
                    <button class="category-btn" style="background:${c.color||'#fff'}" onclick="VocabularyGame.startCategory('${c.id}')">
                        <span class="cat-icon">${c.icon}</span>
                        <span class="btn-text">${c.name[lang.locale]}</span>
                    </button>`).join('')}
            </div>`;
    },

    startCategory(catId) { this.category = lang.getCategory(catId); this.showDifficultyPicker(); },

    showDifficultyPicker() {
        document.getElementById('vocab-scene').innerHTML = `
            <div class="task-info"><p>${this.category.name[lang.locale]}</p></div>
            <p class="diff-subtitle">${_vt('title')}</p>
            <div class="diff-grid">
                <button class="diff-btn easy-btn"   onclick="VocabularyGame.startDiff(1)">
                    <span class="diff-icon">🌱</span><span>${_vt('l1')}</span><small class="diff-sub">${_vt('l1d')}</small>
                </button>
                <button class="diff-btn medium-btn" onclick="VocabularyGame.startDiff(2)">
                    <span class="diff-icon">🌻</span><span>${_vt('l2')}</span><small class="diff-sub">${_vt('l2d')}</small>
                </button>
                <button class="diff-btn hard-btn"   onclick="VocabularyGame.startDiff(3)">
                    <span class="diff-icon">🦁</span><span>${_vt('l3')}</span><small class="diff-sub">${_vt('l3d')}</small>
                </button>
            </div>
            <button class="back-btn" onclick="VocabularyGame.showCategorySelect()">⬅️</button>`;
    },

    startDiff(level) {
        this.difficulty = level;
        if (level === 1) this.showModePicker();
        else { this.mode = 'quiz'; this.nextQuizRound(); }
    },

    showModePicker() {
        document.getElementById('vocab-scene').innerHTML = `
            <div class="task-info"><p>${this.category.name[lang.locale]}</p></div>
            <div class="mode-grid">
                <button class="mode-btn flash-btn" onclick="VocabularyGame.startFlash()">
                    <span class="mode-icon">📖</span><span>${lang.t('flash_mode')}</span>
                </button>
                <button class="mode-btn quiz-btn" onclick="VocabularyGame.startQuiz()">
                    <span class="mode-icon">❓</span><span>${lang.t('quiz_mode')}</span>
                </button>
            </div>
            <button class="back-btn" onclick="VocabularyGame.showDifficultyPicker()">⬅️</button>`;
    },

    // Flashcard mode
    startFlash() { this.mode = 'flash'; this.flashIndex = 0; this.showFlashcard(); },
    showFlashcard() {
        const items = this.category.items;
        if (this.flashIndex >= items.length) { state.addStar(); setTimeout(() => this.showModePicker(), 2300); return; }
        const item = items[this.flashIndex];
        const visual = item.image
            ? `<img class="flash-img" src="${item.image.startsWith('/')?'':'/'}${item.image}" alt="${item.name[lang.locale]}" onerror="this.parentNode.innerHTML='<span class=flash-emoji>${item.emoji||'❓'}</span>'">`
            : `<span class="flash-emoji">${item.emoji||'❓'}</span>`;
        document.getElementById('vocab-scene').innerHTML = `
            <div class="task-info"><p>${lang.t('learn_item',{name:`<span class="big-sound">${item.name[lang.locale]}</span>`})}</p></div>
            <div class="flash-card" onclick="VocabularyGame.nextFlash()">
                ${visual}
                <div class="flash-label">${item.name[lang.locale]}</div>
                ${lang.locale!=='fr'?`<div class="flash-sublabel">${item.name['fr']}</div>`:''}
            </div>
            <div class="flash-progress">${this.flashIndex+1} / ${items.length}</div>
            <button class="back-btn" onclick="VocabularyGame.showDifficultyPicker()">⬅️</button>`;
        SoundManager.play('flip');
        setTimeout(() => VoiceManager.speak(item.name[lang.locale], lang.locale), 300);
    },
    nextFlash() { this.flashIndex++; this.showFlashcard(); },

    // Quiz mode
    startQuiz() { this.mode = 'quiz'; this.nextQuizRound(); },
    nextQuizRound() {
        const items = this.category.items;
        const pool = [...items].sort(() => Math.random()-0.5).slice(0, Math.min(4, items.length));
        this.target = pool[Math.floor(Math.random()*pool.length)];
        const d = this.difficulty;

        const visual = (item) => item.image
            ? `<img class="item-img" src="${item.image.startsWith('/')?'':'/'}${item.image}" alt="${item.name[lang.locale]}" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">${item.emoji?`<span class="emoji-fallback" style="display:none">${item.emoji}</span>`:''}`
            : `<span class="item-emoji">${item.emoji||'❓'}</span>`;

        const qHtml = d===3
            ? `<p>${_vt('q3')}</p>`
            : `<p>${lang.t('touch_item',{name:`<span class="big-sound">${this.target.name[lang.locale]}</span>`})}</p>`;

        document.getElementById('vocab-scene').innerHTML = `
            <div class="task-info">${qHtml}</div>
            <div class="item-grid grid-${pool.length}">
                ${pool.map(item=>`
                    <div class="item-card" role="button" onclick="VocabularyGame.checkItem('${item.id}')">
                        ${visual(item)}
                        ${d===1?`<span class="item-label">${item.name[lang.locale]}</span>`:''}
                    </div>`).join('')}
            </div>
            <button class="back-btn" onclick="VocabularyGame.showDifficultyPicker()">⬅️</button>`;
        setTimeout(() => VoiceManager.speak(this.target.name[lang.locale], lang.locale), 200);
    },
    checkItem(id) {
        if (id === this.target.id) {
            if (this.difficulty===3) { SoundManager.play('success'); setTimeout(()=>this.showSpellGame(this.target), 600); }
            else { state.addStar(); setTimeout(()=>this.nextQuizRound(), 2300); }
        } else { state.showOops(); }
    },

    // Level 3: Spell the word
    showSpellGame(item) {
        const word = item.name[lang.locale].toUpperCase();
        const chars = [...word].map(c=>({char:c, isLetter:/[A-ZÀÂÆÇÉÈÊËÎÏÔŒÙÛÜ]/i.test(c)}));
        const targetLetters = chars.filter(c=>c.isLetter).map(c=>c.char);
        const decoys=[];
        for (const c of 'BCDFGHJKLMNPQRSTVWXYZ') {
            if (decoys.length>=3) break;
            if (!targetLetters.includes(c)) decoys.push(c);
        }
        const pool = [...targetLetters,...decoys].sort(()=>Math.random()-0.5);
        this.spellState = {item, chars, targetLetters, pool, cursor:0, usedCards:new Set()};
        this._renderSpell();
    },
    _renderSpell() {
        const {item,chars,targetLetters,pool,cursor,usedCards} = this.spellState;
        const visual = item.image
            ? `<img class="spell-img" src="${item.image.startsWith('/')?'':'/'}${item.image}" alt="" onerror="this.outerHTML='<span class=spell-emoji>${item.emoji||'❓'}</span>'">`
            : `<span class="spell-emoji">${item.emoji||'❓'}</span>`;
        let li=0;
        const boxesHtml = chars.map(c=>{
            if (!c.isLetter) return `<span class="spell-gap">${c.char===' '?'&nbsp;&nbsp;':c.char}</span>`;
            const idx=li++;
            return `<span class="spell-box${idx<cursor?' filled':''}">${idx<cursor?targetLetters[idx]:''}</span>`;
        }).join('');
        const cardsHtml = pool.map((letter,i)=>
            `<button class="letter-card${usedCards.has(i)?' used':''}" onclick="VocabularyGame.tapLetter(${i})">${letter}</button>`
        ).join('');
        document.getElementById('vocab-scene').innerHTML = `
            <div class="spell-container">
                <p class="spell-title">${_vt('spellTitle')}</p>
                <div class="spell-visual">${visual}</div>
                <p class="spell-hint">${_vt('spellHint')}</p>
                <div class="spell-word-display" id="spell-boxes">${boxesHtml}</div>
                <div class="spell-letters">${cardsHtml}</div>
                <button class="spell-erase" onclick="VocabularyGame.tapBackspace()">⌫</button>
            </div>`;
    },
    tapLetter(poolIdx) {
        const s = this.spellState;
        if (!s || s.cursor>=s.targetLetters.length || s.usedCards.has(poolIdx)) return;
        if (s.pool[poolIdx]===s.targetLetters[s.cursor]) {
            s.usedCards.add(poolIdx); s.cursor++;
            SoundManager.play('pop'); this._renderSpell();
            if (s.cursor===s.targetLetters.length) {
                setTimeout(()=>{state.addStar(); this.spellState=null; setTimeout(()=>this.nextQuizRound(),2400);},300);
            }
        } else {
            const b=document.getElementById('spell-boxes');
            if(b){b.classList.add('shake');SoundManager.play('error');setTimeout(()=>b.classList.remove('shake'),500);}
        }
    },
    tapBackspace() {
        const s=this.spellState;
        if(!s||s.cursor===0) return;
        const lastUsed=[...s.usedCards].pop();
        if(lastUsed!==undefined) s.usedCards.delete(lastUsed);
        s.cursor--; SoundManager.play('flip'); this._renderSpell();
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
document.getElementById('math-btn').onclick = () => MathGame.init();
document.getElementById('french-btn').onclick = () => VocabularyGame.init();
document.getElementById('sticker-book-btn').onclick = () => StickerBook.init();
document.getElementById('playground-btn').onclick = () => Playground.init();
document.getElementById('home-btn').onclick = () => {
    SceneManager.showScene('intro-scene');
    refreshIntro();
};
document.getElementById('lang-toggle').onclick = () => {
    const next = lang.locale === 'fr' ? 'en' : 'fr';
    lang.setLocale(next);
    refreshIntro();
    if (state.currentScene === 'vocab-scene') VocabularyGame.showCategorySelect();
    if (state.currentScene === 'math-scene') MathGame.showDifficultyPicker();
    if (state.currentScene === 'playground-scene') Playground.render();
};
