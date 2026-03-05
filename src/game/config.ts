import type { AttackKind } from "@/game/types";

export interface AttackProfile {
  readonly key: AttackKind;
  readonly textureKey: string;
  readonly windupMs: number;
  readonly activeMs: number;
  readonly recoveryMs: number;
  readonly damage: number;
  readonly baseKnockback: number;
  readonly lift: number;
  readonly swingScale: number;
  readonly hitboxWidth: number;
  readonly hitboxHeight: number;
  readonly hitboxForwardOffset: number;
}

export const GAME_SIZE = {
  width: 1280,
  height: 720,
} as const;

export const MOVEMENT = {
  groundSpeed: 405,
  airSpeed: 340,
  jumpVelocity: 860,
  dashSpeed: 760,
  dashDurationMs: 120,
  dashCooldownMs: 760,
  dashRecoveryMs: 150,
  dropDurationMs: 260,
  maxFallSpeed: 1260,
} as const;

export const COMBAT = {
  hitStunMs: 210,
  parryStunMs: 320,
  guardBreakStunMs: 720,
  guardDrainPerSecond: 54,
  guardRecoverPerSecond: 30,
  guardRecoverDelayMs: 280,
  guardReleaseCooldownMs: 180,
  guardHitCost: 34,
  guardMax: 100,
  guardPerfectMs: 120,
} as const;

export const RING_OUT_MARGIN = 160;

export const ATTACKS: Record<AttackKind, AttackProfile> = {
  primary: {
    key: "primary",
    textureKey: "pillow-primary",
    windupMs: 72,
    activeMs: 90,
    recoveryMs: 220,
    damage: 13,
    baseKnockback: 490,
    lift: 220,
    swingScale: 1.04,
    hitboxWidth: 66,
    hitboxHeight: 40,
    hitboxForwardOffset: 20,
  },
  secondary: {
    key: "secondary",
    textureKey: "pillow-secondary",
    windupMs: 110,
    activeMs: 120,
    recoveryMs: 310,
    damage: 19,
    baseKnockback: 590,
    lift: 300,
    swingScale: 1.18,
    hitboxWidth: 84,
    hitboxHeight: 52,
    hitboxForwardOffset: 28,
  },
};
