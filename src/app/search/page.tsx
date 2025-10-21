import type { Metadata } from "next";

import SearchClient from "./SearchClient";

export const metadata: Metadata = {
  title: "상표 검색 | 진정상표",
  description:
    "브랜드 상표명을 실시간으로 검색하고 유사 상표 현황을 확인한 뒤, 안전하게 출원을 진행하세요.",
};

export default function SearchPage() {
  return <SearchClient />;
}
