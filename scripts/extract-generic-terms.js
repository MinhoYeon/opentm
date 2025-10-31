const fs = require("fs");
const path = require("path");

// 상품 데이터 로드
const productsPath = path.join(__dirname, "..", "data", "products.json");
const products = JSON.parse(fs.readFileSync(productsPath, "utf-8"));

console.log(`총 ${products.length.toLocaleString()}개 상품 로드 완료\n`);

/**
 * 상위 개념 점수 계산
 * @param {Object} product - 상품 객체
 * @param {number} groupSize - 유사군 내 상품 개수
 * @returns {number} - 상위 개념 점수 (높을수록 상위 개념)
 */
function calculateScore(product, groupSize) {
  let score = 0;

  // 1. 명칭 길이 (짧을수록 상위 개념 가능성 높음)
  const nameLength = product.국문명칭.length;
  if (nameLength <= 2) score += 4;      // 매우 짧음
  else if (nameLength <= 4) score += 3; // 짧음
  else if (nameLength <= 6) score += 1; // 약간 짧음

  // 2. 키워드 포함 (명시적 상위 개념 표현)
  if (/^(기타|일반|모든)/.test(product.국문명칭)) score += 3; // 시작 부분
  else if (/기타|일반|모든/.test(product.국문명칭)) score += 2; // 포함

  // 3. 괄호 없음 (구체적 설명이 없음)
  if (!product.국문명칭.includes("(")) score += 1;

  // 4. 영문 명칭 단순성
  const engWords = (product.영문명칭.match(/\b[a-z]{3,}\b/gi) || []).filter(
    (w) => !["for", "and", "the", "with", "not"].includes(w.toLowerCase())
  );
  if (engWords.length === 1) score += 3;      // 단어 1개
  else if (engWords.length === 2) score += 2; // 단어 2개

  // 5. 그룹 크기 (대표성)
  if (groupSize > 100) score += 2;      // 큰 그룹
  else if (groupSize > 50) score += 1;  // 중간 그룹

  return score;
}

/**
 * 유사군코드별로 상위 개념 상품 추출
 */
function extractGenericTerms() {
  console.log("📊 유사군코드별 그룹핑 시작...\n");

  // 유사군코드별로 그룹핑
  const groups = {};
  products.forEach((p) => {
    if (!p.유사군코드) return;

    if (!groups[p.유사군코드]) {
      groups[p.유사군코드] = [];
    }
    groups[p.유사군코드].push(p);
  });

  console.log(`총 ${Object.keys(groups).length.toLocaleString()}개 유사군코드 발견\n`);

  // 각 그룹에서 상위 개념 추출
  const generics = [];
  const hierarchy = {};
  let totalGenericCount = 0;

  Object.entries(groups).forEach(([code, items]) => {
    // 점수 계산
    const scored = items.map((p) => ({
      product: p,
      score: calculateScore(p, items.length),
    }));

    // 점수 >= 5인 것만 필터링하고 정렬
    const qualified = scored
      .filter((s) => s.score >= 5)
      .sort((a, b) => {
        // 점수 우선, 같으면 명칭 길이로 정렬
        if (b.score !== a.score) return b.score - a.score;
        return a.product.국문명칭.length - b.product.국문명칭.length;
      })
      .slice(0, 5); // 그룹당 최대 5개

    if (qualified.length > 0) {
      const groupGenerics = qualified.map((s) => ({
        ...s.product,
        _score: s.score, // 디버깅용
      }));

      generics.push(...groupGenerics);
      totalGenericCount += qualified.length;

      // 계층 구조 생성
      hierarchy[code] = {
        generics: groupGenerics,
        totalProducts: items.length,
        children: items.filter(
          (item) => !groupGenerics.find((g) => g.순번 === item.순번)
        ),
      };
    }
  });

  console.log(`✅ 상위 개념 추출 완료: ${totalGenericCount.toLocaleString()}개\n`);

  return {
    generics,
    hierarchy,
    stats: {
      totalProducts: products.length,
      totalGroups: Object.keys(groups).length,
      totalGenerics: totalGenericCount,
      averageGenericsPerGroup: (totalGenericCount / Object.keys(groups).length).toFixed(2),
    },
  };
}

/**
 * 상품류별 상위 개념 매핑 생성
 */
function createClassMapping(hierarchy) {
  const byClass = {};

  Object.entries(hierarchy).forEach(([code, data]) => {
    data.generics.forEach((generic) => {
      const classNum = generic.상품류;
      if (!byClass[classNum]) {
        byClass[classNum] = [];
      }
      byClass[classNum].push({
        ...generic,
        유사군코드: code,
        childrenCount: data.children.length,
      });
    });
  });

  // 각 상품류별로 점수 순 정렬
  Object.keys(byClass).forEach((classNum) => {
    byClass[classNum].sort((a, b) => b._score - a._score);
  });

  return byClass;
}

// 실행
console.log("🚀 상위 개념 추출 시작...\n");
console.log("=".repeat(60) + "\n");

const result = extractGenericTerms();
const byClass = createClassMapping(result.hierarchy);

// 통계 출력
console.log("=".repeat(60));
console.log("📈 추출 통계\n");
console.log(`전체 상품 수: ${result.stats.totalProducts.toLocaleString()}개`);
console.log(`유사군코드 수: ${result.stats.totalGroups.toLocaleString()}개`);
console.log(`상위 개념 수: ${result.stats.totalGenerics.toLocaleString()}개`);
console.log(`평균 (그룹당): ${result.stats.averageGenericsPerGroup}개\n`);

// 샘플 출력
console.log("=".repeat(60));
console.log("📋 샘플 데이터 (제25류 - 의류/신발)\n");

if (byClass[25]) {
  byClass[25].slice(0, 10).forEach((item) => {
    console.log(
      `[점수 ${item._score}] ${item.국문명칭} (${item.영문명칭}) - 하위 ${item.childrenCount}개`
    );
  });
} else {
  console.log("제25류 데이터 없음");
}

console.log("\n" + "=".repeat(60));
console.log("📋 샘플 데이터 (제30류 - 커피/빵)\n");

if (byClass[30]) {
  byClass[30].slice(0, 10).forEach((item) => {
    console.log(
      `[점수 ${item._score}] ${item.국문명칭} (${item.영문명칭}) - 하위 ${item.childrenCount}개`
    );
  });
} else {
  console.log("제30류 데이터 없음");
}

// JSON 파일 생성
const outputPath = path.join(__dirname, "..", "data", "generic-products.json");
const output = {
  metadata: {
    generatedAt: new Date().toISOString(),
    ...result.stats,
    scoringRules: {
      threshold: 5,
      maxPerGroup: 5,
      nameLength: { veryShort: 4, short: 3, medium: 1 },
      keywords: { start: 3, contains: 2 },
      noBrackets: 1,
      englishSimplicity: { oneWord: 3, twoWords: 2 },
      groupSize: { large: 2, medium: 1 },
    },
  },
  byClass,
  hierarchy: result.hierarchy,
  generics: result.generics,
};

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");

console.log("\n" + "=".repeat(60));
console.log(`✅ 파일 생성 완료: ${outputPath}`);
console.log(`파일 크기: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
console.log("=".repeat(60) + "\n");
