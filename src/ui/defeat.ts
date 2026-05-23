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

/**
 * Render the end-of-run screen. Bankruptcy and revolt freeze with a full
 * `.defeat-overlay` backdrop and a centred `.defeat-modal` panel. Spell-
 * Breaks renders the translucent `.epilogue-banner` so the freed country
 * keeps animating underneath. When `onRestart` is provided, both surfaces
 * include a Start over button that calls it.
 */
export function renderDefeat(
  state: GameState,
  el: HTMLElement,
  onRestart?: () => void,
): void {
  el.innerHTML = '';
  if (!state.lossCause) return;
  if (state.lossCause === 'spell-breaks') {
    renderEpilogue(state, el, onRestart);
    return;
  }
  renderDefeatModal(state, el, onRestart);
}

function renderDefeatModal(state: GameState, el: HTMLElement, onRestart?: () => void): void {
  const cause = state.lossCause as LossCause;
  const overlay = document.createElement('div');
  overlay.className = 'defeat-overlay';
  const modal = document.createElement('div');
  modal.className = 'defeat-modal';
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
  if (onRestart) modal.appendChild(makeRestartButton(onRestart));
  overlay.appendChild(modal);
  el.appendChild(overlay);
}

function renderEpilogue(state: GameState, el: HTMLElement, onRestart?: () => void): void {
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
  if (onRestart) banner.appendChild(makeRestartButton(onRestart));
  el.appendChild(banner);
}

function makeRestartButton(onRestart: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'defeat-restart';
  btn.textContent = 'Start over';
  btn.addEventListener('click', onRestart);
  return btn;
}
