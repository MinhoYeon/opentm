"use client";

import { useEffect } from "react";

type AddressResult = {
  postalCode: string;
  address: string;
  roadAddress: string;
  detailAddress?: string;
};

type AddressSearchModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (result: AddressResult) => void;
  initialQuery?: string;
};

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

declare global {
  interface Window {
    jusoCallBack?: (
      roadFullAddr: string,
      roadAddrPart1: string,
      addrDetail: string,
      roadAddrPart2: string,
      engAddr: string,
      jibunAddr: string,
      zipNo: string,
      admCd: string,
      rnMgtSn: string,
      bdMgtSn: string,
      detBdNmList: string,
      bdNm: string,
      bdKdcd: string,
      siNm: string,
      sggNm: string,
      emdNm: string,
      liNm: string,
      rn: string,
      udrtYn: string,
      buldMnnm: string,
      buldSlno: string,
      mtYn: string,
      lnbrMnnm: string,
      lnbrSlno: string,
      emdNo: string
    ) => void;
  }
}

export function AddressSearchModal({ open, onClose, onSelect }: AddressSearchModalProps) {
  useEffect(() => {
    // 팝업에서 주소를 선택하면 호출될 콜백 함수 등록
    // JUSO API는 개별 파라미터들을 순서대로 전달합니다
    window.jusoCallBack = (
      roadFullAddr: string,
      roadAddrPart1: string,
      addrDetail: string,
      roadAddrPart2: string,
      engAddr: string,
      jibunAddr: string,
      zipNo: string
    ) => {
      const result: AddressResult = {
        postalCode: zipNo,
        address: jibunAddr,
        roadAddress: roadAddrPart1,
        detailAddress: addrDetail || "",
      };

      onSelect(result);
      onClose();
    };

    return () => {
      // 컴포넌트 언마운트 시 콜백 함수 제거
      delete window.jusoCallBack;
    };
  }, [onSelect, onClose]);

  useEffect(() => {
    if (!open) return;

    // 팝업 창 열기
    const popupWidth = 570;
    const popupHeight = 420;
    const left = window.screenX + (window.outerWidth - popupWidth) / 2;
    const top = window.screenY + (window.outerHeight - popupHeight) / 2;

    const popup = window.open(
      "/address-search.html",
      "addressSearchPopup",
      `width=${popupWidth},height=${popupHeight},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      alert("팝업이 차단되었습니다. 팝업 차단을 해제해 주세요.");
      onClose();
      return;
    }

    // 팝업이 닫혔는지 주기적으로 확인
    const checkPopupClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkPopupClosed);
        onClose();
      }
    }, 500);

    return () => {
      clearInterval(checkPopupClosed);
      if (popup && !popup.closed) {
        popup.close();
      }
    };
  }, [open, onClose]);

  // 이 컴포넌트는 팝업을 관리하는 역할만 하므로 UI를 렌더링하지 않음
  return null;
}
