"use server";

import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";

import { createServerClient } from "@/lib/supabaseServerClient";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const TRADEMARK_IMAGE_BUCKET = "trademark-images";

export type TrademarkType = "word" | "logo" | "combined";

export interface SubmitTrademarkRequestImage {
  dataUrl: string;
  fileName: string;
  fileType: string;
  size: number;
}

export interface SubmitTrademarkRequestInput {
  brandName: string;
  trademarkType: TrademarkType;
  productClasses: string[];
  representativeEmail: string;
  additionalNotes?: string;
  image?: SubmitTrademarkRequestImage | null;
  userId?: string | null;
}

export type SubmitTrademarkRequestResult =
  | {
      success: true;
      requestId: string;
      requestLink: string;
      imageUrl: string | null;
    }
  | {
      success: false;
      message: string;
      errors: string[];
    };

function sanitizeFileName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function extractDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(?<mime>[-\w+.\/]+);base64,(?<base64>[A-Za-z0-9+/=]+)$/);
  if (!match || !match.groups) {
    throw new Error("이미지 데이터 URL 형식이 올바르지 않습니다.");
  }
  return {
    mimeType: match.groups.mime,
    base64: match.groups.base64,
  };
}

function deriveExtension(image: SubmitTrademarkRequestImage, mimeType: string): string {
  if (image.fileName.includes(".")) {
    return image.fileName.substring(image.fileName.lastIndexOf("."));
  }

  const map: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/svg+xml": ".svg",
  };

  return map[mimeType] ?? "";
}

function buildRequestLink(requestId: string): string {
  const baseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!baseUrl) {
    return `/mypage/requests/${requestId}`;
  }
  return `${baseUrl.replace(/\/$/, "")}/mypage/requests/${requestId}`;
}

function validateInput(input: SubmitTrademarkRequestInput): string[] {
  const problems: string[] = [];

  if (!input.brandName || !input.brandName.trim()) {
    problems.push("상표명을 입력해 주세요.");
  }

  if (!input.trademarkType) {
    problems.push("상표 유형을 선택해 주세요.");
  }

  if (!Array.isArray(input.productClasses) || input.productClasses.length === 0) {
    problems.push("최소 한 개 이상의 상품류를 선택해 주세요.");
  }

  const email = input.representativeEmail?.trim();
  if (!email) {
    problems.push("담당자 이메일을 입력해 주세요.");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    problems.push("담당자 이메일 형식이 올바르지 않습니다.");
  }

  if (input.image) {
    if (input.image.size > MAX_IMAGE_SIZE_BYTES) {
      problems.push("이미지 파일은 5MB 이하만 업로드할 수 있습니다.");
    }
    if (!input.image.fileType.startsWith("image/")) {
      problems.push("이미지 파일만 업로드할 수 있습니다.");
    }
  }

  return problems;
}

export { sanitizeFileName, extractDataUrl, validateInput };

export async function submitTrademarkRequest(
  input: SubmitTrademarkRequestInput
): Promise<SubmitTrademarkRequestResult> {
  const errors = validateInput(input);
  if (errors.length > 0) {
    return {
      success: false,
      message: "제출한 정보를 다시 확인해 주세요.",
      errors,
    };
  }

  // Use user's session instead of admin client
  const supabase = createServerClient("mutable");
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Authentication error:', authError);
    return {
      success: false,
      message: "인증에 실패했습니다. 다시 로그인해 주세요.",
      errors: ["인증 오류가 발생했습니다."],
    };
  }

  const requestId = randomUUID();
  let imageUrl: string | null = null;
  let imagePath: string | null = null;

  if (input.image) {
    try {
      const { mimeType, base64 } = extractDataUrl(input.image.dataUrl);
      if (mimeType !== input.image.fileType) {
        throw new Error("업로드된 이미지 정보가 일치하지 않습니다.");
      }
      const buffer = Buffer.from(base64, "base64");
      if (buffer.byteLength === 0) {
        throw new Error("업로드된 이미지 데이터가 비어 있습니다.");
      }
      if (buffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
        throw new Error("이미지 파일은 5MB 이하만 업로드할 수 있습니다.");
      }

      const extension = deriveExtension(input.image, mimeType);
      const safeName = sanitizeFileName(input.image.fileName || "trademark");
      const fileName = `${safeName || "trademark"}${extension}`;
      imagePath = `${user.id}/${requestId}/${Date.now()}-${fileName}`;

      const { error: uploadError } = await supabase
        .storage
        .from(TRADEMARK_IMAGE_BUCKET)
        .upload(imagePath, buffer, { contentType: mimeType, upsert: false });
      if (uploadError) {
        throw uploadError;
      }
      const { data: publicUrlData } = supabase
        .storage
        .from(TRADEMARK_IMAGE_BUCKET)
        .getPublicUrl(imagePath);
      imageUrl = publicUrlData.publicUrl;
    } catch (error) {
      console.error('Failed to upload trademark image:', error);
      const message =
        error instanceof Error
          ? error.message
          : (error as any)?.message || "이미지 업로드 중 오류가 발생했습니다.";
      const details = (error as any)?.details;
      const hint = (error as any)?.hint;
      const code = (error as any)?.code;

      const fullMessage = [
        message,
        details ? `상세: ${details}` : null,
        hint ? `힌트: ${hint}` : null,
        code ? `코드: ${code}` : null,
      ].filter(Boolean).join(' ');

      return {
        success: false,
        message: fullMessage,
        errors: [fullMessage],
      };
    }
  }

  const submittedAt = new Date().toISOString();

  try {
    // trademark_requests에 저장 (관리자가 수동으로 승인할 때까지 대기)
    const { error: insertError } = await supabase
      .from("trademark_requests")
      .insert({
      id: requestId,
      user_id: user.id,
      brand_name: input.brandName.trim(),
      trademark_type: input.trademarkType,
      image_url: imageUrl,
      image_storage_path: imagePath,
      product_classes: input.productClasses,
      representative_email: input.representativeEmail.trim(),
      additional_notes: input.additionalNotes?.trim() || null,
      submitted_at: submittedAt,
      status: "submitted",
      status_detail: "요청이 접수되었습니다. 관리자 승인 대기 중입니다.",
      status_updated_at: submittedAt,
      })
      .select()
      .single();
    if (insertError) {
      throw insertError;
    }
  } catch (error) {
    console.error('Failed to insert trademark request:', error);
    const message =
      error instanceof Error
        ? error.message
        : (error as any)?.message || "출원 요청 저장 중 오류가 발생했습니다.";
    const details = (error as any)?.details;
    const hint = (error as any)?.hint;
    const code = (error as any)?.code;

    const fullMessage = [
      message,
      details ? `상세: ${details}` : null,
      hint ? `힌트: ${hint}` : null,
      code ? `코드: ${code}` : null,
    ].filter(Boolean).join(' ');

    return {
      success: false,
      message: fullMessage,
      errors: [fullMessage],
    };
  }

  const requestLink = buildRequestLink(requestId);
  const functionName = process.env.SUPABASE_NOTIFICATION_FUNCTION;
  if (functionName) {
    try {
      await supabase.functions.invoke(functionName, {
        body: {
          requestId,
          brandName: input.brandName,
          representativeEmail: input.representativeEmail,
          submittedAt,
          imageUrl,
        },
      });
    } catch (error) {
      console.error("Failed to invoke notification function", error);
    }
  }

  return {
    success: true,
    requestId,
    requestLink,
    imageUrl,
  };
}
