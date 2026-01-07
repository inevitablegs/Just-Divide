let gridCells = [];


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

function create() {
    const size = 100;
    const gap = 10;

    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            let x = 520 + c * (size + gap);
            let y = 300 + r * (size + gap);

            this.add.rectangle(x, y, size, size, 0x3ddad7)
                .setStrokeStyle(4, 0xffffff);

            gridCells.push({ x, y });

        }
    }
    let tile = this.add.image(1100, 400, "tile")
    .setScale(0.7)
    .setInteractive();

    let tileText = this.add.text(1100, 400, "12", {
        fontSize: "32px",
        color: "#ffffff",
        fontStyle: "bold"
    }).setOrigin(0.5);

    this.input.setDraggable(tile);
    this.input.on("drag", function (pointer, gameObject, dragX, dragY) {
        gameObject.x = dragX;
        gameObject.y = dragY;

        tileText.x = dragX;
        tileText.y = dragY;
    });

    this.input.on("dragend", function (pointer, gameObject) {
        gridCells.forEach(cell => {
            let dist = Phaser.Math.Distance.Between(
                gameObject.x,
                gameObject.y,
                cell.x,
                cell.y
            );

            if (dist < 50) {
                console.log("Dropped near grid cell");
            }
        });
    });



}
