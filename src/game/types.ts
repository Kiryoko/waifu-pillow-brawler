export type AttackKind = "primary" | "secondary";
export type Axis = -1 | 0 | 1;
export type ParrySide = "left" | "right";

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface ControlIntent {
  readonly moveX: Axis;
  readonly jump: boolean;
  readonly descend: boolean;
  readonly dash: boolean;
  readonly attack: AttackKind | null;
  readonly parry: ParrySide | null;
  readonly aim: Vec2;
}
