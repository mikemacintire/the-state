import { describe, it, expect, beforeEach } from 'vitest';
import { renderMap } from './map';
import { createInitialState } from '../sim/state';

describe('renderMap', () => {
  let mapEl: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<section id="map"></section>';
    mapEl = document.getElementById('map')!;
  });

  it('renders one SVG group per district (9 total)', () => {
    const s = createInitialState();
    renderMap(s, mapEl);
    const tiles = mapEl.querySelectorAll('.district');
    expect(tiles.length).toBe(9);
  });

  it('labels each tile with the district name', () => {
    const s = createInitialState();
    renderMap(s, mapEl);
    const labels = Array.from(mapEl.querySelectorAll('text')).map((t) => t.textContent);
    expect(labels).toContain('The Capital');
    expect(labels).toContain('The Outer Wards');
  });

  it('colours a rich district differently from a poor one', () => {
    const s = createInitialState();
    renderMap(s, mapEl);
    // Capital starts at wealth 70; Outer Wards at 25.
    const capital = mapEl.querySelector('[data-district-id="capital"]') as SVGElement;
    const outer = mapEl.querySelector('[data-district-id="outerwards"]') as SVGElement;
    expect(capital.getAttribute('fill')).not.toBe(outer.getAttribute('fill'));
  });
});
