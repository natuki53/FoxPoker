import { Resend } from "resend";

// API キーが設定されている場合のみインスタンスを生成する（未設定時はスキップ）
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = process.env.EMAIL_FROM ?? "FoxPoker <onboarding@resend.dev>";
const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

const CATEGORY_LABELS: Record<string, string> = {
  general: "サービス全般について",
  "store-owner": "店舗掲載について",
  billing: "料金・決済について",
  report: "不具合報告",
};

type EmailResult = { ok: true } | { ok: false; error: string };

async function send(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<EmailResult> {
  const client = getResend();
  if (!client) {
    console.warn("[email] RESEND_API_KEY が設定されていません。メール送信をスキップします。");
    return { ok: true };
  }
  const { error } = await client.emails.send({ from: FROM, ...params });
  if (error) {
    console.error("[email] 送信エラー:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

// ==============================
// 共通ラッパー HTML
// ==============================

function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>FoxPoker</title>
</head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:'Hiragino Kaku Gothic ProN',Meiryo,sans-serif;color:#1e293b;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <!-- Header -->
      <tr>
        <td style="background:#fff7ef;border-radius:12px 12px 0 0;padding:24px 32px;border-bottom:3px solid #f97316;">
          <span style="font-size:24px;">🦊</span>
          <span style="font-size:18px;font-weight:bold;color:#f97316;margin-left:8px;">FoxPoker</span>
        </td>
      </tr>
      <!-- Body -->
      <tr>
        <td style="background:#ffffff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;">
          ${body}
        </td>
      </tr>
      <!-- Footer -->
      <tr>
        <td style="padding:16px 0;text-align:center;font-size:12px;color:#94a3b8;">
          © FoxPoker — このメールに心当たりがない場合は無視してください。
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ==============================
// 1. お問い合わせ — 運営者通知
// ==============================

export async function sendContactNotification(params: {
  name: string;
  email: string;
  category: string;
  message: string;
}): Promise<EmailResult> {
  const contactTo = process.env.CONTACT_TO_EMAIL;
  if (!contactTo) {
    console.warn("[email] CONTACT_TO_EMAIL が設定されていません。");
    return { ok: true };
  }

  const categoryLabel = CATEGORY_LABELS[params.category] ?? params.category;
  const html = wrapHtml(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#1e293b;">新しいお問い合わせが届きました</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
      <tr>
        <td style="padding:10px;background:#f8fafc;border:1px solid #e2e8f0;width:120px;font-weight:bold;">お名前</td>
        <td style="padding:10px;border:1px solid #e2e8f0;">${escHtml(params.name)}</td>
      </tr>
      <tr>
        <td style="padding:10px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:bold;">メール</td>
        <td style="padding:10px;border:1px solid #e2e8f0;">${escHtml(params.email)}</td>
      </tr>
      <tr>
        <td style="padding:10px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:bold;">種別</td>
        <td style="padding:10px;border:1px solid #e2e8f0;">${escHtml(categoryLabel)}</td>
      </tr>
      <tr>
        <td style="padding:10px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:bold;vertical-align:top;">内容</td>
        <td style="padding:10px;border:1px solid #e2e8f0;white-space:pre-wrap;">${escHtml(params.message)}</td>
      </tr>
    </table>
    <p style="margin-top:20px;font-size:13px;color:#64748b;">
      返信先: <a href="mailto:${escHtml(params.email)}" style="color:#f97316;">${escHtml(params.email)}</a>
    </p>
  `);

  return send({
    to: contactTo,
    subject: `【問い合わせ】${categoryLabel} — ${params.name} 様より`,
    html,
  });
}

// ==============================
// 2. お問い合わせ — 自動返信
// ==============================

export async function sendContactAutoReply(params: {
  name: string;
  email: string;
  category: string;
}): Promise<EmailResult> {
  const categoryLabel = CATEGORY_LABELS[params.category] ?? params.category;
  const html = wrapHtml(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#1e293b;">${escHtml(params.name)} 様</h2>
    <p style="font-size:14px;line-height:1.7;">
      この度はFoxPokerへお問い合わせいただきありがとうございます。<br />
      以下の内容でお問い合わせを受け付けました。内容を確認のうえ、順次ご連絡いたします。
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;margin-top:16px;">
      <tr>
        <td style="padding:10px;background:#f8fafc;border:1px solid #e2e8f0;width:120px;font-weight:bold;">お名前</td>
        <td style="padding:10px;border:1px solid #e2e8f0;">${escHtml(params.name)}</td>
      </tr>
      <tr>
        <td style="padding:10px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:bold;">種別</td>
        <td style="padding:10px;border:1px solid #e2e8f0;">${escHtml(categoryLabel)}</td>
      </tr>
    </table>
    <p style="margin-top:24px;font-size:13px;color:#64748b;">
      ※ このメールは自動送信です。このメールに返信しても届きません。<br />
      お問い合わせは通常2〜3営業日以内にご連絡します。
    </p>
  `);

  return send({ to: params.email, subject: "お問い合わせを受け付けました — FoxPoker", html });
}

// ==============================
// 3. 申請承認通知
// ==============================

export async function sendApplicationApproved(params: {
  to: string;
  displayName: string;
  storeName: string;
  planName: string;
  isFree: boolean;
  storeAdminUrl: string;
}): Promise<EmailResult> {
  const nextStep = params.isFree
    ? `<p style="font-size:14px;line-height:1.7;">無料プランの掲載が承認されました。以下のボタンから店舗管理画面へアクセスし、公開手続きを行ってください。</p>`
    : `<p style="font-size:14px;line-height:1.7;">申請が承認されました。以下のボタンから店舗管理画面へアクセスし、お支払いを完了してください。お支払い完了後に掲載が開始されます。</p>`;

  const html = wrapHtml(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#1e293b;">${escHtml(params.displayName)} 様</h2>
    <div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:8px;padding:12px 16px;margin-bottom:16px;">
      <span style="font-size:16px;font-weight:bold;color:#065f46;">✅ 申請が承認されました</span>
    </div>
    ${nextStep}
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;margin:16px 0;">
      <tr>
        <td style="padding:10px;background:#f8fafc;border:1px solid #e2e8f0;width:120px;font-weight:bold;">店舗名</td>
        <td style="padding:10px;border:1px solid #e2e8f0;">${escHtml(params.storeName)}</td>
      </tr>
      <tr>
        <td style="padding:10px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:bold;">プラン</td>
        <td style="padding:10px;border:1px solid #e2e8f0;">${escHtml(params.planName)}</td>
      </tr>
    </table>
    <p style="text-align:center;margin:24px 0;">
      <a href="${params.storeAdminUrl}" style="display:inline-block;background:#f97316;color:#ffffff;font-weight:bold;font-size:14px;padding:12px 32px;border-radius:8px;text-decoration:none;">
        店舗管理画面へ
      </a>
    </p>
  `);

  return send({ to: params.to, subject: `【FoxPoker】申請が承認されました — ${params.storeName}`, html });
}

// ==============================
// 4. 申請却下通知
// ==============================

export async function sendApplicationRejected(params: {
  to: string;
  displayName: string;
  storeName: string;
  reason: string;
}): Promise<EmailResult> {
  const html = wrapHtml(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#1e293b;">${escHtml(params.displayName)} 様</h2>
    <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:12px 16px;margin-bottom:16px;">
      <span style="font-size:16px;font-weight:bold;color:#991b1b;">申請が審査を通過できませんでした</span>
    </div>
    <p style="font-size:14px;line-height:1.7;">
      誠に申し訳ありませんが、以下の理由により今回の掲載申請を承認することができませんでした。
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;margin:16px 0;">
      <tr>
        <td style="padding:10px;background:#f8fafc;border:1px solid #e2e8f0;width:120px;font-weight:bold;">店舗名</td>
        <td style="padding:10px;border:1px solid #e2e8f0;">${escHtml(params.storeName)}</td>
      </tr>
      <tr>
        <td style="padding:10px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:bold;vertical-align:top;">却下理由</td>
        <td style="padding:10px;border:1px solid #e2e8f0;white-space:pre-wrap;">${escHtml(params.reason)}</td>
      </tr>
    </table>
    <p style="font-size:14px;line-height:1.7;">
      内容を修正のうえ、再度申請いただくことも可能です。ご不明な点はお問い合わせフォームよりご連絡ください。
    </p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${BASE_URL}/contact" style="display:inline-block;background:#64748b;color:#ffffff;font-size:14px;padding:10px 28px;border-radius:8px;text-decoration:none;">
        お問い合わせ
      </a>
    </p>
  `);

  return send({ to: params.to, subject: `【FoxPoker】申請結果のご連絡 — ${params.storeName}`, html });
}

// ==============================
// 5. パスワードリセット
// ==============================

export async function sendPasswordResetEmail(params: {
  to: string;
  displayName: string;
  resetToken: string;
}): Promise<EmailResult> {
  const resetUrl = `${BASE_URL}/auth/reset-password?token=${params.resetToken}`;
  const html = wrapHtml(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#1e293b;">${escHtml(params.displayName)} 様</h2>
    <p style="font-size:14px;line-height:1.7;">
      パスワードリセットのリクエストを受け付けました。<br />
      以下のボタンをクリックして、新しいパスワードを設定してください。
    </p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${resetUrl}" style="display:inline-block;background:#f97316;color:#ffffff;font-weight:bold;font-size:14px;padding:12px 32px;border-radius:8px;text-decoration:none;">
        パスワードを再設定する
      </a>
    </p>
    <p style="font-size:13px;color:#64748b;line-height:1.7;">
      このリンクの有効期限は <strong>1時間</strong> です。<br />
      心当たりがない場合は、このメールを無視してください。パスワードは変更されません。
    </p>
    <p style="font-size:12px;color:#94a3b8;word-break:break-all;margin-top:16px;">
      URL: ${resetUrl}
    </p>
  `);

  return send({ to: params.to, subject: "【FoxPoker】パスワードリセットのご案内", html });
}

// ==============================
// 6. 会員登録確認メール
// ==============================

export async function sendWelcomeEmail(params: {
  to: string;
  displayName: string;
}): Promise<EmailResult> {
  const html = wrapHtml(`
    <h2 style="margin:0 0 16px;font-size:18px;color:#1e293b;">${escHtml(params.displayName)} 様</h2>
    <p style="font-size:14px;line-height:1.7;">
      FoxPokerへようこそ！<br />
      会員登録が完了しました。
    </p>
    <p style="font-size:14px;line-height:1.7;margin-top:16px;">
      FoxPokerでは全国のアミューズメントポーカー店舗情報・トーナメントスケジュールを検索できます。
      気になる店舗をお気に入りに追加したり、口コミを投稿してコミュニティに貢献しましょう。
    </p>
    <p style="text-align:center;margin:28px 0 8px;">
      <a href="${BASE_URL}/search" style="display:inline-block;background:#f97316;color:#ffffff;font-weight:bold;font-size:14px;padding:12px 32px;border-radius:8px;text-decoration:none;">
        店舗を探す
      </a>
    </p>
    <p style="text-align:center;margin:0 0 8px;">
      <a href="${BASE_URL}/tournament" style="display:inline-block;background:#ffffff;color:#f97316;font-weight:bold;font-size:14px;padding:10px 32px;border-radius:8px;text-decoration:none;border:2px solid #f97316;">
        トーナメントを見る
      </a>
    </p>
  `);

  return send({ to: params.to, subject: "FoxPokerへようこそ！会員登録が完了しました", html });
}

// ==============================
// ユーティリティ
// ==============================

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
