import { describe, it, expect, beforeEach } from 'vitest';
import { renderDefeat } from './defeat';
import { createInitialState } from '../sim/state';

describe('renderDefeat', () => {
  let el: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="defeat-root"></div>';
    el = document.getElementById('defeat-root')!;
  });

  it('renders nothing while the run is still going', () => {
    const s = createInitialState();
    renderDefeat(s, el);
    expect(el.children.length).toBe(0);
  });

  it('shows the loss cause and final scores when the run ends', () => {
    const s = createInitialState();
    s.lossCause = 'revolt';
    s.month = 240;
    s.lifetimeExtraction = 1_000_000;
    renderDefeat(s, el);
    expect(el.textContent?.toLowerCase()).toContain('revolt');
    expect(el.textContent).toContain('20'); // 240 months = 20 years
    expect(el.textContent).toContain('1,000,000');
  });

  it('uses different copy for each loss cause', () => {
    const s1 = createInitialState();
    s1.lossCause = 'bankruptcy';
    renderDefeat(s1, el);
    const t1 = el.textContent ?? '';
    const s2 = createInitialState();
    s2.lossCause = 'spell-breaks';
    renderDefeat(s2, el);
    const t2 = el.textContent ?? '';
    expect(t1).not.toBe(t2);
  });

  it('renders the spell-breaks epilogue as a non-blocking banner (not a modal-overlay)', () => {
    const s = createInitialState();
    s.lossCause = 'spell-breaks';
    renderDefeat(s, el);
    // The full-screen modal-overlay would cover the map; the epilogue uses a
    // translucent banner instead so the player can keep watching the freed
    // country flourish underneath.
    expect(el.querySelector('.modal-overlay')).toBeNull();
    expect(el.querySelector('.epilogue-banner')).not.toBeNull();
  });

  it('bankruptcy and revolt still use the full modal overlay (blocking)', () => {
    const s = createInitialState();
    s.lossCause = 'bankruptcy';
    renderDefeat(s, el);
    expect(el.querySelector('.modal-overlay')).not.toBeNull();
  });
});
