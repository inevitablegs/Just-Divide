let gridCells = [];
let gridState = [];

let activeTile = null;


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


function create() {
    const size = 100;
    const gap = 10;

    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            let x = 520 + c * (size + gap);
            let y = 300 + r * (size + gap);

            this.add.rectangle(x, y, size, size, 0x3ddad7)
                .setStrokeStyle(4, 0xffffff);

            gridCells.push({ x, y, occupied: false, value: null });

        }
    }
    spawnTile(this, 12);

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
            }

            gameObject.x = targetCell.x;
            gameObject.y = targetCell.y;
            gameObject.text.x = targetCell.x;
            gameObject.text.y = targetCell.y;

            targetCell.occupied = true;
            targetCell.value = gameObject.value;
            gameObject.currentCell = targetCell;
        }

        if (!snapped) {

            gameObject.x = 1100;
            gameObject.y = 400;
            gameObject.text.x = 1100;
            gameObject.text.y = 400;

            gameObject.currentCell = previousCell;
        }
    });



}






