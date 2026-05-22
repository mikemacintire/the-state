import type { District } from '../sim/types';

/** The nine starting districts — varied so the map has texture (design doc §3.1). */
export const INITIAL_DISTRICTS: readonly District[] = [
  { id: 'capital', name: 'The Capital', population: 1200, wealth: 70 },
  { id: 'industrial', name: 'The Industrial Belt', population: 1500, wealth: 50 },
  { id: 'port', name: 'The Port', population: 900, wealth: 55 },
  { id: 'oldtown', name: 'Old Town', population: 700, wealth: 45 },
  { id: 'university', name: 'The University Quarter', population: 500, wealth: 60 },
  { id: 'outerwards', name: 'The Outer Wards', population: 1800, wealth: 25 },
  { id: 'farmland', name: 'The Farmlands', population: 1100, wealth: 35 },
  { id: 'frontier', name: 'The Frontier', population: 600, wealth: 30 },
  { id: 'garrison', name: 'The Garrison Town', population: 800, wealth: 40 },
];
