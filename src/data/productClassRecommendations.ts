/**
 * 사업분야별 상품류 추천 데이터
 * 특허청 고시상품명칭 12판(2025.10.) 기준으로 작성
 */

export interface ProductClass {
  classNumber: number;
  label: string;
  description: string;
}

export interface BusinessCategory {
  id: string;
  label: string;
  description: string;
  primaryClasses: ProductClass[];  // 핵심 상품류 (반드시 추천)
  relatedClasses: ProductClass[];  // 관련 상품류 (함께 추천)
}

export const PRODUCT_CLASSES: Record<number, ProductClass> = {
  1: { classNumber: 1, label: "제1류", description: "화학품, 비료" },
  2: { classNumber: 2, label: "제2류", description: "페인트, 염료" },
  3: { classNumber: 3, label: "제3류", description: "화장품, 세제" },
  4: { classNumber: 4, label: "제4류", description: "연료, 오일" },
  5: { classNumber: 5, label: "제5류", description: "약품, 건강보조식품" },
  6: { classNumber: 6, label: "제6류", description: "금속재료" },
  7: { classNumber: 7, label: "제7류", description: "기계, 공작기계" },
  8: { classNumber: 8, label: "제8류", description: "수공구, 칼붙이" },
  9: { classNumber: 9, label: "제9류", description: "소프트웨어, 전자기기" },
  10: { classNumber: 10, label: "제10류", description: "의료기기" },
  11: { classNumber: 11, label: "제11류", description: "조명, 난방기기" },
  12: { classNumber: 12, label: "제12류", description: "차량, 운송기구" },
  13: { classNumber: 13, label: "제13류", description: "화기, 폭발물" },
  14: { classNumber: 14, label: "제14류", description: "귀금속, 보석" },
  15: { classNumber: 15, label: "제15류", description: "악기" },
  16: { classNumber: 16, label: "제16류", description: "서적, 인쇄물" },
  17: { classNumber: 17, label: "제17류", description: "고무, 플라스틱" },
  18: { classNumber: 18, label: "제18류", description: "가방, 지갑" },
  19: { classNumber: 19, label: "제19류", description: "건축재료" },
  20: { classNumber: 20, label: "제20류", description: "가구, 액자" },
  21: { classNumber: 21, label: "제21류", description: "주방용품, 화장용구" },
  22: { classNumber: 22, label: "제22류", description: "로프, 천막" },
  23: { classNumber: 23, label: "제23류", description: "직물용 실" },
  24: { classNumber: 24, label: "제24류", description: "직물, 침구" },
  25: { classNumber: 25, label: "제25류", description: "의류, 신발" },
  26: { classNumber: 26, label: "제26류", description: "헤어액세서리, 단추" },
  27: { classNumber: 27, label: "제27류", description: "카펫, 매트" },
  28: { classNumber: 28, label: "제28류", description: "게임, 완구" },
  29: { classNumber: 29, label: "제29류", description: "육류, 생선, 냉동식품" },
  30: { classNumber: 30, label: "제30류", description: "곡물, 빵, 커피, 차" },
  31: { classNumber: 31, label: "제31류", description: "미가공 농산물" },
  32: { classNumber: 32, label: "제32류", description: "음료, 주스" },
  33: { classNumber: 33, label: "제33류", description: "주류" },
  34: { classNumber: 34, label: "제34류", description: "담배, 흡연용품" },
  35: { classNumber: 35, label: "제35류", description: "광고, 경영, 소매업" },
  36: { classNumber: 36, label: "제36류", description: "금융, 보험, 부동산" },
  37: { classNumber: 37, label: "제37류", description: "건설, 수리" },
  38: { classNumber: 38, label: "제38류", description: "통신 서비스" },
  39: { classNumber: 39, label: "제39류", description: "운송, 배송" },
  40: { classNumber: 40, label: "제40류", description: "재료 가공" },
  41: { classNumber: 41, label: "제41류", description: "교육, 오락, 공연" },
  42: { classNumber: 42, label: "제42류", description: "과학기술 서비스, IT개발" },
  43: { classNumber: 43, label: "제43류", description: "식당, 숙박" },
  44: { classNumber: 44, label: "제44류", description: "의료, 미용, 농업 서비스" },
  45: { classNumber: 45, label: "제45류", description: "법률, 보안, 소셜 네트워킹" },
};

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  {
    id: "food-beverage",
    label: "식품 & 음료",
    description: "식음료 제조, 유통, 외식업",
    primaryClasses: [
      PRODUCT_CLASSES[29], // 육류, 생선, 냉동식품
      PRODUCT_CLASSES[30], // 곡물, 빵, 커피, 차
      PRODUCT_CLASSES[32], // 음료
    ],
    relatedClasses: [
      PRODUCT_CLASSES[33], // 주류
      PRODUCT_CLASSES[43], // 식당, 카페 서비스
      PRODUCT_CLASSES[35], // 소매업
    ],
  },
  {
    id: "fashion-beauty",
    label: "패션 & 뷰티",
    description: "의류, 화장품, 액세서리",
    primaryClasses: [
      PRODUCT_CLASSES[25], // 의류, 신발
      PRODUCT_CLASSES[3],  // 화장품
      PRODUCT_CLASSES[18], // 가방, 지갑
    ],
    relatedClasses: [
      PRODUCT_CLASSES[14], // 귀금속, 보석
      PRODUCT_CLASSES[26], // 헤어액세서리
      PRODUCT_CLASSES[35], // 소매업
      PRODUCT_CLASSES[44], // 미용 서비스
    ],
  },
  {
    id: "it-software",
    label: "IT & 소프트웨어",
    description: "소프트웨어, 앱, 플랫폼",
    primaryClasses: [
      PRODUCT_CLASSES[9],  // 소프트웨어, 앱
      PRODUCT_CLASSES[42], // IT 개발, 기술 서비스
    ],
    relatedClasses: [
      PRODUCT_CLASSES[38], // 통신 서비스
      PRODUCT_CLASSES[35], // 광고, 경영
      PRODUCT_CLASSES[45], // 소셜 네트워킹
    ],
  },
  {
    id: "healthcare",
    label: "의료 & 헬스케어",
    description: "의료, 건강관리, 웰니스",
    primaryClasses: [
      PRODUCT_CLASSES[5],  // 약품, 건강보조식품
      PRODUCT_CLASSES[10], // 의료기기
      PRODUCT_CLASSES[44], // 의료 서비스
    ],
    relatedClasses: [
      PRODUCT_CLASSES[42], // 연구개발
      PRODUCT_CLASSES[41], // 교육
    ],
  },
  {
    id: "education-entertainment",
    label: "교육 & 엔터테인먼트",
    description: "교육, 게임, 공연, 출판",
    primaryClasses: [
      PRODUCT_CLASSES[41], // 교육, 오락, 공연
      PRODUCT_CLASSES[9],  // 게임 소프트웨어
    ],
    relatedClasses: [
      PRODUCT_CLASSES[16], // 서적, 인쇄물
      PRODUCT_CLASSES[28], // 게임, 완구
      PRODUCT_CLASSES[38], // 방송
      PRODUCT_CLASSES[35], // 이벤트 기획
    ],
  },
  {
    id: "construction-realestate",
    label: "건설 & 부동산",
    description: "건축, 인테리어, 부동산",
    primaryClasses: [
      PRODUCT_CLASSES[37], // 건설, 수리
      PRODUCT_CLASSES[19], // 건축재료
      PRODUCT_CLASSES[36], // 부동산
    ],
    relatedClasses: [
      PRODUCT_CLASSES[6],  // 금속재료
      PRODUCT_CLASSES[20], // 가구
      PRODUCT_CLASSES[42], // 건축 설계
    ],
  },
  {
    id: "finance-business",
    label: "금융 & 비즈니스",
    description: "금융, 보험, 컨설팅",
    primaryClasses: [
      PRODUCT_CLASSES[36], // 금융, 보험
      PRODUCT_CLASSES[35], // 광고, 경영
    ],
    relatedClasses: [
      PRODUCT_CLASSES[42], // 데이터 분석
      PRODUCT_CLASSES[45], // 법률 서비스
      PRODUCT_CLASSES[9],  // 금융 소프트웨어
    ],
  },
  {
    id: "manufacturing",
    label: "제조 & 화학",
    description: "제조업, 화학, 소재",
    primaryClasses: [
      PRODUCT_CLASSES[1],  // 화학품
      PRODUCT_CLASSES[7],  // 기계
      PRODUCT_CLASSES[40], // 재료 가공
    ],
    relatedClasses: [
      PRODUCT_CLASSES[17], // 고무, 플라스틱
      PRODUCT_CLASSES[6],  // 금속재료
      PRODUCT_CLASSES[42], // 연구개발
    ],
  },
  {
    id: "logistics-transport",
    label: "운송 & 물류",
    description: "운송, 배송, 물류",
    primaryClasses: [
      PRODUCT_CLASSES[39], // 운송, 배송
      PRODUCT_CLASSES[12], // 차량
    ],
    relatedClasses: [
      PRODUCT_CLASSES[35], // 유통
      PRODUCT_CLASSES[42], // 물류 시스템
    ],
  },
  {
    id: "legal-consulting",
    label: "법률 & 컨설팅",
    description: "법률, 특허, 컨설팅",
    primaryClasses: [
      PRODUCT_CLASSES[45], // 법률 서비스, 지식재산
    ],
    relatedClasses: [
      PRODUCT_CLASSES[35], // 경영 컨설팅
      PRODUCT_CLASSES[42], // 기술 컨설팅
    ],
  },
  {
    id: "home-living",
    label: "홈 & 리빙",
    description: "가구, 주방용품, 인테리어",
    primaryClasses: [
      PRODUCT_CLASSES[20], // 가구
      PRODUCT_CLASSES[21], // 주방용품
      PRODUCT_CLASSES[11], // 조명
    ],
    relatedClasses: [
      PRODUCT_CLASSES[24], // 침구
      PRODUCT_CLASSES[27], // 카펫
      PRODUCT_CLASSES[35], // 소매업
    ],
  },
];

/**
 * 선택한 상품류에 대한 추천 상품류 반환
 */
export function getRecommendedClasses(selectedClassNumbers: number[]): ProductClass[] {
  if (selectedClassNumbers.length === 0) {
    return [];
  }

  const recommendations = new Set<number>();

  // 각 사업분야를 확인하여 선택된 상품류가 포함되어 있으면 관련 상품류 추가
  BUSINESS_CATEGORIES.forEach(category => {
    const primaryNumbers = category.primaryClasses.map(c => c.classNumber);
    const relatedNumbers = category.relatedClasses.map(c => c.classNumber);
    const allCategoryNumbers = [...primaryNumbers, ...relatedNumbers];

    // 선택된 상품류 중 하나라도 이 카테고리에 속하면
    const hasMatch = selectedClassNumbers.some(num => allCategoryNumbers.includes(num));

    if (hasMatch) {
      // 핵심 상품류 추천 (높은 우선순위)
      primaryNumbers.forEach(num => {
        if (!selectedClassNumbers.includes(num)) {
          recommendations.add(num);
        }
      });

      // 관련 상품류도 추천 (낮은 우선순위)
      relatedNumbers.forEach(num => {
        if (!selectedClassNumbers.includes(num)) {
          recommendations.add(num);
        }
      });
    }
  });

  // Set을 배열로 변환하고 ProductClass 객체 반환
  return Array.from(recommendations)
    .map(num => PRODUCT_CLASSES[num])
    .filter(Boolean)
    .slice(0, 6); // 최대 6개까지만 추천
}

/**
 * 사업분야별로 그룹화된 상품류 옵션 반환
 */
export function getProductClassGroups() {
  return BUSINESS_CATEGORIES.map(category => ({
    label: category.label,
    description: category.description,
    options: [
      ...category.primaryClasses.map(c => ({
        value: `${c.label}(${c.description})`,
        classNumber: c.classNumber,
        isPrimary: true,
      })),
      ...category.relatedClasses.map(c => ({
        value: `${c.label}(${c.description})`,
        classNumber: c.classNumber,
        isPrimary: false,
      })),
    ],
  }));
}
