import { describe, it, expect, beforeEach } from 'vitest';
import { renderHud } from './hud';
import { createInitialState } from '../sim/state';

describe('renderHud', () => {
  let hud: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<header id="hud"></header>';
    hud = document.getElementById('hud')!;
  });

  it('shows the calendar, treasury, inflation, fear, and both loss meters', () => {
    const s = createInitialState();
    renderHud(s, hud, 1, () => {});
    expect(hud.textContent).toContain('Year 1');
    expect(hud.textContent).toContain('$5,000');
    expect(hud.textContent).toContain('Unrest');
    expect(hud.textContent).toContain('Prosperity');
    expect(hud.textContent).toContain('Inflation');
    expect(hud.textContent).toContain('Fear');
  });

  it('renders loss meters in a dedicated hud-loss-meter element (visual prominence)', () => {
    const s = createInitialState();
    renderHud(s, hud, 1, () => {});
    expect(hud.querySelector('.hud-loss-meter.unrest')).not.toBeNull();
    expect(hud.querySelector('.hud-loss-meter.prosperity')).not.toBeNull();
  });

  it('shows a trajectory arrow + per-month delta on each loss meter when deltas are provided', () => {
    const s = createInitialState();
    renderHud(s, hud, 1, () => {}, { unrest: 0.4, prosperity: -0.3, treasury: 250 });
    expect(hud.querySelector('.hud-loss-meter.unrest .delta')?.textContent).toContain('↑');
    expect(hud.querySelector('.hud-loss-meter.unrest .delta')?.textContent).toContain('+0.4');
    expect(hud.querySelector('.hud-loss-meter.prosperity .delta')?.textContent).toContain('↓');
  });

  it('shows treasury net per-month under the value when a treasury delta is provided', () => {
    const s = createInitialState();
    renderHud(s, hud, 1, () => {}, { unrest: 0, prosperity: 0, treasury: 420 });
    const treasuryNode = Array.from(hud.querySelectorAll('.hud-stat')).find((n) =>
      n.textContent?.includes('Treasury'),
    );
    expect(treasuryNode?.textContent).toContain('+$420/mo');
  });

  it('marks rising loss meters with delta-up-bad and rising treasury with delta-up-good', () => {
    const s = createInitialState();
    renderHud(s, hud, 1, () => {}, { unrest: 1, prosperity: 1, treasury: 1000 });
    expect(hud.querySelector('.hud-loss-meter.unrest .delta-up-bad')).not.toBeNull();
    expect(hud.querySelector('.hud-loss-meter.prosperity .delta-up-bad')).not.toBeNull();
    expect(hud.querySelector('.hud-stat .delta-up-good')).not.toBeNull();
  });

  it('shows four speed buttons (Pause, 1×, 2×, 3×)', () => {
    const s = createInitialState();
    renderHud(s, hud, 1, () => {});
    const buttons = hud.querySelectorAll('.speed-controls button');
    expect(buttons.length).toBe(4);
    expect(Array.from(buttons).map((b) => b.textContent)).toEqual(['Pause', '1×', '2×', '3×']);
  });

  it('marks the active speed', () => {
    const s = createInitialState();
    renderHud(s, hud, 2, () => {});
    const active = hud.querySelector('.speed-controls button.active');
    expect(active?.textContent).toBe('2×');
  });

  it('invokes onSpeedChange with the chosen speed when a speed button is clicked', () => {
    const s = createInitialState();
    let received = -1;
    renderHud(s, hud, 1, (n) => { received = n; });
    const threeX = Array.from(hud.querySelectorAll('button')).find((b) => b.textContent === '3×')!;
    threeX.click();
    expect(received).toBe(3);
  });
});
