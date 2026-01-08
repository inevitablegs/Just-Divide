# JUST DIVIDE 🎮

JUST DIVIDE is a grid-based number puzzle game built with **Phaser 3**.  
The objective is to place number tiles strategically and clear space using **division-based rules**.

---

## 🧠 Game Rules

- Drag the **active tile** into any empty grid cell
- Tiles interact with their **adjacent neighbors**

### Merging Logic
- **Same numbers cancel each other** → both tiles disappear
- **Divisible numbers divide**
  - Example: `8` and `2` → `4`
- If the division result is `1`, it disappears

---

## 🧩 Features

- 4×4 grid-based gameplay
- Tile queue preview
- KEEP slot to store a tile for later
- TRASH slot with limited uses
- Undo support
- Pause / Resume
- Timer
- Fullscreen toggle
- In-game tutorial (❓ button)
- Game Over screen with restart

---

## ⌨️ Controls

- **Drag & Drop** – Place tiles
- **Z** – Undo last move
- **G** – Toggle hints
- **Pause Button** – Pause / Resume game
- **Fullscreen Button** – Toggle fullscreen
- **❓ Button** – Open tutorial

---

## 🛠️ Tech Stack

- Phaser 3
- JavaScript
- HTML5 Canvas

---

## 📌 Notes

- Game starts immediately on load
- Timer runs by default
- KEEP slot currently works as storage only
- Designed primarily for desktop play

---

## 📄 License

This project is intended for learning and personal use.
