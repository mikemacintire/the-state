import type { GameState, LossCause } from '../sim/types';
import { formatMoney } from './format';

const TITLES: Record<LossCause, string> = {
  bankruptcy: 'Bankruptcy.',
  revolt: 'Revolt.',
  'spell-breaks': 'The Spell Breaks.',
};

const EPITAPHS: Record<LossCause, string> = {
  bankruptcy: 'The treasury is empty. Propaganda goes unread; enforcers go unpaid. The state pries its own hands off the controls.',
  revolt: 'The people came for the palace. The state was overthrown.',
  'spell-breaks': 'The people stopped needing the state. They quietly carried on without it.',
};

export function renderDefeat(state: GameState, el: HTMLElement): void {
  el.innerHTML = '';
  if (!state.lossCause) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal';
  const title = document.createElement('h2');
  title.textContent = TITLES[state.lossCause];
  const epitaph = document.createElement('p');
  epitaph.textContent = EPITAPHS[state.lossCause];
  const stats = document.createElement('p');
  const years = (state.month / 12).toFixed(1);
  stats.innerHTML = `<strong>Longest Reign:</strong> ${years} years &nbsp; <strong>Biggest Haul:</strong> ${formatMoney(state.lifetimeExtraction)}`;
  modal.appendChild(title);
  modal.appendChild(epitaph);
  modal.appendChild(stats);
  overlay.appendChild(modal);
  el.appendChild(overlay);
}
