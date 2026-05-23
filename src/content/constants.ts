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
  inflationCatchUp: 0.12, // fraction of the gap inflation closes toward pressure each month — lower = longer-delayed pain
  inflationPressureDecay: 0.92, // fraction of pressure retained each month — higher = pressure lingers, spreading the spiral

  // --- Treasury & the bureaucracy ---
  startingTreasury: 5000,
  initialUpkeep: 450, // monthly apparatus upkeep at the start of a run
  bloatRate: 0.008, // upkeep grows 0.8%/month on its own — doubles in ~7 yrs (design doc §3.6)

  // --- Per-district meters: Happiness ---
  happinessFromWealth: 1.0, // equilibrium happiness equals wealth, minus inflation drag
  happinessInflationDrag: 0.8, // happiness equilibrium loses 0.8 per 1 point of inflation
  happinessCatchUp: 0.2, // fraction of gap toward equilibrium per month
  happinessFloor: 0,
  happinessCeiling: 100,

  // --- Per-district meters: Awareness ---
  awarenessFloor: 0,
  awarenessCeiling: 100,
  awarenessFromProsperity: 0.015, // monthly rise per 1 point of (wealth - 50), clamped >=0
  awarenessFromInflation: 0.05, // monthly rise per 1 point of inflation
  awarenessEducationSuppression: 0.6, // monthly fall per unit of educationLevel
  awarenessPropagandaSuppression: 0.0003, // monthly fall per dollar of propagandaBudget
  awarenessRepressionSpike: 15, // one-shot rise per repression action (per district) — base; escalation multiplier in levers.ts

  // --- Per-district meters: Unrest ---
  unrestFloor: 0,
  unrestCeiling: 100,
  unrestMiseryFactor: 0.025, // pressure per month at full misery × full awareness — halved so unrest takes a season to boil, not a few weeks
  unrestFearSuppression: 0.02, // pressure reduction per 1 point of national fear
  unrestPropagandaSuppression: 0.0005, // pressure reduction per dollar of propagandaBudget
  unrestDecay: 0.97, // monthly retention factor (3%/month decay)

  // --- National Fear ---
  fearFloor: 0,
  fearCeiling: 100,
  fearDecay: 0.92, // monthly retention factor (8%/month decay) — fear must be re-manufactured per §3.5

  // --- Lever costs and effects ---
  educationUpkeepPerLevel: 200, // monthly $ cost per unit of educationLevel
  educationWealthDrag: 0.05, // wealth growth lost per unit of educationLevel
  repressionCost: 500, // treasury cost per repression action
  repressionUnrestCut: 8, // unrest cut per repression action, per district — small; spam-then-spike-awareness is the design
  fearOpCostPerUnit: 50, // treasury cost per unit of fear injected by spawnFearOp

  // --- Emigration ---
  emigrationAwarenessThreshold: 40, // contributes only when district awareness > this
  emigrationHappinessThreshold: 40, // contributes only when district happiness < this
  emigrationRate: 0.06, // monthly loss fraction at full emigration pressure — the §3.9 sweet-spot punishment

  // --- National aggregates ---
  prosperityWealthWeight: 0.6, // local prosperity = wealth*W + happiness*(1-W)
  prosperityHappinessWeight: 0.4,

  // --- Loss thresholds ---
  revoltThreshold: 70, // national unrest at or above this triggers revolt
  spellBreaksThreshold: 80, // national prosperity at or above this triggers spell-breaks
} as const;
