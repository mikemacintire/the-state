import { describe, it, expect } from 'vitest';
import { checkLoss } from './loss';
import { createInitialState } from './state';

describe('checkLoss', () => {
  it('leaves a solvent state running', () => {
    const s = createInitialState();
    s.treasury = 100;
    checkLoss(s);
    expect(s.lossCause).toBeNull();
  });

  it('ends the run in bankruptcy when the treasury is exhausted', () => {
    const s = createInitialState();
    s.treasury = 0;
    checkLoss(s);
    expect(s.lossCause).toBe('bankruptcy');
  });

  it('ends the run in bankruptcy when the treasury goes negative', () => {
    const s = createInitialState();
    s.treasury = -250;
    checkLoss(s);
    expect(s.lossCause).toBe('bankruptcy');
  });

  it('never overwrites an existing loss cause', () => {
    const s = createInitialState();
    s.lossCause = 'bankruptcy';
    s.treasury = 9999;
    checkLoss(s);
    expect(s.lossCause).toBe('bankruptcy');
  });
});
