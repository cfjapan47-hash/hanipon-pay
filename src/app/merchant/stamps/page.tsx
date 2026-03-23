"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  getMerchantByOwner,
  getAllStampCardsByMerchant,
  createStampCard,
  updateStampCardStatus,
} from "@/lib/firestore";
import type { Merchant, StampCard } from "@/types";
import {
  Loader2,
  Plus,
  ArrowLeft,
  Stamp,
  Gift,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import Link from "next/link";
import MerchantNavigation from "@/components/MerchantNavigation";

function StampCardContent() {
  const { liffUser, loading } = useAuth();
  const [merchant, setMerchant] = useState<{
    id: string;
    data: Merchant;
  } | null>(null);
  const [stampCards, setStampCards] = useState<StampCard[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Form state
  const [requiredStamps, setRequiredStamps] = useState("10");
  const [rewardType, setRewardType] = useState<"point" | "coupon">("point");
  const [rewardValue, setRewardValue] = useState("");
  const [rewardDescription, setRewardDescription] = useState("");

  useEffect(() => {
    if (!liffUser) return;
    getMerchantByOwner(liffUser.userId)
      .then(async (m) => {
        setMerchant(m);
        if (m) {
          const cards = await getAllStampCardsByMerchant(m.id);
          setStampCards(cards);
        }
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [liffUser]);

  const handleCreate = async () => {
    if (!merchant) return;
    const stamps = parseInt(requiredStamps, 10);
    const value = parseInt(rewardValue, 10);
    if (!stamps || stamps < 1 || stamps > 30) {
      setMessage({ type: "error", text: "スタンプ数は1〜30で指定してください" });
      return;
    }
    if (!value || value < 1) {
      setMessage({ type: "error", text: "報酬値を正しく入力してください" });
      return;
    }
    if (!rewardDescription.trim()) {
      setMessage({ type: "error", text: "報酬の説明を入力してください" });
      return;
    }

    setSubmitting(true);
    try {
      await createStampCard({
        merchantId: merchant.id,
        merchantName: merchant.data.name,
        requiredStamps: stamps,
        rewardType,
        rewardValue: value,
        rewardDescription: rewardDescription.trim(),
      });
      const cards = await getAllStampCardsByMerchant(merchant.id);
      setStampCards(cards);
      setShowForm(false);
      setRequiredStamps("10");
      setRewardType("point");
      setRewardValue("");
      setRewardDescription("");
      setMessage({ type: "success", text: "スタンプカードを作成しました" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "作成に失敗しました",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (card: StampCard) => {
    if (!card.id) return;
    try {
      await updateStampCardStatus(card.id, !card.isActive);
      setStampCards((prev) =>
        prev.map((c) =>
          c.id === card.id ? { ...c, isActive: !c.isActive } : c
        )
      );
      setMessage({
        type: "success",
        text: card.isActive ? "無効にしました" : "有効にしました",
      });
    } catch {
      setMessage({ type: "error", text: "更新に失敗しました" });
    }
  };

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6">
        <p className="text-gray-600 text-center">加盟店が見つかりません</p>
      </div>
    );
  }

  const activeCard = stampCards.find((c) => c.isActive);

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/merchant" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-800">スタンプカード管理</h1>
      </div>

      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 現在の有効なスタンプカード */}
      {activeCard && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-orange-200 rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Stamp size={20} className="text-orange-500" />
            <p className="text-sm font-bold text-orange-700">現在のスタンプカード</p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">必要スタンプ数</span>
              <span className="font-bold text-gray-800">{activeCard.requiredStamps}個</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">報酬タイプ</span>
              <span className="font-bold text-gray-800">
                {activeCard.rewardType === "point" ? "ポイント" : "クーポン"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">報酬</span>
              <span className="font-bold text-gray-800">{activeCard.rewardDescription}</span>
            </div>
          </div>
        </div>
      )}

      {/* 作成ボタン */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white rounded-xl px-4 py-3 font-bold hover:bg-orange-600 transition-colors mb-4"
        >
          <Plus size={18} />
          新しいスタンプカードを作成
        </button>
      )}

      {/* 作成フォーム */}
      {showForm && (
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <p className="font-bold text-gray-800 mb-4">スタンプカード作成</p>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 block mb-1">
                必要スタンプ数
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={requiredStamps}
                onChange={(e) => setRequiredStamps(e.target.value)}
                min={1}
                max={30}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <p className="text-xs text-gray-400 mt-1">1〜30個（来店ごとに1スタンプ）</p>
            </div>

            <div>
              <label className="text-sm text-gray-600 block mb-1">報酬タイプ</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setRewardType("point")}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                    rewardType === "point"
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  ポイント付与
                </button>
                <button
                  onClick={() => setRewardType("coupon")}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                    rewardType === "coupon"
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  クーポン
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600 block mb-1">
                {rewardType === "point" ? "付与ポイント数" : "クーポン割引額"}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  value={rewardValue}
                  onChange={(e) => setRewardValue(e.target.value)}
                  placeholder="500"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <span className="text-sm text-gray-500">
                  {rewardType === "point" ? "pt" : "円"}
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600 block mb-1">
                報酬の説明
              </label>
              <input
                type="text"
                value={rewardDescription}
                onChange={(e) => setRewardDescription(e.target.value)}
                placeholder="例: 500ptプレゼント"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-300 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="flex-1 bg-orange-500 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-orange-600 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin mx-auto" />
                ) : (
                  "作成"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 過去のスタンプカード一覧 */}
      {stampCards.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-600 mb-3">スタンプカード一覧</p>
          <div className="space-y-2">
            {stampCards.map((card) => (
              <div
                key={card.id}
                className={`bg-white rounded-xl p-4 shadow-sm ${
                  !card.isActive ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift
                      size={16}
                      className={card.isActive ? "text-orange-500" : "text-gray-400"}
                    />
                    <div>
                      <p className="text-sm font-bold text-gray-800">
                        {card.rewardDescription}
                      </p>
                      <p className="text-xs text-gray-400">
                        {card.requiredStamps}スタンプで達成 /{" "}
                        {card.rewardType === "point"
                          ? `${card.rewardValue}pt付与`
                          : `${card.rewardValue}円割引`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(card)}
                    className="text-gray-500"
                  >
                    {card.isActive ? (
                      <ToggleRight size={28} className="text-green-500" />
                    ) : (
                      <ToggleLeft size={28} className="text-gray-300" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <MerchantNavigation />
    </div>
  );
}

export default function MerchantStampsPage() {
  return (
    <AuthProvider>
      <StampCardContent />
    </AuthProvider>
  );
}
