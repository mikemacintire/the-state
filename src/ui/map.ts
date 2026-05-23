import type { District, GameState } from '../sim/types';
import { MAP_REGIONS } from '../content/map-regions';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Which meter the player is colouring the map by (design doc §6.1). */
export type Overlay = 'wealth' | 'happiness' | 'awareness' | 'unrest';

/** A label and a bright base colour for each overlay's "bad-for-the-regime"
 * end. Color choices intentionally avoid the city-builder "wealth = gold =
 * good" instinct — every overlay is reading "state's concern", and the hues
 * differ so you can tell at a glance which overlay you're in. */
const OVERLAY_META: Record<Overlay, { label: string; rgb: [number, number, number] }> = {
  wealth: { label: 'Wealth', rgb: [199, 178, 123] },
  happiness: { label: 'Happiness', rgb: [201, 142, 88] },
  awareness: { label: 'Awareness', rgb: [194, 85, 85] },
  unrest: { label: 'Unrest', rgb: [212, 90, 58] },
};

const OVERLAYS: Overlay[] = ['wealth', 'happiness', 'awareness', 'unrest'];

/**
 * Render the country map: a painted background image with nine click-target
 * polygons over the top, tinted by the active overlay. An overlay-selector
 * bar sits above the SVG; clicking a polygon calls `onDistrictClick`. Fully
 * re-renders on each call.
 */
export function renderMap(
  state: GameState,
  el: HTMLElement,
  overlay: Overlay = 'wealth',
  onOverlayChange: (o: Overlay) => void = () => {},
  selectedDistrictId: string | null = null,
  onDistrictClick: (id: string) => void = () => {},
): void {
  el.innerHTML = '';

  el.appendChild(makeOverlayBar(overlay, onOverlayChange));
  el.appendChild(makeMapSvg(state, overlay, selectedDistrictId, onDistrictClick));
}

function makeOverlayBar(
  overlay: Overlay,
  onOverlayChange: (o: Overlay) => void,
): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'map-overlay-bar';
  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = 'Overlay:';
  bar.appendChild(label);
  for (const o of OVERLAYS) {
    const btn = document.createElement('button');
    btn.textContent = OVERLAY_META[o].label;
    btn.setAttribute('data-overlay', o);
    if (o === overlay) btn.classList.add('active');
    btn.addEventListener('click', () => onOverlayChange(o));
    bar.appendChild(btn);
  }
  return bar;
}

function makeMapSvg(
  state: GameState,
  overlay: Overlay,
  selectedDistrictId: string | null,
  onDistrictClick: (id: string) => void,
): SVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 800 600');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('class', 'map-svg');

  const image = document.createElementNS(SVG_NS, 'image');
  image.setAttribute('href', '/map.png');
  image.setAttribute('x', '0');
  image.setAttribute('y', '0');
  image.setAttribute('width', '800');
  image.setAttribute('height', '600');
  svg.appendChild(image);

  for (const region of MAP_REGIONS) {
    const district = state.districts.find((d) => d.id === region.districtId);
    if (!district) continue;
    const value = districtMeterValue(district, overlay);
    const fill = overlayFill(overlay, value);

    const poly = document.createElementNS(SVG_NS, 'polygon');
    let cls = 'district';
    if (selectedDistrictId === district.id) cls += ' selected';
    poly.setAttribute('class', cls);
    poly.setAttribute('points', region.points);
    poly.setAttribute('fill', fill);
    poly.setAttribute('data-district-id', district.id);
    poly.addEventListener('click', () => onDistrictClick(district.id));
    svg.appendChild(poly);
  }
  return svg;
}

function districtMeterValue(d: District, overlay: Overlay): number {
  switch (overlay) {
    case 'wealth':
      return d.wealth;
    case 'happiness':
      return d.happiness;
    case 'awareness':
      return d.awareness;
    case 'unrest':
      return d.unrest;
  }
}

/**
 * Translucent fill colour for a region tile under the given overlay. Alpha
 * scales with the meter so an empty district reads as nearly bare image and
 * a full-meter district reads as a strong wash.
 */
function overlayFill(overlay: Overlay, value: number): string {
  const [r, g, b] = OVERLAY_META[overlay].rgb;
  const clamped = Math.max(0, Math.min(100, value));
  const alpha = 0.1 + (clamped / 100) * 0.55;
  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
}
