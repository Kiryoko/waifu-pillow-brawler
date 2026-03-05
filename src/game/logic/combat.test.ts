import { describe, expect, it } from "vitest";

import { ATTACKS } from "@/game/config";
import {
  buildKnockback,
  isTargetInsideAttack,
  normalizeVector,
  resolvesParry,
} from "@/game/logic/combat";

describe("combat helpers", () => {
  it("normalizes vectors and falls back to a stable horizontal direction", () => {
    expect(normalizeVector({ x: 0, y: 0 }, -1)).toEqual({ x: -1, y: 0 });
    expect(normalizeVector({ x: 3, y: 4 })).toEqual({ x: 0.6, y: 0.8 });
  });

  it("connects attacks only when the target is inside the swing arc", () => {
    expect(isTargetInsideAttack({ x: 1, y: 0 }, { x: 110, y: 6 }, ATTACKS.primary)).toBe(true);
    expect(isTargetInsideAttack({ x: 1, y: 0 }, { x: -110, y: 6 }, ATTACKS.primary)).toBe(false);
  });

  it("blocks only the correct parry side and never from directly above", () => {
    expect(resolvesParry("left", { x: -60, y: 8 })).toBe(true);
    expect(resolvesParry("right", { x: -60, y: 8 })).toBe(false);
    expect(resolvesParry("left", { x: 12, y: -80 })).toBe(false);
  });

  it("scales knockback with accumulated damage", () => {
    const lowDamage = buildKnockback(ATTACKS.secondary, { x: 1, y: 0 }, 10);
    const highDamage = buildKnockback(ATTACKS.secondary, { x: 1, y: 0 }, 140);

    expect(highDamage.x).toBeGreaterThan(lowDamage.x);
    expect(highDamage.y).toBeLessThan(lowDamage.y);
  });
});
