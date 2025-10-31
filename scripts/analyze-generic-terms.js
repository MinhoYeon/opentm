const fs = require("fs");
const products = JSON.parse(fs.readFileSync("data/products.json", "utf-8"));

// "기타", "그 외", "모든" 등이 포함된 상품 찾기
console.log("=== \"기타\" 포함 명칭 ===");
const withEtc = products.filter(p =>
  p.국문명칭.includes("기타") ||
  p.국문명칭.includes("그 외") ||
  p.국문명칭.includes("모든") ||
  p.국문명칭.includes("일반")
).slice(0, 25);

withEtc.forEach(p => {
  console.log(`[제${p.상품류}류] ${p.국문명칭}`);
});

// 영문이 단순한 것들
console.log("\n=== 영문이 단순한 명칭 (단어 1개) ===");
const simpleEnglish = products.filter(p => {
  const words = p.영문명칭.toLowerCase()
    .replace(/[^a-z ]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 2 && !["for", "and", "the", "with", "not"].includes(w));
  return words.length === 1;
}).slice(0, 30);

simpleEnglish.forEach(p => {
  console.log(`[제${p.상품류}류] ${p.국문명칭} | ${p.영문명칭}`);
});

// 같은 유사군코드 내에서 가장 짧은 명칭 (상위 개념 가능성)
console.log("\n=== 각 유사군코드별 가장 짧은 명칭 TOP 30 ===");
const bySimilarity = {};
products.forEach(p => {
  if (!p.유사군코드) return;
  if (!bySimilarity[p.유사군코드]) {
    bySimilarity[p.유사군코드] = [];
  }
  bySimilarity[p.유사군코드].push(p);
});

const shortestInGroup = [];
Object.keys(bySimilarity).forEach(code => {
  const sorted = bySimilarity[code].sort((a, b) => a.국문명칭.length - b.국문명칭.length);
  if (sorted[0] && sorted[0].국문명칭.length <= 4) {
    shortestInGroup.push({
      code,
      product: sorted[0],
      groupSize: sorted.length
    });
  }
});

shortestInGroup
  .sort((a, b) => b.groupSize - a.groupSize)
  .slice(0, 30)
  .forEach(item => {
    console.log(`[${item.code}] ${item.product.국문명칭} (${item.product.영문명칭}) - 그룹 ${item.groupSize}개`);
  });
