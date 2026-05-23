import type { GameState } from '../sim/types';
import { formatMonth } from './format';

const MAX_ENTRIES = 20;

/** Render the last MAX_ENTRIES events, newest first. */
export function renderFeed(state: GameState, el: HTMLElement): void {
  el.innerHTML = '';
  const entries = state.eventLog.slice(-MAX_ENTRIES).reverse();
  for (const e of entries) {
    const node = document.createElement('div');
    node.className = 'feed-entry';
    const time = `[${formatMonth(e.month)}] `;
    const choice = e.chosenOption ? ` — ${e.chosenOption}` : '';
    node.textContent = `${time}${e.text}${choice}`;
    el.appendChild(node);
  }
}
