import { describe, it, expect, beforeEach } from 'vitest';
import { renderModal } from './modal';
import { createInitialState } from '../sim/state';

describe('renderModal', () => {
  let el: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-root"></div>';
    el = document.getElementById('modal-root')!;
  });

  it('renders nothing when pendingCrises is empty', () => {
    const s = createInitialState();
    renderModal(s, el, () => {});
    expect(el.children.length).toBe(0);
  });

  it('renders the crisis text and one button per choice', () => {
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
    renderModal(s, el, () => {});
    expect(el.textContent).toContain('archivist');
    const buttons = el.querySelectorAll('.choices button');
    expect(buttons.length).toBe(3);
    expect(buttons[0].textContent).toBe('Suppress');
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
    renderModal(s, el, (idx) => { chosen = idx; });
    const buttons = el.querySelectorAll('.choices button');
    (buttons[1] as HTMLElement).click();
    expect(chosen).toBe(1);
  });
});
