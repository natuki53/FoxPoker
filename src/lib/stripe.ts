import Stripe from "stripe";

let stripeClient: Stripe | null = null;

function hasPlaceholder(value: string): boolean {
  return value.includes("...");
}

function getStripeSecretKey(): string {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Set a valid key in .env.local."
    );
  }
  if (hasPlaceholder(secretKey)) {
    throw new Error(
      "STRIPE_SECRET_KEY looks like a placeholder value. Set the full Stripe key."
    );
  }
  if (!/^sk_(test|live)_/.test(secretKey)) {
    throw new Error(
      "STRIPE_SECRET_KEY format is invalid. It must start with sk_test_ or sk_live_."
    );
  }
  return secretKey;
}

export function getStripeWebhookSecret(): string {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET is not set. Set a valid webhook secret in .env.local."
    );
  }
  if (hasPlaceholder(webhookSecret)) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET looks like a placeholder value. Set the full Stripe webhook secret."
    );
  }
  if (!webhookSecret.startsWith("whsec_")) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET format is invalid. It must start with whsec_."
    );
  }
  return webhookSecret;
}

export function getStripeClient(): Stripe {
  if (stripeClient) return stripeClient;

  stripeClient = new Stripe(getStripeSecretKey(), {
    apiVersion: "2026-03-25.dahlia",
    typescript: true,
  });
  return stripeClient;
}

export const PLAN_PRICES: Record<string, Record<string, number>> = {
  basic: {
    ONE_MONTH: 5000,
    THREE_MONTHS: 14250,
    SIX_MONTHS: 27000,
    TWELVE_MONTHS: 51000,
  },
  premium: {
    ONE_MONTH: 12000,
    THREE_MONTHS: 34200,
    SIX_MONTHS: 64800,
    TWELVE_MONTHS: 122400,
  },
  platinum: {
    ONE_MONTH: 25000,
    THREE_MONTHS: 71250,
    SIX_MONTHS: 135000,
    TWELVE_MONTHS: 255000,
  },
};

export function calcTaxIncluded(amount: number): number {
  return Math.floor(amount * 1.1);
}
