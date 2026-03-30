"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CropMode = "fixed" | "flexible";

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ImageMeta = {
  width: number;
  height: number;
};

type DisplayImageRect = Rect & {
  scale: number;
};

type CropHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

type InteractionState =
  | {
      type: "move";
      pointerId: number;
      startX: number;
      startY: number;
      startRect: Rect;
    }
  | {
      type: "resize";
      pointerId: number;
      startX: number;
      startY: number;
      startRect: Rect;
      handle: CropHandle;
    };

type Props = {
  name?: string;
  accept?: string;
  disabled?: boolean;
  className?: string;
  mode?: CropMode;
  fixedAspectRatio?: number;
  fixedAspectLabel?: string;
  defaultFlexibleAspectRatio?: number;
  onCroppedFile?: (file: File) => Promise<void> | void;
};

const DEFAULT_ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif";
const DEFAULT_FIXED_ASPECT_RATIO = 16 / 9;
const MIN_FLEXIBLE_ASPECT = 0.4;
const MAX_FLEXIBLE_ASPECT = 2.5;
const MAX_OUTPUT_SIDE = 1920;
const MIN_CROP_SIDE = 56;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function preferredOutputMime(inputMime: string) {
  if (inputMime === "image/jpeg" || inputMime === "image/png" || inputMime === "image/webp") {
    return inputMime;
  }
  return "image/png";
}

function extensionByMime(mime: string) {
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/webp") return ".webp";
  return ".png";
}

function formatAspectLabel(aspectRatio: number) {
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) return "1 : 1";
  if (aspectRatio >= 1) {
    return `${aspectRatio.toFixed(2)} : 1`;
  }
  return `1 : ${(1 / aspectRatio).toFixed(2)}`;
}

function stripExtension(fileName: string) {
  const index = fileName.lastIndexOf(".");
  if (index <= 0) return fileName;
  return fileName.slice(0, index);
}

function hasNorth(handle: CropHandle) {
  return handle === "n" || handle === "ne" || handle === "nw";
}

function hasSouth(handle: CropHandle) {
  return handle === "s" || handle === "se" || handle === "sw";
}

function hasEast(handle: CropHandle) {
  return handle === "e" || handle === "ne" || handle === "se";
}

function hasWest(handle: CropHandle) {
  return handle === "w" || handle === "nw" || handle === "sw";
}

function getFixedMinSize(aspectRatio: number) {
  if (aspectRatio >= 1) {
    return {
      minWidth: MIN_CROP_SIDE * aspectRatio,
      minHeight: MIN_CROP_SIDE,
    };
  }
  return {
    minWidth: MIN_CROP_SIDE,
    minHeight: MIN_CROP_SIDE / aspectRatio,
  };
}

function clampMoveRect(rect: Rect, boundsWidth: number, boundsHeight: number): Rect {
  const maxX = Math.max(0, boundsWidth - rect.width);
  const maxY = Math.max(0, boundsHeight - rect.height);
  return {
    ...rect,
    x: clamp(rect.x, 0, maxX),
    y: clamp(rect.y, 0, maxY),
  };
}

function clampFreeRect(rect: Rect, boundsWidth: number, boundsHeight: number): Rect {
  const maxWidth = Math.max(MIN_CROP_SIDE, boundsWidth);
  const maxHeight = Math.max(MIN_CROP_SIDE, boundsHeight);
  const width = clamp(rect.width, MIN_CROP_SIDE, maxWidth);
  const height = clamp(rect.height, MIN_CROP_SIDE, maxHeight);
  return clampMoveRect({ ...rect, width, height }, boundsWidth, boundsHeight);
}

function fitRectToAspect(rect: Rect, aspectRatio: number, boundsWidth: number, boundsHeight: number): Rect {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  let width = rect.width;
  let height = width / aspectRatio;

  if (height > boundsHeight) {
    height = boundsHeight;
    width = height * aspectRatio;
  }
  if (width > boundsWidth) {
    width = boundsWidth;
    height = width / aspectRatio;
  }

  const { minWidth, minHeight } = getFixedMinSize(aspectRatio);
  width = Math.max(width, minWidth);
  height = Math.max(height, minHeight);

  if (width > boundsWidth) {
    width = boundsWidth;
    height = width / aspectRatio;
  }
  if (height > boundsHeight) {
    height = boundsHeight;
    width = height * aspectRatio;
  }

  const next = {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };

  return clampMoveRect(next, boundsWidth, boundsHeight);
}

function createInitialCropRect(
  boundsWidth: number,
  boundsHeight: number,
  aspectRatio: number
): Rect {
  let width = boundsWidth * 0.55;
  let height = width / aspectRatio;

  if (height > boundsHeight * 0.8) {
    height = boundsHeight * 0.8;
    width = height * aspectRatio;
  }

  const { minWidth, minHeight } = getFixedMinSize(aspectRatio);
  width = Math.max(width, minWidth);
  height = Math.max(height, minHeight);

  if (width > boundsWidth) {
    width = boundsWidth;
    height = width / aspectRatio;
  }
  if (height > boundsHeight) {
    height = boundsHeight;
    width = height * aspectRatio;
  }

  return {
    x: (boundsWidth - width) / 2,
    y: (boundsHeight - height) / 2,
    width,
    height,
  };
}

function resizeRectFlexible(
  start: Rect,
  handle: CropHandle,
  deltaX: number,
  deltaY: number,
  boundsWidth: number,
  boundsHeight: number
): Rect {
  const right = start.x + start.width;
  const bottom = start.y + start.height;

  let x = start.x;
  let y = start.y;
  let width = start.width;
  let height = start.height;

  if (hasEast(handle)) {
    width = clamp(start.width + deltaX, MIN_CROP_SIDE, boundsWidth - start.x);
  }
  if (hasSouth(handle)) {
    height = clamp(start.height + deltaY, MIN_CROP_SIDE, boundsHeight - start.y);
  }
  if (hasWest(handle)) {
    const nextX = clamp(start.x + deltaX, 0, right - MIN_CROP_SIDE);
    x = nextX;
    width = right - nextX;
  }
  if (hasNorth(handle)) {
    const nextY = clamp(start.y + deltaY, 0, bottom - MIN_CROP_SIDE);
    y = nextY;
    height = bottom - nextY;
  }

  return clampFreeRect({ x, y, width, height }, boundsWidth, boundsHeight);
}

function resizeRectFixed(
  start: Rect,
  handle: CropHandle,
  deltaX: number,
  deltaY: number,
  boundsWidth: number,
  boundsHeight: number,
  aspectRatio: number
): Rect {
  const anchorX = hasWest(handle)
    ? start.x + start.width
    : hasEast(handle)
      ? start.x
      : start.x + start.width / 2;
  const anchorY = hasNorth(handle)
    ? start.y + start.height
    : hasSouth(handle)
      ? start.y
      : start.y + start.height / 2;

  let candidateWidth = start.width;

  if (handle === "e" || handle === "w") {
    candidateWidth = start.width + (handle === "e" ? deltaX : -deltaX);
  } else if (handle === "n" || handle === "s") {
    const candidateHeight = start.height + (handle === "s" ? deltaY : -deltaY);
    candidateWidth = candidateHeight * aspectRatio;
  } else {
    const widthFromX = start.width + (hasEast(handle) ? deltaX : -deltaX);
    const widthFromY = start.width + (hasSouth(handle) ? deltaY : -deltaY) * aspectRatio;
    candidateWidth =
      Math.abs(widthFromX - start.width) > Math.abs(widthFromY - start.width)
        ? widthFromX
        : widthFromY;
  }

  const maxWidthByX = hasWest(handle)
    ? anchorX
    : hasEast(handle)
      ? boundsWidth - anchorX
      : 2 * Math.min(anchorX, boundsWidth - anchorX);

  const maxHeightByY = hasNorth(handle)
    ? anchorY
    : hasSouth(handle)
      ? boundsHeight - anchorY
      : 2 * Math.min(anchorY, boundsHeight - anchorY);

  const maxWidth = Math.min(maxWidthByX, maxHeightByY * aspectRatio);
  const { minWidth } = getFixedMinSize(aspectRatio);
  if (!Number.isFinite(maxWidth) || maxWidth <= 0 || maxWidth < minWidth) return start;

  const width = clamp(candidateWidth, minWidth, maxWidth);
  const height = width / aspectRatio;

  const x = hasWest(handle)
    ? anchorX - width
    : hasEast(handle)
      ? anchorX
      : anchorX - width / 2;
  const y = hasNorth(handle)
    ? anchorY - height
    : hasSouth(handle)
      ? anchorY
      : anchorY - height / 2;

  return { x, y, width, height };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("画像を読み込めませんでした。"));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("画像データの生成に失敗しました。"));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });
}

export function ImageCropFileInput({
  name,
  accept = DEFAULT_ACCEPT,
  disabled = false,
  className,
  mode = "fixed",
  fixedAspectRatio = DEFAULT_FIXED_ASPECT_RATIO,
  fixedAspectLabel,
  defaultFlexibleAspectRatio,
  onCroppedFile,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<InteractionState | null>(null);
  const previousDisplayRef = useRef<{ width: number; height: number } | null>(null);

  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceMeta, setSourceMeta] = useState<ImageMeta | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [cropRect, setCropRect] = useState<Rect | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropError, setCropError] = useState<string | null>(null);
  const [flexibleAspectRatio, setFlexibleAspectRatio] = useState<number>(() =>
    clamp(
      defaultFlexibleAspectRatio && defaultFlexibleAspectRatio > 0
        ? defaultFlexibleAspectRatio
        : 4 / 3,
      MIN_FLEXIBLE_ASPECT,
      MAX_FLEXIBLE_ASPECT
    )
  );

  const flexibleCropAspectRatio =
    cropRect && cropRect.width > 0 && cropRect.height > 0
      ? cropRect.width / cropRect.height
      : flexibleAspectRatio;
  const currentAspectRatio = mode === "fixed" ? fixedAspectRatio : flexibleCropAspectRatio;
  const initialAspectRatio = mode === "fixed" ? fixedAspectRatio : flexibleAspectRatio;

  useEffect(() => {
    if (!sourceUrl) return;
    return () => {
      URL.revokeObjectURL(sourceUrl);
    };
  }, [sourceUrl]);

  useEffect(() => {
    if (!sourceUrl) return;
    let cancelled = false;

    const readMeta = async () => {
      try {
        const image = await loadImage(sourceUrl);
        if (cancelled) return;

        setSourceMeta({ width: image.naturalWidth, height: image.naturalHeight });
        setCropRect(null);

        if (mode === "flexible" && !defaultFlexibleAspectRatio) {
          setFlexibleAspectRatio(
            clamp(
              image.naturalWidth >= image.naturalHeight ? 4 / 3 : 3 / 4,
              MIN_FLEXIBLE_ASPECT,
              MAX_FLEXIBLE_ASPECT
            )
          );
        }
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "画像の読み込みに失敗しました。";
        setCropError(message);
      }
    };

    void readMeta();
    return () => {
      cancelled = true;
    };
  }, [sourceUrl, mode, defaultFlexibleAspectRatio]);

  useEffect(() => {
    const element = stageRef.current;
    if (!element || !sourceFile) return;

    const updateSize = () => {
      setStageSize({ width: element.clientWidth, height: element.clientHeight });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    window.addEventListener("resize", updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, [sourceFile]);

  const displayImageRect = useMemo<DisplayImageRect | null>(() => {
    if (!sourceMeta || stageSize.width <= 0 || stageSize.height <= 0) return null;

    const scale = Math.min(stageSize.width / sourceMeta.width, stageSize.height / sourceMeta.height);
    const width = sourceMeta.width * scale;
    const height = sourceMeta.height * scale;

    return {
      x: (stageSize.width - width) / 2,
      y: (stageSize.height - height) / 2,
      width,
      height,
      scale,
    };
  }, [sourceMeta, stageSize.height, stageSize.width]);

  useEffect(() => {
    if (!displayImageRect) return;

    setCropRect((previous) => {
      const prevDisplay = previousDisplayRef.current;
      let nextRect = previous;

      if (!nextRect) {
        nextRect = createInitialCropRect(
          displayImageRect.width,
          displayImageRect.height,
          initialAspectRatio
        );
      } else if (
        prevDisplay &&
        (prevDisplay.width !== displayImageRect.width || prevDisplay.height !== displayImageRect.height)
      ) {
        const scaleX = displayImageRect.width / prevDisplay.width;
        const scaleY = displayImageRect.height / prevDisplay.height;
        nextRect = {
          x: nextRect.x * scaleX,
          y: nextRect.y * scaleY,
          width: nextRect.width * scaleX,
          height: nextRect.height * scaleY,
        };
      }

      if (mode === "fixed") {
        return fitRectToAspect(
          nextRect,
          fixedAspectRatio,
          displayImageRect.width,
          displayImageRect.height
        );
      }

      return clampFreeRect(nextRect, displayImageRect.width, displayImageRect.height);
    });

    previousDisplayRef.current = {
      width: displayImageRect.width,
      height: displayImageRect.height,
    };
  }, [displayImageRect, fixedAspectRatio, initialAspectRatio, mode]);

  const closeModal = useCallback(() => {
    setSourceFile(null);
    setSourceUrl(null);
    setSourceMeta(null);
    setStageSize({ width: 0, height: 0 });
    setCropRect(null);
    setCropError(null);
    previousDisplayRef.current = null;
    interactionRef.current = null;
  }, []);

  const handleFileSelect = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.currentTarget.value = "";
    if (!file) return;

    setCropError(null);
    setSourceMeta(null);
    setCropRect(null);
    previousDisplayRef.current = null;
    interactionRef.current = null;
    setSourceFile(file);
    setSourceUrl(URL.createObjectURL(file));
  }, []);

  const beginMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (isCropping || !cropRect) return;
      interactionRef.current = {
        type: "move",
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startRect: cropRect,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
    },
    [cropRect, isCropping]
  );

  const moveCrop = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const interaction = interactionRef.current;
      if (!interaction || interaction.type !== "move" || interaction.pointerId !== event.pointerId) {
        return;
      }
      if (!displayImageRect) return;

      const deltaX = event.clientX - interaction.startX;
      const deltaY = event.clientY - interaction.startY;

      const nextRect = clampMoveRect(
        {
          ...interaction.startRect,
          x: interaction.startRect.x + deltaX,
          y: interaction.startRect.y + deltaY,
        },
        displayImageRect.width,
        displayImageRect.height
      );
      setCropRect(nextRect);
      event.preventDefault();
      event.stopPropagation();
    },
    [displayImageRect]
  );

  const endMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const interaction = interactionRef.current;
    if (!interaction || interaction.type !== "move" || interaction.pointerId !== event.pointerId) {
      return;
    }
    interactionRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const beginResize = useCallback(
    (handle: CropHandle, event: PointerEvent<HTMLButtonElement>) => {
      if (isCropping || !cropRect) return;
      interactionRef.current = {
        type: "resize",
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startRect: cropRect,
        handle,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
    },
    [cropRect, isCropping]
  );

  const moveResize = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      const interaction = interactionRef.current;
      if (!interaction || interaction.type !== "resize" || interaction.pointerId !== event.pointerId) {
        return;
      }
      if (!displayImageRect) return;

      const deltaX = event.clientX - interaction.startX;
      const deltaY = event.clientY - interaction.startY;

      const nextRect =
        mode === "fixed"
          ? resizeRectFixed(
              interaction.startRect,
              interaction.handle,
              deltaX,
              deltaY,
              displayImageRect.width,
              displayImageRect.height,
              currentAspectRatio
            )
          : resizeRectFlexible(
              interaction.startRect,
              interaction.handle,
              deltaX,
              deltaY,
              displayImageRect.width,
              displayImageRect.height
            );

      setCropRect(nextRect);
      event.preventDefault();
      event.stopPropagation();
    },
    [currentAspectRatio, displayImageRect, mode]
  );

  const endResize = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    const interaction = interactionRef.current;
    if (!interaction || interaction.type !== "resize" || interaction.pointerId !== event.pointerId) {
      return;
    }
    interactionRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const applyCrop = useCallback(async () => {
    if (!sourceFile || !sourceUrl || !sourceMeta || !displayImageRect || !cropRect) return;
    if (cropRect.width <= 0 || cropRect.height <= 0 || displayImageRect.scale <= 0) return;

    setCropError(null);
    setIsCropping(true);

    try {
      const image = await loadImage(sourceUrl);

      const sourceX = clamp(cropRect.x / displayImageRect.scale, 0, sourceMeta.width);
      const sourceY = clamp(cropRect.y / displayImageRect.scale, 0, sourceMeta.height);
      const sourceWidth = clamp(
        cropRect.width / displayImageRect.scale,
        1,
        sourceMeta.width - sourceX
      );
      const sourceHeight = clamp(
        cropRect.height / displayImageRect.scale,
        1,
        sourceMeta.height - sourceY
      );

      const scaleToOutput = Math.min(
        1,
        MAX_OUTPUT_SIDE / Math.max(sourceWidth, sourceHeight, 1)
      );
      const outputWidth = Math.max(1, Math.round(sourceWidth * scaleToOutput));
      const outputHeight = Math.max(1, Math.round(sourceHeight * scaleToOutput));

      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("トリミング処理を開始できませんでした。ブラウザを更新してください。");
      }

      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        outputWidth,
        outputHeight
      );

      const outputMime = preferredOutputMime(sourceFile.type);
      const blob = await canvasToBlob(
        canvas,
        outputMime,
        outputMime === "image/png" ? undefined : 0.92
      );

      const baseName = stripExtension(sourceFile.name) || "image";
      const croppedFile = new File([blob], `${baseName}-cropped${extensionByMime(outputMime)}`, {
        type: outputMime,
        lastModified: Date.now(),
      });

      if (onCroppedFile) {
        await onCroppedFile(croppedFile);
      }

      if (name && inputRef.current) {
        if (typeof DataTransfer === "undefined") {
          throw new Error("このブラウザではトリミング済みファイルをフォームに設定できませんでした。");
        }
        const dt = new DataTransfer();
        dt.items.add(croppedFile);
        inputRef.current.files = dt.files;
      }

      closeModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : "画像のトリミングに失敗しました。";
      setCropError(message);
    } finally {
      setIsCropping(false);
    }
  }, [
    closeModal,
    cropRect,
    displayImageRect,
    name,
    onCroppedFile,
    sourceFile,
    sourceMeta,
    sourceUrl,
  ]);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        disabled={disabled}
        onChange={handleFileSelect}
        className={cn(
          "block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-rose-700 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-rose-800",
          className
        )}
      />

      {sourceFile && sourceUrl ? (
        <div className="fixed inset-0 z-50 bg-black/70 p-4">
          <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-center">
            <div className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">画像をトリミング</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {mode === "fixed"
                      ? `比率固定: ${fixedAspectLabel ?? formatAspectLabel(currentAspectRatio)}`
                      : `比率可変: 現在 ${formatAspectLabel(currentAspectRatio)}（枠の端や角をドラッグ）`}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={closeModal}
                  disabled={isCropping}
                >
                  閉じる
                </Button>
              </div>

              <div
                ref={stageRef}
                className="relative mx-auto w-full max-w-[980px] h-[62vh] min-h-[320px] max-h-[640px] overflow-hidden rounded-md border border-slate-200 bg-slate-100 select-none"
              >
                {displayImageRect && cropRect ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sourceUrl}
                      alt=""
                      draggable={false}
                      className="absolute pointer-events-none"
                      style={{
                        left: `${displayImageRect.x}px`,
                        top: `${displayImageRect.y}px`,
                        width: `${displayImageRect.width}px`,
                        height: `${displayImageRect.height}px`,
                      }}
                    />

                    {/* Dark overlay outside crop box */}
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        left: `${displayImageRect.x}px`,
                        top: `${displayImageRect.y}px`,
                        width: `${displayImageRect.width}px`,
                        height: `${displayImageRect.height}px`,
                      }}
                    >
                      <div
                        className="absolute left-0 top-0 right-0 bg-black/45"
                        style={{ height: `${cropRect.y}px` }}
                      />
                      <div
                        className="absolute left-0 right-0 bg-black/45"
                        style={{
                          top: `${cropRect.y + cropRect.height}px`,
                          bottom: 0,
                        }}
                      />
                      <div
                        className="absolute left-0 bg-black/45"
                        style={{
                          top: `${cropRect.y}px`,
                          width: `${cropRect.x}px`,
                          height: `${cropRect.height}px`,
                        }}
                      />
                      <div
                        className="absolute right-0 bg-black/45"
                        style={{
                          top: `${cropRect.y}px`,
                          left: `${cropRect.x + cropRect.width}px`,
                          height: `${cropRect.height}px`,
                        }}
                      />
                    </div>

                    <div
                      className="absolute border-2 border-white cursor-move"
                      style={{
                        left: `${displayImageRect.x + cropRect.x}px`,
                        top: `${displayImageRect.y + cropRect.y}px`,
                        width: `${cropRect.width}px`,
                        height: `${cropRect.height}px`,
                      }}
                      onPointerDown={beginMove}
                      onPointerMove={moveCrop}
                      onPointerUp={endMove}
                      onPointerCancel={endMove}
                    >
                      <div className="pointer-events-none absolute left-1/3 top-0 bottom-0 border-l border-white/55" />
                      <div className="pointer-events-none absolute left-2/3 top-0 bottom-0 border-l border-white/55" />
                      <div className="pointer-events-none absolute top-1/3 left-0 right-0 border-t border-white/55" />
                      <div className="pointer-events-none absolute top-2/3 left-0 right-0 border-t border-white/55" />

                      {([
                        { handle: "nw", className: "-left-2 -top-2 cursor-nwse-resize" },
                        { handle: "ne", className: "-right-2 -top-2 cursor-nesw-resize" },
                        { handle: "sw", className: "-left-2 -bottom-2 cursor-nesw-resize" },
                        { handle: "se", className: "-right-2 -bottom-2 cursor-nwse-resize" },
                        { handle: "n", className: "left-1/2 -top-2 -translate-x-1/2 cursor-ns-resize" },
                        { handle: "s", className: "left-1/2 -bottom-2 -translate-x-1/2 cursor-ns-resize" },
                        { handle: "w", className: "-left-2 top-1/2 -translate-y-1/2 cursor-ew-resize" },
                        { handle: "e", className: "-right-2 top-1/2 -translate-y-1/2 cursor-ew-resize" },
                      ] as const).map((entry) => (
                        <button
                          key={entry.handle}
                          type="button"
                          aria-label={`切り抜き枠を${entry.handle}ハンドルで調整`}
                          className={cn(
                            "absolute h-4 w-4 rounded-[2px] border border-slate-500 bg-white",
                            entry.className
                          )}
                          onPointerDown={(event) => beginResize(entry.handle, event)}
                          onPointerMove={moveResize}
                          onPointerUp={endResize}
                          onPointerCancel={endResize}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-full w-full animate-pulse bg-slate-200" />
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  {mode === "fixed"
                    ? "固定比率のまま、枠サイズと位置をドラッグで調整できます。"
                    : "枠の端や角をドラッグして比率・サイズを変更し、枠内ドラッグで位置を調整できます。"}
                </p>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={closeModal}
                    disabled={isCropping}
                  >
                    キャンセル
                  </Button>
                  <Button type="button" onClick={() => void applyCrop()} disabled={isCropping}>
                    {isCropping ? "適用中…" : "切り抜き"}
                  </Button>
                </div>
              </div>

              {cropError ? (
                <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {cropError}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
