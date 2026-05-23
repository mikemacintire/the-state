import type { Event } from '../sim/types';

/**
 * The v1 event catalog (design doc §5.2). The voice is deadpan ministry
 * euphemism — the satire is in the gap between the language and the mechanics
 * (§1 Tone). Anti-repeat cooldown lives in src/sim/events.ts COOLDOWN_MONTHS,
 * so weights here express *eligibility under state*, not "how often" — the
 * picker handles that.
 *
 * Chains are wired by pushing pendingEvents directly from choice effects;
 * authored chain targets carry weight 0 so the picker never picks them
 * (only `processEvents` step 1 fires them).
 */
export const EVENT_CATALOG: readonly Event[] = [
  // ============================================================
  // AMBIENT — no choice, no mechanical effect, satirical flavour
  // ============================================================
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
    weight: (s) => (s.fear > 40 || s.propagandaBudget > 1500 ? 1 : 0),
    effects: () => {},
  },
  {
    id: 'amb-affordability-initiative',
    kind: 'ambient',
    text: 'The Ministry of Price Stability launches its third Strategic Affordability Initiative this year.',
    weight: (s) => (s.inflation > 15 ? 3 : 0),
    effects: () => {},
  },
  {
    id: 'amb-mandatory-optimism',
    kind: 'ambient',
    text: 'A Mandatory Optimism Week is declared in the eastern wards.',
    weight: (s) => (s.districts.some((d) => d.happiness < 30) ? 2.5 : 0),
    effects: () => {},
  },
  {
    id: 'amb-curriculum-update',
    kind: 'ambient',
    text: 'School curricula are updated to clarify recent history.',
    weight: (s) => (s.propagandaBudget > 1500 ? 2 : 0),
    effects: () => {},
  },

  // ============================================================
  // INCIDENT — small mechanical effects, often consequences
  // ============================================================
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
    text: 'An unscheduled gathering disperses peacefully after Public Order Officials make several arrests.',
    weight: (s) => {
      const hot = s.districts.some((d) => d.awareness > 40 && d.unrest > 20);
      return hot ? 3 : 0;
    },
    effects: (s) => {
      const worst = [...s.districts].sort((a, b) => b.unrest - a.unrest)[0];
      if (worst) {
        worst.unrest = Math.min(100, worst.unrest + 2);
        worst.awareness = Math.min(100, worst.awareness + 1);
      }
    },
  },
  {
    id: 'inc-voluntary-underreporting',
    kind: 'incident',
    text: 'Receipts arrive short. The Bureau reclassifies the gap as Voluntary Underreporting.',
    weight: (s) => (s.taxRate > 0.4 ? 2 : 0),
    effects: (s) => {
      s.treasury -= 400;
    },
  },
  {
    id: 'inc-insufficient-enthusiasm',
    kind: 'incident',
    text: 'A regional inspector is found to have insufficient enthusiasm. He is reassigned.',
    weight: (s) => (s.fear > 50 ? 2 : 0),
    effects: (s) => {
      s.fear = Math.min(100, s.fear + 3);
      const target = [...s.districts].sort((a, b) => b.awareness - a.awareness)[0];
      if (target) target.awareness = Math.min(100, target.awareness + 1);
    },
  },
  {
    id: 'inc-trade-retaliation',
    kind: 'incident',
    text: 'A neighbouring state has restricted trade in response to recent rhetoric. Imports slow.',
    weight: () => 0, // chain target only (scheduled by cri-inflation-anger "Blame foreign speculators")
    effects: (s) => {
      s.treasury -= 800;
      for (const d of s.districts) d.wealth = Math.max(0, d.wealth - 2);
    },
  },

  // ============================================================
  // CRISIS — major choice modals (auto-pause in the UI)
  // ============================================================
  {
    id: 'cri-leaked-files',
    kind: 'crisis',
    text: 'An archivist has leaked documents proving the Harbor Attack was staged.',
    weight: (s) => {
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
      { label: 'Decline', effects: () => {} },
    ],
    // Authorising plants a possible investigation crisis 6 months out.
    schedule: (s) => [{ eventId: 'cri-leaked-files', fireMonth: s.month + 6 }],
  },
  {
    id: 'cri-inflation-anger',
    kind: 'crisis',
    text: 'Bakers in two markets close their shutters; the Office of Domestic Tranquility downplays the disruption.',
    weight: (s) => (s.inflation > 20 ? 4 : 0),
    effects: () => {},
    choices: [
      {
        label: 'Blame foreign speculators',
        effects: (s) => {
          s.fear = Math.min(100, s.fear + 8);
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 2);
          // Chain: a real foreign actor reads the speech and reciprocates.
          s.pendingEvents.push({ eventId: 'inc-trade-retaliation', fireMonth: s.month + 4 });
        },
      },
      {
        label: 'Impose price controls',
        effects: (s) => {
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
  {
    id: 'cri-foreign-coin',
    kind: 'crisis',
    text: 'Merchants in the Port District are quietly settling accounts in foreign coin.',
    weight: (s) => (s.districts.some((d) => d.wealth > 70 && d.awareness > 40) ? 2 : 0),
    effects: () => {},
    choices: [
      {
        label: 'Outlaw possession',
        effects: (s) => {
          s.treasury -= 600;
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 4);
        },
      },
      {
        label: 'Devalue our own',
        effects: (s) => {
          s.inflationPressure += 4;
        },
      },
      {
        label: 'Investigate quietly',
        effects: (s) => {
          s.treasury -= 300;
          const port = s.districts.find((d) => d.id === 'port');
          if (port) port.awareness = Math.min(100, port.awareness + 2);
        },
      },
    ],
  },
  {
    id: 'cri-ministry-expansion',
    kind: 'crisis',
    text: 'The Ministry of Internal Affairs requests a discretionary expansion, citing emerging threats.',
    weight: (s) => (s.apparatusUpkeep > Math.max(1, s.treasury) * 0.1 ? 1.5 : 0),
    effects: () => {},
    choices: [
      {
        label: 'Approve',
        effects: (s) => {
          s.apparatusUpkeep += 100;
          s.fear = Math.min(100, s.fear + 4);
        },
      },
      { label: 'Defer', effects: () => {} },
      {
        label: 'Audit them',
        effects: (s) => {
          s.treasury -= 500;
          s.apparatusUpkeep = Math.max(s.apparatusUpkeep * 0.95, 200);
        },
      },
    ],
  },
  {
    id: 'cri-folk-song',
    kind: 'crisis',
    text: 'A folk song mocking the Minister is spreading in three districts.',
    weight: (s) => (s.educationLevel < 0.3 && s.nationalUnrest > 30 ? 2 : 0),
    effects: () => {},
    choices: [
      {
        label: 'Arrest the singers',
        effects: (s) => {
          s.treasury -= 300;
          for (const d of s.districts) {
            d.awareness = Math.min(100, d.awareness + 5);
            d.unrest = Math.max(0, d.unrest - 4);
          }
        },
      },
      {
        label: 'Commission a counter-song',
        effects: (s) => {
          s.treasury -= 800;
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 1);
        },
      },
      {
        label: 'Ignore it',
        effects: (s) => {
          for (const d of s.districts) {
            d.awareness = Math.min(100, d.awareness + 3);
            d.unrest = Math.min(100, d.unrest + 2);
          }
        },
      },
    ],
  },
  {
    id: 'cri-mutual-aid-martyr',
    kind: 'crisis',
    text: 'A detained mutual-aid organiser has died in custody. Independent accounts are circulating.',
    weight: () => 0, // chain target only (scheduled by sp-mutual-aid "Ban it")
    effects: () => {},
    choices: [
      {
        label: 'Suppress the accounts',
        effects: (s) => {
          s.treasury -= 1500;
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 3);
        },
      },
      {
        label: 'Blame outside agitators',
        effects: (s) => {
          s.fear = Math.min(100, s.fear + 6);
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 5);
        },
      },
      {
        label: 'Issue a formal apology',
        effects: (s) => {
          for (const d of s.districts) {
            d.awareness = Math.min(100, d.awareness + 8);
            d.unrest = Math.max(0, d.unrest - 3);
          }
        },
      },
    ],
  },

  // ============================================================
  // SELF-PROVISION — the thesis-in-action (design doc §3.8)
  // ============================================================
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
          // Chain: a detainee's death surfaces three months later.
          s.pendingEvents.push({ eventId: 'cri-mutual-aid-martyr', fireMonth: s.month + 3 });
        },
      },
      {
        label: 'Co-opt it as a state programme',
        effects: (s) => {
          s.treasury -= 1500;
          s.apparatusUpkeep += 50;
        },
      },
      {
        label: 'Let it run',
        effects: (s) => {
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
    weight: (s) => (s.educationLevel < 0.6 ? 1.2 : 0),
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
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 1);
        },
      },
    ],
  },
  {
    id: 'sp-private-watch',
    kind: 'self-provision',
    text: 'Residents of the Low Quarter have organised a private night-watch — crime is down on their streets.',
    weight: (s) => (s.districts.some((d) => d.wealth < 30) ? 1.2 : 0),
    effects: () => {},
    choices: [
      {
        label: 'Disband',
        effects: (s) => {
          s.treasury -= 400;
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 5);
        },
      },
      {
        label: 'Require licensing',
        effects: (s) => {
          s.treasury += 200;
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 2);
        },
      },
      {
        label: 'Let it run',
        effects: (s) => {
          const poor = [...s.districts].sort((a, b) => a.wealth - b.wealth)[0];
          if (poor) {
            poor.happiness = Math.min(100, poor.happiness + 6);
            poor.unrest = Math.max(0, poor.unrest - 4);
          }
        },
      },
    ],
  },
  {
    id: 'sp-silver-grams',
    kind: 'self-provision',
    text: 'Shopkeepers in two markets have begun pricing goods in silver grams.',
    weight: (s) => (s.inflation > 25 ? 2 : 0),
    effects: () => {},
    choices: [
      {
        label: 'Confiscate the scales',
        effects: (s) => {
          s.treasury -= 600;
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 4);
        },
      },
      {
        label: 'Tax the practice',
        effects: (s) => {
          s.treasury += 400;
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 1);
        },
      },
      {
        label: 'Let it run',
        effects: (s) => {
          for (const d of s.districts) {
            d.happiness = Math.min(100, d.happiness + 3);
            d.awareness = Math.min(100, d.awareness + 2);
          }
        },
      },
    ],
  },
  {
    id: 'sp-unlicensed-clinic',
    kind: 'self-provision',
    text: 'An unlicensed clinic in the slums is treating patients faster than the state hospital.',
    weight: (s) => (s.districts.some((d) => d.happiness < 40) ? 1.2 : 0),
    effects: () => {},
    choices: [
      {
        label: 'Close it',
        effects: (s) => {
          s.treasury -= 300;
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 5);
          const sick = [...s.districts].sort((a, b) => a.happiness - b.happiness)[0];
          if (sick) sick.happiness = Math.max(0, sick.happiness - 3);
        },
      },
      {
        label: 'Absorb its staff',
        effects: (s) => {
          s.treasury -= 1200;
          s.apparatusUpkeep += 30;
        },
      },
      {
        label: 'Let it run',
        effects: (s) => {
          const sick = [...s.districts].sort((a, b) => a.happiness - b.happiness)[0];
          if (sick) {
            sick.happiness = Math.min(100, sick.happiness + 8);
            sick.unrest = Math.max(0, sick.unrest - 3);
          }
        },
      },
    ],
  },
  {
    id: 'sp-samizdat-pamphlet',
    kind: 'self-provision',
    text: 'A samizdat pamphlet titled "On the Visible Hand" is circulating in the academies.',
    weight: (s) => (s.educationLevel < 0.5 ? 1.5 : 0),
    effects: () => {},
    choices: [
      {
        label: 'Seize copies',
        effects: (s) => {
          s.treasury -= 500;
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 4);
        },
      },
      {
        label: 'Publish a rebuttal',
        effects: (s) => {
          s.treasury -= 1000;
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 2);
        },
      },
      {
        label: 'Let it run',
        effects: (s) => {
          const uni = s.districts.find((d) => d.id === 'university');
          if (uni) uni.awareness = Math.min(100, uni.awareness + 5);
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 1);
        },
      },
    ],
  },
];
