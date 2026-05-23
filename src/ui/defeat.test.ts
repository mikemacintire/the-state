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

  it('renders the spell-breaks epilogue as a non-blocking banner (not a defeat-overlay)', () => {
    const s = createInitialState();
    s.lossCause = 'spell-breaks';
    renderDefeat(s, el);
    // The full-screen defeat-overlay would cover the map; the epilogue uses
    // a translucent banner instead so the player can keep watching the freed
    // country flourish underneath.
    expect(el.querySelector('.defeat-overlay')).toBeNull();
    expect(el.querySelector('.epilogue-banner')).not.toBeNull();
  });

  it('bankruptcy and revolt still use the full defeat overlay (blocking)', () => {
    const s = createInitialState();
    s.lossCause = 'bankruptcy';
    renderDefeat(s, el);
    expect(el.querySelector('.defeat-overlay')).not.toBeNull();
  });

  describe('start-over restart', () => {
    it('renders a Start over button on bankruptcy/revolt when onRestart is provided', () => {
      const s = createInitialState();
      s.lossCause = 'revolt';
      renderDefeat(s, el, () => {});
      const btn = el.querySelector('.defeat-restart') as HTMLButtonElement | null;
      expect(btn).not.toBeNull();
      expect(btn!.textContent?.toLowerCase()).toContain('start');
    });

    it('calls onRestart when the Start over button is clicked', () => {
      const s = createInitialState();
      s.lossCause = 'revolt';
      let restarted = 0;
      renderDefeat(s, el, () => {
        restarted += 1;
      });
      const btn = el.querySelector('.defeat-restart') as HTMLButtonElement;
      btn.click();
      expect(restarted).toBe(1);
    });

    it('omits the Start over button when no onRestart is provided', () => {
      const s = createInitialState();
      s.lossCause = 'revolt';
      renderDefeat(s, el);
      expect(el.querySelector('.defeat-restart')).toBeNull();
    });

    it('also offers Start over from the spell-breaks epilogue', () => {
      const s = createInitialState();
      s.lossCause = 'spell-breaks';
      renderDefeat(s, el, () => {});
      const btn = el.querySelector('.defeat-restart');
      expect(btn).not.toBeNull();
    });
  });
});
