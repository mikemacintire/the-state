import type { GameState } from '../sim/types';
import { CONSTANTS } from '../content/constants';
import { formatMonth, formatMoney, meterClass } from './format';

/**
 * Render the HUD bar (design doc §6.1). Speed is 0 (paused), 1, 2, or 3;
 * `onSpeedChange` is invoked when the user clicks one of the four speed
 * buttons. The HUD is fully re-rendered each call — cheap because there are
 * only a handful of nodes.
 */
export function renderHud(
  state: GameState,
  el: HTMLElement,
  speed: 0 | 1 | 2 | 3,
  onSpeedChange: (n: 0 | 1 | 2 | 3) => void,
): void {
  el.innerHTML = '';

  const stat = (label: string, value: string, cssClass = ''): HTMLElement => {
    const node = document.createElement('div');
    node.className = 'hud-stat';
    const lbl = document.createElement('div');
    lbl.className = 'label';
    lbl.textContent = label;
    const val = document.createElement('div');
    val.className = `value ${cssClass}`.trim();
    val.textContent = value;
    node.appendChild(lbl);
    node.appendChild(val);
    return node;
  };

  el.appendChild(stat('Date', formatMonth(state.month)));
  el.appendChild(stat('Treasury', formatMoney(state.treasury)));
  el.appendChild(stat('Inflation', `${state.inflation.toFixed(1)}`));
  el.appendChild(stat('Fear', `${Math.round(state.fear)}`));
  el.appendChild(
    stat(
      'Unrest',
      `${Math.round(state.nationalUnrest)}/${CONSTANTS.revoltThreshold}`,
      meterClass(state.nationalUnrest, CONSTANTS.revoltThreshold),
    ),
  );
  el.appendChild(
    stat(
      'Prosperity',
      `${Math.round(state.nationalProsperity)}/${CONSTANTS.spellBreaksThreshold}`,
      meterClass(state.nationalProsperity, CONSTANTS.spellBreaksThreshold),
    ),
  );

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
  el.appendChild(controls);
}
