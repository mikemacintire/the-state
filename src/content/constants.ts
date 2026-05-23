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
  awarenessEducationSuppression: 1.5, // scales `level × (1 - level × 0.8)` — Laffer-shaped, peaks around level 0.6 (design doc §4.4)
  educationBrittleness: 0.4, // adds `level² × this` to awareness pressure — a docile population is brittle (§4.4)
  awarenessPropagandaSuppression: 0.04, // scales `sqrt(budget) × effectiveness` — diminishing returns (§4.3)
  awarenessRepressionSpike: 15, // one-shot rise per repression action (per district) — base; escalation multiplier in levers.ts

  // --- Per-district meters: Unrest ---
  unrestFloor: 0,
  unrestCeiling: 100,
  unrestMiseryFactor: 0.025, // pressure per month at full misery × full awareness — halved so unrest takes a season to boil, not a few weeks
  unrestTaxFactor: 1.5, // pressure per month at full tax × full awareness — the §4.1 "higher felt taxation raises unrest"
  unrestFearLicensing: 0.7, // at full fear, tax-felt pressure is reduced by 70% — fear "licenses extraction" per §3.5
  unrestFearSuppression: 0.02, // pressure reduction per 1 point of national fear
  unrestPropagandaSuppression: 0.04, // scales `sqrt(budget) × effectiveness` — same diminishing-returns shape as awareness (§4.3)
  unrestDecay: 0.97, // monthly retention factor (3%/month decay)

  // --- National Fear ---
  fearFloor: 0,
  fearCeiling: 100,
  fearDecay: 0.92, // monthly retention factor (8%/month decay) — fear must be re-manufactured per §3.5
  fearFatigueDecay: 0.95, // monthly retention factor for fearFatigue — slow, so fresh threats are needed
  fearFatigueGainPerUnit: 0.05, // fatigue raised per 1 raw point of fear injected — 20 units → +1 fatigue → half-effective ops

  // --- Lever costs and effects ---
  educationUpkeepPerLevel: 200, // monthly $ cost per unit of educationLevel
  educationWealthDrag: 0.05, // wealth growth lost per unit of educationLevel
  repressionCost: 500, // treasury cost per repression action
  repressionUnrestCut: 8, // unrest cut per repression action, per district — small; spam-then-spike-awareness is the design
  repressionEscalationPerUse: 0.15, // each prior use raises the awareness spike by 15% of base — ~7 uses doubles it
  suppressionEscalationPerUse: 0.5, // each prior "crush" pick on the same event raises that event's awareness penalty by 50% of base
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
  bankruptcyGraceMonths: 24, // months of insolvency before the cascade closes the run on its own (design doc §3.6)

  // --- Spell Breaks epilogue ---
  epilogueWealthGrowth: 0.75, // per-month wealth growth during the stateless epilogue — faster than normal baseWealthGrowth (no drag at all)
} as const;
