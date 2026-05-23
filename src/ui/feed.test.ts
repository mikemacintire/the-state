import { describe, it, expect, beforeEach } from 'vitest';
import { renderFeed } from './feed';
import { createInitialState } from '../sim/state';

describe('renderFeed', () => {
  let el: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<footer id="feed"></footer>';
    el = document.getElementById('feed')!;
  });

  it('shows nothing when the log is empty', () => {
    const s = createInitialState();
    renderFeed(s, el);
    expect(el.querySelectorAll('.feed-entry').length).toBe(0);
  });

  it('shows each log entry, newest first', () => {
    const s = createInitialState();
    s.eventLog.push({ month: 0, eventId: 'a', text: 'First.' });
    s.eventLog.push({ month: 1, eventId: 'b', text: 'Second.' });
    renderFeed(s, el);
    const entries = Array.from(el.querySelectorAll('.feed-entry'));
    expect(entries[0].textContent).toContain('Second.');
    expect(entries[1].textContent).toContain('First.');
  });

  it('caps the feed at 20 entries', () => {
    const s = createInitialState();
    for (let i = 0; i < 50; i++) {
      s.eventLog.push({ month: i, eventId: `e${i}`, text: `entry ${i}` });
    }
    renderFeed(s, el);
    expect(el.querySelectorAll('.feed-entry').length).toBe(20);
  });

  it('appends the chosen option when present', () => {
    const s = createInitialState();
    s.eventLog.push({ month: 0, eventId: 'x', text: 'A choice.', chosenOption: 'Suppress' });
    renderFeed(s, el);
    const entry = el.querySelector('.feed-entry');
    expect(entry?.textContent).toContain('A choice.');
    expect(entry?.textContent).toContain('Suppress');
  });
});
