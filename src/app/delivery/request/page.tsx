"use client";

import { useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { createDeliveryRequest } from "@/lib/firestore";
import { formatPoints } from "@/lib/utils";
import {
  Loader2,
  ArrowLeft,
  MapPin,
  Package,
  Clock,
  Coins,
  CircleDot,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";

function DeliveryRequestContent() {
  const { liffUser, user, loading } = useAuth();
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [description, setDescription] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [fee, setFee] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const feeNum = parseInt(fee) || 0;
  const platformFee = Math.floor(feeNum * 0.1);
  const driverReward = feeNum - platformFee;

  const handleSubmit = async () => {
    if (!liffUser || !user) return;
    if (!pickup.trim()) return setError("集荷場所を入力してください");
    if (!destination.trim()) return setError("配達先住所を入力してください");
    if (!description.trim()) return setError("荷物の説明を入力してください");
    if (feeNum < 100) return setError("配達料は100ポイント以上を設定してください");
    if (feeNum > (user.balance || 0))
      return setError("ポイント残高が不足しています");

    setSubmitting(true);
    setError("");
    try {
      await createDeliveryRequest({
        requesterId: liffUser.userId,
        requesterName: user.displayName,
        pickup: pickup.trim(),
        destination: destination.trim(),
        description: description.trim(),
        fee: feeNum,
        preferredTime: preferredTime.trim(),
      });
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "依頼に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (!liffUser || !user) {
    return (
      <div className="flex items-center justify-center h-screen px-4">
        <p className="text-red-500">認証エラー</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6 pb-24">
        <div className="text-center py-12">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-lg font-bold text-gray-800 mb-2">
            配達依頼を作成しました
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            ドライバーが受注するまでお待ちください
          </p>
          <div className="space-y-2">
            <Link
              href="/my-deliveries"
              className="block w-full bg-teal-600 text-white rounded-xl px-4 py-3 text-sm font-bold hover:bg-teal-700"
            >
              配達状況を確認する
            </Link>
            <Link
              href="/"
              className="block w-full bg-gray-100 text-gray-700 rounded-xl px-4 py-3 text-sm font-medium hover:bg-gray-200"
            >
              ホームに戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <Link
        href="/"
        className="flex items-center gap-1 text-sm text-gray-500 mb-4"
      >
        <ArrowLeft size={16} />
        ホームに戻る
      </Link>

      <h1 className="text-xl font-bold text-gray-800 mb-4">配達を依頼する</h1>

      <div className="space-y-4">
        {/* 集荷場所 */}
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            <CircleDot size={14} />
            集荷場所
          </label>
          <input
            type="text"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            placeholder="例: 本庄ベーカリー（駅前町1-2-3）"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* 配達先 */}
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            <MapPin size={14} />
            配達先住所
          </label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="例: 本庄市中央2-5-8"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* 荷物の説明 */}
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            <Package size={14} />
            荷物の説明
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="例: パン5個入りの紙袋1つ"
            rows={2}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
          />
        </div>

        {/* 希望時間帯 */}
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            <Clock size={14} />
            希望時間帯（任意）
          </label>
          <input
            type="text"
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value)}
            placeholder="例: 14:00〜16:00"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* 配達料 */}
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            <Coins size={14} />
            配達料（ポイント）
          </label>
          <input
            type="number"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            placeholder="例: 300"
            min={100}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* 料金内訳 */}
        {feeNum > 0 && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">配達料</span>
              <span className="font-medium">{formatPoints(feeNum)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">
                プラットフォーム手数料（10%）
              </span>
              <span className="text-gray-600">{formatPoints(platformFee)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-500">ドライバー報酬</span>
              <span className="font-bold text-teal-600">
                {formatPoints(driverReward)}
              </span>
            </div>
          </div>
        )}

        {/* 残高表示 */}
        <div className="bg-orange-50 rounded-xl px-4 py-3 text-sm">
          <span className="text-orange-700">
            現在の残高: {formatPoints(user.balance || 0)}
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-teal-600 text-white rounded-xl px-4 py-3 text-sm font-bold hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <>
              <Package size={18} />
              配達を依頼する（{formatPoints(feeNum)}）
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function DeliveryRequestPage() {
  return (
    <AuthProvider>
      <DeliveryRequestContent />
    </AuthProvider>
  );
}
