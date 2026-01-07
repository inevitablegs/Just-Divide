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
            this.add.rectangle(
                520 + c * (size + gap),
                300 + r * (size + gap),
                size,
                size,
                0x3ddad7
            ).setStrokeStyle(4, 0xffffff);
        }
    }
    let tile = this.add.image(1100, 400, "tile")
    .setScale(0.7)
    .setInteractive();

    this.input.setDraggable(tile);
    this.input.on("drag", function (pointer, gameObject, dragX, dragY) {
        gameObject.x = dragX;
        gameObject.y = dragY;
    });


}
