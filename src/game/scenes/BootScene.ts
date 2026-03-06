import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  private readonly assetBasePath = `${import.meta.env.BASE_URL}assets/`;
  private readonly assets = [
    { key: "background", width: 1280, height: 720 },
    { key: "floor", width: 960, height: 220 },
    { key: "platform-left", width: 360, height: 96 },
    { key: "platform-right", width: 360, height: 96 },
    { key: "waifu-blue", width: 160, height: 160 },
    { key: "waifu-red", width: 160, height: 160 },
    { key: "pillow-primary", width: 300, height: 200 },
    { key: "pillow-secondary", width: 350, height: 240 },
    { key: "sparkle", width: 96, height: 96 },
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

    this.load.setPath(this.assetBasePath);

    this.assets.forEach(({ key, width, height }) => {
      this.load.svg(key, `${key}.svg`, { width, height });
    });

    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => {
      fill.width = 320 * value;
      label.setText(value >= 1 ? "Fluffing pillows..." : "Loading pillows...");
    });

    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      label.setText("Asset load failed. Check the deploy path.");
      console.error(`Failed to load asset "${file.key}" from "${file.src}".`);
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
