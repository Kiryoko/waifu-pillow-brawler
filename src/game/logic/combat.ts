import type { AttackProfile } from "@/game/config";
import type { ParrySide, Vec2 } from "@/game/types";

export interface AttackHitbox {
  readonly center: Vec2;
  readonly direction: Vec2;
  readonly halfWidth: number;
  readonly halfHeight: number;
}

export interface Hurtbox {
  readonly center: Vec2;
  readonly halfWidth: number;
  readonly halfHeight: number;
}

/**
 * Returns a stable unit vector for aiming and knockback.
 *
 * @param vector - Raw directional input.
 * @param fallbackX - Horizontal fallback when the input is almost zero.
 * @returns The normalized vector.
 */
export function normalizeVector(vector: Vec2, fallbackX = 1): Vec2 {
  const magnitude = Math.hypot(vector.x, vector.y);

  if (magnitude < 0.001) {
    return { x: Math.sign(fallbackX) || 1, y: 0 };
  }

  return {
    x: vector.x / magnitude,
    y: vector.y / magnitude,
  };
}

/**
 * Tests a rotated pillow hitbox against the defender's hurtbox.
 *
 * @param attack - Rotated attack hitbox aligned to the sprite.
 * @param hurtbox - Defender hurtbox.
 * @returns Whether the attack overlaps the defender.
 */
export function attackOverlapsHurtbox(attack: AttackHitbox, hurtbox: Hurtbox): boolean {
  const direction = normalizeVector(attack.direction);
  const normal = {
    x: -direction.y,
    y: direction.x,
  };
  const offset = {
    x: hurtbox.center.x - attack.center.x,
    y: hurtbox.center.y - attack.center.y,
  };
  const localX = offset.x * direction.x + offset.y * direction.y;
  const localY = offset.x * normal.x + offset.y * normal.y;
  const projectedHalfWidth =
    hurtbox.halfWidth * Math.abs(direction.x) + hurtbox.halfHeight * Math.abs(direction.y);
  const projectedHalfHeight =
    hurtbox.halfWidth * Math.abs(normal.x) + hurtbox.halfHeight * Math.abs(normal.y);

  return (
    Math.abs(localX) <= attack.halfWidth + projectedHalfWidth &&
    Math.abs(localY) <= attack.halfHeight + projectedHalfHeight
  );
}

export function classifyIncomingSide(attackerOffset: Vec2): ParrySide | "above" | null {
  const verticalLead = -attackerOffset.y;

  if (verticalLead > 48 && verticalLead > Math.abs(attackerOffset.x)) {
    return "above";
  }

  if (Math.abs(attackerOffset.x) < 18) {
    return null;
  }

  return attackerOffset.x < 0 ? "left" : "right";
}

/**
 * Checks whether the defender is guarding the correct side.
 *
 * @param parrySide - Defender guard direction, if active.
 * @param attackerOffset - Vector from defender to attacker.
 * @returns Whether the attack is coming from the guarded side.
 */
export function resolvesParry(parrySide: ParrySide | null, attackerOffset: Vec2): boolean {
  if (!parrySide) {
    return false;
  }

  const incomingSide = classifyIncomingSide(attackerOffset);
  return incomingSide !== "above" && incomingSide !== null && incomingSide === parrySide;
}

export function buildKnockback(profile: AttackProfile, aim: Vec2, defenderDamage: number): Vec2 {
  const direction = normalizeVector(aim);
  const scaledForce = profile.baseKnockback + defenderDamage * 4.2;

  return {
    x: direction.x * scaledForce,
    y: direction.y * scaledForce * 0.28 - profile.lift - defenderDamage * 0.75,
  };
}
