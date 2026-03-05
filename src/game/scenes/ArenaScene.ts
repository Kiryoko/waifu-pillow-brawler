import Phaser from "phaser";

import { Sfx } from "@/game/audio/Sfx";
import { GAME_SIZE } from "@/game/config";
import { Fighter } from "@/game/entities/Fighter";
import { decideBotIntent } from "@/game/logic/bot";
import { isTargetInsideAttack, normalizeVector } from "@/game/logic/combat";
import type { AttackKind, Axis, ControlIntent } from "@/game/types";

interface KeyMap {
  readonly left: Phaser.Input.Keyboard.Key;
  readonly right: Phaser.Input.Keyboard.Key;
  readonly jump: Phaser.Input.Keyboard.Key;
  readonly descend: Phaser.Input.Keyboard.Key;
  readonly dash: Phaser.Input.Keyboard.Key;
  readonly parryLeft: Phaser.Input.Keyboard.Key;
  readonly parryRight: Phaser.Input.Keyboard.Key;
  readonly rematch: Phaser.Input.Keyboard.Key;
}

export class ArenaScene extends Phaser.Scene {
  private bot!: Fighter;
  private botDamage!: Phaser.GameObjects.Text;
  private keys!: KeyMap;
  private player!: Fighter;
  private playerDamage!: Phaser.GameObjects.Text;
  private queuedAttack: AttackKind | null = null;
  private resultText!: Phaser.GameObjects.Text;
  private roundOver = false;
  private sfx!: Sfx;

  public constructor() {
    super("arena");
  }

  public create(): void {
    this.createStage();
    this.createFighters();
    this.createHud();
    this.bindInput();

    this.physics.add.collider(this.player.sprite, this.bot.sprite);
    this.player.reset(300, 510, 1);
    this.bot.reset(980, 510, -1);
    this.sfx = new Sfx(this);
  }

  public override update(): void {
    if (this.roundOver) {
      const rematchAttack = this.consumeQueuedAttack();

      if (Phaser.Input.Keyboard.JustDown(this.keys.rematch) || rematchAttack !== null) {
        this.scene.restart();
      }

      return;
    }

    const now = this.time.now;
    const playerIntent = this.collectPlayerIntent();
    const botIntent = decideBotIntent(this.bot.snapshot(now), this.player.snapshot(now));

    this.player.step(now, playerIntent);
    this.bot.step(now, botIntent);

    this.resolveAttack(this.player, this.bot, now);
    this.resolveAttack(this.bot, this.player, now);
    this.updateHud();
    this.checkRoundOver();
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
      parryLeft: Phaser.Input.Keyboard.KeyCodes.Q,
      parryRight: Phaser.Input.Keyboard.KeyCodes.E,
      rematch: Phaser.Input.Keyboard.KeyCodes.R,
    }) as KeyMap;

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 0) {
        this.queuedAttack = "primary";
      }

      if (pointer.button === 2) {
        this.queuedAttack = "secondary";
      }
    });
  }

  private checkRoundOver(): void {
    const playerOut = this.player.isKnockedOut();
    const botOut = this.bot.isKnockedOut();

    if (!playerOut && !botOut) {
      return;
    }

    this.roundOver = true;
    this.physics.pause();

    if (playerOut && botOut) {
      this.resultText.setText("Double tumble. Press R or click to rematch.");
      return;
    }

    this.resultText.setText(
      playerOut
        ? "Bot wins the pillow duel. Press R or click to rematch."
        : "You bonked the bot offstage. Press R or click to rematch.",
    );
  }

  private collectPlayerIntent(): ControlIntent {
    const pointer = this.input.activePointer;
    const aim = normalizeVector({
      x: pointer.worldX - this.player.x,
      y: pointer.worldY - this.player.y,
    });
    let parry: "left" | "right" | null = null;

    if (Phaser.Input.Keyboard.JustDown(this.keys.parryLeft)) {
      parry = "left";
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.parryRight)) {
      parry = "right";
    }

    return {
      moveX: this.axisFromKeys(),
      jump: Phaser.Input.Keyboard.JustDown(this.keys.jump),
      descend: Phaser.Input.Keyboard.JustDown(this.keys.descend),
      dash: Phaser.Input.Keyboard.JustDown(this.keys.dash),
      attack: this.consumeQueuedAttack(),
      parry,
      aim,
    };
  }

  private consumeQueuedAttack(): AttackKind | null {
    const queuedAttack = this.queuedAttack;
    this.queuedAttack = null;
    return queuedAttack;
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
    this.botDamage = this.add
      .text(GAME_SIZE.width - 36, 28, "", {
        fontFamily: "Trebuchet MS",
        fontSize: "34px",
        color: "#652b39",
      })
      .setDepth(10)
      .setOrigin(1, 0);
    this.resultText = this.add
      .text(GAME_SIZE.width / 2, 32, "First tumble wins.", {
        fontFamily: "Trebuchet MS",
        fontSize: "28px",
        color: "#652b39",
      })
      .setDepth(10)
      .setOrigin(0.5, 0);
    this.add
      .text(
        GAME_SIZE.width / 2,
        GAME_SIZE.height - 18,
        "WASD move, mouse aims, LMB swing, RMB heavy, SPACE dash, Q/E parry, S drop",
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

  private resolveAttack(attacker: Fighter, defender: Fighter, now: number): void {
    const attack = attacker.getActiveAttack(now);

    if (!attack) {
      return;
    }

    const offset = {
      x: defender.x - attacker.x,
      y: defender.y - attacker.y,
    };

    if (!isTargetInsideAttack(attack.direction, offset, attack.profile)) {
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

    if (attack.kind === "secondary") {
      this.sfx.heavySwing();
    } else {
      this.sfx.hit();
    }

    this.cameras.main.shake(100, attack.kind === "secondary" ? 0.006 : 0.0035);
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

  private spawnImpact(x: number, y: number, outcome: "hit" | "parry"): void {
    const spark = this.add
      .image(x, y, "sparkle")
      .setDepth(9)
      .setScale(outcome === "parry" ? 0.95 : 0.78)
      .setTint(outcome === "parry" ? 0xffefae : 0xff9eae);

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
    this.botDamage
      .setText(`BOT ${Math.round(this.bot.damage)}%`)
      .setColor(this.damageColor(this.bot.damage));

    if (!this.roundOver) {
      this.resultText.setText("First tumble wins.");
    }
  }
}
