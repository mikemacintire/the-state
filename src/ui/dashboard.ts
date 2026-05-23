import type { GameState } from '../sim/types';

export interface DashboardHandlers {
  onTaxRate: (rate: number) => void;
  onPrint: (amount: number) => void;
  onPropaganda: (budget: number) => void;
  onEducation: (level: number) => void;
  onRepression: () => void;
  onFearOp: (units: number) => void;
}

/**
 * Render the six-lever dashboard (design doc §4). Each control captures its
 * own input element and routes through the matching handler. Re-renders the
 * whole subtree each call.
 */
export function renderDashboard(
  state: GameState,
  el: HTMLElement,
  h: DashboardHandlers,
): void {
  el.innerHTML = '';

  el.appendChild(
    leverSlider('Tax rate', 'tax', 0, 1, 0.01, state.taxRate, (n) => h.onTaxRate(n)),
  );

  el.appendChild(
    leverInput('Print money ($)', 'print', 'Print', (n) => h.onPrint(n)),
  );

  el.appendChild(
    leverInput(
      'Propaganda budget ($/mo)',
      'propaganda',
      'Set',
      (n) => h.onPropaganda(n),
      state.propagandaBudget,
    ),
  );

  el.appendChild(
    leverSlider(
      'Education monopoly',
      'education',
      0,
      1,
      0.05,
      state.educationLevel,
      (n) => h.onEducation(n),
    ),
  );

  el.appendChild(leverButton('Crack down', 'repression', () => h.onRepression()));

  el.appendChild(
    leverInput('Manufacture fear (units)', 'fearop', 'Spawn', (n) => h.onFearOp(n)),
  );
}

function leverSlider(
  title: string,
  id: string,
  min: number,
  max: number,
  step: number,
  initial: number,
  on: (n: number) => void,
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'lever';
  const h = document.createElement('h3');
  h.textContent = title;
  wrap.appendChild(h);
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.dataset.lever = id;
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(initial);
  const readout = document.createElement('div');
  readout.style.fontFamily = 'var(--mono)';
  readout.style.fontSize = '12px';
  readout.style.color = 'var(--fg-dim)';
  readout.style.marginTop = '4px';
  readout.textContent = slider.value;
  slider.addEventListener('input', () => {
    readout.textContent = slider.value;
    on(Number(slider.value));
  });
  wrap.appendChild(slider);
  wrap.appendChild(readout);
  return wrap;
}

function leverInput(
  title: string,
  id: string,
  buttonLabel: string,
  on: (n: number) => void,
  initial?: number,
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'lever';
  const h = document.createElement('h3');
  h.textContent = title;
  wrap.appendChild(h);
  const input = document.createElement('input');
  input.type = 'number';
  input.dataset.lever = id;
  input.min = '0';
  input.value = initial !== undefined ? String(initial) : '';
  wrap.appendChild(input);
  const btn = document.createElement('button');
  btn.textContent = buttonLabel;
  btn.style.marginTop = '6px';
  btn.addEventListener('click', () => {
    const n = Number(input.value);
    if (!Number.isFinite(n) || n < 0) return;
    on(n);
  });
  wrap.appendChild(btn);
  return wrap;
}

function leverButton(title: string, id: string, on: () => void): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'lever';
  const h = document.createElement('h3');
  h.textContent = title;
  wrap.appendChild(h);
  const btn = document.createElement('button');
  btn.textContent = 'Deploy force';
  btn.dataset.lever = id;
  btn.addEventListener('click', () => on());
  wrap.appendChild(btn);
  return wrap;
}
