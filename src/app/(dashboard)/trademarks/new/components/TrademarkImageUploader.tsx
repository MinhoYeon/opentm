"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import { createBrowserClient } from "@/lib/supabaseBrowserClient";

type UploadedImage = {
  name: string;
  size: number;
  type: string;
  previewUrl: string;
  storagePath: string;
  publicUrl: string;
};

type TrademarkImageUploaderProps = {
  userId: string;
  value?: UploadedImage | null;
  onChange?: (value: UploadedImage | null) => void;
  bucket?: string;
  pathPrefix?: string;
  disabled?: boolean;
  maxSizeBytes?: number;
};

const DEFAULT_BUCKET = "trademark-images";
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function TrademarkImageUploader({
  userId,
  value = null,
  onChange,
  bucket = DEFAULT_BUCKET,
  pathPrefix,
  disabled = false,
  maxSizeBytes = DEFAULT_MAX_SIZE,
}: TrademarkImageUploaderProps) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value?.previewUrl ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPreviewUrl(value?.previewUrl ?? null);
  }, [value?.previewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) {
        return;
      }
      const [file] = Array.from(files);
      if (!file) {
        return;
      }

      if (file.size > maxSizeBytes) {
        setError("이미지 파일은 5MB 이하만 업로드할 수 있습니다.");
        return;
      }

      const safeName = sanitizeFileName(file.name || "trademark");
      const prefix = pathPrefix ?? userId;
      const key = `${prefix}/${crypto.randomUUID?.() ?? Date.now()}-${safeName || "trademark"}`;

      setIsUploading(true);
      setError(null);

      try {
        const { error: uploadError } = await supabase.storage.from(bucket).upload(key, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData, error: urlError } = supabase.storage
          .from(bucket)
          .getPublicUrl(key);

        if (urlError) {
          throw urlError;
        }

        const nextPreview = URL.createObjectURL(file);
        setPreviewUrl((prev) => {
          if (prev && prev !== nextPreview) {
            URL.revokeObjectURL(prev);
          }
          return nextPreview;
        });

        const uploaded: UploadedImage = {
          name: file.name,
          size: file.size,
          type: file.type,
          previewUrl: nextPreview,
          storagePath: key,
          publicUrl: publicUrlData.publicUrl,
        };

        onChange?.(uploaded);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "이미지를 업로드하는 중 오류가 발생했습니다.";
        setError(message);
      } finally {
        setIsUploading(false);
      }
    },
    [bucket, maxSizeBytes, onChange, pathPrefix, supabase, userId]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      if (disabled || isUploading) {
        return;
      }
      setIsDragging(false);
      void handleFiles(event.dataTransfer.files);
    },
    [disabled, handleFiles, isUploading]
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled || isUploading) {
        return;
      }
      void handleFiles(event.target.files);
    },
    [disabled, handleFiles, isUploading]
  );

  const clearImage = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    onChange?.(null);
  }, [onChange, previewUrl]);

  return (
    <div className="space-y-3">
      <label
        htmlFor="trademark-image-input"
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled && !isUploading) {
            setIsDragging(true);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled && !isUploading) {
            setIsDragging(true);
          }
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
          isDragging
            ? "border-indigo-400 bg-indigo-50"
            : "border-slate-300 bg-slate-50 hover:border-indigo-300"
        } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
      >
        <input
          id="trademark-image-input"
          name="trademark-image"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInputChange}
          disabled={disabled || isUploading}
        />
        <span className="text-sm font-medium text-slate-700">
          {isUploading ? "이미지를 업로드하는 중..." : "이미지를 드래그하거나 클릭하여 업로드"}
        </span>
        <span className="mt-2 text-xs text-slate-500">
          최대 5MB, PNG/JPG/SVG 등 이미지를 업로드할 수 있습니다.
        </span>
      </label>

      {error ? (
        <p className="text-sm text-rose-600">{error}</p>
      ) : null}

      {previewUrl ? (
        <div className="relative h-48 overflow-hidden rounded-2xl border border-slate-200">
          <Image
            src={previewUrl}
            alt="업로드된 상표 이미지 미리보기"
            fill
            sizes="(min-width: 640px) 384px, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 px-4 py-2 text-xs text-white">
            <span>{value?.name ?? "업로드된 이미지"}</span>
            <button
              type="button"
              onClick={clearImage}
              className="rounded-full border border-white/40 px-3 py-1 text-xs font-medium transition hover:bg-white/10"
            >
              제거
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export type { UploadedImage };
