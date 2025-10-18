import { NextResponse } from "next/server";

interface NotificationPayload {
  brandName: string;
  trademarkType: string;
  productClasses: string[];
  representativeEmail: string;
  additionalNotes?: string;
  submittedAt?: string;
}

async function queueNotification(payload: NotificationPayload) {
  await new Promise((resolve) => setTimeout(resolve, 200));
  console.info("[notify] trademark submission", payload);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NotificationPayload;

    if (!body.brandName || !body.trademarkType || !body.representativeEmail) {
      return NextResponse.json(
        { error: "필수 정보가 누락되어 알림을 전송할 수 없습니다." },
        { status: 400 }
      );
    }

    await queueNotification(body);

    return NextResponse.json({ status: "queued" }, { status: 200 });
  } catch (error) {
    console.error("[notify] failed", error);
    return NextResponse.json(
      { error: "알림을 전송하는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
