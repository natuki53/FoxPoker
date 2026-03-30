"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

type Props = {
  successMessage: string | null;
  errorMessage: string | null;
};

type ToastState = {
  tone: "error" | "success";
  message: string;
};

export function SaveFeedbackToast({ successMessage, errorMessage }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toneFromProps = errorMessage ? "error" : successMessage ? "success" : null;
  const messageFromProps = errorMessage ?? successMessage;
  const [toast, setToast] = useState<ToastState | null>(() => {
    if (!toneFromProps || !messageFromProps) return null;
    return { tone: toneFromProps, message: messageFromProps };
  });

  useEffect(() => {
    if (!toneFromProps || !messageFromProps) return;
    const timer = window.setTimeout(() => {
      setToast((current) => {
        if (
          current &&
          current.tone === toneFromProps &&
          current.message === messageFromProps
        ) {
          return current;
        }
        return { tone: toneFromProps, message: messageFromProps };
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [toneFromProps, messageFromProps]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(
      () => setToast(null),
      toast.tone === "error" ? 7000 : 4500
    );
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!messageFromProps) return;

    const nextParams = new URLSearchParams(searchParams.toString());
    const hasSaved = nextParams.has("saved");
    const hasError = nextParams.has("error");
    if (!hasSaved && !hasError) return;

    nextParams.delete("saved");
    nextParams.delete("error");
    const nextQuery = nextParams.toString();
    const nextUrl = nextQuery.length > 0 ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [messageFromProps, pathname, router, searchParams]);

  if (!toast) return null;

  const isError = toast.tone === "error";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4 sm:justify-end">
      <div
        className={`pointer-events-auto w-full max-w-[380px] rounded-[22px] p-[1px] shadow-[0_18px_42px_-22px_rgba(15,23,42,0.55)] ${
          isError
            ? "bg-gradient-to-br from-red-300/70 via-red-200/55 to-orange-200/60"
            : "bg-gradient-to-br from-emerald-300/70 via-emerald-200/55 to-cyan-200/60"
        }`}
      >
        <div
          role="alert"
          className="rounded-[21px] border border-white/70 bg-white/92 p-4 backdrop-blur-xl"
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                isError ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {isError ? (
                <AlertTriangle className="h-4.5 w-4.5" aria-hidden />
              ) : (
                <CheckCircle2 className="h-4.5 w-4.5" aria-hidden />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className={`text-xs font-semibold tracking-wide ${isError ? "text-red-700" : "text-emerald-700"}`}>
                {isError ? "ERROR" : "SAVED"}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setToast(null)}
              className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              aria-label="通知を閉じる"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
