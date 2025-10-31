import { NextResponse } from "next/server";
import { requireAdminContext } from "@/lib/api/auth";
import { readFile } from "fs/promises";
import { join } from "path";

export interface Product {
  순번: number;
  국문명칭: string;
  상품류: number;
  유사군코드: string;
  영문명칭: string;
  _score?: number; // 상위 개념 점수
}

export interface GenericProduct extends Product {
  childrenCount: number;
}

export async function GET(request: Request) {
  try {
    // 관리자 인증 확인
    await requireAdminContext();

    const { searchParams } = new URL(request.url);
    const classNumbersParam = searchParams.get("classes");
    const searchQuery = searchParams.get("search");

    if (!classNumbersParam) {
      return NextResponse.json(
        { error: "상품류를 선택해주세요." },
        { status: 400 }
      );
    }

    const classNumbers = classNumbersParam.split(",").map(Number);

    // JSON 파일 경로
    const jsonPath = join(process.cwd(), "data", "products.json");
    const genericJsonPath = join(process.cwd(), "data", "generic-products.json");

    // JSON 파일 읽기
    const fileContent = await readFile(jsonPath, "utf-8");
    const allProducts: Product[] = JSON.parse(fileContent);

    // 상위 개념 데이터 읽기
    const genericFileContent = await readFile(genericJsonPath, "utf-8");
    const genericData = JSON.parse(genericFileContent);

    // 데이터 필터링
    const products = allProducts.filter((product) => {
      // 선택된 상품류에 속하는지 확인
      if (!classNumbers.includes(product.상품류)) {
        return false;
      }

      // 검색어가 있으면 필터링
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          product.국문명칭.toLowerCase().includes(query) ||
          product.영문명칭.toLowerCase().includes(query) ||
          product.유사군코드.toLowerCase().includes(query)
        );
      }

      return true;
    });

    // 선택된 상품류의 상위 개념 추출
    const generics: GenericProduct[] = [];
    classNumbers.forEach((classNum) => {
      const classGenerics = genericData.byClass[classNum];
      if (classGenerics) {
        generics.push(...classGenerics);
      }
    });

    // 상위 개념의 순번 집합 생성
    const genericIds = new Set(generics.map(g => g.순번));

    // 상품류별로 그룹화
    const productsByClass: Record<number, Product[]> = {};
    products.forEach((product) => {
      if (!productsByClass[product.상품류]) {
        productsByClass[product.상품류] = [];
      }
      productsByClass[product.상품류].push(product);
    });

    // 유사군코드별 계층 구조 생성
    const hierarchy: Record<string, { generic: GenericProduct | null; children: Product[] }> = {};

    generics.forEach((generic) => {
      const code = generic.유사군코드;
      if (!hierarchy[code]) {
        hierarchy[code] = { generic, children: [] };
      }
    });

    // 하위 상품 매핑 (상위 개념이 아닌 상품들)
    products.forEach((product) => {
      if (!genericIds.has(product.순번)) {
        const code = product.유사군코드;
        if (hierarchy[code]) {
          hierarchy[code].children.push(product);
        }
      }
    });

    return NextResponse.json({
      products,
      productsByClass,
      generics,
      hierarchy,
      totalCount: products.length,
      genericsCount: generics.length,
    });
  } catch (error) {
    console.error("Failed to load products:", error);
    return NextResponse.json(
      { error: "상품 데이터를 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
