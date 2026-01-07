let gridCells = [];
let gridState = [];

let activeTile = null;
let tileQueue = [];


let score = 0;
let level = 1;

let bestScore = localStorage.getItem("bestScore");
bestScore = bestScore ? parseInt(bestScore) : 0;


const config = {
    type: Phaser.AUTO,
    width: 1440,
    height: 1024,
    backgroundColor: "#f6c1cc",
    scene: {
        preload,
        create
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }

};

const game = new Phaser.Game(config);



function initQueue() {
    tileQueue = [4, 6, 12];
}



function preload() {
    this.load.image("tile", "assets/tile.png");
}


function spawnTile(scene, value) {

    let tile = scene.add.image(1100, 400, "tile")
        .setScale(0.7)
        .setInteractive();

    let text = scene.add.text(1100, 400, value, {
        fontSize: "32px",
        color: "#ffffff",
        fontStyle: "bold"
    }).setOrigin(0.5);

    tile.value = value;
    tile.text = text;
    tile.currentCell = null;

    scene.input.setDraggable(tile);

    activeTile = tile;
}

function advanceQueue(scene) {

    // Take next tile value
    let nextValue = tileQueue.shift();

    // Push new random tile to queue
    tileQueue.push(Phaser.Math.RND.pick([2, 3, 4, 6, 12]));

    // Update queue UI
    scene.queueTexts.forEach((txt, i) => {
        txt.setText(tileQueue[i]);
    });

    // Spawn new active tile
    spawnTile(scene, nextValue);
}

function getNeighbors(cell) {
    return gridCells.filter(c =>
        (c.row === cell.row && Math.abs(c.col - cell.col) === 1) ||
        (c.col === cell.col && Math.abs(c.row - cell.row) === 1)
    );
}


function checkEqualMerge(cell) {

    let neighbors = getNeighbors(cell);

    neighbors.forEach(n => {
        if (n.occupied && n.value === cell.value) {

            // Destroy both tiles
            cell.tile.destroy();
            cell.tile.text.destroy();

            n.tile.destroy();
            n.tile.text.destroy();

            // Clear both cells
            cell.occupied = false;
            cell.value = null;
            cell.tile = null;

            n.occupied = false;
            n.value = null;
            n.tile = null;
            updateScore();
        }
    });

}


function checkDivisibleMerge(cell) {

    let neighbors = getNeighbors(cell);

    neighbors.forEach(n => {

        if (!n.occupied) return;

        let a = cell.value;
        let b = n.value;

        let larger = Math.max(a, b);
        let smaller = Math.min(a, b);

        if (larger % smaller === 0) {

            let result = larger / smaller;

            // Remove both tiles
            cell.tile.destroy();
            cell.tile.text.destroy();
            n.tile.destroy();
            n.tile.text.destroy();

            // Clear both cells
            cell.occupied = false;
            cell.value = null;
            cell.tile = null;

            n.occupied = false;
            n.value = null;
            n.tile = null;

            // If result is 1 → no new tile
            if (result === 1) return;

            // Spawn result tile at cell position
            spawnMergedTile(cell.x, cell.y, result, cell);
            updateScore();

        }
    });

}



function spawnMergedTile(x, y, value, cell) {

    let tile = game.scene.scenes[0].add.image(x, y, "tile")
        .setScale(0.7);

    let text = game.scene.scenes[0].add.text(x, y, value, {
        fontSize: "32px",
        color: "#ffffff",
        fontStyle: "bold"
    }).setOrigin(0.5);

    cell.occupied = true;
    cell.value = value;
    cell.tile = tile;

    tile.text = text;
}


function updateScore() {

    score += 1;

    // Level calculation: every 10 points
    level = Math.floor(score / 10) + 1;

    // Update best score
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem("bestScore", bestScore);
    }

    // Update UI
    let scene = game.scene.scenes[0];
    scene.scoreText.setText("Score: " + score);
    scene.levelText.setText("LEVEL " + level);
    scene.bestText.setText("Best: " + bestScore);
}




function create() {
    const size = 100;
    const gap = 10;

    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            let x = 520 + c * (size + gap);
            let y = 300 + r * (size + gap);

            this.add.rectangle(x, y, size, size, 0x3ddad7)
                .setStrokeStyle(4, 0xffffff);

            gridCells.push({
                x: x,
                y: y,
                row: r,
                col: c,
                occupied: false,
                value: null,
                tile: null
            });


        }
    }

    initQueue();
    spawnTile(this, 12);

    this.queueTexts = [];

    for (let i = 0; i < tileQueue.length; i++) {
        let t = this.add.text(
            1100,
            500 + i * 60,
            tileQueue[i],
            { fontSize: "24px", color: "#000" }
        ).setOrigin(0.5);

        this.queueTexts.push(t);
    }



    this.input.on("drag", function (pointer, gameObject, dragX, dragY) {

        gameObject.x = dragX;
        gameObject.y = dragY;

        if (gameObject.text) {
            gameObject.text.x = dragX;
            gameObject.text.y = dragY;
        }
    });


    this.input.on("dragend", function (pointer, gameObject) {

        let previousCell = gameObject.currentCell;

        let snapped = false;
        let targetCell = null;

        gridCells.forEach(cell => {

            let dist = Phaser.Math.Distance.Between(
                gameObject.x,
                gameObject.y,
                cell.x,
                cell.y
            );

            if (dist < 50 && !cell.occupied && !snapped) {
                targetCell = cell;
                snapped = true;
            }
        });

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
            advanceQueue(this.scene);

            checkEqualMerge(targetCell);

            checkEqualMerge(targetCell);
            checkDivisibleMerge(targetCell);

        }

        if (!snapped) {

            gameObject.x = 1100;
            gameObject.y = 400;
            gameObject.text.x = 1100;
            gameObject.text.y = 400;

            gameObject.currentCell = previousCell;
        }
    });


    // LEFT PANEL - LEVEL
    this.levelText = this.add.text(200, 150, "LEVEL 1", {
        fontSize: "28px",
        color: "#ffffff",
        fontStyle: "bold"
    });

    // RIGHT PANEL - SCORE & BEST
    this.scoreText = this.add.text(1000, 150, "Score: 0", {
        fontSize: "24px",
        color: "#ffffff"
    });

    this.bestText = this.add.text(1000, 190, "Best: " + bestScore, {
        fontSize: "20px",
        color: "#ffffff"
    });



}






