import type { District, GameState } from '../sim/types';

const SVG_NS = 'http://www.w3.org/2000/svg';
const TILE = 120;
const PAD = 8;

/** Linear interpolation between two RGB colours by t in [0,1]. */
function lerpColor(t: number): string {
  // Poor → desaturated brown; Wealthy → muted gold (design doc §6.3 palette family).
  const poor = [60, 50, 40];
  const rich = [199, 178, 123];
  const c = poor.map((p, i) => Math.round(p + (rich[i] - p) * Math.max(0, Math.min(1, t))));
  return `rgb(${c.join(', ')})`;
}

/** Render the 9-district map as an SVG. Re-renders the whole subtree each call. */
export function renderMap(state: GameState, el: HTMLElement): void {
  el.innerHTML = '';
  const svg = document.createElementNS(SVG_NS, 'svg');
  const cols = 3;
  const rows = 3;
  svg.setAttribute('width', String(cols * (TILE + PAD) + PAD));
  svg.setAttribute('height', String(rows * (TILE + PAD) + PAD));

  state.districts.forEach((d, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = PAD + col * (TILE + PAD);
    const y = PAD + row * (TILE + PAD);
    const fill = lerpColor(d.wealth / 100);
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('data-district-id', d.id);
    // Mirror the fill on the group so tests querying by data attribute can read it.
    g.setAttribute('fill', fill);
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('class', 'district');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', String(TILE));
    rect.setAttribute('height', String(TILE));
    rect.setAttribute('fill', fill);
    g.appendChild(rect);
    g.appendChild(districtLabel(d, x + TILE / 2, y + TILE / 2));
    svg.appendChild(g);
  });
  el.appendChild(svg);
}

function districtLabel(d: District, x: number, y: number): SVGTextElement {
  const t = document.createElementNS(SVG_NS, 'text');
  t.setAttribute('x', String(x));
  t.setAttribute('y', String(y));
  t.setAttribute('text-anchor', 'middle');
  t.setAttribute('dominant-baseline', 'middle');
  t.setAttribute('fill', '#d8dde6');
  t.setAttribute('font-size', '12');
  t.setAttribute('font-family', 'Inter, sans-serif');
  t.textContent = d.name;
  return t;
}
