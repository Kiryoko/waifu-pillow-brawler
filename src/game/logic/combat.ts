import type { AttackProfile } from "@/game/config";
import type { ParrySide, Vec2 } from "@/game/types";

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
 * Tests whether a defender is inside a fighter's current swing.
 *
 * @param aim - The locked attack direction.
 * @param toTarget - Vector from attacker to defender.
 * @param profile - Attack profile for range and arc limits.
 * @returns Whether the attack should connect.
 */
export function isTargetInsideAttack(aim: Vec2, toTarget: Vec2, profile: AttackProfile): boolean {
  const distanceSquared = toTarget.x * toTarget.x + toTarget.y * toTarget.y;

  if (distanceSquared > profile.range * profile.range) {
    return false;
  }

  const aimDirection = normalizeVector(aim);
  const targetDirection = normalizeVector(toTarget, aimDirection.x);
  const dot = aimDirection.x * targetDirection.x + aimDirection.y * targetDirection.y;

  return dot >= Math.cos(profile.arcRadians / 2);
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
 * Checks whether the defender's current parry catches the attack.
 *
 * @param parrySide - Defender parry direction, if active.
 * @param attackerOffset - Vector from defender to attacker.
 * @returns Whether the hit should be parried.
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
  const scaledForce = profile.baseKnockback + defenderDamage * 4.4;

  return {
    x: direction.x * scaledForce,
    y: direction.y * scaledForce * 0.3 - profile.lift - defenderDamage * 0.7,
  };
}
