export default function PostApplicationSteps() {
  const steps = [
    { title: '변리사 상세 검토', description: '10년 경력의 변리사가 최종 출원 전, 상표에 대해 상세 검토를 진행합니다.' },
    { title: '변리사 1:1 상담(유선)', description: '접수 내용 확인 및 내용 수정, 보완 등을 위해 변리사가 직접 연락드립니다.' },
    { title: '특허청 출원 신청 접수', description: '내용에 문제가 없을 시, 특허청에 출원을 신청합니다.' },
    { title: '특허청 심사', description: '특허청의 심사를 거칩니다. (일반 등록: 15개월 이상 소요, 빠른 등록: 약 2~3개월 소요)' },
    { title: '자료 제출(거절 시)', description: '특허청에서 심사를 거절하면 변리사가 사유를 검토하고 소명, 보완 자료를 제출합니다.' },
    { title: '출원 공고(통과 시)', description: '특허청 심사를 통과하면 2개월 동안 출원 공고를 게재합니다. (기간 내 이의 없을 시 등록 결정)' },
    { title: '등록료 납부', description: '특허청에 등록료를 납부하면 최종적으로 상표등록이 완료됩니다. (10년 기준 212,102원)' },
    { title: '상표등록증 수령', description: '약 1달 뒤, 입력해 둔 주소지로 상표등록증이 발송됩니다.' },
  ];

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h3 className="mb-6 text-xl font-semibold text-white">신청 이후</h3>
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
