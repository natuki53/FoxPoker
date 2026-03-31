# FoxPoker

FoxPoker は、日本国内のアミューズメントポーカー店舗を検索・比較できる情報プラットフォームです。  
店舗掲載、トーナメント告知、口コミ、掲載審査、決済までを 1 つの Next.js アプリで提供します。

## 主な機能

- 一般ユーザー向け
  - エリア・キーワード検索
  - 店舗詳細（営業時間、ゲーム情報、写真、口コミ）
  - トーナメント一覧・詳細
  - お気に入り管理
- 店舗運営者向け
  - 掲載申請フロー
  - 店舗情報編集（基本情報、営業時間、ゲーム、画像、公開ページ）
  - プラン申請・決済（Stripe）
- システム管理者向け
  - 掲載審査・承認/却下
  - ユーザー/店舗の管理
  - 掲載状態の運用

## 技術スタック

- Framework: Next.js 16 (App Router) / React 19 / TypeScript
- Styling: Tailwind CSS 4
- Database: PostgreSQL + Prisma
- Auth: NextAuth.js v5（メール+パスワード / Google OAuth）
- Payment: Stripe Checkout + Webhook
- Storage: Cloudflare R2（未設定時は `public/uploads` へローカル保存）
- Mail: Resend（未設定時は送信スキップ）

## セットアップ

### 1. 前提

- Node.js 20 以上
- npm
- PostgreSQL（ローカル or Supabase など）

### 2. 依存インストール

```bash
npm install
```

### 3. 環境変数

```bash
cp .env.example .env.local
```

最低限、以下は設定してください。

```dotenv
DATABASE_URL="postgresql://postgres:password@localhost:5432/foxpoker?schema=public"
AUTH_SECRET="replace-with-random-secret"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

機能別の主な環境変数:

- Google ログイン: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Stripe 決済: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- R2 画像保存: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
- メール送信: `RESEND_API_KEY`, `EMAIL_FROM`, `CONTACT_TO_EMAIL`
- システム管理者 seed: `SYSTEM_ADMIN_EMAIL`, `SYSTEM_ADMIN_PASSWORD`, `SYSTEM_ADMIN_NAME`

### 4. DB 準備

```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

### 5. 開発サーバー起動

```bash
npm run dev
```

`http://localhost:3000` にアクセス。

## よく使うコマンド

```bash
npm run dev         # 開発サーバー（webpack）
npm run dev:turbo   # 開発サーバー（turbopack）
npm run build       # 本番ビルド
npm run start       # 本番起動
npm run lint        # ESLint
npx prisma studio   # DB確認
```

## ディレクトリ構成

```text
foxpoker/
├── src/
│   ├── app/        # 画面・Route Handlers
│   ├── components/ # UI/レイアウトコンポーネント
│   ├── lib/        # 認証・DB・決済・メール・ストレージ
│   └── types/      # 型拡張（NextAuth など）
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── docs/ (../docs) # 要件・設計・デプロイ資料
```

## デプロイ

本番構成・環境変数・外部サービス設定は以下を参照:

- [`docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md)
