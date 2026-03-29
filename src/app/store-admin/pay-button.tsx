"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CreditCard } from "lucide-react";

export function PayButton({
  applicationId,
  isFree = false,
}: {
  applicationId: string;
  isFree?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.completed) {
        window.location.reload();
      } else {
        alert(data.error || "決済セッションの作成に失敗しました");
        setLoading(false);
      }
    } catch {
      alert("エラーが発生しました");
      setLoading(false);
    }
  }

  return (
    <Button size="sm" onClick={handlePay} disabled={loading}>
      {isFree ? <CheckCircle2 size={14} /> : <CreditCard size={14} />}
      {loading ? "処理中..." : isFree ? "無料で掲載準備を完了" : "支払いに進む"}
    </Button>
  );
}
