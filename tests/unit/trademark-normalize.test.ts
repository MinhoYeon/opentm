import { describe, expect, it } from '@jest/globals';

import { normalizeResponse } from '@/app/api/trademark-search/route';

describe('normalizeResponse', () => {
  it('normalizes JSON payloads into the expected structure', async () => {
    const response = new Response(
      JSON.stringify({
        results: [
          {
            title: '오픈상표',
            classification: ['01', '35'],
            similarMark: '오픈마크, 오픈TM',
            applicationNumber: '402024000001',
            applicationDate: '2024-01-01',
            registrationNumber: '402024000010',
            registrationDate: '2024-02-01',
            applicationStatus: '심사중',
            applicantName: '오픈주식회사',
            drawing: 'http://example.com/mark.png',
          },
        ],
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );

    const [result] = await normalizeResponse(response);
    expect(result).toMatchObject({
      markName: '오픈상표',
      applicationNumber: '402024000001',
      applicationDate: '2024-01-01',
      registrationNumber: '402024000010',
      registrationDate: '2024-02-01',
      status: '심사중',
      applicantName: '오픈주식회사',
      classes: ['01', '35'],
      similarMarks: ['오픈마크', '오픈TM'],
      imageUrl: 'http://example.com/mark.png',
    });
  });

  it('parses XML payloads from KIPRIS responses', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <response>
        <body>
          <items>
            <item>
              <trademark>
                <trademarkName>오픈상표</trademarkName>
                <applicationNumber>402024000002</applicationNumber>
                <applicationDate>2024-03-10</applicationDate>
                <registrationNumber>402024000020</registrationNumber>
                <registrationDate>2024-04-10</registrationDate>
                <applicationStatus>등록완료</applicationStatus>
                <applicantName>주식회사 오픈</applicantName>
                <niceClassCode>01, 09</niceClassCode>
                <similarGroup>오픈A, 오픈B</similarGroup>
                <drawing>http://example.com/mark2.png</drawing>
              </trademark>
            </item>
          </items>
        </body>
      </response>`;

    const response = new Response(xml, {
      headers: { 'Content-Type': 'application/xml' },
    });

    const [result] = await normalizeResponse(response);
    expect(result).toMatchObject({
      markName: '오픈상표',
      applicationNumber: '402024000002',
      applicationDate: '2024-03-10',
      registrationNumber: '402024000020',
      registrationDate: '2024-04-10',
      status: '등록완료',
      applicantName: '주식회사 오픈',
      classes: ['01', '09'],
      similarMarks: ['오픈A', '오픈B'],
      imageUrl: 'http://example.com/mark2.png',
    });
  });

  it('returns an empty array when the payload cannot be parsed', async () => {
    const response = new Response('not valid', {
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(normalizeResponse(response)).resolves.toEqual([]);
  });
});
