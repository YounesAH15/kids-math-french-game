![LudiKids Banner](/public/assets/banner.png)

# 🐼 LudiKids: The Century 100 Landmark

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Content: Encyclopedic](https://img.shields.io/badge/Content-100_Categories-blueviolet.svg)](#)
[![Experience: Premium](https://img.shields.io/badge/UX-Glassmorphism-brightgreen.svg)](#)
[![Stack: Vanilla JS](https://img.shields.io/badge/Stack-Vanilla_JS-f7df1e.svg)](#)
[![Platform: Web/Mobile](https://img.shields.io/badge/Platform-Web%20%2F%20Mobile-orange.svg)](#)

**LudiKids** is a definitive, world-class educational ecosystem for early childhood development. Designed with a "Privacy First" philosophy, it offers an encyclopedic learning experience through high-fidelity visuals, tactile interactivity, and an unprecedented bilingual database.

> [!IMPORTANT]
> **The Century 100 Milestone**: LudiKids officially features **100 curated categories** and **~800 unique bilingual items**, making it one of the most content-rich local-first educational apps available.

---

## 💎 The Premium Experience

LudiKids isn't just a game; it's a meticulously crafted educational tool built on three pillars:

### 1. 🛡️ Encyclopedic Vocabulary (The Century 100)
Spanning from **Everyday Objects** to **Ancient Greece**, **Deep Space**, and **Quantum Concepts** (simplified). 
- **100% Bilingual**: Instant switching between French and English.
- **Auditory Association**: Integrated AI voice synthesis for every single word.
- **Visual Diversity**: Hundreds of high-quality icons and robust emoji fallbacks.

### 2. 🧠 Adaptive Cognitive Games
- **Math Engine**: A dynamic system that transitions from simple counting to complex base-10 building (Tens/Units).
- **Discovery Quiz**: A spaced-repetition inspired quiz mode that reinforces vocabulary retention through visual and auditory cues.
- **Flashcard Mastery**: A dedicated learning mode for passive knowledge absorption.

### 3. 🕹️ Tactile Sticker Playground
- **Gamified Rewards**: Children earn stars through learning to unlock rare digital stickers.
- **Free-form Interaction**: A dedicated playground scene where stickers can be arranged to create stories.
- **State Persistence**: Every sticker position and every earned star is saved locally via `localStorage`.

---

## 🎨 Design & UX Philosophy

- **Liquid Glassmorphism**: A UI that feels alive, using translucent layers, real-time blurs, and vibrant gradients.
- **Juicy Feedback**: Every touch triggers "Squash & Stretch" animations and synthesized "Pop" sounds.
- **Zero Friction**: No accounts, no internet required (after first load), and no trackers. 100% safe for children.

---

## 🛠️ Technical Architecture

LudiKids is built for performance and longevity using a clean, decoupled architecture:

- **`data.json`**: The central brain of the app. A single source of truth containing 100 categories, UI translations, and sticker metadata.
- **`VoiceManager`**: A robust wrapper around the Web Speech API, handling locale-specific voices and pitch modulation.
- **`SceneManager`**: A lightweight state machine managing smooth CSS-animated transitions between 6+ unique game scenes.
- **`LanguageManager`**: A translation bridge that enables instant, reactive UI updates without page reloads.

---

## 🚀 Quick Start

### For Users
Simply open the **[Live Demo](https://ludikids.vercel.app)** in any modern browser.

### For Developers
1. **Clone & Install**:
   ```bash
   git clone https://github.com/YounesAH15/kids-math-french-game.git
   cd kids-math-french-game
   npm install
   ```
2. **Launch Dev Environment**:
   ```bash
   npm run dev
   ```
3. **Build for Production**:
   ```bash
   npm run build
   ```

---

## 🏛️ Content Index: The Century 100
*A glimpse into the massive library:*

| Domain | Highlights |
| :--- | :--- |
| **Nature** | Animals, Safari, Oceans, Insects, Flowers, Forest Life, Farm Friends |
| **Science** | Planets, Deep Space, Human Body, Weather Watch, Geometry Plus |
| **History** | Dinosaurs, Ancient Egypt, Ancient Rome, Ancient Greece, Mythology |
| **Daily Life** | Home Sweet Home, Kitchen Kit, Handy Tools, School Supplies, Routine |
| **Fun** | Fairy Tales, Superheroes, Hobbies, Orchestra, Sports, Ice Cream Shop |

---

## 📜 License
Distributed under the MIT License. See `LICENSE` for more information.

---
*Created with ❤️ by Antigravity for the next generation of learners.*
