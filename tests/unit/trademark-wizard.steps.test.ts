import { describe, expect, it } from '@jest/globals';

import { validateStep } from '@/app/register/page';

describe('validateStep', () => {
  const baseData = {
    brandName: '오픈TM',
    trademarkType: 'logo' as const,
    productClasses: ['01'],
    representativeEmail: 'user@example.com',
    additionalNotes: '테스트',
    image: {
      dataUrl: 'data:image/png;base64,aGVsbG8=',
      fileName: 'logo.png',
      fileType: 'image/png',
      size: 1024,
    },
    agreeToTerms: true,
  };

  it('validates the brand step', () => {
    const result = validateStep(0, { ...baseData, brandName: ' ' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('상표명을 입력해 주세요.');
  });

  it('requires logo information on the trademark step', () => {
    const result = validateStep(1, { ...baseData, trademarkType: '', image: null });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      '상표 유형을 선택해 주세요.',
      '상표 이미지를 업로드해 주세요.',
    ]);
  });

  it('ensures at least one product class is selected', () => {
    const result = validateStep(2, { ...baseData, productClasses: [] });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(['최소 한 개 이상의 상품류를 선택해 주세요.']);
  });

  it('checks contact details and consent in the final step or final review', () => {
    const withoutConsent = validateStep(3, {
      ...baseData,
      representativeEmail: 'bad-email',
      agreeToTerms: false,
    });

    expect(withoutConsent.valid).toBe(false);
    expect(withoutConsent.errors).toEqual([
      '담당자 이메일 형식이 올바르지 않습니다.',
      '정보 전달 및 상담 진행에 동의해 주세요.',
    ]);

    const finalCheck = validateStep(0, { ...baseData, agreeToTerms: false }, true);
    expect(finalCheck.valid).toBe(false);
    expect(finalCheck.errors).toContain('정보 전달 및 상담 진행에 동의해 주세요.');
  });
});
