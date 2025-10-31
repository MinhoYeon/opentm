import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export interface RecommendedProduct {
  순번: number;
  국문명칭: string;
  상품류: number;
  유사군코드: string;
  영문명칭: string;
  _score?: number;
  childrenCount: number;
  reason: string; // 추천 이유
  relevance: number; // 관련도 점수
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const selectedClassesParam = searchParams.get("classes");

    if (!selectedClassesParam) {
      return NextResponse.json({ recommendations: [] });
    }

    const selectedClasses = selectedClassesParam.split(",").map(Number).filter(Boolean);

    if (selectedClasses.length === 0) {
      return NextResponse.json({ recommendations: [] });
    }

    // 데이터 로드
    const genericJsonPath = join(process.cwd(), "data", "generic-products.json");
    const genericFileContent = await readFile(genericJsonPath, "utf-8");
    const genericData = JSON.parse(genericFileContent);

    const recommendations: RecommendedProduct[] = [];
    const processedIds = new Set<number>();

    // 1. 선택된 상품류에서 상위 개념 추출
    const selectedGenerics: any[] = [];
    selectedClasses.forEach((classNum) => {
      const classGenerics = genericData.byClass[classNum];
      if (classGenerics) {
        selectedGenerics.push(...classGenerics);
      }
    });

    // 2. 선택된 상위 개념들의 유사군코드 수집
    const selectedSimilarityCodes = new Set(
      selectedGenerics.map((g) => g.유사군코드.substring(0, 2)) // 앞 2자리로 유사성 판단
    );

    // 3. 같은 유사군 그룹에 속하는 다른 상위 개념 찾기
    Object.entries(genericData.hierarchy).forEach(([code, data]: [string, any]) => {
      if (!data.generic) return;

      const generic = data.generic;

      // 이미 선택된 상품류는 제외
      if (selectedClasses.includes(generic.상품류)) return;

      // 이미 처리된 상품은 제외
      if (processedIds.has(generic.순번)) return;

      const codePrefix = code.substring(0, 2);
      let relevance = 0;
      let reason = "";

      // 같은 유사군 그룹
      if (selectedSimilarityCodes.has(codePrefix)) {
        relevance = 80;
        reason = "선택하신 상품과 관련이 깊습니다";
      }

      // 점수가 높은 상위 개념 (인기 상품)
      if (generic._score && generic._score >= 8) {
        relevance = Math.max(relevance, 60);
        if (!reason) reason = "인기 있는 관련 카테고리입니다";
      }

      // 하위 상품이 많은 경우 (대표성)
      if (generic.childrenCount > 100) {
        relevance = Math.max(relevance, 50);
        if (!reason) reason = "폭넓은 상품 범위를 커버합니다";
      }

      if (relevance > 0) {
        recommendations.push({
          ...generic,
          reason,
          relevance,
        });
        processedIds.add(generic.순번);
      }
    });

    // 4. 사업분야 기반 추천 추가
    // 선택된 상품류가 어떤 사업분야에 속하는지 파악
    const businessCategoryMap: Record<string, number[]> = {
      "식음료": [29, 30, 32, 33, 43],
      "패션/뷰티": [3, 18, 25, 26],
      "IT/소프트웨어": [9, 35, 38, 42],
      "건강/의료": [5, 10, 44],
      "교육/엔터테인먼트": [16, 28, 41],
      "건설/부동산": [6, 17, 19, 37],
      "금융/비즈니스": [35, 36, 45],
      "제조": [1, 2, 7, 12],
      "물류": [39, 40],
      "법률/컨설팅": [45],
      "생활/가전": [11, 21],
    };

    // 선택된 상품류가 속한 사업분야 찾기
    const relevantBusinesses = new Set<string>();
    selectedClasses.forEach((classNum) => {
      Object.entries(businessCategoryMap).forEach(([business, classes]) => {
        if (classes.includes(classNum)) {
          relevantBusinesses.add(business);
        }
      });
    });

    // 같은 사업분야의 다른 상품류 추천
    relevantBusinesses.forEach((business) => {
      const relatedClasses = businessCategoryMap[business];
      relatedClasses.forEach((classNum) => {
        if (selectedClasses.includes(classNum)) return;

        const classGenerics = genericData.byClass[classNum];
        if (!classGenerics) return;

        classGenerics.slice(0, 2).forEach((generic: any) => {
          if (processedIds.has(generic.순번)) return;

          recommendations.push({
            ...generic,
            reason: `${business} 관련 추천`,
            relevance: 40,
          });
          processedIds.add(generic.순번);
        });
      });
    });

    // 5. 관련도 순으로 정렬하고 상위 15개만 반환
    const sortedRecommendations = recommendations
      .sort((a, b) => {
        if (b.relevance !== a.relevance) return b.relevance - a.relevance;
        return (b._score || 0) - (a._score || 0);
      })
      .slice(0, 15);

    return NextResponse.json({
      recommendations: sortedRecommendations,
      selectedClasses,
      totalRecommendations: recommendations.length,
    });
  } catch (error) {
    console.error("Failed to get recommendations:", error);
    return NextResponse.json(
      { error: "추천 상품을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
