"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { getMerchant, processPayment } from "@/lib/firestore";
import { formatPoints } from "@/lib/utils";
import type { Merchant } from "@/types";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Store,
  ExternalLink,
} from "lucide-react";

type OnlinePayStep = "loading" | "confirm" | "processing" | "done" | "error";

function OnlinePayContent() {
  const searchParams = useSearchParams();
  const { liffUser, user, loading: authLoading } = useAuth();

  const shopId = searchParams.get("shopId") || "";
  const amountParam = searchParams.get("amount") || "";
  const orderId = searchParams.get("orderId") || "";
  const redirectUrl = searchParams.get("redirect") || "";
  const memo = searchParams.get("memo") || "";

  const amount = parseInt(amountParam, 10);

  const [step, setStep] = useState<OnlinePayStep>("loading");
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // 加盟店情報を取得
  useEffect(() => {
    if (!shopId) {
      setErrorMsg("加盟店IDが指定されていません");
      setStep("error");
      return;
    }
    if (!amountParam || isNaN(amount) || amount <= 0) {
      setErrorMsg("金額が正しく指定されていません");
      setStep("error");
      return;
    }

    getMerchant(shopId)
      .then((m) => {
        if (!m) {
          setErrorMsg("加盟店が見つかりませんでした");
          setStep("error");
          return;
        }
        if (!m.isActive) {
          setErrorMsg("この加盟店は現在利用できません");
          setStep("error");
          return;
        }
        setMerchant(m);
        setStep("confirm");
      })
      .catch(() => {
        setErrorMsg("加盟店情報の取得に失敗しました");
        setStep("error");
      });
  }, [shopId, amountParam, amount]);

  const handlePay = async () => {
    if (!liffUser || !merchant || !shopId) return;

    if (user && user.balance < amount) {
      setErrorMsg("ポイント残高が不足しています");
      setStep("error");
      return;
    }

    setStep("processing");
    try {
      const payMemo = [
        "オンライン決済",
        orderId ? `注文ID: ${orderId}` : "",
        memo || "",
      ]
        .filter(Boolean)
        .join(" / ");

      await processPayment(liffUser.userId, shopId, amount, payMemo);
      setStep("done");

      // リダイレクトURLがある場合、3秒後にリダイレクト
      if (redirectUrl) {
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 3000);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "支払いに失敗しました"
      );
      setStep("error");
    }
  };

  if (authLoading || step === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <Loader2 className="animate-spin text-orange-500" size={32} />
        <p className="text-sm text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-8 pb-12">
      <h1 className="text-xl font-bold text-gray-800 mb-6 text-center">
        オンライン決済
      </h1>

      {step === "confirm" && merchant && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Store className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">お支払い先</p>
                <p className="text-lg font-bold text-gray-800">
                  {merchant.name}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-500 text-center">お支払い金額</p>
              <p className="text-4xl font-bold text-orange-600 text-center mt-1">
                {formatPoints(amount)}
                <span className="text-lg ml-1">pt</span>
              </p>
            </div>

            {orderId && (
              <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                <span className="text-gray-500">注文ID</span>
                <span className="text-gray-800 font-medium">{orderId}</span>
              </div>
            )}

            {memo && (
              <div className="flex justify-between text-sm py-2 border-b border-gray-100">
                <span className="text-gray-500">メモ</span>
                <span className="text-gray-800">{memo}</span>
              </div>
            )}

            {user && (
              <div className="flex justify-between text-sm py-2 mt-2">
                <span className="text-gray-500">あなたの残高</span>
                <span
                  className={`font-bold ${
                    user.balance >= amount
                      ? "text-green-600"
                      : "text-red-500"
                  }`}
                >
                  {formatPoints(user.balance)} pt
                </span>
              </div>
            )}

            {user && user.balance < amount && (
              <div className="bg-red-50 rounded-xl p-3 mt-3">
                <p className="text-sm text-red-600 text-center">
                  残高が不足しています（あと{" "}
                  {formatPoints(amount - user.balance)} pt 必要）
                </p>
              </div>
            )}

            <button
              onClick={handlePay}
              disabled={!user || user.balance < amount}
              className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold mt-6 hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {formatPoints(amount)} pt を支払う
            </button>

            <p className="text-xs text-gray-400 text-center mt-3">
              決済手数料4%は加盟店負担です
            </p>
          </div>
        </div>
      )}

      {step === "processing" && (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <Loader2
            className="animate-spin text-orange-500 mx-auto mb-4"
            size={48}
          />
          <p className="text-lg font-bold text-gray-800">決済処理中...</p>
          <p className="text-sm text-gray-500 mt-2">
            しばらくお待ちください
          </p>
        </div>
      )}

      {step === "done" && (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <CheckCircle2 className="mx-auto text-green-500 mb-4" size={56} />
          <p className="text-xl font-bold text-gray-800">支払い完了</p>
          <p className="text-gray-500 mt-2">
            {merchant?.name} に {formatPoints(amount)} pt を支払いました
          </p>
          {orderId && (
            <p className="text-sm text-gray-400 mt-1">注文ID: {orderId}</p>
          )}

          {redirectUrl ? (
            <div className="mt-6">
              <p className="text-sm text-gray-500 mb-3">
                3秒後に自動でリダイレクトします
              </p>
              <a
                href={redirectUrl}
                className="inline-flex items-center gap-2 bg-orange-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors"
              >
                <ExternalLink size={16} />
                元のサイトに戻る
              </a>
            </div>
          ) : (
            <a
              href="/"
              className="inline-block mt-6 bg-orange-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors"
            >
              トップに戻る
            </a>
          )}
        </div>
      )}

      {step === "error" && (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={56} />
          <p className="text-xl font-bold text-gray-800">エラー</p>
          <p className="text-red-500 mt-2">{errorMsg}</p>
          <a
            href="/"
            className="inline-block mt-6 bg-gray-200 text-gray-700 px-8 py-3 rounded-xl font-bold hover:bg-gray-300 transition-colors"
          >
            トップに戻る
          </a>
        </div>
      )}
    </div>
  );
}

function OnlinePayWithSuspense() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="animate-spin text-orange-500" size={32} />
        </div>
      }
    >
      <OnlinePayContent />
    </Suspense>
  );
}

export default function OnlinePayPage() {
  return (
    <AuthProvider>
      <OnlinePayWithSuspense />
    </AuthProvider>
  );
}
