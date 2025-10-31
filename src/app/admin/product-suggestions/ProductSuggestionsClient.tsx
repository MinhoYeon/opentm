"use client";

import { useState, useEffect, useMemo } from "react";
import { BUSINESS_CATEGORIES, PRODUCT_CLASSES } from "@/data/productClassRecommendations";
import * as XLSX from "xlsx";

interface Product {
  순번: number;
  국문명칭: string;
  상품류: number;
  유사군코드: string;
  영문명칭: string;
}

export default function ProductSuggestionsClient() {
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 상품류별로 그룹화된 선택된 상품
  const selectedProductsByClass = useMemo(() => {
    const grouped: Record<number, Product[]> = {};
    selectedProducts.forEach((product) => {
      if (!grouped[product.상품류]) {
        grouped[product.상품류] = [];
      }
      grouped[product.상품류].push(product);
    });
    return grouped;
  }, [selectedProducts]);

  // 상품류 토글
  const toggleClass = (classNumber: number) => {
    setSelectedClasses((prev) =>
      prev.includes(classNumber)
        ? prev.filter((c) => c !== classNumber)
        : [...prev, classNumber]
    );
  };

  // 상품 데이터 로드
  useEffect(() => {
    if (selectedClasses.length === 0) {
      setProducts([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    const classesParam = selectedClasses.join(",");
    const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : "";

    fetch(`/api/admin/products?classes=${classesParam}${searchParam}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("상품 데이터를 불러오는데 실패했습니다.");
        }
        return res.json();
      })
      .then((data) => {
        setProducts(data.products || []);
      })
      .catch((err) => {
        console.error("Failed to load products:", err);
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedClasses, searchQuery]);

  // 상품 선택/해제
  const toggleProduct = (product: Product) => {
    setSelectedProducts((prev) => {
      const exists = prev.some((p) => p.순번 === product.순번);
      if (exists) {
        return prev.filter((p) => p.순번 !== product.순번);
      } else {
        return [...prev, product];
      }
    });
  };

  // 전체 선택/해제
  const toggleAllProducts = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts([...products]);
    }
  };

  // 엑셀 다운로드
  const downloadExcel = () => {
    if (selectedProducts.length === 0) {
      alert("선택된 상품이 없습니다.");
      return;
    }

    // 상품류별로 정렬
    const sortedProducts = [...selectedProducts].sort((a, b) => {
      if (a.상품류 !== b.상품류) {
        return a.상품류 - b.상품류;
      }
      return a.순번 - b.순번;
    });

    // 엑셀 데이터 준비
    const excelData = sortedProducts.map((product) => ({
      상품류: `제${product.상품류}류`,
      "명칭(국문)": product.국문명칭,
      "명칭(영문)": product.영문명칭,
      유사군코드: product.유사군코드,
    }));

    // 워크시트 생성
    const ws = XLSX.utils.json_to_sheet(excelData);

    // 컬럼 너비 설정
    ws["!cols"] = [
      { wch: 10 },  // 상품류
      { wch: 30 },  // 명칭(국문)
      { wch: 30 },  // 명칭(영문)
      { wch: 15 },  // 유사군코드
    ];

    // 워크북 생성
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "선택된 상품");

    // 파일 다운로드
    const today = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `지정상품_${today}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">상품 제안</h1>
            <p className="mt-1 text-sm text-slate-600">
              사업분야별로 상품류를 선택하고 지정상품을 추천해드립니다
            </p>
          </div>
          <a
            href="/admin/trademarks"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            ← 대시보드로 돌아가기
          </a>
        </div>

        {/* 사업분야별 상품류 선택 */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            1단계: 사업분야별 상품류 선택
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {BUSINESS_CATEGORIES.map((category) => (
              <fieldset
                key={category.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <legend className="text-sm font-semibold text-slate-800">
                  {category.label}
                </legend>
                <p className="mb-2 text-[10px] text-slate-500">{category.description}</p>
                <div className="space-y-2">
                  {category.primaryClasses.map((productClass) => {
                    const isSelected = selectedClasses.includes(productClass.classNumber);
                    return (
                      <label
                        key={productClass.classNumber}
                        className="flex cursor-pointer items-start gap-2 text-xs text-slate-700 transition hover:text-slate-900"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleClass(productClass.classNumber)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="leading-tight">
                          {productClass.label}{" "}
                          <span className="text-slate-500">({productClass.description})</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          {/* 전체 상품류 선택 드롭다운 */}
          <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50">
            <summary className="cursor-pointer p-4 text-sm font-medium text-slate-700">
              전체 상품류에서 선택 (1류~45류)
            </summary>
            <div className="border-t border-slate-200 p-4">
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {Object.values(PRODUCT_CLASSES).map((productClass) => {
                  const isSelected = selectedClasses.includes(productClass.classNumber);
                  return (
                    <label
                      key={productClass.classNumber}
                      className="flex cursor-pointer items-start gap-2 text-xs text-slate-700 transition hover:text-slate-900"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleClass(productClass.classNumber)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="leading-tight">
                        {productClass.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </details>

          {selectedClasses.length > 0 && (
            <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
              <p className="text-sm font-medium text-indigo-900">
                선택된 상품류 ({selectedClasses.length}개)
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedClasses.sort((a, b) => a - b).map((classNum) => {
                  const productClass = PRODUCT_CLASSES[classNum];
                  return (
                    <span
                      key={classNum}
                      className="inline-flex items-center gap-1 rounded-full border border-indigo-300 bg-white px-3 py-1 text-xs text-indigo-900"
                    >
                      {productClass?.label || `제${classNum}류`}
                      <button
                        onClick={() => toggleClass(classNum)}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        ✕
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* 상품 테이블 */}
        {selectedClasses.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                2단계: 지정상품 선택
              </h2>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="상품 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <button
                  onClick={toggleAllProducts}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  {selectedProducts.length === products.length ? "전체 해제" : "전체 선택"}
                </button>
              </div>
            </div>

            {isLoading && (
              <div className="py-12 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
                <p className="mt-3 text-sm text-slate-600">상품 데이터를 불러오는 중...</p>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {!isLoading && !error && products.length === 0 && (
              <div className="py-12 text-center text-sm text-slate-600">
                상품류를 선택하면 관련 상품이 표시됩니다.
              </div>
            )}

            {!isLoading && !error && products.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-700">
                    <tr>
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedProducts.length === products.length}
                          onChange={toggleAllProducts}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="px-4 py-3">상품류</th>
                      <th className="px-4 py-3">명칭(국문)</th>
                      <th className="px-4 py-3">명칭(영문)</th>
                      <th className="px-4 py-3">유사군코드</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {products.map((product) => {
                      const isSelected = selectedProducts.some((p) => p.순번 === product.순번);
                      return (
                        <tr
                          key={product.순번}
                          className={`transition hover:bg-slate-50 ${
                            isSelected ? "bg-indigo-50" : ""
                          }`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleProduct(product)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            제{product.상품류}류
                          </td>
                          <td className="px-4 py-3 text-slate-700">{product.국문명칭}</td>
                          <td className="px-4 py-3 text-slate-600">{product.영문명칭}</td>
                          <td className="px-4 py-3 text-slate-600">{product.유사군코드}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="mt-4 text-center text-sm text-slate-600">
                  총 {products.length}개 상품
                </div>
              </div>
            )}
          </section>
        )}

        {/* 선택된 상품 리스트 */}
        {selectedProducts.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                3단계: 선택된 상품 ({selectedProducts.length}개)
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedProducts([])}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  선택 초기화
                </button>
                <button
                  onClick={downloadExcel}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                >
                  📥 엑셀 다운로드
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {Object.keys(selectedProductsByClass)
                .map(Number)
                .sort((a, b) => a - b)
                .map((classNumber) => {
                  const classProducts = selectedProductsByClass[classNumber];
                  const productClass = PRODUCT_CLASSES[classNumber];
                  return (
                    <div key={classNumber} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <h3 className="mb-3 font-semibold text-slate-900">
                        {productClass?.label || `제${classNumber}류`} ({classProducts.length}개)
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="border-b border-slate-300 text-xs uppercase text-slate-700">
                            <tr>
                              <th className="px-3 py-2">명칭(국문)</th>
                              <th className="px-3 py-2">명칭(영문)</th>
                              <th className="px-3 py-2">유사군코드</th>
                              <th className="px-3 py-2"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {classProducts.map((product) => (
                              <tr key={product.순번} className="hover:bg-slate-100">
                                <td className="px-3 py-2 text-slate-800">{product.국문명칭}</td>
                                <td className="px-3 py-2 text-slate-600">{product.영문명칭}</td>
                                <td className="px-3 py-2 text-slate-600">{product.유사군코드}</td>
                                <td className="px-3 py-2 text-right">
                                  <button
                                    onClick={() => toggleProduct(product)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    제거
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
