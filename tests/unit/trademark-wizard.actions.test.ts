import { describe, expect, it } from '@jest/globals';

import {
  sanitizeFileName,
  extractDataUrl,
  validateInput,
  type SubmitTrademarkRequestInput,
} from '@/app/register/actions';

describe('trademark wizard server helpers', () => {
  describe('sanitizeFileName', () => {
    it('removes unsupported characters and collapses delimiters', () => {
      expect(sanitizeFileName('My File (Final).png')).toBe('My-File-Final.png');
    });

    it('truncates long file names to 120 characters', () => {
      const longName = 'a'.repeat(140);
      const sanitized = sanitizeFileName(longName);
      expect(sanitized.length).toBe(120);
    });
  });

  describe('extractDataUrl', () => {
    it('returns mime type and base64 payload from a valid data URL', () => {
      const sample = 'data:image/png;base64,aGVsbG8=';
      expect(extractDataUrl(sample)).toEqual({ mimeType: 'image/png', base64: 'aGVsbG8=' });
    });

    it('throws when the data URL is malformed', () => {
      expect(() => extractDataUrl('not-a-data-url')).toThrow('이미지 데이터 URL 형식이 올바르지 않습니다.');
    });
  });

  describe('validateInput', () => {
    const baseInput: SubmitTrademarkRequestInput = {
      brandName: '오픈TM',
      trademarkType: 'logo',
      productClasses: ['01'],
      representativeEmail: 'user@example.com',
      additionalNotes: '테스트',
      image: {
        dataUrl: 'data:image/png;base64,aGVsbG8=',
        fileName: 'logo.png',
        fileType: 'image/png',
        size: 1024,
      },
      userId: 'user-123',
    };

    it('returns no errors for a valid payload', () => {
      expect(validateInput(baseInput)).toEqual([]);
    });

    it('collects validation errors for missing required fields', () => {
      const invalid = {
        ...baseInput,
        brandName: '   ',
        productClasses: [],
        representativeEmail: 'invalid-email',
      };

      expect(validateInput(invalid)).toEqual([
        '상표명을 입력해 주세요.',
        '최소 한 개 이상의 상품류를 선택해 주세요.',
        '담당자 이메일 형식이 올바르지 않습니다.',
      ]);
    });

    it('validates optional image constraints when present', () => {
      const withInvalidImage: SubmitTrademarkRequestInput = {
        ...baseInput,
        image: {
          dataUrl: 'data:text/plain;base64,aGVsbG8=',
          fileName: 'note.txt',
          fileType: 'text/plain',
          size: 6 * 1024 * 1024,
        },
      };

      expect(validateInput(withInvalidImage)).toEqual([
        '이미지 파일은 5MB 이하만 업로드할 수 있습니다.',
        '이미지 파일만 업로드할 수 있습니다.',
      ]);
    });
  });
});
