"use client";

import { useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { chargeCard, getCardByNumber } from "@/lib/firestore";
import { formatPoints } from "@/lib/utils";
import {
  Loader2,
  ArrowLeft,
  CreditCard,
  Zap,
  CheckCircle2,
  AlertCircle,
  Search,
} from "lucide-react";
import Link from "next/link";
import type { Card } from "@/types";

function CardChargeContent() {
  const { liffUser, user, loading } = useAuth();
  const [cardNumber, setCardNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [lookedUpCard, setLookedUpCard] = useState<{
    id: string;
    data: Card;
  } | null>(null);
  const [searching, setSearching] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-screen px-4">
        <p className="text-red-500 text-center">管理者権限がありません</p>
      </div>
    );
  }

  const normalizeCardNumber = (input: string): string => {
    const trimmed = input.trim().toUpperCase();
    return trimmed.startsWith("HANIPON-")
      ? trimmed
      : `HANIPON-${trimmed.padStart(5, "0")}`;
  };

  const handleSearch = async () => {
    const trimmed = cardNumber.trim();
    if (!trimmed) {
      setErrorMsg("カード番号を入力してください");
      return;
    }

    setSearching(true);
    setErrorMsg("");
    setLookedUpCard(null);

    try {
      const fullNumber = normalizeCardNumber(trimmed);
      const result = await getCardByNumber(fullNumber);
      if (!result) {
        setErrorMsg("カードが見つかりません");
        return;
      }
      setLookedUpCard(result);
      // カード番号を正規化して表示
      setCardNumber(fullNumber);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "検索に失敗しました");
    } finally {
      setSearching(false);
    }
  };

  const handleCharge = async () => {
    if (!liffUser) return;

    const fullNumber = normalizeCardNumber(cardNumber);
    const numAmount = parseInt(amount, 10);

    if (!cardNumber.trim()) {
      setErrorMsg("カード番号を入力してください");
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg("正しいチャージ金額を入力してください");
      return;
    }

    setProcessing(true);
    setErrorMsg("");
    setMessage("");

    try {
      await chargeCard(fullNumber, numAmount, liffUser.userId);
      setMessage(
        `${fullNumber} に ${formatPoints(numAmount)}pt チャージしました`
      );
      setCardNumber("");
      setAmount("");
      setLookedUpCard(null);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "チャージに失敗しました");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-8">
      <Link
        href="/admin"
        className="flex items-center gap-1 text-sm text-gray-500 mb-4 hover:text-gray-700"
      >
        <ArrowLeft size={16} />
        管理者ダッシュボード
      </Link>

      <h1 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Zap size={24} />
        窓口チャージ
      </h1>

      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        {/* カード番号入力 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            カード番号
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => {
                setCardNumber(e.target.value);
                setLookedUpCard(null);
              }}
              placeholder="HANIPON-00001"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50"
            >
              {searching ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Search size={16} />
              )}
              照会
            </button>
          </div>
        </div>

        {/* カード情報表示 */}
        {lookedUpCard && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={16} className="text-blue-600" />
              <span className="font-mono text-sm font-medium text-blue-800">
                {lookedUpCard.data.cardNumber}
              </span>
            </div>
            <div className="text-xs text-blue-700 space-y-0.5">
              <p>現在残高: {formatPoints(lookedUpCard.data.balance)}pt</p>
              <p>
                状態:{" "}
                {lookedUpCard.data.isActive ? (
                  <span className="text-green-600">有効</span>
                ) : (
                  <span className="text-red-600">無効</span>
                )}
              </p>
              <p>
                紐付け:{" "}
                {lookedUpCard.data.citizenId
                  ? `紐付け済（${lookedUpCard.data.citizenId}）`
                  : "未紐付け"}
              </p>
            </div>
          </div>
        )}

        {/* チャージ金額 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            チャージ金額
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000"
            min="1"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {/* プリセットボタン */}
        <div className="flex gap-2 mb-4">
          {[500, 1000, 3000, 5000, 10000].map((v) => (
            <button
              key={v}
              onClick={() => setAmount(String(v))}
              className="flex-1 bg-gray-50 text-gray-700 px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-100"
            >
              {formatPoints(v)}
            </button>
          ))}
        </div>

        <button
          onClick={handleCharge}
          disabled={processing}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50"
        >
          {processing ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Zap size={18} />
          )}
          チャージする
        </button>

        {message && (
          <div className="flex items-center gap-2 mt-3 text-green-600 text-sm">
            <CheckCircle2 size={16} />
            {message}
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-2 mt-3 text-red-500 text-sm">
            <AlertCircle size={16} />
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CardChargePage() {
  return (
    <AuthProvider>
      <CardChargeContent />
    </AuthProvider>
  );
}
