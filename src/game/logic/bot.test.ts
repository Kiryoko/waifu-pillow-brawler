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
  it("dashes and advances when the opponent is far away", () => {
    const intent = decideBotIntent(makeSnapshot(), makeSnapshot({ x: 420, y: 0, canDash: false }));

    expect(intent.moveX).toBe(1);
    expect(intent.dash).toBe(true);
    expect(intent.attack).toBeNull();
  });

  it("chooses the heavy swing when the opponent is above and in range", () => {
    const intent = decideBotIntent(makeSnapshot(), makeSnapshot({ x: 120, y: -96 }));

    expect(intent.attack).toBe("secondary");
    expect(intent.jump).toBe(false);
  });

  it("parries the correct side when the opponent is attacking nearby", () => {
    const intent = decideBotIntent(
      makeSnapshot({ canDash: false }),
      makeSnapshot({ x: -90, y: 0, activeAttack: "primary" }),
    );

    expect(intent.parry).toBe("left");
    expect(intent.attack).toBeNull();
  });
});
