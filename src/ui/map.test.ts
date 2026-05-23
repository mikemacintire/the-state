import { describe, it, expect, beforeEach } from 'vitest';
import { renderMap } from './map';
import { createInitialState } from '../sim/state';

describe('renderMap', () => {
  let mapEl: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<section id="map"></section>';
    mapEl = document.getElementById('map')!;
  });

  it('renders one polygon per district (9 total)', () => {
    const s = createInitialState();
    renderMap(s, mapEl);
    const polys = mapEl.querySelectorAll('polygon.district');
    expect(polys.length).toBe(9);
  });

  it('renders the map background image', () => {
    const s = createInitialState();
    renderMap(s, mapEl);
    expect(mapEl.querySelector('image')).not.toBeNull();
  });

  it('attaches a data-district-id to each polygon', () => {
    const s = createInitialState();
    renderMap(s, mapEl);
    for (const d of s.districts) {
      expect(mapEl.querySelector(`[data-district-id="${d.id}"]`)).not.toBeNull();
    }
  });

  it('marks the active overlay button', () => {
    const s = createInitialState();
    renderMap(s, mapEl, 'awareness');
    const active = mapEl.querySelector('.map-overlay-bar button.active');
    expect(active?.textContent).toBe('Awareness');
  });

  it('calls onOverlayChange when an overlay button is clicked', () => {
    const s = createInitialState();
    let chosen: string | null = null;
    renderMap(s, mapEl, 'wealth', (o) => {
      chosen = o;
    });
    const btn = mapEl.querySelector(
      '.map-overlay-bar button[data-overlay="unrest"]',
    ) as HTMLButtonElement;
    btn.click();
    expect(chosen).toBe('unrest');
  });

  it('calls onDistrictClick when a polygon is clicked', () => {
    const s = createInitialState();
    let clicked: string | null = null;
    renderMap(s, mapEl, 'wealth', () => {}, null, (id) => {
      clicked = id;
    });
    const cap = mapEl.querySelector('[data-district-id="capital"]') as SVGElement;
    cap.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(clicked).toBe('capital');
  });

  it('marks the selected district polygon with the .selected class', () => {
    const s = createInitialState();
    renderMap(s, mapEl, 'wealth', () => {}, 'industrial', () => {});
    const selected = mapEl.querySelector('polygon.district.selected');
    expect(selected?.getAttribute('data-district-id')).toBe('industrial');
  });

  it('tints districts differently under the same overlay based on meter value', () => {
    const s = createInitialState();
    renderMap(s, mapEl, 'wealth');
    // Capital starts at wealth 70; Southgate Quarter (outerwards) at 25.
    const capital = mapEl.querySelector('[data-district-id="capital"]') as SVGElement;
    const outer = mapEl.querySelector('[data-district-id="outerwards"]') as SVGElement;
    expect(capital.getAttribute('fill')).not.toBe(outer.getAttribute('fill'));
  });
});
