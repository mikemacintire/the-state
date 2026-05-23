import { describe, it, expect, beforeEach } from 'vitest';
import { renderDistrictDetail } from './district-detail';
import type { District } from '../sim/types';

describe('renderDistrictDetail', () => {
  let el: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="district-detail-root"></div>';
    el = document.getElementById('district-detail-root')!;
  });

  it('renders nothing when no district is selected', () => {
    renderDistrictDetail(null, el, () => {});
    expect(el.children.length).toBe(0);
  });

  it('shows the district name and all four meter rows when selected', () => {
    const d: District = {
      id: 'capital',
      name: 'The Capital',
      population: 1200,
      wealth: 70,
      happiness: 65,
      awareness: 25,
      unrest: 5,
    };
    renderDistrictDetail(d, el, () => {});
    expect(el.textContent).toContain('The Capital');
    expect(el.textContent).toContain('1,200');
    expect(el.textContent).toContain('Wealth');
    expect(el.textContent).toContain('Happiness');
    expect(el.textContent).toContain('Awareness');
    expect(el.textContent).toContain('Unrest');
    expect(el.querySelectorAll('.district-meter').length).toBe(4);
  });

  it('the close button calls onClose', () => {
    const d: District = {
      id: 'x',
      name: 'X',
      population: 100,
      wealth: 50,
      happiness: 50,
      awareness: 50,
      unrest: 50,
    };
    let closed = false;
    renderDistrictDetail(d, el, () => {
      closed = true;
    });
    const close = el.querySelector('.district-detail-close') as HTMLButtonElement;
    close.click();
    expect(closed).toBe(true);
  });
});
