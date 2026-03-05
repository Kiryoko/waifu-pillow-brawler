import { ATTACKS, GAME_SIZE } from "@/game/config";
import { classifyIncomingSide, normalizeVector } from "@/game/logic/combat";
import type { AttackKind, Axis, ControlIntent, ParrySide, Vec2 } from "@/game/types";

export type BotDifficultyKey = "easy" | "normal" | "hard";

export interface BotDifficulty {
  readonly attackDistance: number;
  readonly dashDistance: number;
  readonly edgeMargin: number;
  readonly jumpTriggerY: number;
  readonly label: string;
  readonly parryDistance: number;
  readonly retreatDistance: number;
  readonly chaseDistance: number;
}

export const BOT_DIFFICULTIES: Record<BotDifficultyKey, BotDifficulty> = {
  easy: {
    attackDistance: 108,
    dashDistance: 520,
    edgeMargin: 110,
    jumpTriggerY: -170,
    label: "Easy",
    parryDistance: 92,
    retreatDistance: 52,
    chaseDistance: 245,
  },
  normal: {
    attackDistance: 122,
    dashDistance: 390,
    edgeMargin: 145,
    jumpTriggerY: -150,
    label: "Normal",
    parryDistance: 128,
    retreatDistance: 68,
    chaseDistance: 215,
  },
  hard: {
    attackDistance: 136,
    dashDistance: 320,
    edgeMargin: 185,
    jumpTriggerY: -130,
    label: "Hard",
    parryDistance: 162,
    retreatDistance: 84,
    chaseDistance: 190,
  },
};

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
 * Chooses a simple platform-fighter bot action each frame.
 *
 * @param self - Current bot state.
 * @param opponent - Player state.
 * @param difficultyKey - Current bot difficulty.
 * @returns The bot's control intent for this frame.
 */
export function decideBotIntent(
  self: FighterSnapshot,
  opponent: FighterSnapshot,
  difficultyKey: BotDifficultyKey,
): ControlIntent {
  const difficulty = BOT_DIFFICULTIES[difficultyKey];
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

  if (self.x < difficulty.edgeMargin) {
    moveX = 1;
  } else if (self.x > GAME_SIZE.width - difficulty.edgeMargin) {
    moveX = -1;
  } else if (horizontalGap > difficulty.chaseDistance) {
    moveX = axisToward(toOpponent.x);
  } else if (horizontalGap < difficulty.retreatDistance) {
    moveX = axisToward(-toOpponent.x);
  }

  if (self.onGround && toOpponent.y < difficulty.jumpTriggerY && horizontalGap < 210) {
    jump = true;
  }

  if (self.onGround && toOpponent.y > 145 && horizontalGap < 120) {
    descend = true;
  }

  if (self.canAct && distance < difficulty.parryDistance) {
    parry = pickParrySide(self, opponent);
  }

  if (!parry && self.canAct && distance < difficulty.attackDistance) {
    attack = ATTACKS.primary.key;
  }

  if (
    self.canDash &&
    distance > difficulty.dashDistance &&
    self.x > difficulty.edgeMargin &&
    self.x < GAME_SIZE.width - difficulty.edgeMargin
  ) {
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
