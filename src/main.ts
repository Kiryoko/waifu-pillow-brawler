import Phaser from "phaser";

import "@/styles.css";
import { ArenaScene } from "@/game/scenes/ArenaScene";
import { BootScene } from "@/game/scenes/BootScene";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: 1280,
  height: 720,
  backgroundColor: "#f7e7e1",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 1700 },
      debug: false,
    },
  },
  scene: [BootScene, ArenaScene],
});

game.canvas.oncontextmenu = (event) => {
  event.preventDefault();
};
