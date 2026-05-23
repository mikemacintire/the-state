import type { Event } from '../sim/types';

/**
 * v1 starter catalog. Ten events covering all four kinds (design doc §5.2) and
 * the false-flag → investigation chaining mechanism. Voice is deadpan
 * bureaucratic euphemism — the satire is in the gap between the language and
 * the mechanics (§3 Tone).
 *
 * Weights are deliberate starting values. Reaching the design's "~30 events"
 * v1 target is a follow-up content pass after Plan 4.
 */
export const EVENT_CATALOG: readonly Event[] = [
  // --- Ambient (no choice, no mechanical effect; satirical flavour) ---
  {
    id: 'amb-inflation-transitory',
    kind: 'ambient',
    text: 'The Bureau of Statistics confirms inflation remains transitory for the ninth consecutive year.',
    weight: (s) => (s.inflation > 5 ? 4 : 0.2),
    effects: () => {},
  },
  {
    id: 'amb-record-approval',
    kind: 'ambient',
    text: 'State media reports record approval ratings amid renewed national unity.',
    weight: (s) => (s.fear > 30 ? 3 : 0.2),
    effects: () => {},
  },
  {
    id: 'amb-park-opens',
    kind: 'ambient',
    text: 'A new park opens in the Capital, named for the current Minister of Order.',
    weight: () => 0.5,
    effects: () => {},
  },

  // --- Incidents (small mechanical effects; sometimes consequences of prior actions) ---
  {
    id: 'inc-border-flare',
    kind: 'incident',
    text: 'Border tensions flare. Defence allocations rise quietly.',
    weight: (s) => (s.fear > 10 ? 2 : 0.5),
    effects: (s) => {
      s.treasury -= 300;
      s.fear = Math.min(100, s.fear + 5);
    },
  },
  {
    id: 'inc-small-protest',
    kind: 'incident',
    text: 'A small protest forms outside a regional administration office.',
    weight: (s) => {
      // surfaces when any district has both notable awareness and unrest
      const hot = s.districts.some((d) => d.awareness > 40 && d.unrest > 20);
      return hot ? 3 : 0;
    },
    effects: (s) => {
      // affect the most-unrest district
      const worst = [...s.districts].sort((a, b) => b.unrest - a.unrest)[0];
      if (worst) {
        worst.unrest = Math.min(100, worst.unrest + 2);
        worst.awareness = Math.min(100, worst.awareness + 1);
      }
    },
  },

  // --- Crises (major choices; in Plan 4 these will auto-pause and show modals) ---
  {
    id: 'cri-leaked-files',
    kind: 'crisis',
    text: 'An archivist has leaked documents proving the Harbor Attack was staged.',
    weight: (s) => {
      // only fires once a false-flag has actually been used recently
      const recent = s.eventLog.some(
        (e) => e.eventId === 'cri-false-flag' && e.month >= s.month - 24,
      );
      return recent ? 2 : 0;
    },
    effects: () => {},
    choices: [
      {
        label: 'Suppress the story',
        effects: (s) => {
          s.treasury -= 2000;
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 2);
        },
      },
      {
        label: 'Discredit the leaker',
        effects: (s) => {
          s.treasury -= 500;
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 5);
        },
      },
      {
        label: 'Let it run',
        effects: (s) => {
          for (const d of s.districts) {
            d.awareness = Math.min(100, d.awareness + 12);
            d.unrest = Math.min(100, d.unrest + 8);
          }
        },
      },
    ],
  },
  {
    id: 'cri-false-flag',
    kind: 'crisis',
    text: 'Operations propose a deniable incident in the Port to refocus public attention.',
    weight: (s) => (s.nationalUnrest > 25 ? 1.5 : 0),
    effects: () => {},
    choices: [
      {
        label: 'Authorise the operation',
        effects: (s) => {
          s.treasury -= 1500;
          s.fear = Math.min(100, s.fear + 20);
        },
      },
      {
        label: 'Decline',
        effects: () => {},
      },
    ],
    // Authorising plants a possible investigation crisis 6 months out.
    schedule: (s) => [{ eventId: 'cri-leaked-files', fireMonth: s.month + 6 }],
  },
  {
    id: 'cri-inflation-anger',
    kind: 'crisis',
    text: 'Citizens are openly angry about the cost of bread.',
    weight: (s) => (s.inflation > 20 ? 4 : 0),
    effects: () => {},
    choices: [
      {
        label: 'Blame foreign speculators',
        effects: (s) => {
          s.fear = Math.min(100, s.fear + 8);
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 2);
        },
      },
      {
        label: 'Impose price controls',
        effects: (s) => {
          // helps short-term happiness, hurts wealth growth (deferred)
          for (const d of s.districts) {
            d.happiness = Math.min(100, d.happiness + 5);
            d.wealth = Math.max(0, d.wealth - 3);
          }
        },
      },
      {
        label: 'Pay a one-off subsidy',
        effects: (s) => {
          s.treasury -= 2500;
          for (const d of s.districts) d.happiness = Math.min(100, d.happiness + 8);
        },
      },
    ],
  },

  // --- Self-Provision (private/voluntary solutions; pose a Spell-Breaks threat) ---
  {
    id: 'sp-mutual-aid',
    kind: 'self-provision',
    text: 'A neighbourhood mutual-aid network has emerged in a poorer ward — care arranged without the state.',
    weight: (s) => {
      const aware = s.districts.some((d) => d.awareness > 30 && d.wealth < 50);
      return aware ? 1.2 : 0;
    },
    effects: () => {},
    choices: [
      {
        label: 'Ban it',
        effects: (s) => {
          s.treasury -= 500;
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 4);
        },
      },
      {
        label: 'Co-opt it as a state programme',
        effects: (s) => {
          s.treasury -= 1500;
          s.apparatusUpkeep += 50; // permanent
        },
      },
      {
        label: 'Let it run',
        effects: (s) => {
          // It works: the neediest district's happiness climbs.
          const poor = [...s.districts].sort((a, b) => a.wealth - b.wealth)[0];
          if (poor) {
            poor.happiness = Math.min(100, poor.happiness + 10);
            poor.unrest = Math.max(0, poor.unrest - 5);
          }
        },
      },
    ],
  },
  {
    id: 'sp-private-school',
    kind: 'self-provision',
    text: 'A growing private school co-op is teaching unauthorised civics.',
    weight: (s) => (s.educationLevel < 0.5 && s.nationalProsperity > 50 ? 1 : 0),
    effects: () => {},
    choices: [
      {
        label: 'Shut it down',
        effects: (s) => {
          s.treasury -= 400;
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 6);
        },
      },
      {
        label: 'Tax it heavily',
        effects: (s) => {
          s.treasury += 800;
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 2);
        },
      },
      {
        label: 'Let it run',
        effects: (s) => {
          // Genuinely educated kids — long-run awareness rise across the country.
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 1);
        },
      },
    ],
  },
];
