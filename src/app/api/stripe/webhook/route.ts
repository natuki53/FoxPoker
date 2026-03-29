import { NextRequest, NextResponse } from "next/server";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { calcListingEndsAt, getPlanPrice } from "@/lib/utils";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    const webhookSecret = getStripeWebhookSecret();
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);

    const message = err instanceof Error ? err.message : "";
    if (
      message.includes("STRIPE_SECRET_KEY") ||
      message.includes("STRIPE_WEBHOOK_SECRET") ||
      message.includes("placeholder")
    ) {
      return NextResponse.json(
        {
          error:
            "Stripe設定エラーです。.env.local の STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET を確認してください。",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata;

    if (!meta?.applicationId || !meta?.storeId || !meta?.planId || !meta?.billingPeriod) {
      console.error("Missing metadata in checkout session:", session.id);
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    const existing = await prisma.storeListing.findFirst({
      where: { applicationId: meta.applicationId },
    });
    if (existing) {
      return NextResponse.json({ received: true, note: "Already processed" });
    }

    const plan = await prisma.listingPlan.findUnique({
      where: { id: meta.planId },
    });
    if (!plan) {
      console.error("Plan not found:", meta.planId);
      return NextResponse.json({ error: "Plan not found" }, { status: 400 });
    }

    const price = getPlanPrice(plan, meta.billingPeriod);
    const taxAmount = Math.floor(price * 0.1);
    const startsAt = new Date();
    const endsAt = calcListingEndsAt(startsAt, meta.billingPeriod);

    await prisma.storeListing.create({
      data: {
        storeId: meta.storeId,
        applicationId: meta.applicationId,
        planId: meta.planId,
        billingPeriod: meta.billingPeriod as "ONE_MONTH" | "THREE_MONTHS" | "SIX_MONTHS" | "TWELVE_MONTHS",
        startsAt,
        endsAt,
        status: "ACTIVE",
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null,
        amountPaid: price,
        taxAmount,
        paidAt: new Date(),
      },
    });
  }

  return NextResponse.json({ received: true });
}
