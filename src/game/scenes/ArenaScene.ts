import Phaser from "phaser";

export class ArenaScene extends Phaser.Scene {
  public constructor() {
    super("arena");
  }

  public create(): void {
    this.add
      .text(640, 320, "Waifu Pillow Brawler", {
        fontFamily: "Trebuchet MS",
        fontSize: "56px",
        color: "#6a2331",
      })
      .setOrigin(0.5);

    this.add
      .text(640, 390, "WASD move, mouse aims, left click primary, right click secondary", {
        fontFamily: "Trebuchet MS",
        fontSize: "24px",
        color: "#6a2331",
      })
      .setOrigin(0.5);
  }
}
