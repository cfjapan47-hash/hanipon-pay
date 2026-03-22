import { NextRequest, NextResponse } from "next/server";
import { processPayment } from "@/lib/firestore";

export async function POST(request: NextRequest) {
  try {
    const { fromUserId, toMerchantId, amount, memo } = await request.json();

    if (!fromUserId || !toMerchantId || !amount) {
      return NextResponse.json(
        { error: "必須パラメータが不足しています" },
        { status: 400 }
      );
    }

    const transactionId = await processPayment(
      fromUserId,
      toMerchantId,
      amount,
      memo || ""
    );

    return NextResponse.json({ success: true, transactionId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "支払い処理に失敗しました";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
