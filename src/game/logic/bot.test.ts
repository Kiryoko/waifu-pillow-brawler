import { describe, expect, it } from "vitest";

import { decideBotIntent, type FighterSnapshot } from "@/game/logic/bot";

function makeSnapshot(overrides: Partial<FighterSnapshot> = {}): FighterSnapshot {
  return {
    x: 0,
    y: 0,
    aim: { x: 1, y: 0 },
    onGround: true,
    canAct: true,
    canDash: true,
    activeAttack: null,
    ...overrides,
  };
}

describe("decideBotIntent", () => {
  it("keeps the easy bot from dashing until the gap is large", () => {
    const intent = decideBotIntent(makeSnapshot(), makeSnapshot({ x: 420 }), "easy");

    expect(intent.moveX).toBe(1);
    expect(intent.dash).toBe(false);
    expect(intent.attack).toBeNull();
  });

  it("lets the hard bot dash earlier to stay aggressive", () => {
    const intent = decideBotIntent(makeSnapshot({ x: 520 }), makeSnapshot({ x: 940 }), "hard");

    expect(intent.moveX).toBe(1);
    expect(intent.dash).toBe(true);
  });

  it("parries instead of attacking when an incoming hit is close", () => {
    const intent = decideBotIntent(
      makeSnapshot({ x: 320, canDash: false }),
      makeSnapshot({ x: 238, y: 0, activeAttack: "primary" }),
      "normal",
    );

    expect(intent.parry).toBe("left");
    expect(intent.attack).toBeNull();
  });
});
