import type { Event, GameState } from '../sim/types';
import { centroidOf } from '../content/map-regions';

const SVG_NS = 'http://www.w3.org/2000/svg';
const VIEWBOX_W = 800;
const VIEWBOX_H = 600;
const MODAL_W = 320;
const MODAL_H = 220;

/**
 * Render the floating crisis modal inside the map SVG as a foreignObject,
 * anchored to the originating event's district centroid (clamped so the
 * box never overflows the viewBox). No full-screen backdrop — the rest
 * of the map stays visible and interactive while the choice is open.
 * The caller still pauses the game loop while `state.pendingCrises` is
 * non-empty; only the choice UI moves to live near its source.
 *
 * Replaces any previously-rendered modal on the same SVG. Renders the
 * head of `state.pendingCrises`; if empty, simply clears.
 */
export function renderModal(
  state: GameState,
  svg: SVGElement,
  catalog: readonly Event[],
  onChoose: (choiceIdx: number) => void,
): void {
  svg.querySelectorAll('.modal-host').forEach((el) => el.remove());

  const crisis = state.pendingCrises[0];
  if (!crisis) return;

  // Find the anchor centroid via the catalog. Fall back to the map centre
  // if either the catalog entry or its anchor district is missing.
  const event = catalog.find((e) => e.id === crisis.eventId);
  const districtId = event?.anchor?.(state);
  const centroid =
    (districtId ? centroidOf(districtId) : null) ?? { x: VIEWBOX_W / 2, y: VIEWBOX_H / 2 };

  // Centre the modal on the centroid, then clamp to keep it on the map.
  let x = centroid.x - MODAL_W / 2;
  let y = centroid.y - MODAL_H / 2;
  x = Math.max(0, Math.min(x, VIEWBOX_W - MODAL_W));
  y = Math.max(0, Math.min(y, VIEWBOX_H - MODAL_H));

  const fo = document.createElementNS(SVG_NS, 'foreignObject');
  fo.setAttribute('class', 'modal-host');
  fo.setAttribute('x', String(x));
  fo.setAttribute('y', String(y));
  fo.setAttribute('width', String(MODAL_W));
  fo.setAttribute('height', String(MODAL_H));

  const modal = document.createElement('div');
  modal.className = 'modal';
  const title = document.createElement('h2');
  title.textContent = 'A decision';
  const body = document.createElement('p');
  body.textContent = crisis.text;
  const choices = document.createElement('div');
  choices.className = 'choices';
  crisis.choices.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.textContent = c.label;
    btn.addEventListener('click', () => onChoose(i));
    choices.appendChild(btn);
  });
  modal.appendChild(title);
  modal.appendChild(body);
  modal.appendChild(choices);
  fo.appendChild(modal);
  svg.appendChild(fo);
}
