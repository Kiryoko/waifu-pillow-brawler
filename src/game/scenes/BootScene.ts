import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  private readonly assets = [
    "background",
    "floor",
    "platform-left",
    "platform-right",
    "waifu-blue",
    "waifu-red",
    "pillow-primary",
    "pillow-secondary",
    "sparkle",
  ] as const;

  public constructor() {
    super("boot");
  }

  public preload(): void {
    const label = this.add
      .text(640, 336, "Loading pillows...", {
        fontFamily: "Trebuchet MS",
        fontSize: "32px",
        color: "#6a2331",
      })
      .setOrigin(0.5);
    const progress = this.add.rectangle(640, 388, 320, 20, 0xf2d0c9, 0.8).setOrigin(0.5);
    const fill = this.add.rectangle(481, 388, 0, 20, 0xca7485, 1).setOrigin(0, 0.5);

    this.assets.forEach((key) => {
      this.load.svg(key, `assets/${key}.svg`);
    });

    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => {
      fill.width = 320 * value;
      label.setText(value >= 1 ? "Fluffing pillows..." : "Loading pillows...");
    });

    this.load.on(Phaser.Loader.Events.COMPLETE, () => {
      progress.destroy();
      fill.destroy();
    });
  }

  public create(): void {
    this.scene.start("arena");
  }
}
