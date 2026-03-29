"use client";

import { useEffect } from "react";

const WARNING_MESSAGE = "保存していない変更があります。このまま移動しますか？";

export function UnsavedChangesGuard() {
  useEffect(() => {
    let isDirty = false;
    let isSubmitting = false;

    const trackedForms = Array.from(
      document.querySelectorAll<HTMLFormElement>('form[data-dirty-track="true"]')
    );

    const markDirty = () => {
      if (!isSubmitting) {
        isDirty = true;
      }
    };

    for (const form of trackedForms) {
      form.addEventListener("input", markDirty);
      form.addEventListener("change", markDirty);
    }

    const handleSubmitCapture = (event: Event) => {
      const form = event.target as HTMLFormElement | null;
      if (!form || form.tagName !== "FORM") return;

      if (!isDirty || isSubmitting) {
        isSubmitting = true;
        return;
      }

      const isTrackedForm = form.matches('form[data-dirty-track="true"]');
      if (isTrackedForm) {
        isSubmitting = true;
        isDirty = false;
        return;
      }

      const allow = window.confirm(WARNING_MESSAGE);
      if (!allow) {
        event.preventDefault();
        return;
      }

      isSubmitting = true;
      isDirty = false;
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty || isSubmitting) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (!isDirty || isSubmitting) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const nextUrl = new URL(anchor.href, window.location.href);
      if (nextUrl.origin !== window.location.origin) return;
      if (nextUrl.href === window.location.href) return;

      const allow = window.confirm(WARNING_MESSAGE);
      if (!allow) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      isDirty = false;
      isSubmitting = true;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);
    document.addEventListener("submit", handleSubmitCapture, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
      document.removeEventListener("submit", handleSubmitCapture, true);
      for (const form of trackedForms) {
        form.removeEventListener("input", markDirty);
        form.removeEventListener("change", markDirty);
      }
    };
  }, []);

  return null;
}
