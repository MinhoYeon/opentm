"use client";

import { useState, useEffect, useMemo } from "react";
import { BUSINESS_CATEGORIES, PRODUCT_CLASSES } from "@/data/productClassRecommendations";

interface Product {
  순번: number;
  국문명칭: string;
  상품류: number;
  유사군코드: string;
  영문명칭: string;
  _score?: number;
}

interface GenericProduct extends Product {
  childrenCount: number;
}

interface Hierarchy {
  generic: GenericProduct | null;
  children: Product[];
}

export default function ProductSuggestionsClient() {
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [generics, setGenerics] = useState<GenericProduct[]>([]);
  const [hierarchy, setHierarchy] = useState<Record<string, Hierarchy>>({});
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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
      setGenerics([]);
      setHierarchy({});
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
        setGenerics(data.generics || []);
        setHierarchy(data.hierarchy || {});
      })
      .catch((err) => {
        console.error("Failed to load products:", err);
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedClasses, searchQuery]);

  // 그룹 펼치기/접기
  const toggleGroup = (code: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(code)) {
        newSet.delete(code);
      } else {
        newSet.add(code);
      }
      return newSet;
    });
  };

  // 모든 그룹 펼치기/접기
  const toggleAllGroups = () => {
    if (expandedGroups.size === Object.keys(hierarchy).length) {
      setExpandedGroups(new Set());
    } else {
      setExpandedGroups(new Set(Object.keys(hierarchy)));
    }
  };

  // 상위 개념과 하위 상품 전체 선택
  const toggleGenericWithChildren = (generic: GenericProduct) => {
    const group = hierarchy[generic.유사군코드];
    if (!group) return;

    const allItems = [generic, ...group.children];
    const allSelected = allItems.every((item) =>
      selectedProducts.some((p) => p.순번 === item.순번)
    );

    if (allSelected) {
      // 전체 해제
      setSelectedProducts((prev) =>
        prev.filter((p) => !allItems.some((item) => item.순번 === p.순번))
      );
    } else {
      // 전체 선택
      const toAdd = allItems.filter(
        (item) => !selectedProducts.some((p) => p.순번 === item.순번)
      );
      setSelectedProducts((prev) => [...prev, ...toAdd]);
    }
  };

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

  // CSV 다운로드 (Excel에서 열 수 있음)
  const downloadCSV = () => {
    if (selectedProducts.length === 0) {
      alert("선택된 상품이 없습니다.");
      return;
    }

    try {
      // 상품류별로 정렬
      const sortedProducts = [...selectedProducts].sort((a, b) => {
        if (a.상품류 !== b.상품류) {
          return a.상품류 - b.상품류;
        }
        return a.순번 - b.순번;
      });

      // CSV 헤더
      const headers = ["상품류", "명칭(국문)", "명칭(영문)", "유사군코드"];

      // CSV 데이터 행
      const rows = sortedProducts.map((product) => [
        `제${product.상품류}류`,
        product.국문명칭,
        product.영문명칭,
        product.유사군코드,
      ]);

      // CSV 문자열 생성 (UTF-8 BOM 포함하여 Excel에서 한글이 깨지지 않도록)
      const csvContent = [
        "\uFEFF", // UTF-8 BOM
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
      ].join("\n");

      // Blob 생성 및 다운로드
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const today = new Date().toISOString().split("T")[0];

      link.setAttribute("href", url);
      link.setAttribute("download", `지정상품_${today}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("CSV 다운로드 실패:", error);
      alert("CSV 파일 다운로드에 실패했습니다.");
    }
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

        {/* 2단 레이아웃: 상품 선택 + 선택된 상품 */}
        {selectedClasses.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-[60%_40%]">
            {/* 왼쪽: 상품 선택 영역 */}
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
              <div className="space-y-4">
                {/* 컨트롤 버튼 */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleAllGroups}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      {expandedGroups.size === Object.keys(hierarchy).length
                        ? "모두 접기"
                        : "모두 펼치기"}
                    </button>
                    <span className="text-xs text-slate-500">
                      상위 개념 {generics.length}개 · 전체 {products.length}개
                    </span>
                  </div>
                  <button
                    onClick={toggleAllProducts}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    {selectedProducts.length === products.length ? "전체 해제" : "전체 선택"}
                  </button>
                </div>

                {/* 계층 구조 리스트 */}
                <div className="space-y-2">
                  {Object.entries(hierarchy)
                    .sort(([, a], [, b]) => {
                      // 상품류로 먼저 정렬
                      if (a.generic && b.generic) {
                        return a.generic.상품류 - b.generic.상품류;
                      }
                      return 0;
                    })
                    .map(([code, group]) => {
                      if (!group.generic) return null;

                      const isExpanded = expandedGroups.has(code);
                      const allItems = [group.generic, ...group.children];
                      const selectedCount = allItems.filter((item) =>
                        selectedProducts.some((p) => p.순번 === item.순번)
                      ).length;
                      const allSelected = selectedCount === allItems.length;
                      const someSelected = selectedCount > 0 && !allSelected;

                      return (
                        <div
                          key={code}
                          className="overflow-hidden rounded-lg border border-slate-200 bg-white"
                        >
                          {/* 상위 개념 행 */}
                          <div
                            className={`flex items-center gap-3 p-3 transition ${
                              allSelected ? "bg-indigo-50" : "bg-slate-50 hover:bg-slate-100"
                            }`}
                          >
                            {/* 체크박스 (상위 개념 + 하위 전체 선택) */}
                            <input
                              type="checkbox"
                              checked={allSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = someSelected;
                              }}
                              onChange={() => toggleGenericWithChildren(group.generic!)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              title={`${group.generic.국문명칭} 및 하위 상품 ${group.children.length}개 전체 선택`}
                            />

                            {/* 펼치기/접기 버튼 */}
                            <button
                              onClick={() => toggleGroup(code)}
                              className="flex flex-1 items-center gap-3 text-left"
                            >
                              <span className="text-slate-400">
                                {isExpanded ? "▼" : "▶"}
                              </span>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-900">
                                    {group.generic.국문명칭}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    ({group.generic.영문명칭})
                                  </span>
                                  {group.generic._score && (
                                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                                      점수 {group.generic._score}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 flex items-center gap-3 text-xs text-slate-600">
                                  <span>제{group.generic.상품류}류</span>
                                  <span>유사군: {code}</span>
                                  <span className="font-medium text-indigo-600">
                                    하위 상품 {group.children.length}개
                                  </span>
                                  {selectedCount > 0 && (
                                    <span className="font-medium text-emerald-600">
                                      선택됨 {selectedCount}개
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          </div>

                          {/* 하위 상품 목록 */}
                          {isExpanded && group.children.length > 0 && (
                            <div className="max-h-[400px] overflow-y-auto border-t border-slate-200 bg-white">
                              <table className="w-full text-sm">
                                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                                  <tr>
                                    <th className="px-4 py-2 text-left" style={{ width: "40px" }}></th>
                                    <th className="px-4 py-2 text-left">명칭(국문)</th>
                                    <th className="px-4 py-2 text-left">명칭(영문)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {group.children.map((child) => {
                                    const isChildSelected = selectedProducts.some(
                                      (p) => p.순번 === child.순번
                                    );
                                    return (
                                      <tr
                                        key={child.순번}
                                        className={`transition hover:bg-slate-50 ${
                                          isChildSelected ? "bg-indigo-50" : ""
                                        }`}
                                      >
                                        <td className="px-4 py-2">
                                          <input
                                            type="checkbox"
                                            checked={isChildSelected}
                                            onChange={() => toggleProduct(child)}
                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                          />
                                        </td>
                                        <td className="px-4 py-2 text-slate-800">
                                          {child.국문명칭}
                                        </td>
                                        <td className="px-4 py-2 text-slate-600">
                                          {child.영문명칭}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
            </section>

            {/* 오른쪽: 선택된 상품 영역 (sticky) */}
            {selectedProducts.length > 0 && (
              <section className="sticky top-6 flex max-h-[calc(100vh-3rem)] flex-col self-start overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {/* 헤더 (고정) */}
                <div className="flex items-center justify-between border-b border-slate-200 p-6 pb-4">
                  <h2 className="text-lg font-semibold text-slate-900">
                    선택된 상품 ({selectedProducts.length}개)
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedProducts([])}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      초기화
                    </button>
                    <button
                      onClick={downloadCSV}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700"
                    >
                      📥 CSV
                    </button>
                  </div>
                </div>

                {/* 상품 리스트 (스크롤) */}
                <div className="flex-1 overflow-y-auto p-6 pt-4">
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
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
