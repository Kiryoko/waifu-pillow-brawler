import Phaser from "phaser";

import {
  ATTACKS,
  COMBAT,
  GAME_SIZE,
  MOVEMENT,
  RING_OUT_MARGIN,
  type AttackProfile,
} from "@/game/config";
import { buildKnockback, normalizeVector, resolvesParry } from "@/game/logic/combat";
import type { AttackKind, ControlIntent, ParrySide, Vec2 } from "@/game/types";

interface ActiveAttack {
  readonly kind: AttackKind;
  readonly profile: AttackProfile;
  readonly direction: Vec2;
  readonly windupEndsAt: number;
  readonly activeEndsAt: number;
  readonly recoveryEndsAt: number;
  hitConsumed: boolean;
}

export interface AttackView {
  readonly kind: AttackKind;
  readonly profile: AttackProfile;
  readonly direction: Vec2;
}

export interface FighterSnapshot {
  readonly x: number;
  readonly y: number;
  readonly aim: Vec2;
  readonly onGround: boolean;
  readonly canAct: boolean;
  readonly canDash: boolean;
  readonly activeAttack: AttackKind | null;
}

interface FighterConfig {
  readonly accent: number;
  readonly label: string;
  readonly textureKey: string;
  readonly x: number;
  readonly y: number;
}

export class Fighter {
  public readonly sprite: Phaser.Physics.Arcade.Sprite;

  public damage = 0;

  private readonly accent: number;
  private readonly aura: Phaser.GameObjects.Arc;
  private readonly label: Phaser.GameObjects.Text;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly weapon: Phaser.GameObjects.Image;

  private aim: Vec2 = { x: 1, y: 0 };
  private attackState: ActiveAttack | null = null;
  private dashCooldownUntil = 0;
  private dashUntil = 0;
  private dropThroughUntil = 0;
  private facing: -1 | 1 = 1;
  private parrySide: ParrySide | null = null;
  private parryUntil = 0;
  private recoveryUntil = 0;
  private stunUntil = 0;

  public constructor(scene: Phaser.Scene, config: FighterConfig) {
    this.accent = config.accent;
    this.shadow = scene.add.ellipse(config.x, config.y + 74, 116, 28, 0x542630, 0.2).setDepth(2);
    this.aura = scene.add
      .circle(config.x, config.y - 6, 88, config.accent, 0.12)
      .setDepth(4)
      .setVisible(false);
    this.sprite = scene.physics.add
      .sprite(config.x, config.y, config.textureKey)
      .setDisplaySize(168, 168)
      .setDepth(6);
    this.weapon = scene.add
      .image(config.x, config.y, "pillow-primary")
      .setDepth(7)
      .setOrigin(0.2, 0.5)
      .setScale(0.72);
    this.label = scene.add
      .text(config.x, config.y - 112, config.label, {
        fontFamily: "Trebuchet MS",
        fontSize: "18px",
        color: "#612938",
      })
      .setDepth(8)
      .setOrigin(0.5);

    this.body.setSize(72, 118);
    this.body.setOffset(48, 36);
    this.body.setCollideWorldBounds(false);
    this.body.setMaxVelocity(MOVEMENT.dashSpeed, MOVEMENT.maxFallSpeed);
  }

  public get x(): number {
    return this.sprite.x;
  }

  public get y(): number {
    return this.sprite.y;
  }

  public get physicsBody(): Phaser.Physics.Arcade.Body {
    return this.body;
  }

  public getActiveAttack(now: number): AttackView | null {
    if (!this.attackState || this.attackState.hitConsumed) {
      return null;
    }

    if (now < this.attackState.windupEndsAt || now > this.attackState.activeEndsAt) {
      return null;
    }

    return {
      kind: this.attackState.kind,
      profile: this.attackState.profile,
      direction: this.attackState.direction,
    };
  }

  public isDroppingThrough(now: number): boolean {
    return now < this.dropThroughUntil;
  }

  public isKnockedOut(): boolean {
    return (
      this.x < -RING_OUT_MARGIN ||
      this.x > GAME_SIZE.width + RING_OUT_MARGIN ||
      this.y > GAME_SIZE.height + RING_OUT_MARGIN
    );
  }

  public markAttackResolved(): void {
    if (this.attackState) {
      this.attackState.hitConsumed = true;
    }
  }

  public receiveAttack(now: number, attackerPosition: Vec2, attack: AttackView): "hit" | "parry" {
    const attackerOffset = {
      x: attackerPosition.x - this.x,
      y: attackerPosition.y - this.y,
    };

    if (resolvesParry(this.currentParrySide(now), attackerOffset)) {
      this.parryUntil = 0;
      return "parry";
    }

    const knockback = buildKnockback(attack.profile, attack.direction, this.damage);

    this.attackState = null;
    this.damage = Math.min(999, this.damage + attack.profile.damage);
    this.dashUntil = 0;
    this.parryUntil = 0;
    this.recoveryUntil = Math.max(this.recoveryUntil, now + COMBAT.hitStunMs);
    this.stunUntil = now + COMBAT.hitStunMs;
    this.body.setAllowGravity(true);
    this.body.setVelocity(knockback.x, knockback.y);

    return "hit";
  }

  public receiveParry(now: number, defenderPosition: Vec2): void {
    this.attackState = null;
    this.dashUntil = 0;
    this.parryUntil = 0;
    this.recoveryUntil = now + COMBAT.parryStunMs;
    this.stunUntil = now + COMBAT.parryStunMs;
    this.body.setAllowGravity(true);
    this.body.setVelocity(defenderPosition.x > this.x ? -260 : 260, -150);
  }

  public reset(x: number, y: number, facing: -1 | 1): void {
    this.attackState = null;
    this.damage = 0;
    this.dashCooldownUntil = 0;
    this.dashUntil = 0;
    this.dropThroughUntil = 0;
    this.facing = facing;
    this.parrySide = null;
    this.parryUntil = 0;
    this.recoveryUntil = 0;
    this.stunUntil = 0;
    this.aim = { x: facing, y: 0 };
    this.body.setAllowGravity(true);
    this.body.stop();
    this.sprite.setPosition(x, y);
    this.updateRender(0);
  }

  public snapshot(now: number): FighterSnapshot {
    return {
      x: this.x,
      y: this.y,
      aim: this.aim,
      onGround: this.isGrounded(),
      canAct: this.canAct(now),
      canDash: this.canDash(now),
      activeAttack: this.getActiveAttack(now)?.kind ?? null,
    };
  }

  public step(now: number, intent: ControlIntent): void {
    this.expireStates(now);
    this.updateAim(intent.aim);
    this.handleDrop(now, intent.descend);
    this.handleJump(now, intent.jump);
    this.handleParry(now, intent.parry);
    this.handleAttack(now, intent.attack);
    this.handleDash(now, intent.dash);
    this.applyMovement(now, intent.moveX);
    this.capFallSpeed();
    this.updateRender(now);
  }

  private get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  private applyMovement(now: number, moveX: number): void {
    if (now < this.dashUntil || now < this.stunUntil) {
      return;
    }

    const topSpeed = this.isGrounded() ? MOVEMENT.groundSpeed : MOVEMENT.airSpeed;
    const targetVelocity = moveX * topSpeed;
    const blend = this.isGrounded() ? 0.26 : 0.14;

    this.body.setVelocityX(Phaser.Math.Linear(this.body.velocity.x, targetVelocity, blend));
  }

  private canAct(now: number): boolean {
    return now >= this.recoveryUntil && now >= this.stunUntil && !this.attackState;
  }

  private canDash(now: number): boolean {
    return now >= this.dashCooldownUntil && now >= this.stunUntil;
  }

  private capFallSpeed(): void {
    if (this.body.velocity.y > MOVEMENT.maxFallSpeed) {
      this.body.setVelocityY(MOVEMENT.maxFallSpeed);
    }
  }

  private currentParrySide(now: number): ParrySide | null {
    return now < this.parryUntil ? this.parrySide : null;
  }

  private expireStates(now: number): void {
    if (this.attackState && now >= this.attackState.recoveryEndsAt) {
      this.attackState = null;
    }

    if (now >= this.parryUntil) {
      this.parrySide = null;
    }

    this.body.setAllowGravity(now >= this.dashUntil);
  }

  private handleAttack(now: number, kind: AttackKind | null): void {
    if (!kind || !this.canAct(now)) {
      return;
    }

    const profile = ATTACKS[kind];
    const direction = normalizeVector(this.aim, this.facing);

    this.attackState = {
      kind,
      profile,
      direction,
      windupEndsAt: now + profile.windupMs,
      activeEndsAt: now + profile.windupMs + profile.activeMs,
      recoveryEndsAt: now + profile.windupMs + profile.activeMs + profile.recoveryMs,
      hitConsumed: false,
    };
    this.recoveryUntil = this.attackState.recoveryEndsAt;
  }

  private handleDash(now: number, dashPressed: boolean): void {
    if (!dashPressed || !this.canDash(now)) {
      return;
    }

    const direction = normalizeVector(this.aim, this.facing);

    this.attackState = null;
    this.dashUntil = now + MOVEMENT.dashDurationMs;
    this.dashCooldownUntil = now + MOVEMENT.dashCooldownMs;
    this.parryUntil = 0;
    this.body.setVelocity(direction.x * MOVEMENT.dashSpeed, direction.y * MOVEMENT.dashSpeed);
  }

  private handleDrop(now: number, descendPressed: boolean): void {
    if (!descendPressed || !this.isGrounded()) {
      return;
    }

    this.dropThroughUntil = now + MOVEMENT.dropDurationMs;
    this.sprite.y += 6;
  }

  private handleJump(now: number, jumpPressed: boolean): void {
    if (!jumpPressed || now < this.stunUntil || !this.isGrounded()) {
      return;
    }

    this.body.setVelocityY(-MOVEMENT.jumpVelocity);
  }

  private handleParry(now: number, side: ParrySide | null): void {
    if (!side || !this.canAct(now)) {
      return;
    }

    this.parrySide = side;
    this.parryUntil = now + COMBAT.parryWindowMs;
    this.recoveryUntil = Math.max(this.recoveryUntil, now + COMBAT.parryCommitMs);
  }

  private isGrounded(): boolean {
    return this.body.blocked.down || this.body.touching.down;
  }

  private updateAim(rawAim: Vec2): void {
    this.aim = normalizeVector(rawAim, this.facing);

    if (Math.abs(this.aim.x) > 0.18) {
      this.facing = this.aim.x > 0 ? 1 : -1;
    }
  }

  private updateRender(now: number): void {
    const attack = this.attackState;
    const attackVisible = attack && now >= attack.windupEndsAt && now <= attack.recoveryEndsAt;
    const attackStrength =
      attack && now >= attack.windupEndsAt && now <= attack.activeEndsAt ? 1 : 0.55;
    const idleBob = this.isGrounded() ? Math.sin(now / 140) * 2 : 0;
    const reach = attack ? 52 + attack.profile.range * 0.42 * attackStrength : 42;
    const scale = attack ? attack.profile.swingScale : 0.72;

    this.shadow
      .setPosition(this.x, this.y + 76)
      .setScale(this.isGrounded() ? 1 : 0.82, this.isGrounded() ? 1 : 0.82);
    this.aura
      .setPosition(this.x, this.y - 10)
      .setVisible(now < this.parryUntil)
      .setAlpha(now < this.parryUntil ? 0.22 : 0);
    this.label.setPosition(this.x, this.y - 112);
    this.sprite
      .setAngle(Phaser.Math.Clamp(this.body.velocity.x * 0.03, -10, 10))
      .setFlipX(this.facing < 0)
      .setScale(now < this.dashUntil ? 0.78 : 0.74);
    this.weapon
      .setTexture(attackVisible ? attack.profile.textureKey : "pillow-primary")
      .setPosition(this.x + this.aim.x * reach, this.y - 18 + idleBob + this.aim.y * reach * 0.52)
      .setRotation(Math.atan2(this.aim.y, this.aim.x))
      .setScale(scale);

    if (now < this.parryUntil) {
      this.sprite.setTintFill(0xffefae);
      this.weapon.setTintFill(this.accent);
    } else if (now < this.stunUntil) {
      this.sprite.setTint(0xffd7dc);
      this.weapon.setTint(0xffd7dc);
    } else {
      this.sprite.clearTint();
      this.weapon.clearTint();
    }
  }
}
