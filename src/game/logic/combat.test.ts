import { describe, expect, it } from "vitest";

import { ATTACKS } from "@/game/config";
import {
  attackOverlapsHurtbox,
  buildKnockback,
  normalizeVector,
  resolvesParry,
} from "@/game/logic/combat";

describe("combat helpers", () => {
  it("normalizes vectors and falls back to a stable horizontal direction", () => {
    expect(normalizeVector({ x: 0, y: 0 }, -1)).toEqual({ x: -1, y: 0 });
    expect(normalizeVector({ x: 3, y: 4 })).toEqual({ x: 0.6, y: 0.8 });
  });

  it("matches attack overlap to the rotated pillow bounds", () => {
    const overlap = attackOverlapsHurtbox(
      {
        center: { x: 120, y: 120 },
        direction: { x: 1, y: 0 },
        halfWidth: ATTACKS.primary.hitboxWidth / 2,
        halfHeight: ATTACKS.primary.hitboxHeight / 2,
      },
      {
        center: { x: 145, y: 120 },
        halfWidth: 28,
        halfHeight: 50,
      },
    );
    const miss = attackOverlapsHurtbox(
      {
        center: { x: 120, y: 120 },
        direction: { x: 1, y: 0 },
        halfWidth: ATTACKS.primary.hitboxWidth / 2,
        halfHeight: ATTACKS.primary.hitboxHeight / 2,
      },
      {
        center: { x: 240, y: 120 },
        halfWidth: 28,
        halfHeight: 50,
      },
    );

    expect(overlap).toBe(true);
    expect(miss).toBe(false);
  });

  it("blocks only the correct guard side and never from directly above", () => {
    expect(resolvesParry("left", { x: -60, y: 8 })).toBe(true);
    expect(resolvesParry("right", { x: -60, y: 8 })).toBe(false);
    expect(resolvesParry("left", { x: 12, y: -80 })).toBe(false);
  });

  it("scales knockback with accumulated damage", () => {
    const lowDamage = buildKnockback(ATTACKS.primary, { x: 1, y: 0 }, 10);
    const highDamage = buildKnockback(ATTACKS.primary, { x: 1, y: 0 }, 140);

    expect(highDamage.x).toBeGreaterThan(lowDamage.x);
    expect(highDamage.y).toBeLessThan(lowDamage.y);
  });
});
