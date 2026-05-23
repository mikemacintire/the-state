import { describe, it, expect, beforeEach } from 'vitest';
import { renderSpatialEvents } from './spatial-events';
import { createInitialState } from '../sim/state';
import type { Event } from '../sim/types';

function mkEvent(id: string, anchorId: string): Event {
  return {
    id,
    kind: 'ambient',
    text: `text for ${id}`,
    weight: () => 1,
    effects: () => {},
    anchor: () => anchorId,
  };
}

describe('renderSpatialEvents', () => {
  let svg: SVGElement;

  beforeEach(() => {
    document.body.innerHTML =
      '<svg class="map-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"></svg>';
    svg = document.querySelector('svg.map-svg') as unknown as SVGElement;
  });

  it('renders no callouts when the eventLog is empty', () => {
    const s = createInitialState();
    renderSpatialEvents(s, svg, []);
    expect(svg.querySelectorAll('.event-callout-host').length).toBe(0);
  });

  it('renders one callout per recent event that matches a catalog entry', () => {
    const s = createInitialState();
    s.month = 2;
    s.eventLog.push({ month: 1, eventId: 'A', text: 'first' });
    s.eventLog.push({ month: 2, eventId: 'B', text: 'second' });
    const catalog = [mkEvent('A', 'capital'), mkEvent('B', 'port')];
    renderSpatialEvents(s, svg, catalog);
    expect(svg.querySelectorAll('.event-callout-host').length).toBe(2);
  });

  it('skips events whose id is not in the catalog', () => {
    const s = createInitialState();
    s.month = 1;
    s.eventLog.push({ month: 1, eventId: 'unknown', text: 'mystery' });
    renderSpatialEvents(s, svg, []);
    expect(svg.querySelectorAll('.event-callout-host').length).toBe(0);
  });

  it('positions the callout near the anchor district centroid', () => {
    const s = createInitialState();
    s.month = 1;
    s.eventLog.push({ month: 1, eventId: 'A', text: 'first' });
    renderSpatialEvents(s, svg, [mkEvent('A', 'capital')]);
    const fo = svg.querySelector('.event-callout-host') as SVGElement;
    // capital centroid is around (352.5, 240) — the callout box should
    // sit within a reasonable window of that point regardless of internal
    // anchor offset (left/top corner of the box, not the centroid itself).
    const x = parseFloat(fo.getAttribute('x') ?? '0');
    const y = parseFloat(fo.getAttribute('y') ?? '0');
    expect(x).toBeGreaterThan(150);
    expect(x).toBeLessThan(400);
    expect(y).toBeGreaterThan(130);
    expect(y).toBeLessThan(330);
  });

  it('drops callouts whose event is older than the fade window', () => {
    const s = createInitialState();
    s.month = 50;
    s.eventLog.push({ month: 1, eventId: 'A', text: 'ancient' });
    renderSpatialEvents(s, svg, [mkEvent('A', 'capital')]);
    expect(svg.querySelectorAll('.event-callout-host').length).toBe(0);
  });

  it('shows fresh callouts at full opacity and older ones faded', () => {
    const s = createInitialState();
    s.month = 4;
    s.eventLog.push({ month: 1, eventId: 'aging', text: 'older' });
    s.eventLog.push({ month: 4, eventId: 'fresh', text: 'just now' });
    const catalog = [mkEvent('aging', 'port'), mkEvent('fresh', 'capital')];
    renderSpatialEvents(s, svg, catalog);
    const callouts = Array.from(
      svg.querySelectorAll('.event-callout-host'),
    ) as SVGElement[];
    expect(callouts.length).toBe(2);
    const fresh = callouts.find((c) => (c.textContent ?? '').includes('just now'))!;
    const aging = callouts.find((c) => (c.textContent ?? '').includes('older'))!;
    const freshOpacity = parseFloat(fresh.getAttribute('opacity') ?? '1');
    const agingOpacity = parseFloat(aging.getAttribute('opacity') ?? '1');
    expect(freshOpacity).toBe(1);
    expect(agingOpacity).toBeLessThan(1);
    expect(agingOpacity).toBeGreaterThan(0);
  });

  it('caps the number of concurrent callouts so the map does not get swamped', () => {
    const s = createInitialState();
    s.month = 5;
    const catalog: Event[] = [];
    for (let i = 0; i < 20; i++) {
      s.eventLog.push({ month: 5, eventId: `e${i}`, text: `text ${i}` });
      catalog.push(mkEvent(`e${i}`, 'capital'));
    }
    renderSpatialEvents(s, svg, catalog);
    expect(svg.querySelectorAll('.event-callout-host').length).toBeLessThanOrEqual(6);
  });

  it('shows the most recent events when capped', () => {
    const s = createInitialState();
    s.month = 5;
    const catalog: Event[] = [];
    for (let i = 0; i < 10; i++) {
      s.eventLog.push({ month: 5, eventId: `e${i}`, text: `text ${i}` });
      catalog.push(mkEvent(`e${i}`, 'capital'));
    }
    renderSpatialEvents(s, svg, catalog);
    const hosts = Array.from(svg.querySelectorAll('.event-callout-host'));
    // The newest entry (e9) should always be present.
    expect(hosts.some((h) => (h.textContent ?? '').includes('text 9'))).toBe(true);
    // The oldest entry (e0) should not be present once we've capped.
    expect(hosts.some((h) => (h.textContent ?? '').includes('text 0'))).toBe(false);
  });
});
