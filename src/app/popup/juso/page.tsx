"use client";

import { useEffect } from "react";

export default function JusoPopupPage() {
  useEffect(() => {
    // URL 파라미터 확인
    const urlParams = new URLSearchParams(window.location.search);
    const inputYn = urlParams.get("inputYn");

    if (inputYn !== "Y") {
      // 최초 호출 - JUSO API로 POST 요청
      const confmKey = process.env.NEXT_PUBLIC_JUSO_API_KEY || "devU01TX0FVVEgyMDI1MDEyNzExMjA1NjExNTM0ODI=";
      const returnUrl = window.location.href;

      // 동적으로 폼 생성 및 제출
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "https://business.juso.go.kr/addrlink/addrLinkUrl.do";

      const fields = {
        confmKey: confmKey,
        returnUrl: returnUrl,
        resultType: "4", // 1:도로명, 2:도로명+지번, 3:도로명+상세건물명, 4:도로명+지번+상세건물명
      };

      Object.entries(fields).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } else {
      // 주소 선택 후 돌아온 경우 - 부모 창으로 데이터 전달
      const roadFullAddr = urlParams.get("roadFullAddr") || "";
      const roadAddrPart1 = urlParams.get("roadAddrPart1") || "";
      const addrDetail = urlParams.get("addrDetail") || "";
      const roadAddrPart2 = urlParams.get("roadAddrPart2") || "";
      const engAddr = urlParams.get("engAddr") || "";
      const jibunAddr = urlParams.get("jibunAddr") || "";
      const zipNo = urlParams.get("zipNo") || "";
      const admCd = urlParams.get("admCd") || "";
      const rnMgtSn = urlParams.get("rnMgtSn") || "";
      const bdMgtSn = urlParams.get("bdMgtSn") || "";
      const detBdNmList = urlParams.get("detBdNmList") || "";
      const bdNm = urlParams.get("bdNm") || "";
      const bdKdcd = urlParams.get("bdKdcd") || "";
      const siNm = urlParams.get("siNm") || "";
      const sggNm = urlParams.get("sggNm") || "";
      const emdNm = urlParams.get("emdNm") || "";
      const liNm = urlParams.get("liNm") || "";
      const rn = urlParams.get("rn") || "";
      const udrtYn = urlParams.get("udrtYn") || "";
      const buldMnnm = urlParams.get("buldMnnm") || "";
      const buldSlno = urlParams.get("buldSlno") || "";
      const mtYn = urlParams.get("mtYn") || "";
      const lnbrMnnm = urlParams.get("lnbrMnnm") || "";
      const lnbrSlno = urlParams.get("lnbrSlno") || "";
      const emdNo = urlParams.get("emdNo") || "";

      // 부모 창의 콜백 함수 호출
      if (window.opener && typeof window.opener.jusoCallBack === "function") {
        window.opener.jusoCallBack(
          roadFullAddr, roadAddrPart1, addrDetail, roadAddrPart2, engAddr,
          jibunAddr, zipNo, admCd, rnMgtSn, bdMgtSn, detBdNmList,
          bdNm, bdKdcd, siNm, sggNm, emdNm, liNm, rn, udrtYn,
          buldMnnm, buldSlno, mtYn, lnbrMnnm, lnbrSlno, emdNo
        );
      }

      // 팝업 창 닫기
      window.close();
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-300 border-t-blue-600"></div>
        <p className="mt-4 text-slate-600">주소를 검색하고 있습니다...</p>
      </div>
    </div>
  );
}
