export default function PreApplicationSteps() {
  const steps = [
    { title: '등록할 상표 입력', description: '등록하고 싶은 상표명을 입력합니다.' },
    { title: '로고 유무 선택', description: '로고를 가지고 있다면 이미지 파일로 첨부합니다. (없어도 진행 가능)' },
    { title: '카테고리 선택', description: '상표를 등록하고 싶은 카테고리를 선택합니다. (추후 상담을 통해 변경 가능)' },
    { title: '출원 기간, 비용 확인', description: '출원에 드는 예상 기간과 비용 확인 후, 심사기간 단축 옵션 등을 선택합니다.' },
    { title: '연락처 입력', description: '고객님께 연락할 수 있도록 전화번호, 이메일 주소를 입력합니다.' },
    { title: '변리사 전달 내용 확인', description: '변리사에게 전달할 정보가 올바른지 최종 확인합니다.' },
    { title: '결제수단 선택', description: '카드결제와 무통장입금 중 결제수단 한 가지를 선택합니다.' },
    { title: '결제 및 신청 완료', description: '결제 및 상표등록 신청이 완료되었습니다.' },
  ];

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h3 className="mb-6 text-xl font-semibold text-white">신청 전</h3>
      <ol className="space-y-6 border-l border-white/10 pl-6">
        {steps.map((step, index) => (
          <li key={step.title} className="relative pl-6">
            <span className="absolute -left-[45px] top-0 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 text-base font-semibold text-white">{index + 1}</span>
            <h4 className="text-base font-semibold text-white">{step.title}</h4>
            <p className="mt-2 text-sm text-slate-300">{step.description}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
