import Phaser from "phaser";

interface Tone {
  readonly frequency: number;
  readonly durationMs: number;
  readonly gain: number;
  readonly type: OscillatorType;
  readonly sweepTo?: number;
}

export class Sfx {
  private context?: AudioContext;

  public constructor(private readonly scene: Phaser.Scene) {
    const unlock = () => {
      void this.ensureContext();
    };

    this.scene.input.on(Phaser.Input.Events.POINTER_DOWN, unlock);
    this.scene.input.keyboard?.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, unlock);
  }

  public heavySwing(): void {
    this.play([
      { frequency: 180, durationMs: 80, gain: 0.05, type: "sawtooth", sweepTo: 280 },
      { frequency: 110, durationMs: 120, gain: 0.04, type: "triangle", sweepTo: 70 },
    ]);
  }

  public hit(): void {
    this.play([
      { frequency: 160, durationMs: 70, gain: 0.06, type: "square", sweepTo: 90 },
      { frequency: 520, durationMs: 40, gain: 0.03, type: "triangle", sweepTo: 260 },
    ]);
  }

  public parry(): void {
    this.play([
      { frequency: 720, durationMs: 55, gain: 0.05, type: "triangle", sweepTo: 1240 },
      { frequency: 520, durationMs: 110, gain: 0.03, type: "sine", sweepTo: 680 },
    ]);
  }

  private async ensureContext(): Promise<AudioContext | undefined> {
    if (typeof window === "undefined" || !window.AudioContext) {
      return undefined;
    }

    this.context ??= new window.AudioContext();

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    return this.context;
  }

  private play(tones: readonly Tone[]): void {
    void this.ensureContext().then((context) => {
      if (!context) {
        return;
      }

      const startAt = context.currentTime;

      tones.forEach((tone, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const toneStart = startAt + index * 0.015;
        const toneEnd = toneStart + tone.durationMs / 1000;

        oscillator.type = tone.type;
        oscillator.frequency.setValueAtTime(tone.frequency, toneStart);

        if (tone.sweepTo) {
          oscillator.frequency.exponentialRampToValueAtTime(tone.sweepTo, toneEnd);
        }

        gain.gain.setValueAtTime(0.0001, toneStart);
        gain.gain.exponentialRampToValueAtTime(tone.gain, toneStart + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, toneEnd);

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(toneStart);
        oscillator.stop(toneEnd + 0.02);
      });
    });
  }
}
