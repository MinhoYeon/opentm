import { NextRequest, NextResponse } from "next/server";

type NormalizedTrademark = {
  markName: string;
  applicationNumber?: string;
  applicationDate?: string;
  status?: string;
  applicantName?: string;
  classes?: string[];
  similarMarks?: string[];
};

type SearchPayload = {
  query?: string;
  classifications?: string[];
};

const DEFAULT_API_ENDPOINT =
  "https://plus.kipris.or.kr/openapi/rest/TrademarkAdvancedSearchService/trademarkAdvancedSearchInfo";

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractTagValue(source: string, tag: string): string | undefined {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = source.match(regex);
  if (!match) {
    return undefined;
  }
  return decodeHtmlEntities(match[1].trim());
}

function extractMultipleTagValues(source: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const values: string[] = [];
  for (const match of source.matchAll(regex)) {
    const cleaned = match[1].trim();
    if (cleaned) {
      values.push(decodeHtmlEntities(cleaned));
    }
  }
  return values;
}

function valueToString(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const stringified = String(value).trim();
  return stringified.length > 0 ? stringified : undefined;
}

function valueToStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const converted = value
      .map((entry) => valueToString(entry))
      .filter((entry): entry is string => Boolean(entry));
    return converted.length > 0 ? converted : undefined;
  }

  if (typeof value === "string") {
    const tokens = value
      .split(/[.,\s]+/)
      .map((token) => token.trim())
      .filter(Boolean);
    return tokens.length > 0 ? tokens : undefined;
  }

  return undefined;
}

function normalizeJsonItem(item: Record<string, unknown>): NormalizedTrademark {
  const markName =
    valueToString(item.trademarkName) ||
    valueToString(item.applicantName) ||
    valueToString(item.applicationName) ||
    "상표명 미확인";

  const classes =
    valueToStringArray(item.classification) ||
    valueToStringArray(item.intlClass) ||
    valueToStringArray(item.viennaCode);

  const similarMarks =
    valueToStringArray(item.similarMark) ||
    valueToStringArray(item.similarGroup);

  return {
    markName,
    applicationNumber:
      valueToString(item.applicationNumber) ||
      valueToString(item.applNum) ||
      valueToString(item.registrationNumber),
    applicationDate:
      valueToString(item.applicationDate) ||
      valueToString(item.applDate) ||
      valueToString(item.regPublicationDate),
    status:
      valueToString(item.registrationStatus) ||
      valueToString(item.registerStatus) ||
      valueToString(item.status),
    applicantName: valueToString(item.applicantName) || valueToString(item.ownerName),
    classes,
    similarMarks,
  } satisfies NormalizedTrademark;
}

async function parseKiprisResponse(bodyText: string): Promise<NormalizedTrademark[]> {
  const items = Array.from(bodyText.matchAll(/<item>([\s\S]*?)<\/item>/gi));

  if (items.length === 0) {
    return [];
  }

  return items.map((itemMatch) => {
    const itemSource = itemMatch[1];
    return {
      markName:
        extractTagValue(itemSource, "trademarkName") ||
        extractTagValue(itemSource, "applicantName") ||
        extractTagValue(itemSource, "applicationName") ||
        "상표명 미확인",
      applicationNumber:
        extractTagValue(itemSource, "applicationNumber") ||
        extractTagValue(itemSource, "applNum"),
      applicationDate:
        extractTagValue(itemSource, "applicationDate") ||
        extractTagValue(itemSource, "applDate"),
      status:
        extractTagValue(itemSource, "registrationStatus") ||
        extractTagValue(itemSource, "registerStatus") ||
        extractTagValue(itemSource, "status"),
      applicantName: extractTagValue(itemSource, "applicantName"),
      classes: extractMultipleTagValues(itemSource, "viennaCode")
        .concat(extractMultipleTagValues(itemSource, "classification"))
        .concat(extractMultipleTagValues(itemSource, "intlClass")),
      similarMarks: extractMultipleTagValues(itemSource, "similarGroup")
        .concat(extractMultipleTagValues(itemSource, "similarMark")),
    } satisfies NormalizedTrademark;
  });
}

async function normalizeResponse(rawResponse: Response): Promise<NormalizedTrademark[]> {
  const contentType = rawResponse.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    const json = await rawResponse.json();
    const candidateItems =
      json?.response?.body?.items?.item ?? json?.items ?? json?.results ?? [];

    if (!Array.isArray(candidateItems)) {
      return [];
    }

    return candidateItems.map((item) => normalizeJsonItem(item as Record<string, unknown>));
  }

  const bodyText = await rawResponse.text();
  return parseKiprisResponse(bodyText);
}

export async function POST(request: NextRequest) {
  let payload: SearchPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "유효한 검색 요청이 아닙니다." },
      { status: 400 }
    );
  }

  const query = payload.query?.trim();
  if (!query) {
    return NextResponse.json(
      { error: "검색할 상표명을 입력해주세요." },
      { status: 400 }
    );
  }

  const serviceKey = process.env.KIPRIS_API_KEY;
  const apiEndpoint = process.env.KIPRIS_API_ENDPOINT || DEFAULT_API_ENDPOINT;

  if (!serviceKey) {
    return NextResponse.json(
      { error: "KIPRIS API 인증 정보가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  const url = new URL(apiEndpoint);
  url.searchParams.set("ServiceKey", serviceKey);
  url.searchParams.set("searchString", query);
  if (payload.classifications?.length) {
    url.searchParams.set("classification", payload.classifications.join(","));
  }

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json, application/xml;q=0.9, text/xml;q=0.8",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: "상표 검색에 실패했습니다.",
          details: errorText.slice(0, 500),
        },
        { status: response.status }
      );
    }

    const normalizedResults = await normalizeResponse(response);

    return NextResponse.json({
      source: "kipris",
      query,
      count: normalizedResults.length,
      results: normalizedResults,
    });
  } catch (error) {
    console.error("KIPRIS API fetch error", error);
    return NextResponse.json(
      { error: "상표 검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
