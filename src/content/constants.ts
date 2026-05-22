/**
 * Every tunable number in the fiscal core, in one place (design doc §8).
 * These are deliberate STARTING values, not balanced final values — balance is
 * found later by headless simulation.
 */
export const CONSTANTS = {
  // --- Economy (district wealth is on a 0..100 scale) ---
  baseWealthGrowth: 0.5, // wealth points/month at zero tax and zero inflation
  taxGrowthDrag: 1.0, // wealth growth lost per 1.0 of tax rate
  inflationGrowthDrag: 0.04, // wealth growth lost per 1 point of inflation
  wealthFloor: 0,
  wealthCeiling: 100,

  // --- Taxation ---
  startingTaxRate: 0.2,
  taxYield: 0.01, // treasury per (wealth * population) per month at tax rate 1.0

  // --- Money printing & inflation ---
  printInflationPerThousand: 0.6, // inflation pressure added per 1000 printed
  inflationCatchUp: 0.25, // fraction of the gap inflation closes toward pressure each month
  inflationPressureDecay: 0.82, // fraction of pressure retained each month

  // --- Treasury & the bureaucracy ---
  startingTreasury: 5000,
  initialUpkeep: 450, // monthly apparatus upkeep at the start of a run
  bloatRate: 0.004, // upkeep grows 0.4%/month on its own (design doc §3.6)
} as const;
