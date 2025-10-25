import { describe, expect, it } from '@jest/globals';

import { toggleSelection } from '@/app/search/SearchClient';

describe('toggleSelection', () => {
  it('adds the code when it is not in the current selection', () => {
    expect(toggleSelection(['01', '03'], '09')).toEqual(['01', '03', '09']);
  });

  it('removes the code when it already exists', () => {
    expect(toggleSelection(['01', '03', '09'], '03')).toEqual(['01', '09']);
  });

  it('does not mutate the original array', () => {
    const original = ['01', '03'];
    toggleSelection(original, '09');
    expect(original).toEqual(['01', '03']);
  });
});
