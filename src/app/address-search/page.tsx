"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

type JusoCallbackParams = {
  roadFullAddr: string;
  roadAddrPart1: string;
  roadAddrPart2: string;
  engAddr: string;
  jibunAddr: string;
  zipNo: string;
  addrDetail: string;
  admCd: string;
  rnMgtSn: string;
  bdMgtSn: string;
  detBdNmList: string;
  bdNm: string;
  bdKdcd: string;
  siNm: string;
  sggNm: string;
  emdNm: string;
  liNm: string;
  rn: string;
  udrtYn: string;
  buldMnnm: string;
  buldSlno: string;
  mtYn: string;
  lnbrMnnm: string;
  lnbrSlno: string;
  emdNo: string;
};

export default function AddressSearchPage() {
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const inputYn = searchParams.get("inputYn");

    if (inputYn !== "Y") {
      // 최초 호출 - 주소 검색 API로 POST 요청
      if (formRef.current) {
        formRef.current.submit();
      }
    } else {
      // 주소 선택 후 돌아온 경우 - 부모 창으로 데이터 전달
      const params: JusoCallbackParams = {
        roadFullAddr: searchParams.get("roadFullAddr") || "",
        roadAddrPart1: searchParams.get("roadAddrPart1") || "",
        roadAddrPart2: searchParams.get("roadAddrPart2") || "",
        engAddr: searchParams.get("engAddr") || "",
        jibunAddr: searchParams.get("jibunAddr") || "",
        zipNo: searchParams.get("zipNo") || "",
        addrDetail: searchParams.get("addrDetail") || "",
        admCd: searchParams.get("admCd") || "",
        rnMgtSn: searchParams.get("rnMgtSn") || "",
        bdMgtSn: searchParams.get("bdMgtSn") || "",
        detBdNmList: searchParams.get("detBdNmList") || "",
        bdNm: searchParams.get("bdNm") || "",
        bdKdcd: searchParams.get("bdKdcd") || "",
        siNm: searchParams.get("siNm") || "",
        sggNm: searchParams.get("sggNm") || "",
        emdNm: searchParams.get("emdNm") || "",
        liNm: searchParams.get("liNm") || "",
        rn: searchParams.get("rn") || "",
        udrtYn: searchParams.get("udrtYn") || "",
        buldMnnm: searchParams.get("buldMnnm") || "",
        buldSlno: searchParams.get("buldSlno") || "",
        mtYn: searchParams.get("mtYn") || "",
        lnbrMnnm: searchParams.get("lnbrMnnm") || "",
        lnbrSlno: searchParams.get("lnbrSlno") || "",
        emdNo: searchParams.get("emdNo") || "",
      };

      // 부모 창의 콜백 함수 호출
      if (window.opener && typeof window.opener.jusoCallBack === "function") {
        window.opener.jusoCallBack(params);
      }

      // 팝업 창 닫기
      window.close();
    }
  }, [searchParams]);

  // 환경 변수에서 승인키 가져오기 (없으면 테스트키 사용)
  const confmKey = process.env.NEXT_PUBLIC_JUSO_API_KEY || "devU01TX0FVVEgyMDI1MDEyNzExMjA1NjExNTM0ODI=";
  const currentUrl = typeof window !== "undefined" ? window.location.origin + "/address-search" : "";

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center">
        <p className="text-slate-600">주소 검색 창으로 이동 중...</p>
        <form
          ref={formRef}
          method="post"
          action="https://business.juso.go.kr/addrlink/addrLinkUrl.do"
        >
          <input type="hidden" name="confmKey" value={confmKey} />
          <input type="hidden" name="returnUrl" value={currentUrl} />
          <input type="hidden" name="resultType" value="4" />
        </form>
      </div>
    </div>
  );
}
