import type { District } from '../sim/types';

/**
 * Floating panel showing one district's meters in detail (design doc §6.1).
 * Pass `null` to hide the panel; otherwise render the meters with simple
 * progress bars. Closing calls `onClose`.
 */
export function renderDistrictDetail(
  district: District | null,
  el: HTMLElement,
  onClose: () => void,
): void {
  el.innerHTML = '';
  if (!district) return;

  const panel = document.createElement('div');
  panel.className = 'district-detail';

  const header = document.createElement('div');
  header.className = 'district-detail-header';
  const title = document.createElement('h3');
  title.textContent = district.name;
  header.appendChild(title);
  const close = document.createElement('button');
  close.className = 'district-detail-close';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Close');
  close.addEventListener('click', onClose);
  header.appendChild(close);
  panel.appendChild(header);

  const pop = document.createElement('p');
  pop.className = 'district-detail-pop';
  pop.innerHTML = `<span class="label">Population</span><span class="value">${district.population.toLocaleString('en-US')}</span>`;
  panel.appendChild(pop);

  const meters = document.createElement('div');
  meters.className = 'district-detail-meters';
  meters.appendChild(meterRow('Wealth', district.wealth));
  meters.appendChild(meterRow('Happiness', district.happiness));
  meters.appendChild(meterRow('Awareness', district.awareness));
  meters.appendChild(meterRow('Unrest', district.unrest));
  panel.appendChild(meters);

  el.appendChild(panel);
}

function meterRow(label: string, value: number): HTMLElement {
  const row = document.createElement('div');
  row.className = 'district-meter';
  const lbl = document.createElement('span');
  lbl.className = 'label';
  lbl.textContent = label;
  const val = document.createElement('span');
  val.className = 'value';
  val.textContent = `${Math.round(value)}/100`;
  const bar = document.createElement('div');
  bar.className = 'bar';
  const fill = document.createElement('div');
  fill.className = 'fill';
  fill.style.width = `${Math.max(0, Math.min(100, value))}%`;
  bar.appendChild(fill);
  row.appendChild(lbl);
  row.appendChild(val);
  row.appendChild(bar);
  return row;
}
