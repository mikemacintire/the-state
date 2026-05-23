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
import { updateAggregates } from '../sim/aggregates';
import { Loop, type Speed } from './loop';
import { saveState, loadState, clearSave } from './save';
import { renderHud, type HudDeltas } from '../ui/hud';
import { renderMap, type Overlay } from '../ui/map';
import { renderDistrictDetail } from '../ui/district-detail';
import { renderDashboard } from '../ui/dashboard';
import { renderModal } from '../ui/modal';
import { renderDefeat } from '../ui/defeat';
import { renderSpatialEvents } from '../ui/spatial-events';
import { EVENT_CATALOG } from '../content/event-catalog';

function bootstrap(): void {
  const hudEl = document.getElementById('hud')!;
  const mapEl = document.getElementById('map')!;
  const detailEl = document.getElementById('district-detail-root')!;
  const dashboardEl = document.getElementById('dashboard')!;
  const defeatEl = document.getElementById('defeat-root')!;

  // If a save exists, offer to resume it — for v1, always auto-resume.
  const state = loadState() ?? createInitialState(Date.now());

  // Compute initial aggregates so the first-tick HUD delta isn't a misleading
  // jump from 0 (the createInitialState placeholder) to ~45 (the actual
  // pop-weighted prosperity). For the spell-breaks epilogue, the loaded
  // values are already correct — recomputing is harmless.
  updateAggregates(state);

  let speed: Speed = 1;
  let overlay: Overlay = 'none';
  let selectedDistrictId: string | null = null;

  // Trajectory tracking: compare each tick to the previous tick's reading so
  // the HUD can show "+0.6/mo" + arrow alongside the value. Lever-action
  // renders reuse the last tick's deltas (a lever click isn't a month).
  let prevUnrest = state.nationalUnrest;
  let prevProsperity = state.nationalProsperity;
  let prevTreasury = state.treasury;
  let lastDeltas: HudDeltas | undefined;

  const loop = new Loop(state, () => {
    lastDeltas = {
      unrest: state.nationalUnrest - prevUnrest,
      prosperity: state.nationalProsperity - prevProsperity,
      treasury: state.treasury - prevTreasury,
    };
    prevUnrest = state.nationalUnrest;
    prevProsperity = state.nationalProsperity;
    prevTreasury = state.treasury;
    render();
    // autosave every 12 ticks (one in-game year)
    if (state.month % 12 === 0) saveState(state);
  });

  function render(): void {
    renderHud(
      state,
      hudEl,
      speed,
      (n) => {
        speed = n;
        loop.setSpeed(n);
        render();
      },
      lastDeltas,
    );
    renderMap(
      state,
      mapEl,
      overlay,
      (o) => {
        overlay = o;
        render();
      },
      selectedDistrictId,
      (id) => {
        selectedDistrictId = id === selectedDistrictId ? null : id;
        render();
      },
    );
    const svg = mapEl.querySelector('svg.map-svg');
    if (svg) {
      renderSpatialEvents(state, svg as unknown as SVGElement, EVENT_CATALOG);
    }
    const selectedDistrict =
      selectedDistrictId !== null
        ? state.districts.find((d) => d.id === selectedDistrictId) ?? null
        : null;
    renderDistrictDetail(selectedDistrict, detailEl, () => {
      selectedDistrictId = null;
      render();
    });
    // Skip re-rendering the dashboard if the user is mid-interaction with one
    // of its inputs — a full innerHTML wipe would destroy the focused element
    // and break drag/type. The dashboard re-renders on the next tick.
    if (!dashboardEl.contains(document.activeElement)) {
      renderDashboard(state, dashboardEl, {
        onTaxRate: (n) => { setTaxRate(state, n); render(); },
        onPrint: (n) => { printMoney(state, n); render(); },
        onPropaganda: (n) => { setPropagandaBudget(state, n); render(); },
        onEducation: (n) => { setEducationLevel(state, n); render(); },
        onRepression: () => { doRepression(state); render(); },
        onFearOp: (n) => { spawnFearOp(state, n); render(); },
      });
    }
    if (svg) {
      renderModal(state, svg as unknown as SVGElement, EVENT_CATALOG, (idx) => {
        resolveCrisis(state, idx);
        render();
      });
    }
    renderDefeat(state, defeatEl, () => {
      clearSave();
      location.reload();
    });
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
