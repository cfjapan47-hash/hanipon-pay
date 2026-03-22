import { NextRequest, NextResponse } from "next/server";
import { grantPoints } from "@/lib/firestore";

export async function POST(request: NextRequest) {
  try {
    const { toUserId, amount, reason, grantedBy } = await request.json();

    if (!toUserId || !amount || !reason || !grantedBy) {
      return NextResponse.json(
        { error: "必須パラメータが不足しています" },
        { status: 400 }
      );
    }

    const grantId = await grantPoints(toUserId, amount, reason, grantedBy);

    return NextResponse.json({ success: true, grantId });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ポイント発行に失敗しました";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
