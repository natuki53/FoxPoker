import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";

const registerSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z
    .string()
    .min(8, "パスワードは8文字以上で入力してください")
    .regex(/[A-Za-z]/, "英字を含めてください")
    .regex(/[0-9]/, "数字を含めてください"),
  displayName: z
    .string()
    .min(1, "表示名を入力してください")
    .max(30, "表示名は30文字以内で入力してください"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const { email, password, displayName } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "このメールアドレスは既に登録されています" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
      },
    });

    // ウェルカムメール送信（失敗しても登録は成功）
    await sendWelcomeEmail({ to: email, displayName }).catch((e) =>
      console.error("[email] ウェルカムメール送信失敗:", e)
    );

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "サーバーエラーが発生しました。しばらくしてからお試しください。" },
      { status: 500 }
    );
  }
}
