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

    // JSON 파일 읽기
    const fileContent = await readFile(jsonPath, "utf-8");
    const allProducts: Product[] = JSON.parse(fileContent);

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

    // 상품류별로 그룹화
    const productsByClass: Record<number, Product[]> = {};
    products.forEach((product) => {
      if (!productsByClass[product.상품류]) {
        productsByClass[product.상품류] = [];
      }
      productsByClass[product.상품류].push(product);
    });

    return NextResponse.json({
      products,
      productsByClass,
      totalCount: products.length,
    });
  } catch (error) {
    console.error("Failed to load products:", error);
    return NextResponse.json(
      { error: "상품 데이터를 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
