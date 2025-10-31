/**
 * 특허청 고시상품명칭 Excel 파일을 JSON으로 변환하는 스크립트
 *
 * 실행 방법:
 * node scripts/convert-products-to-json.js
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelPath = path.join(__dirname, '..', 'data', '특허청 고시상품명칭 12판(2025.10.).xlsx');
const outputPath = path.join(__dirname, '..', 'data', 'products.json');

console.log('📊 Excel 파일 읽는 중...');
console.log('경로:', excelPath);

// 엑셀 파일 읽기
const workbook = XLSX.readFile(excelPath);
const sheetName = '지정상품 고시목록(2025.10 기준)';
const worksheet = workbook.Sheets[sheetName];

if (!worksheet) {
  console.error('❌ 시트를 찾을 수 없습니다:', sheetName);
  process.exit(1);
}

console.log('✅ Excel 파일 로드 완료');
console.log('🔄 JSON으로 변환 중...');

// 시트를 JSON으로 변환
const rawData = XLSX.utils.sheet_to_json(worksheet);

// 데이터 정제 및 타입 변환
const products = rawData.map((row) => ({
  순번: row['순번'] || 0,
  국문명칭: row['지정상품(국문)'] || '',
  상품류: row['NICE분류'] || 0,
  유사군코드: row['유사군코드'] || '',
  영문명칭: row['지정상품(영문)'] || '',
}));

console.log('✅ 변환 완료:', products.length.toLocaleString(), '개 상품');

// 상품류별 통계
const classCounts = {};
products.forEach((product) => {
  const classNum = product.상품류;
  classCounts[classNum] = (classCounts[classNum] || 0) + 1;
});

console.log('📈 상품류별 통계:');
Object.keys(classCounts)
  .sort((a, b) => Number(a) - Number(b))
  .forEach((classNum) => {
    console.log(`  제${classNum}류: ${classCounts[classNum].toLocaleString()}개`);
  });

// JSON 파일로 저장
console.log('💾 JSON 파일 저장 중...');
fs.writeFileSync(outputPath, JSON.stringify(products, null, 2), 'utf-8');

const stats = fs.statSync(outputPath);
const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);

console.log('✅ JSON 파일 저장 완료!');
console.log('📁 파일 경로:', outputPath);
console.log('📦 파일 크기:', fileSizeMB, 'MB');
console.log('');
console.log('🎉 변환 작업이 완료되었습니다!');
