import type { GameState, LossCause } from '../sim/types';
import { formatMoney } from './format';

const TITLES: Record<LossCause, string> = {
  bankruptcy: 'Bankruptcy.',
  revolt: 'Revolt.',
  'spell-breaks': 'The Spell Breaks.',
};

const EPITAPHS: Record<LossCause, string> = {
  bankruptcy: 'The treasury went empty. Propaganda fell silent. The enforcers walked away. The people made their move.',
  revolt: 'The people came for the palace. The state was overthrown.',
  'spell-breaks': 'The people stopped needing the state. They are quietly carrying on without it.',
};

export function renderDefeat(state: GameState, el: HTMLElement): void {
  el.innerHTML = '';
  if (!state.lossCause) return;
  // The spell-breaks epilogue is non-blocking: a translucent banner so the
  // player can watch the map and HUD continue to update as the freed country
  // flourishes. Bankruptcy and revolt freeze with a full modal.
  if (state.lossCause === 'spell-breaks') {
    renderEpilogue(state, el);
    return;
  }
  renderDefeatModal(state, el);
}

function renderDefeatModal(state: GameState, el: HTMLElement): void {
  const cause = state.lossCause as LossCause;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal';
  const title = document.createElement('h2');
  title.textContent = TITLES[cause];
  const epitaph = document.createElement('p');
  epitaph.textContent = EPITAPHS[cause];
  const stats = document.createElement('p');
  const years = (state.month / 12).toFixed(1);
  stats.innerHTML = `<strong>Longest Reign:</strong> ${years} years &nbsp; <strong>Biggest Haul:</strong> ${formatMoney(state.lifetimeExtraction)}`;
  modal.appendChild(title);
  modal.appendChild(epitaph);
  modal.appendChild(stats);
  overlay.appendChild(modal);
  el.appendChild(overlay);
}

function renderEpilogue(state: GameState, el: HTMLElement): void {
  const banner = document.createElement('div');
  banner.className = 'epilogue-banner';
  const title = document.createElement('h2');
  title.textContent = TITLES['spell-breaks'];
  const epitaph = document.createElement('p');
  epitaph.textContent = EPITAPHS['spell-breaks'];
  const stats = document.createElement('p');
  const years = (state.month / 12).toFixed(1);
  stats.innerHTML = `<strong>Reigned:</strong> ${years} years &nbsp; <strong>Extracted:</strong> ${formatMoney(state.lifetimeExtraction)}`;
  const watch = document.createElement('p');
  watch.className = 'epilogue-watch';
  watch.textContent = 'Watch what they do on their own.';
  banner.appendChild(title);
  banner.appendChild(epitaph);
  banner.appendChild(stats);
  banner.appendChild(watch);
  el.appendChild(banner);
}
