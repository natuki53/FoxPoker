import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripeClient, calcTaxIncluded } from "@/lib/stripe";
import { getPlanPrice, BILLING_PERIOD_LABELS, calcListingEndsAt } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { applicationId } = await req.json();
    if (!applicationId) {
      return NextResponse.json(
        { error: "申請IDが必要です" },
        { status: 400 }
      );
    }

    const application = await prisma.storeApplication.findUnique({
      where: {
        id: applicationId,
        applicantUserId: session.user.id,
        status: "APPROVED",
      },
      include: { store: true, plan: true },
    });

    if (!application) {
      return NextResponse.json(
        { error: "承認済みの申請が見つかりません" },
        { status: 404 }
      );
    }

    const existingListing = await prisma.storeListing.findFirst({
      where: { applicationId: application.id },
    });
    if (existingListing) {
      return NextResponse.json(
        { error: "この申請はすでに支払い済みです" },
        { status: 400 }
      );
    }

    const price = getPlanPrice(application.plan, application.billingPeriod);
    const total = calcTaxIncluded(price);

    if (total <= 0) {
      const startsAt = new Date();
      const endsAt = calcListingEndsAt(startsAt, application.billingPeriod);

      await prisma.$transaction([
        prisma.storeListing.create({
          data: {
            storeId: application.storeId,
            applicationId: application.id,
            planId: application.planId,
            billingPeriod: application.billingPeriod,
            startsAt,
            endsAt,
            status: "ACTIVE",
            stripeSessionId: null,
            stripePaymentIntentId: null,
            amountPaid: 0,
            taxAmount: 0,
            paidAt: new Date(),
          },
        }),
        prisma.store.update({
          where: { id: application.storeId },
          data: { status: "AWAITING_PAYMENT" },
        }),
      ]);

      revalidatePath("/store-admin");
      revalidatePath(`/store/${application.storeId}`);
      revalidatePath("/");
      revalidatePath("/search");
      revalidatePath("/area");
      revalidatePath("/ranking");

      return NextResponse.json({ completed: true });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const stripe = getStripeClient();

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: `${application.plan.name}プラン（${application.store.name}）`,
              description: `掲載期間: ${BILLING_PERIOD_LABELS[application.billingPeriod] || application.billingPeriod}`,
            },
            unit_amount: total,
          },
          quantity: 1,
        },
      ],
      metadata: {
        applicationId: application.id,
        storeId: application.storeId,
        planId: application.planId,
        billingPeriod: application.billingPeriod,
      },
      success_url: `${baseUrl}/store-admin?payment=success`,
      cancel_url: `${baseUrl}/store-admin?payment=cancelled`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);

    const message = err instanceof Error ? err.message : "";
    if (
      message.includes("STRIPE_SECRET_KEY") ||
      message.includes("placeholder")
    ) {
      return NextResponse.json(
        {
          error:
            "Stripe設定エラーです。.env.local の STRIPE_SECRET_KEY を実際の値に設定してください。",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "決済セッションの作成に失敗しました" },
      { status: 500 }
    );
  }
}
