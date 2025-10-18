import Image from "next/image";

const caseStudies = [
  {
    title: "한방 스킨케어 브랜드",
    result: "해외 출원까지 확장된 복합 상표 등록",
    description:
      "미국 및 일본 시장에 진출하기 위해 진정상표의 빅데이터 검색과 전문 변리사 검수를 거쳐 3개월 만에 선등록을 완료했습니다.",
  },
  {
    title: "프리미엄 디저트 카페",
    result: "경쟁 상표와의 충돌 위험 0건",
    description:
      "지역 상권 120만 건의 유사군을 비교 분석하여, 차별화된 서비스명과 로고를 안정적으로 확보했습니다.",
  },
  {
    title: "스마트 물류 SaaS",
    result: "국내외 5개류 동시 출원",
    description:
      "플랫폼 확장 전략에 맞춘 분류 제안으로 불필요한 비용을 줄이고, 신규 투자 라운드에 필요한 IP 포트폴리오를 완성했습니다.",
  },
];

const benefits = [
  {
    title: "AI 기반 사전 진단",
    description:
      "국내·해외 1,500만 건의 상표 데이터를 학습한 엔진이 실시간으로 충돌 가능성을 예측합니다.",
  },
  {
    title: "전담 변리사 파트너",
    description:
      "10년 이상 경력의 변리사가 전략 수립부터 의견서 대응까지 모든 절차를 동행합니다.",
  },
  {
    title: "브랜드 스토리 컨설팅",
    description:
      "브랜드 톤앤매너와 일관된 상표 명칭과 시각 요소까지 한 번에 정비할 수 있습니다.",
  },
];

const pricingTiers = [
  {
    name: "스타트",
    price: "₩290,000",
    description: "개인 및 소규모 사업자를 위한 필수 등록 패키지",
    features: [
      "국내 1개류 출원 대행",
      "AI 상표 유사도 리포트",
      "상표명 브레인스토밍 3안 제공",
    ],
  },
  {
    name: "그로스",
    price: "₩540,000",
    description: "성장 단계 브랜드를 위한 맞춤 컨설팅",
    features: [
      "국내 2개류 + 해외 1개국 사전 검색",
      "브랜드 스토리텔링 워크숍",
      "디자인 가이드 샘플 제공",
    ],
  },
  {
    name: "글로벌",
    price: "맞춤 견적",
    description: "글로벌 IP 포트폴리오 구축을 위한 종합 솔루션",
    features: [
      "다국어 명칭 현지화 컨설팅",
      "국제 출원 전략 및 일정 관리",
      "심판·이의신청 대응 패키지",
    ],
  },
];

const processSteps = [
  {
    title: "브랜드 진단 상담",
    description: "온라인으로 신청하면 24시간 이내 전문 컨설턴트가 맞춤 솔루션을 제안합니다.",
  },
  {
    title: "상표 명칭 & 디자인 정교화",
    description: "카피라이터와 디자이너가 브랜드 톤을 반영한 후보안을 제시합니다.",
  },
  {
    title: "지식재산권 심사 준비",
    description: "AI 리포트와 변리사 검토를 바탕으로 출원 전략과 필요 서류를 정리합니다.",
  },
  {
    title: "출원 및 사후 관리",
    description: "출원 접수 후 공고, 등록까지 진행 상황을 투명하게 공유하고 의견서 대응을 지원합니다.",
  },
];

const teamMembers = [
  {
    name: "김서윤",
    role: "Chief Brand Officer",
    bio: "패션·뷰티 업계 12년 경력의 브랜딩 전문가로, 진정성 있는 브랜드 메시지 설계를 이끕니다.",
  },
  {
    name: "이도현",
    role: "Lead Patent Attorney",
    bio: "다수의 글로벌 출원 경험을 지닌 변리사로서 복잡한 IP 전략을 책임집니다.",
  },
  {
    name: "박지안",
    role: "Head of Product",
    bio: "AI 기반 상표 검색 엔진을 개발하며 데이터로 입증되는 의사결정을 가능하게 합니다.",
  },
];

export default function Home() {
  return (

    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="h-screen overflow-y-auto snap-y snap-mandatory">
        <section
          id="hero"
          className="relative snap-start min-h-screen px-6 py-24 sm:px-12 lg:px-20 flex items-center"
        >
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(120,119,255,0.35),_rgba(7,8,20,0.95))]"
            aria-hidden
          />
          <div
            className="absolute left-1/2 top-1/4 h-64 w-64 -translate-x-1/2 rounded-full bg-purple-500/20 blur-3xl"
            aria-hidden
          />
          <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-16 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="flex flex-col gap-8">
              <div className="inline-flex items-center gap-3 rounded-full bg-white/5 px-4 py-2 text-sm backdrop-blur">
                <span className="inline-flex h-2 w-2 rounded-full bg-pink-400" />
                새로운 브랜드의 첫 걸음을, 진정성 있게
              </div>
              <div className="space-y-6">
                <p className="text-sm uppercase tracking-[0.35em] text-pink-200/80">JINJUNG TRADEMARK LAB</p>
                <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
                  진정상표와 함께라면 브랜드의 모든 순간이 안전해집니다.
                </h1>
                <p className="text-base leading-relaxed text-slate-200 sm:text-lg">
                  상표명 무료 조회부터 출원, 등록, 사후 관리까지. 진정상표는 데이터와 경험으로 브랜드의 진정성을 지켜내는
                  지식재산 파트너입니다.
                </p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <a
                  href="#process"
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-8 py-3 text-base font-medium text-white shadow-lg shadow-purple-500/30 transition-transform hover:-translate-y-0.5"
                >
                  상표등록 시작하기
                </a>
                <a
                  href="#pricing"
                  className="inline-flex items-center justify-center rounded-full border border-white/40 px-8 py-3 text-base font-medium text-white transition hover:border-pink-300 hover:text-pink-200"
                >
                  상표명 무료 조회
                </a>
              </div>
              <dl className="grid grid-cols-2 gap-6 text-sm sm:max-w-xl sm:grid-cols-4">
                <div>
                  <dt className="text-slate-400">평균 등록 기간</dt>
                  <dd className="mt-1 text-lg font-semibold text-white">3.2개월</dd>
                </div>
                <div>
                  <dt className="text-slate-400">검토 데이터</dt>
                  <dd className="mt-1 text-lg font-semibold text-white">1,500만+</dd>
                </div>
                <div>
                  <dt className="text-slate-400">누적 고객</dt>
                  <dd className="mt-1 text-lg font-semibold text-white">4,800개 브랜드</dd>
                </div>
                <div>
                  <dt className="text-slate-400">만족도</dt>
                  <dd className="mt-1 text-lg font-semibold text-white">98%</dd>
                </div>
              </dl>
            </div>
            <div className="relative flex items-center justify-center">
              <div className="absolute -left-8 top-12 h-24 w-24 rounded-full bg-indigo-400/40 blur-2xl" aria-hidden />
              <div className="absolute -right-10 bottom-10 h-28 w-28 rounded-full bg-pink-400/40 blur-2xl" aria-hidden />
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="rounded-2xl bg-slate-950/70 p-4 shadow-[0_40px_80px_rgba(92,81,255,0.35)]">
                  <Image
                    src="/jinjung-hero.svg"
                    alt="진정상표 브랜드 감성을 담은 추상 그래픽"
                    width={640}
                    height={480}
                    className="h-auto w-full"
                    priority
                  />
                  <div className="mt-6 space-y-2 text-left">
                    <p className="text-sm font-medium text-pink-200">Trademark Confidence Index</p>
                    <p className="text-2xl font-semibold text-white">0.92 안정권</p>
                    <p className="text-sm text-slate-300">
                      진정상표의 AI가 브랜드명 “Seonwoo Glow”의 유사도 위험을 8개 상권에서 분석한 결과입니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="진정상표 등록 사례"
          className="snap-start min-h-screen scroll-mt-24 px-6 py-24 sm:px-12 lg:px-20"
          aria-labelledby="cases-heading"
        >
          <div className="mx-auto flex h-full max-w-6xl flex-col justify-center">
            <header className="mb-12 space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-200">Success Stories</p>
              <h2 id="cases-heading" className="text-3xl font-semibold text-white sm:text-4xl">
                진정상표 등록 사례
              </h2>
              <p className="max-w-2xl text-base text-slate-300">
                업종과 규모에 상관없이, 진정상표는 브랜드의 본질을 지켜주는 전략적 파트너입니다. 실제 고객의 등록 사례를 통해
                차별화된 접근을 확인하세요.
              </p>
            </header>
            <div className="grid gap-6 md:grid-cols-3">
              {caseStudies.map((item) => (
                <article key={item.title} className="group flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 p-6">
                  <div className="mb-4 text-sm font-medium text-pink-200">{item.result}</div>
                  <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-slate-300 group-hover:text-slate-200">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="진정상표의 장점"
          className="snap-start min-h-screen scroll-mt-24 px-6 py-24 sm:px-12 lg:px-20"
          aria-labelledby="benefits-heading"
        >
          <div className="mx-auto flex h-full max-w-6xl flex-col justify-center">
            <header className="mb-12 space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-pink-200">Why Jinjung</p>
              <h2 id="benefits-heading" className="text-3xl font-semibold text-white sm:text-4xl">
                진정상표의 장점
              </h2>
              <p className="max-w-2xl text-base text-slate-300">
                첨단 기술과 인사이트, 그리고 사람 중심의 컨설팅이 만나 브랜드가 안심할 수 있는 등록 여정을 만듭니다.
              </p>
            </header>
            <div className="grid gap-6 md:grid-cols-3">
              {benefits.map((benefit) => (
                <article key={benefit.title} className="flex h-full flex-col rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6">
                  <h3 className="text-xl font-semibold text-white">{benefit.title}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-slate-300">{benefit.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="서비스 사용 비용"
          className="snap-start min-h-screen scroll-mt-24 px-6 py-24 sm:px-12 lg:px-20"
          aria-labelledby="pricing-heading"
        >
          <div className="mx-auto flex h-full max-w-6xl flex-col justify-center">
            <header className="mb-12 space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-200">Pricing</p>
              <h2 id="pricing-heading" className="text-3xl font-semibold text-white sm:text-4xl">
                서비스 사용 비용
              </h2>
              <p className="max-w-2xl text-base text-slate-300">
                브랜드의 성장 단계에 맞춰 선택할 수 있는 3가지 패키지. 필요에 따라 맞춤 구성이 가능합니다.
              </p>
            </header>
            <div className="grid gap-6 md:grid-cols-3">
              {pricingTiers.map((tier) => (
                <article key={tier.name} className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 p-6">
                  <div className="text-sm font-semibold uppercase tracking-[0.3em] text-pink-200">{tier.name}</div>
                  <div className="mt-4 text-3xl font-semibold text-white">{tier.price}</div>
                  <p className="mt-2 text-sm text-slate-300">{tier.description}</p>
                  <ul className="mt-6 space-y-3 text-sm text-slate-200">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-r from-indigo-400 to-pink-400" aria-hidden />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="상표등록 과정"
          className="snap-start min-h-screen scroll-mt-24 px-6 py-24 sm:px-12 lg:px-20"
          aria-labelledby="process-heading"
        >
          <div className="mx-auto flex h-full max-w-5xl flex-col justify-center">
            <header className="mb-12 space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-pink-200">How it Works</p>
              <h2 id="process-heading" className="text-3xl font-semibold text-white sm:text-4xl">
                상표등록 과정
              </h2>
              <p className="max-w-2xl text-base text-slate-300">
                진정상표가 제공하는 네 단계의 프로세스로 예측 가능한 상표 등록 경험을 누려보세요.
              </p>
            </header>
            <ol className="space-y-6 border-l border-white/10 pl-6">
              {processSteps.map((step, index) => (
                <li key={step.title} className="relative pl-6">
                  <span className="absolute -left-[45px] top-0 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 text-base font-semibold text-white">
                    {index + 1}
                  </span>
                  <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-300">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          id="진정상표 소개"
          className="snap-start min-h-screen scroll-mt-24 px-6 py-24 sm:px-12 lg:px-20"
          aria-labelledby="about-heading"
        >
          <div className="mx-auto flex h-full max-w-5xl flex-col justify-center gap-10 lg:flex-row lg:items-center">
            <div className="flex-1 space-y-6">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-200">About Us</p>
              <h2 id="about-heading" className="text-3xl font-semibold text-white sm:text-4xl">
                진정상표 소개
              </h2>
              <p className="text-base leading-relaxed text-slate-300">
                진정상표는 브랜드의 진정성을 지키는 것을 사명으로 삼은 지식재산 전문 팀입니다. 브랜드 네이밍과 비주얼 아이덴티티,
                상표 전략을 한 번에 설계해 성장 단계에서 흔들리지 않는 브랜드 자산을 구축합니다.
              </p>
              <p className="text-base leading-relaxed text-slate-300">
                우리는 국내외 데이터베이스와 딥러닝 모델을 활용하여 상표 충돌 위험을 사전에 차단하고, 각 산업군에 최적화된 컨설팅을
                제공합니다. 브랜드의 언어, 시각, 경험을 연결해 진정성 있는 스토리를 완성합니다.
              </p>
            </div>
            <div className="flex-1">
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-pink-500/20 p-8">
                <div className="absolute right-8 top-8 h-16 w-16 rounded-full bg-white/20 blur-2xl" aria-hidden />
                <div className="absolute -left-10 bottom-10 h-24 w-24 rounded-full bg-pink-400/20 blur-3xl" aria-hidden />
                <div className="relative space-y-4 text-sm leading-relaxed text-slate-100">
                  <p>
                    “브랜드는 단순한 이름을 넘어 고객과 약속하는 감정의 기록입니다. 진정상표는 그 약속이 흔들리지 않도록 데이터를 바탕으로
                    한 층 한 층 견고하게 쌓아 올립니다.”
                  </p>
                  <p className="text-xs uppercase tracking-[0.3em] text-pink-200">Jinjung Manifesto</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="진정상표 구성원 소개"
          className="snap-start min-h-screen scroll-mt-24 px-6 py-24 sm:px-12 lg:px-20"
          aria-labelledby="team-heading"
        >
          <div className="mx-auto flex h-full max-w-6xl flex-col justify-center">
            <header className="mb-12 space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-200">Team</p>
              <h2 id="team-heading" className="text-3xl font-semibold text-white sm:text-4xl">
                진정상표 구성원 소개
              </h2>
              <p className="max-w-2xl text-base text-slate-300">
                진정상표의 팀은 브랜드와 지식재산을 깊이 이해하는 전문가들로 구성되어 있습니다. 각 분야의 역량을 연결해 신뢰받는
                결과를 만들어냅니다.
              </p>
            </header>
            <div className="grid gap-6 md:grid-cols-3">
              {teamMembers.map((member) => (
                <article key={member.name} className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/5 p-6">
                  <h3 className="text-xl font-semibold text-white">{member.name}</h3>
                  <p className="mt-1 text-sm font-medium text-pink-200">{member.role}</p>
                  <p className="mt-4 text-sm leading-relaxed text-slate-300">{member.bio}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}