import type { GameState } from '../sim/types';
import { tick } from '../sim/tick';

/** Base period in ms for 1× speed (one month per BASE_PERIOD_MS of wall clock). */
const BASE_PERIOD_MS = 800;

export type Speed = 0 | 1 | 2 | 3;

/**
 * Real-time game loop. setInterval-based; period is BASE_PERIOD_MS divided by
 * current speed. Pauses (skips ticks) when speed=0, when a crisis is pending,
 * or when the run has ended.
 */
export class Loop {
  private speed: Speed = 1;
  private handle: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly state: GameState,
    private readonly onTick: () => void,
  ) {}

  periodFor(speed: Speed): number {
    return speed === 0 ? BASE_PERIOD_MS : Math.max(50, Math.floor(BASE_PERIOD_MS / speed));
  }

  setSpeed(speed: Speed): void {
    this.speed = speed;
    if (this.handle !== null) {
      // restart with the new period
      this.stop();
      this.start();
    }
  }

  start(): void {
    if (this.handle !== null) return;
    this.handle = setInterval(() => this.step(), this.periodFor(this.speed));
  }

  stop(): void {
    if (this.handle !== null) {
      clearInterval(this.handle);
      this.handle = null;
    }
  }

  private step(): void {
    if (this.speed === 0) return;
    if (this.state.lossCause !== null) return;
    if (this.state.pendingCrises.length > 0) return;
    tick(this.state, () => -1); // defer every choice to the UI modal
    this.onTick();
  }
}
