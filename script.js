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

let trashUses = 5;

// Layout constants
const GRID_CENTER_X = 720;
const GRID_CENTER_Y = 620;

const GRID_SIZE = 4;
const CELL_SIZE = 110;
const CELL_GAP = 14;

const PANEL_X = 1180;
const KEEP_Y = 365;
const TRASH_Y = 540;
const QUEUE_START_Y = 700;

const ACTIVE_TILE_X = PANEL_X;
const ACTIVE_TILE_Y = 300;

const config = {
    type: Phaser.AUTO,
    width: 1440,
    height: 1024,
    backgroundColor: "#f6c1cc",
    scene: { preload, create },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
};

const game = new Phaser.Game(config);

// Start

function preload() {
    this.load.image("tile", "assets/tile.png");
}

function initQueue() {
    tileQueue = [4, 6, 12];
}

// Tile

function spawnTile(scene, value) {

    let tile = scene.add.image(ACTIVE_TILE_X, ACTIVE_TILE_Y, "tile")
        .setScale(0.7)
        .setInteractive();

    let text = scene.add.text(ACTIVE_TILE_X, ACTIVE_TILE_Y, value, {
        fontSize: "32px",
        color: "#ffffff",
        fontStyle: "bold"
    }).setOrigin(0.5);

    tile.value = value;
    tile.text = text;
    tile.currentCell = null;

    scene.input.setDraggable(tile);
    activeTile = tile;

    updateHints();
}

// Queue

function advanceQueue(scene) {

    let nextValue = tileQueue.shift();
    tileQueue.push(Phaser.Math.RND.pick([2, 3, 4, 5, 7, 11, 13]));

    scene.queueTexts.forEach((t, i) => t.setText(tileQueue[i]));

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

            cell.tile.destroy(); cell.tile.text.destroy();
            n.tile.destroy(); n.tile.text.destroy();

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

            cell.tile.destroy(); cell.tile.text.destroy();
            n.tile.destroy(); n.tile.text.destroy();

            cell.occupied = false; cell.value = null; cell.tile = null;
            n.occupied = false; n.value = null; n.tile = null;

            if (result !== 1) spawnMergedTile(cell.x, cell.y, result, cell);

            updateScore();
        }
    });
}

function spawnMergedTile(x, y, value, cell) {

    let tile = game.scene.scenes[0].add.image(x, y, "tile").setScale(0.7);
    let text = game.scene.scenes[0].add.text(x, y, value, {
        fontSize: "32px", color: "#ffffff", fontStyle: "bold"
    }).setOrigin(0.5);

    cell.occupied = true;
    cell.value = value;
    cell.tile = tile;
    tile.text = text;
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
        if (c.tile) { c.tile.destroy(); c.tile.text.destroy(); }
        c.occupied = false; c.value = null; c.tile = null;
    });

    state.grid.forEach(s => {

        if (!s.occupied) return;

        let cell = gridCells.find(c => c.row === s.row && c.col === s.col);

        let tile = scene.add.image(cell.x, cell.y, "tile").setScale(0.7);
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

    if (activeTile) { activeTile.destroy(); activeTile.text.destroy(); activeTile = null; }
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
    gridCells.forEach(c => c.rect.setFillStyle(0x0f8ca3));

    if (!hintsEnabled || !activeTile) return;

    let mergeExists = anyMergePossibleForTile(activeTile.value);

    gridCells.forEach(cell => {

        if (cell.occupied) return;

        if (mergeExists && canMergeHere(cell, activeTile.value))
            cell.rect.setFillStyle(0xfff176);
        else if (!mergeExists)
            cell.rect.setFillStyle(0xb2ebf2);
    });
}

// keep

function updateKeepDisplay(scene) {

    if (keepTileText) { keepTileText.destroy(); keepTileText = null; }

    if (keptTileValue !== null) {
        keepTileText = scene.add.text(PANEL_X, KEEP_Y, keptTileValue, {
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


// ui

function create() {

    const scene = this;

    this.add.rectangle(720, 512, 1440, 1024, 0xf6c1cc);

    this.add.text(720, 60, "JUST DIVIDE",
        { fontSize: "48px", color: "#000", fontStyle: "bold" }).setOrigin(0.5);

    this.add.text(720, 110, "⏳ 00:07",
        { fontSize: "24px", color: "#000" }).setOrigin(0.5);

    this.add.text(720, 160,
        "DIVIDE WITH THE NUMBERS TO SOLVE THE ROWS AND COLUMNS.",
        { fontSize: "22px", color: "#b82929", fontStyle: "bold" }
    ).setOrigin(0.5);

    this.add.text(720, 225, "🐱", { fontSize: "64px" }).setOrigin(0.5);

    this.levelCard = this.add.rectangle(520, 255, 170, 62, 0xff6b6b)
        .setStrokeStyle(6, 0xffffff);
    this.levelText = this.add.text(520, 255, "LEVEL 1",
        { fontSize: "24px", color: "#fff", fontStyle: "bold" }).setOrigin(0.5);

    this.scoreCard = this.add.rectangle(920, 255, 170, 62, 0xff6b6b)
        .setStrokeStyle(6, 0xffffff);
    this.scoreText = this.add.text(920, 255, "SCORE 0",
        { fontSize: "24px", color: "#fff", fontStyle: "bold" }).setOrigin(0.5);

    // grid bg
    this.add.rectangle(GRID_CENTER_X, GRID_CENTER_Y, 540, 540, 0x0c6c7a)
        .setStrokeStyle(10, 0x64d3e3)
        .setOrigin(0.5);

    // cells
    gridCells = [];

    const gridStartX = GRID_CENTER_X - ((GRID_SIZE - 1) * (CELL_SIZE + CELL_GAP)) / 2;
    const gridStartY = GRID_CENTER_Y - ((GRID_SIZE - 1) * (CELL_SIZE + CELL_GAP)) / 2;

    for (let r = 0; r < GRID_SIZE; r++)
        for (let c = 0; c < GRID_SIZE; c++) {

            const x = gridStartX + c * (CELL_SIZE + CELL_GAP);
            const y = gridStartY + r * (CELL_SIZE + CELL_GAP);

            let rect = this.add.rectangle(x, y, CELL_SIZE, CELL_SIZE, 0x0f8ca3)
                .setStrokeStyle(6, 0x64d3e3)
                .setOrigin(0.5);

            gridCells.push({
                x, y, row: r, col: c,
                occupied: false, value: null,
                tile: null, rect
            });
        }

    // side panel
    this.add.rectangle(PANEL_X, 560, 180, 540, 0xfac561)
        .setStrokeStyle(6, 0xffffff);

    // keep
    this.add.text(PANEL_X, 310, "KEEP",
        { fontSize: "22px", color: "#004444", fontStyle: "bold" }).setOrigin(0.5);

    this.keepBox = this.add.rectangle(PANEL_X, KEEP_Y, 130, 130, 0x9ce5e1)
        .setStrokeStyle(6, 0xffffff).setInteractive();
    this.keepBox.area = { x: PANEL_X, y: KEEP_Y, w: 130, h: 130 };

    // Trash
    this.add.text(PANEL_X, 470, "TRASH",
        { fontSize: "22px", color: "#660000", fontStyle: "bold" }).setOrigin(0.5);

    this.trashBox = this.add.rectangle(PANEL_X, TRASH_Y, 130, 130, 0xff8a80)
        .setStrokeStyle(6, 0x000000).setInteractive();
    this.trashBox.area = { x: PANEL_X, y: TRASH_Y, w: 130, h: 130 };

    this.trashText = this.add.text(PANEL_X, 610, "x" + trashUses,
        { fontSize: "22px", color: "#000", fontStyle: "bold" }).setOrigin(0.5);

    // queue display
    initQueue();

    this.queueTexts = [];
    for (let i = 0; i < tileQueue.length; i++)
        this.queueTexts.push(
            this.add.text(PANEL_X, QUEUE_START_Y + i * 60, tileQueue[i],
                { fontSize: "24px", color: "#000" }).setOrigin(0.5)
        );

    spawnTile(this, tileQueue[0]);


    // Drag
    this.input.on("drag", (_, obj, x, y) => {
        obj.x = x; obj.y = y;
        obj.text.x = x; obj.text.y = y;
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




function dragEndHandler(pointer, gameObject) {

    let scene = this;
    let previousCell = gameObject.currentCell;
    let snapped = false, targetCell = null;

    // Keep
    if (isInsideBox(gameObject, scene.keepBox.area)) {

        if (keptTileValue === null) {
            keptTileValue = activeTile.value;
            activeTile.destroy(); activeTile.text.destroy(); activeTile = null;
            advanceQueue(scene);
        } else {
            let temp = activeTile.value;
            activeTile.destroy(); activeTile.text.destroy();
            spawnTile(scene, keptTileValue);
            keptTileValue = temp;
        }

        updateKeepDisplay(scene);
        updateHints();
        return;
    }

    // Trash
    if (isInsideBox(gameObject, scene.trashBox.area)) {

        if (trashUses <= 0) return;

        trashUses -= 1;
        scene.trashText.setText("x" + trashUses);

        activeTile.destroy(); activeTile.text.destroy();
        activeTile = null;

        advanceQueue(scene);
        updateHints();
        return;
    }

    // Snaping
    gridCells.forEach(cell => {
        if (Phaser.Math.Distance.Between(gameObject.x, gameObject.y, cell.x, cell.y) < 50 &&
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

        gameObject.x = targetCell.x;
        gameObject.y = targetCell.y;
        gameObject.text.x = targetCell.x;
        gameObject.text.y = targetCell.y;

        targetCell.occupied = true;
        targetCell.value = gameObject.value;
        targetCell.tile = gameObject;

        gameObject.currentCell = targetCell;
        gameObject.disableInteractive();
        activeTile = null;

        advanceQueue(scene);

        checkEqualMerge(targetCell);
        checkDivisibleMerge(targetCell);

        updateHints();
        return;
    }

    // reset
    gameObject.x = ACTIVE_TILE_X;
    gameObject.y = ACTIVE_TILE_Y;
    gameObject.text.x = ACTIVE_TILE_X;
    gameObject.text.y = ACTIVE_TILE_Y;

    gameObject.currentCell = previousCell;
}
