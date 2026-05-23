import type { Event, GameState } from '../sim/types';
import { centroidOf } from '../content/map-regions';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Months an event stays on the map after firing before it fully fades. */
const FADE_MONTHS = 4;
/** Maximum number of callouts visible at once — keeps the map from swamping. */
const MAX_VISIBLE = 6;

const CALLOUT_WIDTH = 220;
const CALLOUT_HEIGHT = 70;

/**
 * Render the recent event log as callouts on the map SVG, each anchored to
 * the originating event's district centroid. Replaces any previously-rendered
 * callouts on the same SVG. Older entries are dimmer; entries older than
 * `FADE_MONTHS` are dropped entirely; at most `MAX_VISIBLE` are shown, with
 * priority going to the newest. Events whose id is not in the catalog (or
 * whose anchor returns an unknown district) are silently skipped.
 */
export function renderSpatialEvents(
  state: GameState,
  svg: SVGElement,
  catalog: readonly Event[],
): void {
  // Clear any prior callouts (caller may re-render every tick).
  svg.querySelectorAll('.event-callout-host').forEach((el) => el.remove());

  const fresh = state.eventLog
    .filter((entry) => state.month - entry.month <= FADE_MONTHS)
    .slice(-MAX_VISIBLE);

  for (const entry of fresh) {
    const event = catalog.find((e) => e.id === entry.eventId);
    if (!event?.anchor) continue;
    const districtId = event.anchor(state);
    const centroid = centroidOf(districtId);
    if (!centroid) continue;

    const age = state.month - entry.month;
    const opacity = Math.max(0, 1 - age / FADE_MONTHS);

    const fo = document.createElementNS(SVG_NS, 'foreignObject');
    fo.setAttribute('class', 'event-callout-host');
    fo.setAttribute('x', String(centroid.x - CALLOUT_WIDTH / 2));
    fo.setAttribute('y', String(centroid.y - CALLOUT_HEIGHT / 2));
    fo.setAttribute('width', String(CALLOUT_WIDTH));
    fo.setAttribute('height', String(CALLOUT_HEIGHT));
    fo.setAttribute('opacity', opacity.toFixed(2));

    const div = document.createElement('div');
    div.className = 'event-callout';
    const choice = entry.chosenOption ? ` — ${entry.chosenOption}` : '';
    div.textContent = `${entry.text}${choice}`;
    fo.appendChild(div);
    svg.appendChild(fo);
  }
}
