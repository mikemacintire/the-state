import { createInitialState } from '../sim/state';
import {
  setTaxRate,
  printMoney,
  setPropagandaBudget,
  setEducationLevel,
  doRepression,
  spawnFearOp,
} from '../sim/levers';
import { resolveCrisis } from '../sim/events';
import { Loop, type Speed } from './loop';
import { saveState, loadState, clearSave } from './save';
import { renderHud } from '../ui/hud';
import { renderMap } from '../ui/map';
import { renderDashboard } from '../ui/dashboard';
import { renderFeed } from '../ui/feed';
import { renderModal } from '../ui/modal';
import { renderDefeat } from '../ui/defeat';

function bootstrap(): void {
  const hudEl = document.getElementById('hud')!;
  const mapEl = document.getElementById('map')!;
  const dashboardEl = document.getElementById('dashboard')!;
  const feedEl = document.getElementById('feed')!;
  const modalEl = document.getElementById('modal-root')!;
  const defeatEl = document.getElementById('defeat-root')!;

  // If a save exists, offer to resume it — for v1, always auto-resume.
  const state = loadState() ?? createInitialState(Date.now());
  let speed: Speed = 1;

  const loop = new Loop(state, () => {
    render();
    // autosave every 12 ticks (one in-game year)
    if (state.month % 12 === 0) saveState(state);
  });

  function render(): void {
    renderHud(state, hudEl, speed, (n) => {
      speed = n;
      loop.setSpeed(n);
      render();
    });
    renderMap(state, mapEl);
    renderDashboard(state, dashboardEl, {
      onTaxRate: (n) => { setTaxRate(state, n); render(); },
      onPrint: (n) => { printMoney(state, n); render(); },
      onPropaganda: (n) => { setPropagandaBudget(state, n); render(); },
      onEducation: (n) => { setEducationLevel(state, n); render(); },
      onRepression: () => { doRepression(state); render(); },
      onFearOp: (n) => { spawnFearOp(state, n); render(); },
    });
    renderFeed(state, feedEl);
    renderModal(state, modalEl, (idx) => {
      resolveCrisis(state, idx);
      render();
    });
    renderDefeat(state, defeatEl);
    if (state.lossCause) {
      // Final autosave on game over, then keep the save so the player can
      // see the defeat screen next session if they restart.
      saveState(state);
    }
  }

  render();
  loop.setSpeed(speed);
  loop.start();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
}

// expose a tiny dev affordance to start over in DevTools
declare global {
  interface Window {
    theStateReset?: () => void;
  }
}
if (typeof window !== 'undefined') {
  window.theStateReset = () => {
    clearSave();
    location.reload();
  };
}
