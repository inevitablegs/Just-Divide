let gridCells = [];
let activeTile = null;
let tileQueue = [];

let score = 0;
let level = 1;
let bestScore = parseInt(localStorage.getItem("bestScore") || "0");

let undoStack = [];
const MAX_UNDO = 10;

let hintsEnabled = false;

let keptTileValue = null;
let keepTileText = null;
let keptTile = null;


let trashUses = 5;

// Layout constants
const GRID_CENTER_X = 720;
const GRID_CENTER_Y = 620;

const GRID_SIZE = 4;
const CELL_SIZE = 110;
const CELL_GAP = 14;

const PANEL_X = 1070;
const KEEP_Y = 435;
const TRASH_Y = 860;
const QUEUE_START_Y = 700;

const ACTIVE_TILE_X = PANEL_X - 15;
const ACTIVE_TILE_Y = 600;

const config = {
    type: Phaser.AUTO,
    width: 1440,
    height: 1024,
    scene: { preload, create },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
};

const game = new Phaser.Game(config);


const TILE_TEXTURES = {};

for (let i = 1; i <= 16; i++) {
    TILE_TEXTURES[i] = `tile${i}`;
}


function getTileTexture(value) {
    return TILE_TEXTURES[value] || "tile"; // fallback
}
// Start

function preload() {
    this.load.image("tile", "assets/tile.png");
    this.load.image("bg", "assets/bg.png");
    this.load.image("levelCard", "assets/lvl_score.png");
    this.load.image("catImage", "assets/Cat.png");
    this.load.image("sidePanel", "assets/side_panel.png");
    this.load.image("keepSlot", "assets/keepSlot.png");
    this.load.image("trashSlot", "assets/trashSlot.png");
    this.load.image("queueHolder", "assets/queueHolder.png");


    for (let i = 1; i <= 16; i++) {
        this.load.image(`tile${i}`, `assets/tiles/${i}.png`);
    }

}

function initQueue() {
    tileQueue = [
        Phaser.Math.Between(1, 16),
        Phaser.Math.Between(1, 16)
    ];
}


function createTile(scene, x, y, value) {

    const sprite = scene.add.image(0, 0, getTileTexture(value)).setScale(1);

    const label = scene.add.text(0, 0, value, {
        fontSize: "50px",
        color: "#00000055",
        fontStyle: 900,
        fontFamily: "Fredoka"
    }).setOrigin(0.5);

    const tile = scene.add.container(x, y, [sprite, label]);

    tile.value = value;
    tile.sprite = sprite;
    tile.label = label;
    tile.currentCell = null;

    // IMPORTANT: give the container a hit area
    tile.setSize(sprite.width * 0.7, sprite.height * 0.7);
    tile.setInteractive();

    scene.input.setDraggable(tile);

    return tile;
}


// Tile

function spawnTile(scene, value) {

    activeTile = createTile(scene, ACTIVE_TILE_X, ACTIVE_TILE_Y, value);
    activeTile.setInteractive().setDepth(1);

    updateHints();
}

// Queue

function advanceQueue(scene) {

    let nextValue = tileQueue.shift();
    tileQueue.push(Phaser.Math.Between(1, 16));


    // animate slide-left shift
    scene.tweens.add({
        targets: scene.queueSlots.map(s => [s.bg, s.label, s.frame]).flat(),
        x: "-=80",
        duration: 220,
        ease: "Quad.easeInOut",
        onComplete: () => {

            // destroy old first slot
            const dead = scene.queueSlots.shift();
            dead.bg.destroy();
            dead.label.destroy();
            dead.frame.destroy();

            // create new last slot (fade-in)
            const LAST_X = scene.queueSlots.at(-1).bg.x + 80;
            const LAST_Y = QUEUE_START_Y;

            const slot = createQueueSlot(
                scene,
                LAST_X,
                LAST_Y + 20,
                tileQueue.at(-1),
                false
            );

            scene.queueSlots.push(slot);
            scene.queueTexts = scene.queueSlots.map(s => s.label);

            // update "next tile" highlight
            scene.queueSlots.forEach((s, i) => {
                const isNext = (i === 0);
                s.frame.setVisible(isNext);
                s.bg.setScale(isNext ? 0.9 : 0.8);
                s.label.setFontSize(isNext ? 50 : 45);
            });
        }
    });

    spawnTile(scene, nextValue);
}



// Grid

function getNeighbors(cell) {
    return gridCells.filter(c =>
        (c.row === cell.row && Math.abs(c.col - cell.col) === 1) ||
        (c.col === cell.col && Math.abs(c.row - cell.row) === 1)
    );
}

// merge

function checkEqualMerge(cell) {

    let neighbors = getNeighbors(cell);

    neighbors.forEach(n => {
        if (n.occupied && n.value === cell.value) {

            cell.tile.destroy();
            n.tile.destroy();

            cell.occupied = false; cell.value = null; cell.tile = null;
            n.occupied = false; n.value = null; n.tile = null;

            updateScore();
        }
    });
}

function checkDivisibleMerge(cell) {

    let neighbors = getNeighbors(cell);

    neighbors.forEach(n => {

        if (!n.occupied) return;

        let a = cell.value, b = n.value;
        let larger = Math.max(a, b);
        let smaller = Math.min(a, b);

        if (larger % smaller === 0) {

            let result = larger / smaller;

            cell.tile.destroy();
            n.tile.destroy();

            cell.occupied = false; cell.value = null; cell.tile = null;
            n.occupied = false; n.value = null; n.tile = null;

            if (result !== 1)
                spawnMergedTile(cell.x, cell.y, result, cell);

            updateScore();
        }
    });
}

function spawnMergedTile(x, y, value, cell) {

    let tile = createTile(game.scene.scenes[0], x, y, value);

    cell.occupied = true;
    cell.value = value;
    cell.tile = tile;
    tile.currentCell = cell;
}


// Score

function updateScore() {

    score += 1;
    level = Math.floor(score / 10) + 1;

    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem("bestScore", bestScore);
    }

    let s = game.scene.scenes[0];
    s.scoreText.setText("SCORE " + score);
    s.levelText.setText("LEVEL " + level);
    s.bestText.setText("BEST : " + bestScore);

    let newLevel = Math.floor(score / 10) + 1;
    if (newLevel > level) {
        trashUses += 2; // or reset to fixed number
        scene.trashText.setText("x" + trashUses);
    }
    level = newLevel;


}


// Undo

function saveGameState() {

    let snapshot = gridCells.map(c => ({
        row: c.row, col: c.col,
        occupied: c.occupied, value: c.value
    }));

    undoStack.push({
        grid: snapshot,
        queue: [...tileQueue],
        score, level,
        activeTileValue: activeTile ? activeTile.value : null
    });

    if (undoStack.length > MAX_UNDO) undoStack.shift();
}

function restoreGameState(state) {

    let scene = game.scene.scenes[0];

    gridCells.forEach(c => {
        if (c.tile) { c.tile.destroy(); }
        c.occupied = false; c.value = null; c.tile = null;
    });

    state.grid.forEach(s => {

        if (!s.occupied) return;

        let cell = gridCells.find(c => c.row === s.row && c.col === s.col);

        let tile = createTile(scene, cell.x, cell.y, s.value);
        cell.tile = tile;
        tile.currentCell = cell;
        let text = scene.add.text(cell.x, cell.y, s.value, {
            fontSize: "32px", color: "#ffffff", fontStyle: "bold"
        }).setOrigin(0.5);

        cell.occupied = true;
        cell.value = s.value;
        cell.tile = tile;
        tile.text = text;
    });

    tileQueue = [...state.queue];
    scene.queueTexts.forEach((t, i) => t.setText(tileQueue[i]));

    score = state.score;
    level = state.level;

    scene.scoreText.setText("SCORE " + score);
    scene.levelText.setText("LEVEL " + level);

    if (c.tile) { c.tile.destroy(); }
    if (state.activeTileValue !== null) spawnTile(scene, state.activeTileValue);

    updateHints();
}


// Hints

function canMergeHere(cell, value) {

    if (cell.occupied) return false;

    let neighbors = getNeighbors(cell);

    for (let n of neighbors) {
        if (!n.occupied) continue;

        if (n.value === value) return true;

        let larger = Math.max(n.value, value);
        let smaller = Math.min(n.value, value);
        if (larger % smaller === 0) return true;
    }
    return false;
}

function anyMergePossibleForTile(value) {
    return gridCells.some(c => !c.occupied && canMergeHere(c, value));
}

function updateHints() {

    let scene = game.scene.scenes[0];
    gridCells.forEach(c => c.rect.clearTint());

    if (!hintsEnabled || !activeTile) return;

    let mergeExists = anyMergePossibleForTile(activeTile.value);

    gridCells.forEach(cell => {
        if (cell.occupied) return;

        if (mergeExists && canMergeHere(cell, activeTile.value))
            cell.rect.setTint(0xfff176);
        else if (!mergeExists)
            cell.rect.setTint(0xfff176);
    });
}

// keep

function updateKeepDisplay(scene) {

    if (keepTileText) { keepTileText.destroy(); keepTileText = null; }

    if (keptTileValue !== null) {
        keepTileText = scene.add.text(PANEL_X - 15, KEEP_Y, keptTileValue, {
            fontSize: "32px", color: "#000", fontStyle: "bold"
        }).setOrigin(0.5);
    }
}



function isInsideBox(obj, box) {
    return (
        obj.x > box.x - box.w / 2 &&
        obj.x < box.x + box.w / 2 &&
        obj.y > box.y - box.h / 2 &&
        obj.y < box.y + box.h / 2
    );
}





function createQueueSlot(scene, x, y, value, isNext = false) {

    const bg = scene.add.image(x, y, getTileTexture(value))
        .setScale(isNext ? 0.9 : 0.8);

    const label = scene.add.text(x, y, value, {
        fontSize: isNext ? "50px" : "45px",
        color: "#00000055",
        fontStyle: 900,
        fontFamily: "Fredoka"
    }).setOrigin(0.5);

    // rounded-style frame (fake using thicker stroke + scale)
    const frame = scene.add.rectangle(x, y + 20, 70, 70)
        .setStrokeStyle(4, 0x00ffd5)
        .setVisible(isNext)
        .setScale(1.15);

    // NOTE: we DO NOT call setRadius — Phaser rectangles don’t support it
    // If you later install RoundRectangle plugin, we can re-enable it.

    // glow / emphasis on next tile
    if (isNext) {
        frame.setAlpha(0.95);
        bg.setTint(0xffffff);
    }

    // fade-in + slide animation
    bg.setAlpha(0);
    label.setAlpha(0);
    frame.setAlpha(isNext ? 0 : 0); // explicit, avoids undefined

    scene.tweens.add({
        targets: [bg, label, frame],
        alpha: 1,
        y: y - 6,
        duration: 220,
        ease: "Quad.easeOut"
    });

    return { bg, label, frame };
}


function isGameOver() {
    const full = gridCells.every(c => c.occupied);
    if (!full) return false;

    return !gridCells.some(c => {
        if (!c.occupied) return false;
        return getNeighbors(c).some(n => {
            if (!n.occupied) return false;
            if (n.value === c.value) return true;
            let big = Math.max(n.value, c.value);
            let small = Math.min(n.value, c.value);
            return big % small === 0;
        });
    });
}



// ui

function create() {

    const scene = this;

    const { width, height } = this.scale;

    let bg = this.add.image(width / 2, height / 2, "bg");
    bg.setDisplaySize(width, height).setDepth(-10);

    this.add.text(720, 60, "JUST DIVIDE",
        { 
            fontSize: "48px", 
            color: "#000", 
            fontStyle: 900      ,
            fontFamily: "Arial"
         }).setOrigin(0.5);

    this.add.text(720, 110, "⏳ 00:07",
        { fontSize: "24px", color: "#000" }).setOrigin(0.5);

    this.add.text(720, 160,
        "DIVIDE WITH THE NUMBERS TO SOLVE THE ROWS AND COLUMNS.",
        {
            fontSize: "30px",
            color: "#fcd28d",
            fontStyle: 900,
            fontFamily: "Arial",
            stroke: "#b82929",
            strokeThickness: 6
        }
    ).setOrigin(0.5);



    this.levelCard = this.add.image(300, 390, "levelCard")
        .setOrigin(0.5)
        .setScale(1);

    this.levelText = this.add.text(300, 390, "LEVEL 1", {
        fontFamily: "Arial",   // or any loaded font
        fontSize: "30px",
        fontStyle: 700,
        color: "#ffffff",
        stroke: "#8f1d1dff",       // outline color
        strokeThickness: 5,      // outline width
    }).setOrigin(0.6);


    this.scoreCard = this.add.image(700, 390, "levelCard")
        .setOrigin(0.5)
        .setScale(1);


    this.scoreText = this.add.text(700, 390, "SCORE 0",
        {
            fontFamily: "Arial",   // or any loaded font
            fontSize: "30px",
            fontStyle: 700,
            color: "#ffffff",
            stroke: "#8f1d1dff",       // outline color
            strokeThickness: 5,      // outline width
        }).setOrigin(0.6);

    this.bestText = this.add.text(900, 250, "BEST : " + bestScore,
        {
            fontFamily: "Arial",   // or any loaded font
            fontSize: "30px",
            fontStyle: 700,
            color: "#ffffff",
            stroke: "#8f1d1dff",       // outline color
            strokeThickness: 5,      // outline width
        }).setOrigin(0.6);


    // grid bg
    this.add.rectangle(GRID_CENTER_X - 220, GRID_CENTER_Y + 30, 540, 640, 0x0c6c7a)
        .setStrokeStyle(10, 0x64d3e3)
        .setOrigin(0.5)
        .setDepth(-1);

    this.catImage = this.add.image(GRID_CENTER_X - 220, GRID_CENTER_Y - 350, "catImage")
        .setOrigin(0.5)
        .setScale(1);

    // cells
    gridCells = [];

    const gridStartX = (GRID_CENTER_X - 220) - ((GRID_SIZE - 1) * (CELL_SIZE + CELL_GAP)) / 2;
    const gridStartY = (GRID_CENTER_Y + 80) - ((GRID_SIZE - 1) * (CELL_SIZE + CELL_GAP)) / 2;

    for (let r = 0; r < GRID_SIZE; r++)
        for (let c = 0; c < GRID_SIZE; c++) {

            const x = gridStartX + c * (CELL_SIZE + CELL_GAP);
            const y = gridStartY + r * (CELL_SIZE + CELL_GAP);

            let rect = this.add.image(x, y, "tile")
                .setOrigin(.5)
                .setScale(.8);

            gridCells.push({
                x, y, row: r, col: c,
                occupied: false, value: null,
                tile: null, rect
            });
        }

    // side panel
    this.add.image(PANEL_X, 650, "sidePanel")
        .setOrigin(.5)
        .setScale(1.35);

    // keep
    this.add.text(PANEL_X - 15, KEEP_Y + 80, "KEEP", {
        fontSize: "24px",
        color: "#006D68",
        fontStyle: "900",
        fontFamily: "Arial",

    }).setOrigin(0.5).setShadow(1.5, 1.5, "#676767ff", 4, false, true);

    this.keepBox = this.add.image(PANEL_X - 15, KEEP_Y, "keepSlot")
        .setOrigin(.5)
        .setScale(0.14)
        .setInteractive();

    this.keepBox.area = { x: PANEL_X - 15, y: KEEP_Y, w: 100, h: 100 };

    //queue holder
    this.add.image(PANEL_X - 15, 712.5, "queueHolder")
        .setOrigin(.5)
        .setScale(.15);

    // Trash
    this.add.text(PANEL_X - 15, TRASH_Y, "TRASH",
        {
            fontSize: "24px",
            color: "#ffffffff",
            fontStyle: "900",
            fontFamily: "Arial",
        }).setOrigin(0.5).setShadow(1.5, 1.5, "#676767ff", 4, false, true).setDepth(1);

    this.trashBox = this.add.image(PANEL_X - 15, TRASH_Y, "trashSlot")
        .setOrigin(.5)
        .setScale(0.14)
        .setInteractive();

    this.trashBox.area = { x: PANEL_X, y: TRASH_Y, w: 130, h: 130 };

    this.trashText = this.add.text(PANEL_X - 15, TRASH_Y + 30, "x" + trashUses,
        {
            fontSize: "24px",
            color: "#ffffffff",
            fontStyle: "900",
            fontFamily: "Arial",
        }).setOrigin(0.5).setShadow(1.5, 1.5, "#676767ff", 4, false, true).setDepth(1);

    // queue display
    initQueue();

    this.queueSlots = [];
    this.queueTexts = [];

    const START_X = PANEL_X - 50;
    const START_Y = QUEUE_START_Y + 20;
    const SPACING = 80;

    for (let i = 0; i < tileQueue.length; i++) {

        const isNext = (i === 0); // first = next tile

        const slot = createQueueSlot(
            this,
            START_X + i * SPACING,
            START_Y,
            tileQueue[i],
            isNext
        );

        this.queueSlots.push(slot);
        this.queueTexts.push(slot.label);
    }



    spawnTile(this, tileQueue[0]);


    // Drag
    this.input.on("drag", (_, tile, x, y) => {
        tile.x = x;
        tile.y = y;
    });

    this.input.on("dragend", dragEndHandler, this);

    // Undo
    this.input.keyboard.on("keydown-Z", () => {
        if (!undoStack.length) return;
        restoreGameState(undoStack.pop());
    });

    // hints
    this.input.keyboard.on("keydown-G", () => {
        hintsEnabled = !hintsEnabled;
        updateHints();
    });
}




function dragEndHandler(pointer, tile) {

    let scene = this;
    let previousCell = tile.currentCell;
    let snapped = false, targetCell = null;

    // Keep
    if (isInsideBox(tile, scene.keepBox.area)) {

        if (!keptTile) {
            keptTile = activeTile;
            keptTile.x = PANEL_X - 15;
            keptTile.y = KEEP_Y;
            keptTile.disableInteractive();

            activeTile = null;
            advanceQueue(scene);
        }
        else {
            const temp = keptTile;

            keptTile = activeTile;
            keptTile.x = PANEL_X - 15;
            keptTile.y = KEEP_Y;
            keptTile.disableInteractive();

            spawnTile(scene, temp.value);
            temp.destroy();
        }

        updateHints();
        return;
    }


    // Trash
    if (isInsideBox(tile, scene.trashBox.area)) {

        if (trashUses <= 0) return;

        trashUses--;
        scene.trashText.setText("x" + trashUses);

        activeTile.destroy();
        activeTile = null;

        advanceQueue(scene);
        updateHints();
        return;
    }

    // Snaping
    gridCells.forEach(cell => {
        if (Phaser.Math.Distance.Between(tile.x, tile.y, cell.x, cell.y) < 50 &&
            !cell.occupied && !snapped) {

            targetCell = cell;
            snapped = true;
        }
    });

    saveGameState();

    if (snapped && targetCell) {

        if (previousCell) {
            previousCell.occupied = false;
            previousCell.value = null;
            previousCell.tile = null;
        }

        tile.x = targetCell.x;
        tile.y = targetCell.y;

        targetCell.occupied = true;
        targetCell.value = tile.value;
        targetCell.tile = tile;

        tile.currentCell = targetCell;
        tile.disableInteractive();
        activeTile = null;

        advanceQueue(scene);

        checkEqualMerge(targetCell);
        checkDivisibleMerge(targetCell);

        updateHints();

        if (isGameOver()) { showGameOverUI(); return; }

        return;
    }

    // reset
    tile.x = ACTIVE_TILE_X;
    tile.y = ACTIVE_TILE_Y;
    tile.currentCell = previousCell;
}


function showGameOverUI() {
    const scene = game.scene.scenes[0];

    // Prevent double triggering
    if (scene.gameOverShown) return;
    scene.gameOverShown = true;

    // Disable dragging
    scene.input.off("drag");
    scene.input.off("dragend");

    // Dark overlay
    const overlay = scene.add.rectangle(
        scene.scale.width / 2,
        scene.scale.height / 2,
        scene.scale.width,
        scene.scale.height,
        0x000000,
        0.6
    ).setDepth(100);

    // Panel
    const panel = scene.add.rectangle(
        scene.scale.width / 2,
        scene.scale.height / 2,
        520,
        420,
        0xffffff
    ).setDepth(101).setStrokeStyle(6, 0xff9f1c);

    // GAME OVER text
    scene.add.text(
        scene.scale.width / 2,
        scene.scale.height / 2 - 130,
        "GAME OVER",
        {
            fontSize: "48px",
            fontStyle: "900",
            color: "#d62828",
            fontFamily: "Arial"
        }
    ).setOrigin(0.5).setDepth(102);

    // Final Score
    scene.add.text(
        scene.scale.width / 2,
        scene.scale.height / 2 - 40,
        `SCORE: ${score}`,
        {
            fontSize: "32px",
            fontStyle: "bold",
            color: "#333"
        }
    ).setOrigin(0.5).setDepth(102);

    // Best Score
    scene.add.text(
        scene.scale.width / 2,
        scene.scale.height / 2 + 10,
        `BEST: ${bestScore}`,
        {
            fontSize: "26px",
            fontStyle: "bold",
            color: "#666"
        }
    ).setOrigin(0.5).setDepth(102);

    // Restart Button
    const restartBtn = scene.add.rectangle(
        scene.scale.width / 2,
        scene.scale.height / 2 + 100,
        220,
        60,
        0xff9f1c
    ).setDepth(102).setInteractive();

    const restartText = scene.add.text(
        scene.scale.width / 2,
        scene.scale.height / 2 + 100,
        "RESTART",
        {
            fontSize: "28px",
            fontStyle: "900",
            color: "#ffffff"
        }
    ).setOrigin(0.5).setDepth(103);

    restartBtn.on("pointerdown", () => {
        score = 0;
        level = 1;
        trashUses = 5;
        undoStack.length = 0;
        keptTile = null;
        keptTileValue = null;

        scene.scene.restart();
    });

    // Small pop animation
    scene.tweens.add({
        targets: panel,
        scale: { from: 0.8, to: 1 },
        duration: 220,
        ease: "Back.easeOut"
    });
}
