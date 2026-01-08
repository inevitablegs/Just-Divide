# JUST DIVIDE 🎮

JUST DIVIDE is a grid-based number puzzle game built using **Phaser.js**.  
The game focuses on logical placement and division-based merging mechanics.

---

## 🧠 Approach

Coming from a Unity game development background, I approached this assignment by first understanding Phaser’s core concepts such as scenes, input handling, and rendering.  
I broke the game into small systems (grid, tiles, queue, merge logic, UI) and implemented them incrementally while testing each feature.

The focus was on making the game **playable, deterministic, and easy to extend** rather than over-optimizing early.

---

## ⚙️ Decisions Made

- Used **simple data-driven grid logic** instead of complex physics
- Kept merge rules explicit (cancel, divide, discard `1`) to avoid ambiguity
- Implemented undo using **state snapshots** for reliability
- Used Phaser tweens instead of external animation libraries
- Designed UI overlays (pause, tutorial, game over) without scene switching to keep logic simple

---

## 🚧 Challenges Faced

- Learning Phaser.js while implementing the assignment
- Managing game state during animations (merges, undo, restart)
- Handling pause/resume without breaking input
- Ensuring undo and restart worked correctly after complex merges
- Making UI responsive across fullscreen and windowed modes

Each challenge helped me better understand Phaser’s lifecycle and event system.

---

## 🔧 What I Would Improve

- Add better visual feedback for merges and combos
- Improve mobile and touch support
- Add difficulty scaling and weighted tile generation
- Refactor some logic into reusable modules
- Add sound effects and accessibility options

---

## 🛠️ Tech Stack

- Phaser 3
- JavaScript
- HTML5 Canvas

---

## 🚀 Running the Project

The game is hosted using **GitHub Pages** and can be played directly in the browser.

