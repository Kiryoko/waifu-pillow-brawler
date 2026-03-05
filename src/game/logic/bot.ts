import { ATTACKS } from "@/game/config";
import { classifyIncomingSide, normalizeVector } from "@/game/logic/combat";
import type { AttackKind, Axis, ControlIntent, ParrySide, Vec2 } from "@/game/types";

export interface FighterSnapshot {
  readonly x: number;
  readonly y: number;
  readonly aim: Vec2;
  readonly onGround: boolean;
  readonly canAct: boolean;
  readonly canDash: boolean;
  readonly activeAttack: AttackKind | null;
}

function axisToward(value: number): Axis {
  if (value > 0) {
    return 1;
  }

  if (value < 0) {
    return -1;
  }

  return 0;
}

function pickParrySide(self: FighterSnapshot, opponent: FighterSnapshot): ParrySide | null {
  if (!opponent.activeAttack) {
    return null;
  }

  const side = classifyIncomingSide({
    x: opponent.x - self.x,
    y: opponent.y - self.y,
  });

  return side === "above" ? null : side;
}

/**
 * Chooses a simple but readable platform-fighter bot action each frame.
 *
 * @param self - Current bot state.
 * @param opponent - Player state.
 * @returns The bot's control intent for this frame.
 */
export function decideBotIntent(self: FighterSnapshot, opponent: FighterSnapshot): ControlIntent {
  const toOpponent = {
    x: opponent.x - self.x,
    y: opponent.y - self.y,
  };
  const aim = normalizeVector(toOpponent, self.aim.x);
  const distance = Math.hypot(toOpponent.x, toOpponent.y);
  const horizontalGap = Math.abs(toOpponent.x);

  let moveX: Axis = 0;
  let jump = false;
  let descend = false;
  let dash = false;
  let attack: AttackKind | null = null;
  let parry: ParrySide | null = null;

  if (horizontalGap > 210) {
    moveX = axisToward(toOpponent.x);
  } else if (horizontalGap < 72) {
    moveX = axisToward(-toOpponent.x);
  }

  if (self.onGround && toOpponent.y < -135 && horizontalGap < 190) {
    jump = true;
  }

  if (self.onGround && toOpponent.y > 140 && horizontalGap < 110) {
    descend = true;
  }

  if (self.canAct && distance < ATTACKS.secondary.range) {
    parry = pickParrySide(self, opponent);
  }

  if (!parry && self.canAct && distance < ATTACKS.secondary.range * 1.05) {
    if (toOpponent.y < -70 || distance > ATTACKS.primary.range * 0.85) {
      attack = "secondary";
    } else {
      attack = "primary";
    }
  }

  if (self.canDash && distance > 300) {
    dash = true;
  }

  return {
    moveX,
    jump,
    descend,
    dash,
    attack,
    parry,
    aim,
  };
}
