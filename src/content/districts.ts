import type { District } from '../sim/types';

/** The nine starting districts — varied so the map has texture (design doc §3.1).
 *  Each begins with `happiness === wealth` (the natural equilibrium at zero
 *  inflation), a small baseline awareness, and zero unrest. */
export const INITIAL_DISTRICTS: readonly District[] = [
  { id: 'capital', name: 'The Capital', population: 1200, wealth: 70, happiness: 70, awareness: 10, unrest: 0 },
  { id: 'industrial', name: 'The Industrial Belt', population: 1500, wealth: 50, happiness: 50, awareness: 10, unrest: 0 },
  { id: 'port', name: 'The Port', population: 900, wealth: 55, happiness: 55, awareness: 10, unrest: 0 },
  { id: 'oldtown', name: 'Old Town', population: 700, wealth: 45, happiness: 45, awareness: 10, unrest: 0 },
  { id: 'university', name: 'The University Quarter', population: 500, wealth: 60, happiness: 60, awareness: 10, unrest: 0 },
  { id: 'outerwards', name: 'The Outer Wards', population: 1800, wealth: 25, happiness: 25, awareness: 10, unrest: 0 },
  { id: 'farmland', name: 'The Farmlands', population: 1100, wealth: 35, happiness: 35, awareness: 10, unrest: 0 },
  { id: 'frontier', name: 'The Frontier', population: 600, wealth: 30, happiness: 30, awareness: 10, unrest: 0 },
  { id: 'garrison', name: 'The Garrison Town', population: 800, wealth: 40, happiness: 40, awareness: 10, unrest: 0 },
];
