import Phaser from "phaser";

import { Sfx } from "@/game/audio/Sfx";
import { GAME_SIZE } from "@/game/config";
import { Fighter } from "@/game/entities/Fighter";
import { BOT_DIFFICULTIES, decideBotIntent, type BotDifficultyKey } from "@/game/logic/bot";
import { attackOverlapsHurtbox, normalizeVector } from "@/game/logic/combat";
import type { Axis, ControlIntent, ParrySide } from "@/game/types";

interface KeyMap {
  readonly dash: Phaser.Input.Keyboard.Key;
  readonly descend: Phaser.Input.Keyboard.Key;
  readonly difficultyEasy: Phaser.Input.Keyboard.Key;
  readonly difficultyHard: Phaser.Input.Keyboard.Key;
  readonly difficultyNormal: Phaser.Input.Keyboard.Key;
  readonly jump: Phaser.Input.Keyboard.Key;
  readonly left: Phaser.Input.Keyboard.Key;
  readonly rematch: Phaser.Input.Keyboard.Key;
  readonly right: Phaser.Input.Keyboard.Key;
  readonly start: Phaser.Input.Keyboard.Key;
}

interface PointerButtons {
  readonly leftPressed: boolean;
  readonly rightDown: boolean;
  readonly rightPressed: boolean;
}

type MatchState = "active" | "roundOver" | "waiting";

export class ArenaScene extends Phaser.Scene {
  private bot!: Fighter;
  private botDamage!: Phaser.GameObjects.Text;
  private botGuard!: Phaser.GameObjects.Text;
  private difficulty: BotDifficultyKey = "normal";
  private difficultyText!: Phaser.GameObjects.Text;
  private keys!: KeyMap;
  private matchState: MatchState = "waiting";
  private player!: Fighter;
  private playerDamage!: Phaser.GameObjects.Text;
  private playerGuard!: Phaser.GameObjects.Text;
  private resultText!: Phaser.GameObjects.Text;
  private sfx!: Sfx;
  private wasLeftPointerDown = false;
  private wasRightPointerDown = false;

  public constructor() {
    super("arena");
  }

  public create(): void {
    this.createStage();
    this.createFighters();
    this.createHud();
    this.bindInput();

    this.physics.add.collider(this.player.sprite, this.bot.sprite);
    this.sfx = new Sfx(this);
    this.prepareRound("Click or press Space to start.");
  }

  public override update(): void {
    const pointerButtons = this.readPointerButtons();

    this.applyDifficultyInput();

    if (this.matchState !== "active") {
      this.handleRoundStart(pointerButtons);
      this.updateHud();
      return;
    }

    const now = this.time.now;
    const playerIntent = this.collectPlayerIntent(pointerButtons);
    const botIntent = decideBotIntent(
      this.bot.snapshot(now),
      this.player.snapshot(now),
      this.difficulty,
    );

    this.player.step(now, playerIntent);
    this.bot.step(now, botIntent);

    this.resolveAttack(this.player, this.bot, now);
    this.resolveAttack(this.bot, this.player, now);
    this.updateHud();
    this.checkRoundOver();
  }

  private applyDifficultyInput(): void {
    if (Phaser.Input.Keyboard.JustDown(this.keys.difficultyEasy)) {
      this.difficulty = "easy";
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.difficultyNormal)) {
      this.difficulty = "normal";
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.difficultyHard)) {
      this.difficulty = "hard";
    }
  }

  private axisFromKeys(): Axis {
    const moveRight = this.keys.right.isDown ? 1 : 0;
    const moveLeft = this.keys.left.isDown ? 1 : 0;
    const axis = moveRight - moveLeft;

    if (axis > 0) {
      return 1;
    }

    if (axis < 0) {
      return -1;
    }

    return 0;
  }

  private bindInput(): void {
    const keyboard = this.input.keyboard;

    if (!keyboard) {
      throw new Error("Keyboard input is unavailable for the arena scene.");
    }

    this.input.mouse?.disableContextMenu();
    this.keys = keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      jump: Phaser.Input.Keyboard.KeyCodes.W,
      descend: Phaser.Input.Keyboard.KeyCodes.S,
      dash: Phaser.Input.Keyboard.KeyCodes.SPACE,
      start: Phaser.Input.Keyboard.KeyCodes.SPACE,
      rematch: Phaser.Input.Keyboard.KeyCodes.R,
      difficultyEasy: Phaser.Input.Keyboard.KeyCodes.ONE,
      difficultyNormal: Phaser.Input.Keyboard.KeyCodes.TWO,
      difficultyHard: Phaser.Input.Keyboard.KeyCodes.THREE,
    }) as KeyMap;
  }

  private checkRoundOver(): void {
    const playerOut = this.player.isKnockedOut();
    const botOut = this.bot.isKnockedOut();

    if (!playerOut && !botOut) {
      return;
    }

    this.matchState = "roundOver";
    this.player.setFrozen(true);
    this.bot.setFrozen(true);
    this.physics.pause();

    if (playerOut && botOut) {
      this.resultText.setText("Double tumble. Click or press Space for the rematch.");
      return;
    }

    this.resultText.setText(
      playerOut
        ? "Bot wins. Click or press Space to run it back."
        : "You win. Click or press Space for the next match.",
    );
  }

  private collectPlayerIntent(pointerButtons: PointerButtons): ControlIntent {
    const pointer = this.input.activePointer;
    const aim = normalizeVector({
      x: pointer.worldX - this.player.x,
      y: pointer.worldY - this.player.y,
    });
    const parry: ParrySide | null = pointerButtons.rightDown
      ? aim.x < 0
        ? "left"
        : "right"
      : null;

    return {
      moveX: this.axisFromKeys(),
      jump: Phaser.Input.Keyboard.JustDown(this.keys.jump),
      descend: Phaser.Input.Keyboard.JustDown(this.keys.descend),
      dash: Phaser.Input.Keyboard.JustDown(this.keys.dash),
      attack: pointerButtons.leftPressed ? "primary" : null,
      parry,
      aim,
    };
  }

  private createArenaColliders(fighter: Fighter): void {
    const floor = this.children.getByName("floor");
    const leftPlatform = this.children.getByName("platform-left");
    const rightPlatform = this.children.getByName("platform-right");

    if (
      !(floor instanceof Phaser.Physics.Arcade.Image) ||
      !(leftPlatform instanceof Phaser.Physics.Arcade.Image) ||
      !(rightPlatform instanceof Phaser.Physics.Arcade.Image)
    ) {
      throw new Error("Arena colliders are missing from the scene.");
    }

    this.physics.add.collider(fighter.sprite, floor);
    this.physics.add.collider(
      fighter.sprite,
      leftPlatform,
      undefined,
      () => this.shouldLandOnPlatform(fighter, leftPlatform),
      this,
    );
    this.physics.add.collider(
      fighter.sprite,
      rightPlatform,
      undefined,
      () => this.shouldLandOnPlatform(fighter, rightPlatform),
      this,
    );
  }

  private createFighters(): void {
    this.player = new Fighter(this, {
      accent: 0x6db4d9,
      label: "You",
      textureKey: "waifu-blue",
      x: 300,
      y: 510,
    });
    this.bot = new Fighter(this, {
      accent: 0xf0949e,
      label: "Bot",
      textureKey: "waifu-red",
      x: 980,
      y: 510,
    });
    this.createArenaColliders(this.player);
    this.createArenaColliders(this.bot);
  }

  private createHud(): void {
    this.playerDamage = this.add
      .text(36, 28, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "34px",
        color: "#652b39",
      })
      .setDepth(10);
    this.playerGuard = this.add
      .text(36, 62, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "18px",
        color: "#8b5563",
      })
      .setDepth(10);
    this.botDamage = this.add
      .text(GAME_SIZE.width - 36, 28, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "34px",
        color: "#652b39",
      })
      .setDepth(10)
      .setOrigin(1, 0);
    this.botGuard = this.add
      .text(GAME_SIZE.width - 36, 62, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "18px",
        color: "#8b5563",
      })
      .setDepth(10)
      .setOrigin(1, 0);
    this.resultText = this.add
      .text(GAME_SIZE.width / 2, 26, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "28px",
        color: "#652b39",
      })
      .setDepth(10)
      .setOrigin(0.5, 0);
    this.difficultyText = this.add
      .text(GAME_SIZE.width / 2, 64, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "18px",
        color: "#8b5563",
      })
      .setDepth(10)
      .setOrigin(0.5, 0);
    this.add
      .text(
        GAME_SIZE.width / 2,
        GAME_SIZE.height - 18,
        "WASD move, mouse aim, LMB attack, RMB guard/parry, SPACE dash, S drop, 1/2/3 difficulty",
        {
          fontFamily: "Trebuchet MS",
          fontSize: "20px",
          color: "#652b39",
        },
      )
      .setDepth(10)
      .setOrigin(0.5, 1);

    this.updateHud();
  }

  private createStage(): void {
    this.cameras.main.setBackgroundColor("#f8e4dc");
    this.add
      .image(GAME_SIZE.width / 2, GAME_SIZE.height / 2, "background")
      .setDisplaySize(GAME_SIZE.width, GAME_SIZE.height)
      .setDepth(0);

    const floor = this.physics.add.staticImage(640, 666, "floor").setName("floor");
    floor.setDisplaySize(940, 126);
    floor.setDepth(1);
    floor.refreshBody();
    (floor.body as Phaser.Physics.Arcade.StaticBody).setSize(764, 68).setOffset(88, 42);

    const leftPlatform = this.physics.add
      .staticImage(420, 455, "platform-left")
      .setName("platform-left");
    leftPlatform.setDisplaySize(260, 74);
    leftPlatform.setDepth(1);
    leftPlatform.refreshBody();

    const rightPlatform = this.physics.add
      .staticImage(860, 360, "platform-right")
      .setName("platform-right");
    rightPlatform.setDisplaySize(260, 74);
    rightPlatform.setDepth(1);
    rightPlatform.refreshBody();
  }

  private damageColor(damage: number): string {
    if (damage < 40) {
      return "#652b39";
    }

    if (damage < 90) {
      return "#a84457";
    }

    if (damage < 150) {
      return "#d14d54";
    }

    return "#ee7d36";
  }

  private difficultyLabel(): string {
    return BOT_DIFFICULTIES[this.difficulty].label;
  }

  private handleRoundStart(pointerButtons: PointerButtons): void {
    const startPressed =
      pointerButtons.leftPressed ||
      pointerButtons.rightPressed ||
      Phaser.Input.Keyboard.JustDown(this.keys.start) ||
      Phaser.Input.Keyboard.JustDown(this.keys.rematch);

    if (!startPressed) {
      return;
    }

    if (this.matchState === "roundOver") {
      this.prepareRound("Click or press Space to start.");
      return;
    }

    this.player.setFrozen(false);
    this.bot.setFrozen(false);
    this.matchState = "active";
    this.physics.resume();
    this.resultText.setText(`${this.difficultyLabel()} bot. Fight.`);
  }

  private prepareRound(message: string): void {
    this.matchState = "waiting";
    this.physics.resume();
    this.player.reset(300, 510, 1);
    this.bot.reset(980, 510, -1);
    this.player.setFrozen(true);
    this.bot.setFrozen(true);
    this.physics.pause();
    this.resultText.setText(message);
  }

  private readPointerButtons(): PointerButtons {
    const pointer = this.input.activePointer;
    const leftDown = pointer.leftButtonDown();
    const rightDown = pointer.rightButtonDown();
    const buttons = {
      leftPressed: leftDown && !this.wasLeftPointerDown,
      rightPressed: rightDown && !this.wasRightPointerDown,
      rightDown,
    };

    this.wasLeftPointerDown = leftDown;
    this.wasRightPointerDown = rightDown;

    return buttons;
  }

  private resolveAttack(attacker: Fighter, defender: Fighter, now: number): void {
    const attack = attacker.getActiveAttack(now);

    if (!attack || !attackOverlapsHurtbox(attack, defender.getHurtbox())) {
      return;
    }

    attacker.markAttackResolved();

    const outcome = defender.receiveAttack(
      now,
      {
        x: attacker.x,
        y: attacker.y,
      },
      attack,
    );

    this.spawnImpact((attacker.x + defender.x) / 2, (attacker.y + defender.y) / 2, outcome);

    if (outcome === "parry") {
      attacker.receiveParry(now, {
        x: defender.x,
        y: defender.y,
      });
      this.sfx.parry();
      this.cameras.main.shake(90, 0.003);
      return;
    }

    if (outcome === "blocked") {
      attacker.receiveBlocked(now, {
        x: defender.x,
        y: defender.y,
      });
      this.sfx.hit();
      this.cameras.main.shake(70, 0.002);
      return;
    }

    this.sfx.hit();
    this.cameras.main.shake(100, 0.004);
  }

  private shouldLandOnPlatform(fighter: Fighter, platform: Phaser.Physics.Arcade.Image): boolean {
    if (fighter.isDroppingThrough(this.time.now)) {
      return false;
    }

    const fighterBody = fighter.physicsBody;
    const platformBody = platform.body as Phaser.Physics.Arcade.StaticBody;
    const fighterFeet = fighterBody.y + fighterBody.height;

    return fighterBody.velocity.y >= -40 && fighterFeet <= platformBody.y + 20;
  }

  private spawnImpact(x: number, y: number, outcome: "blocked" | "hit" | "parry"): void {
    const spark = this.add
      .image(x, y, "sparkle")
      .setDepth(9)
      .setScale(outcome === "parry" ? 0.95 : 0.78)
      .setTint(outcome === "parry" ? 0xffefae : outcome === "blocked" ? 0xbfe6ff : 0xff9eae);

    this.tweens.add({
      targets: spark,
      alpha: 0,
      scaleX: spark.scaleX + 0.7,
      scaleY: spark.scaleY + 0.7,
      duration: 220,
      ease: "Cubic.Out",
      onComplete: () => {
        spark.destroy();
      },
    });
  }

  private updateHud(): void {
    this.playerDamage
      .setText(`YOU ${Math.round(this.player.damage)}%`)
      .setColor(this.damageColor(this.player.damage));
    this.playerGuard.setText(`Guard ${Math.round(this.player.guardValue)}`);
    this.botDamage
      .setText(`BOT ${Math.round(this.bot.damage)}%`)
      .setColor(this.damageColor(this.bot.damage));
    this.botGuard.setText(`Guard ${Math.round(this.bot.guardValue)}`);
    this.difficultyText.setText(
      `Difficulty: ${this.difficultyLabel()}  (1 Easy, 2 Normal, 3 Hard)`,
    );
  }
}
