import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export interface Product {
  순번: number;
  국문명칭: string;
  상품류: number;
  유사군코드: string;
  영문명칭: string;
  _score?: number;
}

export interface GenericProduct extends Product {
  childrenCount: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get("q");
    const classNumbersParam = searchParams.get("classes");

    if (!searchQuery && !classNumbersParam) {
      return NextResponse.json(
        { error: "검색어 또는 상품류를 입력해주세요." },
        { status: 400 }
      );
    }

    // JSON 파일 경로
    const jsonPath = join(process.cwd(), "data", "products.json");
    const genericJsonPath = join(process.cwd(), "data", "generic-products.json");

    // JSON 파일 읽기
    const fileContent = await readFile(jsonPath, "utf-8");
    const allProducts: Product[] = JSON.parse(fileContent);

    // 상위 개념 데이터 읽기
    const genericFileContent = await readFile(genericJsonPath, "utf-8");
    const genericData = JSON.parse(genericFileContent);

    let filteredProducts: Product[] = [];
    let matchedGenerics: GenericProduct[] = [];

    // 상품류로 필터링
    let classNumbers: number[] = [];
    if (classNumbersParam) {
      classNumbers = classNumbersParam.split(",").map(Number);
    }

    // 검색어로 필터링
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();

      // 1. 상위 개념에서 검색
      Object.values(genericData.byClass).forEach((classGenerics: any) => {
        classGenerics.forEach((generic: GenericProduct) => {
          if (
            generic.국문명칭.toLowerCase().includes(query) ||
            generic.영문명칭.toLowerCase().includes(query)
          ) {
            // 상품류 필터가 있으면 적용
            if (classNumbers.length === 0 || classNumbers.includes(generic.상품류)) {
              matchedGenerics.push(generic);

              // 해당 상위 개념의 하위 상품도 포함
              const hierarchyGroup = genericData.hierarchy[generic.유사군코드];
              if (hierarchyGroup && hierarchyGroup.children) {
                filteredProducts.push(generic, ...hierarchyGroup.children);
              } else {
                filteredProducts.push(generic);
              }
            }
          }
        });
      });

      // 2. 일반 상품에서 직접 검색
      const directMatches = allProducts.filter((product) => {
        const matchesSearch =
          product.국문명칭.toLowerCase().includes(query) ||
          product.영문명칭.toLowerCase().includes(query) ||
          product.유사군코드.toLowerCase().includes(query);

        const matchesClass =
          classNumbers.length === 0 || classNumbers.includes(product.상품류);

        return matchesSearch && matchesClass;
      });

      // 중복 제거하며 병합
      const productIds = new Set(filteredProducts.map((p) => p.순번));
      directMatches.forEach((product) => {
        if (!productIds.has(product.순번)) {
          filteredProducts.push(product);
          productIds.add(product.순번);
        }
      });
    } else {
      // 검색어 없이 상품류만 있는 경우
      filteredProducts = allProducts.filter((product) =>
        classNumbers.includes(product.상품류)
      );

      // 해당 상품류의 상위 개념 추출
      classNumbers.forEach((classNum) => {
        const classGenerics = genericData.byClass[classNum];
        if (classGenerics) {
          matchedGenerics.push(...classGenerics);
        }
      });
    }

    // 상위 개념의 순번 집합 생성
    const genericIds = new Set(
      Object.values(genericData.generics).map((g: any) => g.순번)
    );

    // 유사군코드별 계층 구조 생성 (필터링된 결과에 대해서만)
    const hierarchy: Record<
      string,
      { generic: GenericProduct | null; children: Product[] }
    > = {};

    matchedGenerics.forEach((generic) => {
      const code = generic.유사군코드;
      if (!hierarchy[code]) {
        hierarchy[code] = { generic, children: [] };
      }
    });

    // 하위 상품 매핑
    filteredProducts.forEach((product) => {
      if (!genericIds.has(product.순번)) {
        const code = product.유사군코드;
        if (hierarchy[code]) {
          hierarchy[code].children.push(product);
        } else {
          // 상위 개념이 없는 상품은 별도 그룹으로
          if (!hierarchy[code]) {
            hierarchy[code] = { generic: null, children: [product] };
          }
        }
      }
    });

    // 상품류별로 그룹화
    const productsByClass: Record<number, Product[]> = {};
    filteredProducts.forEach((product) => {
      if (!productsByClass[product.상품류]) {
        productsByClass[product.상품류] = [];
      }
      productsByClass[product.상품류].push(product);
    });

    return NextResponse.json({
      products: filteredProducts.slice(0, 500), // 최대 500개로 제한
      productsByClass,
      generics: matchedGenerics,
      hierarchy,
      totalCount: filteredProducts.length,
      genericsCount: matchedGenerics.length,
      searchQuery,
      hasMore: filteredProducts.length > 500,
    });
  } catch (error) {
    console.error("Failed to search products:", error);
    return NextResponse.json(
      { error: "상품 검색에 실패했습니다." },
      { status: 500 }
    );
  }
}
