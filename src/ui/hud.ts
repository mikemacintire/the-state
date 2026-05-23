import type { GameState } from '../sim/types';
import { CONSTANTS } from '../content/constants';
import {
  deltaArrow,
  formatMeterDelta,
  formatMoney,
  formatMoneyDelta,
  formatMonth,
  meterClass,
} from './format';

/**
 * Per-tick deltas the renderer wants to display alongside the current
 * meter values. Caller computes these (typically against the previous
 * render's reading). All are "per month" — at higher tick rates they
 * still represent one month's worth of change.
 */
export interface HudDeltas {
  unrest: number;
  prosperity: number;
  treasury: number;
}

/**
 * Render the HUD bar (design doc §6.1 / §6.2). Two grouped clusters:
 *
 * - **Secondary stats** (smaller): Date, Treasury (with net $/mo), Inflation, Fear.
 * - **Loss meters** (larger, visually dominant): Unrest and Prosperity, each
 *   with a per-month trajectory arrow + delta. Prosperity uses cool tones
 *   while approaching threshold so the player learns it is structurally
 *   different from Unrest — both end the run, but for opposite reasons.
 *
 * Speed controls live at the far right. The HUD is fully re-rendered each
 * call — cheap because it's a handful of nodes.
 */
export function renderHud(
  state: GameState,
  el: HTMLElement,
  speed: 0 | 1 | 2 | 3,
  onSpeedChange: (n: 0 | 1 | 2 | 3) => void,
  deltas?: HudDeltas,
): void {
  el.innerHTML = '';

  const secondary = document.createElement('div');
  secondary.className = 'hud-stat-group';
  secondary.appendChild(makeStat('Date', formatMonth(state.month)));
  secondary.appendChild(
    makeStat(
      'Treasury',
      formatMoney(state.treasury),
      undefined,
      deltas ? formatMoneyDelta(deltas.treasury) : undefined,
      deltas ? treasuryDeltaClass(deltas.treasury) : undefined,
    ),
  );
  secondary.appendChild(makeStat('Inflation', state.inflation.toFixed(1)));
  secondary.appendChild(makeStat('Fear', String(Math.round(state.fear))));
  el.appendChild(secondary);

  const losses = document.createElement('div');
  losses.className = 'hud-stat-group hud-loss-group';
  losses.appendChild(
    makeLossMeter(
      'Unrest',
      `${Math.round(state.nationalUnrest)}/${CONSTANTS.revoltThreshold}`,
      meterClass(state.nationalUnrest, CONSTANTS.revoltThreshold),
      deltas ? deltas.unrest : undefined,
      'unrest',
    ),
  );
  losses.appendChild(
    makeLossMeter(
      'Prosperity',
      `${Math.round(state.nationalProsperity)}/${CONSTANTS.spellBreaksThreshold}`,
      meterClass(state.nationalProsperity, CONSTANTS.spellBreaksThreshold),
      deltas ? deltas.prosperity : undefined,
      'prosperity',
    ),
  );
  el.appendChild(losses);

  el.appendChild(makeSpeedControls(speed, onSpeedChange));
}

function makeStat(
  label: string,
  value: string,
  valueCssClass = '',
  subline?: string,
  sublineCssClass = '',
): HTMLElement {
  const node = document.createElement('div');
  node.className = 'hud-stat';
  const lbl = document.createElement('div');
  lbl.className = 'label';
  lbl.textContent = label;
  const val = document.createElement('div');
  val.className = `value ${valueCssClass}`.trim();
  val.textContent = value;
  node.appendChild(lbl);
  node.appendChild(val);
  if (subline !== undefined) {
    const sub = document.createElement('div');
    sub.className = `subline ${sublineCssClass}`.trim();
    sub.textContent = subline;
    node.appendChild(sub);
  }
  return node;
}

function makeLossMeter(
  label: string,
  value: string,
  meterCssClass: string,
  delta: number | undefined,
  variant: 'unrest' | 'prosperity',
): HTMLElement {
  const node = document.createElement('div');
  node.className = `hud-loss-meter ${variant}`;
  const lbl = document.createElement('div');
  lbl.className = 'label';
  lbl.textContent = label;
  const val = document.createElement('div');
  val.className = `value ${meterCssClass}`.trim();
  val.textContent = value;
  node.appendChild(lbl);
  node.appendChild(val);
  if (delta !== undefined) {
    const d = document.createElement('div');
    // Rising loss meter = bad. Falling = relief.
    d.className = `delta ${meterDeltaClass(delta)}`;
    d.textContent = `${deltaArrow(delta)} ${formatMeterDelta(delta)}`;
    node.appendChild(d);
  }
  return node;
}

function makeSpeedControls(
  speed: 0 | 1 | 2 | 3,
  onSpeedChange: (n: 0 | 1 | 2 | 3) => void,
): HTMLElement {
  const controls = document.createElement('div');
  controls.className = 'speed-controls';
  const speeds: Array<{ n: 0 | 1 | 2 | 3; label: string }> = [
    { n: 0, label: 'Pause' },
    { n: 1, label: '1×' },
    { n: 2, label: '2×' },
    { n: 3, label: '3×' },
  ];
  for (const s of speeds) {
    const btn = document.createElement('button');
    btn.textContent = s.label;
    if (s.n === speed) btn.classList.add('active');
    btn.addEventListener('click', () => onSpeedChange(s.n));
    controls.appendChild(btn);
  }
  return controls;
}

/** Bad-when-rising convention: loss meters going UP are alarming. */
function meterDeltaClass(delta: number): string {
  if (delta > 0.05) return 'delta-up-bad';
  if (delta < -0.05) return 'delta-down-good';
  return 'delta-flat';
}

/** Good-when-rising convention: treasury going UP is relief. */
function treasuryDeltaClass(delta: number): string {
  if (delta > 0.5) return 'delta-up-good';
  if (delta < -0.5) return 'delta-down-bad';
  return 'delta-flat';
}
