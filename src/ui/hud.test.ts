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
