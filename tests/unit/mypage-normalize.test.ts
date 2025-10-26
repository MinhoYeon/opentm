import { describe, expect, it } from '@jest/globals';

import {
  normalizeTrademarkRequest,
  toStatusTransitions,
  toStringArray,
} from '@/app/(dashboard)/mypage/utils/normalizeTrademarkRequest';

describe('toStringArray', () => {
  it('handles arrays of mixed values', () => {
    expect(toStringArray(['01', 2, ' 03 '])).toEqual(['01', '2', '03']);
  });

  it('parses JSON encoded arrays', () => {
    expect(toStringArray('["10", " 20 "]')).toEqual(['10', '20']);
  });

  it('splits comma separated strings', () => {
    expect(toStringArray('11, 22 , 33')).toEqual(['11', '22', '33']);
  });

  it('returns an empty array for unsupported inputs', () => {
    expect(toStringArray(undefined)).toEqual([]);
    expect(toStringArray(42)).toEqual([]);
  });
});

describe('toStatusTransitions', () => {
  it('normalizes an array of transition objects', () => {
    expect(
      toStatusTransitions([
        {
          status: '접수',
          label: '접수 완료',
          description: '출원서 접수 완료',
          changed_at: '2024-01-01',
        },
        {
          status: '심사',
          label: null,
          description: null,
          changedAt: '2024-02-01',
        },
      ]),
    ).toEqual([
      {
        status: '접수',
        label: '접수 완료',
        description: '출원서 접수 완료',
        changedAt: '2024-01-01',
      },
      {
        status: '심사',
        label: null,
        description: null,
        changedAt: '2024-02-01',
      },
    ]);
  });

  it('parses JSON strings representing transitions', () => {
    expect(
      toStatusTransitions(
        JSON.stringify([
          { status: '등록', description: '등록 완료' },
          { status: '종결' },
        ]),
      ),
    ).toEqual([
      { status: '등록', label: null, description: '등록 완료', changedAt: null },
      { status: '종결', label: null, description: null, changedAt: null },
    ]);
  });

  it('returns an empty array for falsy or invalid values', () => {
    expect(toStatusTransitions(null)).toEqual([]);
    expect(toStatusTransitions('not-json')).toEqual([]);
  });
});

describe('normalizeTrademarkRequest', () => {
  it('maps snake_case and camelCase fields into a normalized record', () => {
    const record = normalizeTrademarkRequest({
      id: '123',
      brand_name: '브랜드',
      status: '심사',
      status_label: '심사중',
      status_description: '담당 심사관 배정',
      status_badge_class: 'badge-warning',
      status_dot_class: 'dot-warning',
      submitted_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      product_classes: '01, 35',
      representative_name: '홍길동',
      reference_code: 'REF-001',
      status_transitions: [
        { status: '접수', label: '접수 완료', description: '완료', changed_at: '2024-01-01' },
      ],
    });

    expect(record).toEqual({
      id: '123',
      brandName: '브랜드',
      status: '심사',
      statusLabel: '심사중',
      statusDescription: '담당 심사관 배정',
      statusBadgeClass: 'badge-warning',
      statusDotClass: 'dot-warning',
      submittedAt: '2024-01-01T00:00:00Z',
      lastUpdated: '2024-01-02T00:00:00Z',
      classes: ['01', '35'],
      representative: '홍길동',
      referenceCode: 'REF-001',
      transitions: [
        {
          status: '접수',
          label: '접수 완료',
          description: '완료',
          changedAt: '2024-01-01',
        },
      ],
    });
  });

  it('applies fallbacks when optional fields are missing', () => {
    const record = normalizeTrademarkRequest({});

    expect(record).toEqual({
      id: '',
      brandName: '이름 미지정',
      status: '알 수 없음',
      statusLabel: null,
      statusDescription: null,
      statusBadgeClass: null,
      statusDotClass: null,
      submittedAt: null,
      lastUpdated: null,
      classes: [],
      representative: null,
      referenceCode: null,
      transitions: [],
    });
  });
});
