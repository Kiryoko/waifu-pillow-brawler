import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  public constructor() {
    super("boot");
  }

  public create(): void {
    this.add
      .text(640, 360, "Loading pillows...", {
        fontFamily: "Trebuchet MS",
        fontSize: "32px",
        color: "#6a2331",
      })
      .setOrigin(0.5);
    this.scene.start("arena");
  }
}
