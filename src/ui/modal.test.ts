import { describe, it, expect, beforeEach } from 'vitest';
import { renderModal } from './modal';
import { createInitialState } from '../sim/state';
import type { Event } from '../sim/types';

function mkEvent(id: string, anchorId: string): Event {
  return {
    id,
    kind: 'crisis',
    text: `text for ${id}`,
    weight: () => 1,
    effects: () => {},
    anchor: () => anchorId,
  };
}

describe('renderModal', () => {
  let svg: SVGElement;

  beforeEach(() => {
    document.body.innerHTML =
      '<svg class="map-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"></svg>';
    svg = document.querySelector('svg.map-svg') as unknown as SVGElement;
  });

  it('renders nothing when pendingCrises is empty', () => {
    const s = createInitialState();
    renderModal(s, svg, [], () => {});
    expect(svg.querySelectorAll('.modal-host').length).toBe(0);
  });

  it('renders the crisis text and one button per choice inside the SVG', () => {
    const s = createInitialState();
    s.pendingCrises.push({
      eventId: 'leak',
      text: 'An archivist has leaked documents.',
      choices: [
        { label: 'Suppress', effects: () => {} },
        { label: 'Discredit', effects: () => {} },
        { label: 'Let it run', effects: () => {} },
      ],
    });
    renderModal(s, svg, [mkEvent('leak', 'capital')], () => {});
    const host = svg.querySelector('.modal-host');
    expect(host).not.toBeNull();
    expect(host!.textContent).toContain('archivist');
    const buttons = host!.querySelectorAll('.choices button');
    expect(buttons.length).toBe(3);
    expect(buttons[0].textContent).toBe('Suppress');
  });

  it('positions the modal near the anchor district centroid', () => {
    const s = createInitialState();
    s.pendingCrises.push({
      eventId: 'port-event',
      text: 'Something at the port.',
      choices: [{ label: 'A', effects: () => {} }],
    });
    renderModal(s, svg, [mkEvent('port-event', 'port')], () => {});
    const host = svg.querySelector('.modal-host') as SVGElement;
    const x = parseFloat(host.getAttribute('x') ?? '0');
    const y = parseFloat(host.getAttribute('y') ?? '0');
    // port centroid ≈ (642.5, 275). Modal box centred on it would put x in
    // the right half of the map. After clamp it may shift left to stay in
    // bounds, but it should never be in the far-left.
    expect(x).toBeGreaterThan(200);
    expect(y).toBeGreaterThan(60);
  });

  it('clamps the modal so it never overflows the viewBox', () => {
    const s = createInitialState();
    s.pendingCrises.push({
      eventId: 'corner-event',
      text: 'Edge case.',
      choices: [{ label: 'A', effects: () => {} }],
    });
    // Anchor to 'frontier' whose centroid sits near y=100 (top of map);
    // the modal would otherwise drop below 0 if it tried to centre vertically.
    renderModal(s, svg, [mkEvent('corner-event', 'frontier')], () => {});
    const host = svg.querySelector('.modal-host') as SVGElement;
    const x = parseFloat(host.getAttribute('x') ?? '0');
    const y = parseFloat(host.getAttribute('y') ?? '0');
    const w = parseFloat(host.getAttribute('width') ?? '0');
    const h = parseFloat(host.getAttribute('height') ?? '0');
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(x + w).toBeLessThanOrEqual(800);
    expect(y + h).toBeLessThanOrEqual(600);
  });

  it('invokes onChoose with the clicked choice index', () => {
    const s = createInitialState();
    s.pendingCrises.push({
      eventId: 'x',
      text: '...',
      choices: [
        { label: 'A', effects: () => {} },
        { label: 'B', effects: () => {} },
      ],
    });
    let chosen = -1;
    renderModal(s, svg, [mkEvent('x', 'capital')], (idx) => {
      chosen = idx;
    });
    const buttons = svg.querySelectorAll('.modal-host .choices button');
    (buttons[1] as HTMLElement).click();
    expect(chosen).toBe(1);
  });

  it('does not paint a full-screen backdrop overlay', () => {
    const s = createInitialState();
    s.pendingCrises.push({
      eventId: 'no-bg',
      text: 'Floating only.',
      choices: [{ label: 'A', effects: () => {} }],
    });
    renderModal(s, svg, [mkEvent('no-bg', 'capital')], () => {});
    expect(svg.querySelector('.modal-overlay')).toBeNull();
  });

  it('falls back to a sensible position if the anchor district is unknown', () => {
    const s = createInitialState();
    s.pendingCrises.push({
      eventId: 'orphan',
      text: 'No anchor known.',
      choices: [{ label: 'A', effects: () => {} }],
    });
    // catalog match exists but anchor returns a bogus id
    const ev: Event = { ...mkEvent('orphan', 'capital'), anchor: () => 'atlantis' };
    renderModal(s, svg, [ev], () => {});
    const host = svg.querySelector('.modal-host') as SVGElement;
    expect(host).not.toBeNull();
    // Still rendered, just centred.
  });
});
