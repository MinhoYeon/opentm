import { NextResponse } from "next/server";
import { requireAdminContext } from "@/lib/api/auth";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

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

    // 엑셀 파일 경로
    const excelPath = path.join(process.cwd(), "data", "특허청 고시상품명칭 12판(2025.10.).xlsx");

    if (!fs.existsSync(excelPath)) {
      return NextResponse.json(
        { error: "상품 데이터 파일을 찾을 수 없습니다." },
        { status: 500 }
      );
    }

    // 엑셀 파일 읽기
    const workbook = XLSX.readFile(excelPath);
    const sheetName = "지정상품 고시목록(2025.10 기준)";
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      return NextResponse.json(
        { error: "상품 데이터 시트를 찾을 수 없습니다." },
        { status: 500 }
      );
    }

    // 시트를 JSON으로 변환
    const rawData: unknown[] = XLSX.utils.sheet_to_json(worksheet);

    // 데이터 필터링 및 타입 변환
    const products: Product[] = rawData
      .map((row: any) => ({
        순번: row["순번"] || 0,
        국문명칭: row["지정상품(국문)"] || "",
        상품류: row["NICE분류"] || 0,
        유사군코드: row["유사군코드"] || "",
        영문명칭: row["지정상품(영문)"] || "",
      }))
      .filter((product) => {
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
