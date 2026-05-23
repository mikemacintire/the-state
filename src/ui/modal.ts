import type { GameState } from '../sim/types';

/**
 * Render (or clear) the crisis modal. Shows the head of `pendingCrises`; the
 * caller is responsible for pausing the game loop while pendingCrises is
 * non-empty.
 */
export function renderModal(
  state: GameState,
  el: HTMLElement,
  onChoose: (choiceIdx: number) => void,
): void {
  el.innerHTML = '';
  const crisis = state.pendingCrises[0];
  if (!crisis) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
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
  overlay.appendChild(modal);
  el.appendChild(overlay);
}
