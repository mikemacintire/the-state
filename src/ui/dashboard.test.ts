import { describe, it, expect, beforeEach } from 'vitest';
import { renderDashboard } from './dashboard';
import { createInitialState } from '../sim/state';

describe('renderDashboard', () => {
  let el: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<aside id="dashboard"></aside>';
    el = document.getElementById('dashboard')!;
  });

  it('renders one control per lever (six total)', () => {
    renderDashboard(createInitialState(), el, {
      onTaxRate: () => {},
      onPrint: () => {},
      onPropaganda: () => {},
      onEducation: () => {},
      onRepression: () => {},
      onFearOp: () => {},
    });
    const levers = el.querySelectorAll('.lever');
    expect(levers.length).toBe(6);
  });

  it('routes the tax slider to onTaxRate', () => {
    let lastRate = -1;
    renderDashboard(createInitialState(), el, {
      onTaxRate: (n) => { lastRate = n; },
      onPrint: () => {},
      onPropaganda: () => {},
      onEducation: () => {},
      onRepression: () => {},
      onFearOp: () => {},
    });
    const slider = el.querySelector('input[data-lever="tax"]') as HTMLInputElement;
    slider.value = '0.45';
    slider.dispatchEvent(new Event('input'));
    expect(lastRate).toBeCloseTo(0.45);
  });

  it('routes the repression button to onRepression', () => {
    let pressed = 0;
    renderDashboard(createInitialState(), el, {
      onTaxRate: () => {},
      onPrint: () => {},
      onPropaganda: () => {},
      onEducation: () => {},
      onRepression: () => { pressed++; },
      onFearOp: () => {},
    });
    const btn = el.querySelector('button[data-lever="repression"]') as HTMLButtonElement;
    btn.click();
    expect(pressed).toBe(1);
  });
});
