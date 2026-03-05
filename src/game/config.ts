import type { AttackKind } from "@/game/types";

export interface AttackProfile {
  readonly key: AttackKind;
  readonly textureKey: string;
  readonly range: number;
  readonly arcRadians: number;
  readonly windupMs: number;
  readonly activeMs: number;
  readonly recoveryMs: number;
  readonly damage: number;
  readonly baseKnockback: number;
  readonly lift: number;
  readonly swingScale: number;
}

export const GAME_SIZE = {
  width: 1280,
  height: 720,
} as const;

export const MOVEMENT = {
  groundSpeed: 410,
  airSpeed: 340,
  jumpVelocity: 860,
  dashSpeed: 780,
  dashDurationMs: 150,
  dashCooldownMs: 420,
  dropDurationMs: 260,
  maxFallSpeed: 1260,
} as const;

export const COMBAT = {
  hitStunMs: 190,
  parryCommitMs: 150,
  parryWindowMs: 190,
  parryStunMs: 280,
} as const;

export const RING_OUT_MARGIN = 160;

export const ATTACKS: Record<AttackKind, AttackProfile> = {
  primary: {
    key: "primary",
    textureKey: "pillow-primary",
    range: 128,
    arcRadians: 1.15,
    windupMs: 50,
    activeMs: 100,
    recoveryMs: 170,
    damage: 12,
    baseKnockback: 470,
    lift: 200,
    swingScale: 1.04,
  },
  secondary: {
    key: "secondary",
    textureKey: "pillow-secondary",
    range: 160,
    arcRadians: 1.55,
    windupMs: 110,
    activeMs: 135,
    recoveryMs: 290,
    damage: 19,
    baseKnockback: 590,
    lift: 290,
    swingScale: 1.18,
  },
};
