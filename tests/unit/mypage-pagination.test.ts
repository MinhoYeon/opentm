import { describe, expect, it } from '@jest/globals';

import { getPaginationRange, toPositiveInteger } from '@/app/(dashboard)/mypage/page';

describe('toPositiveInteger', () => {
  it('returns parsed positive integers', () => {
    expect(toPositiveInteger('3', 1)).toBe(3);
  });

  it('falls back for zero, negative, or invalid values', () => {
    expect(toPositiveInteger('0', 5)).toBe(5);
    expect(toPositiveInteger('-2', 5)).toBe(5);
    expect(toPositiveInteger('not-a-number', 5)).toBe(5);
    expect(toPositiveInteger(undefined, 5)).toBe(5);
  });
});

describe('getPaginationRange', () => {
  it('calculates start and end indices for the given page and size', () => {
    expect(getPaginationRange(1, 10)).toEqual({ from: 0, to: 9 });
    expect(getPaginationRange(3, 25)).toEqual({ from: 50, to: 74 });
  });

  it('guards against invalid page and pageSize values', () => {
    expect(getPaginationRange(0, 10)).toEqual({ from: 0, to: 9 });
    expect(getPaginationRange(-2, 0)).toEqual({ from: 0, to: 0 });
    expect(getPaginationRange(Number.NaN, Number.NaN)).toEqual({ from: 0, to: 0 });
  });
});
