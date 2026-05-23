import { describe, it, expect } from 'vitest';
import { checkLoss } from './loss';
import { createInitialState } from './state';
import { CONSTANTS } from '../content/constants';

describe('checkLoss', () => {
  it('leaves a solvent state running', () => {
    const s = createInitialState();
    s.treasury = 100;
    checkLoss(s);
    expect(s.lossCause).toBeNull();
    expect(s.bankruptSince).toBeNull();
  });

  it('latches bankruptSince the first month treasury goes non-positive, but does not end the run', () => {
    const s = createInitialState();
    s.month = 17;
    s.treasury = 0;
    checkLoss(s);
    expect(s.bankruptSince).toBe(17);
    expect(s.lossCause).toBeNull();
  });

  it('latches bankruptSince when treasury goes negative too', () => {
    const s = createInitialState();
    s.month = 5;
    s.treasury = -250;
    checkLoss(s);
    expect(s.bankruptSince).toBe(5);
    expect(s.lossCause).toBeNull();
  });

  it('does not re-latch bankruptSince once set', () => {
    const s = createInitialState();
    s.bankruptSince = 5;
    s.month = 10;
    s.treasury = -100;
    checkLoss(s);
    expect(s.bankruptSince).toBe(5); // unchanged
  });

  it('bankrupt + unrest crossing threshold ends the run as bankruptcy', () => {
    const s = createInitialState();
    s.bankruptSince = 3;
    s.month = 10;
    s.nationalUnrest = CONSTANTS.revoltThreshold;
    checkLoss(s);
    expect(s.lossCause).toBe('bankruptcy');
  });

  it('bankrupt for the grace period ends the run as bankruptcy on its own (cascade timer)', () => {
    const s = createInitialState();
    s.bankruptSince = 0;
    s.month = CONSTANTS.bankruptcyGraceMonths;
    checkLoss(s);
    expect(s.lossCause).toBe('bankruptcy');
  });

  it('unrest at threshold while solvent ends the run as revolt', () => {
    const s = createInitialState();
    s.treasury = 1000;
    s.nationalUnrest = CONSTANTS.revoltThreshold;
    checkLoss(s);
    expect(s.lossCause).toBe('revolt');
  });

  it('prosperity at threshold ends the run as spell-breaks', () => {
    const s = createInitialState();
    s.treasury = 1000;
    s.nationalProsperity = CONSTANTS.spellBreaksThreshold;
    checkLoss(s);
    expect(s.lossCause).toBe('spell-breaks');
  });

  it('never overwrites an existing loss cause', () => {
    const s = createInitialState();
    s.lossCause = 'spell-breaks';
    s.treasury = 0;
    s.nationalUnrest = CONSTANTS.revoltThreshold + 10;
    checkLoss(s);
    expect(s.lossCause).toBe('spell-breaks');
  });

  it('prefers bankruptcy-cascade over plain revolt when both could fire', () => {
    const s = createInitialState();
    s.bankruptSince = 0;
    s.month = 5;
    s.nationalUnrest = CONSTANTS.revoltThreshold;
    checkLoss(s);
    expect(s.lossCause).toBe('bankruptcy');
  });

  it('prefers any other loss over spell-breaks when both could fire', () => {
    const s = createInitialState();
    s.nationalUnrest = CONSTANTS.revoltThreshold;
    s.nationalProsperity = CONSTANTS.spellBreaksThreshold;
    checkLoss(s);
    expect(s.lossCause).toBe('revolt');
  });
});
