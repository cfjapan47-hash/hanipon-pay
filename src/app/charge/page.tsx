"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import { createChargeRequest, getChargeRequests } from "@/lib/firestore";
import { formatPoints, formatDate } from "@/lib/utils";
import type { ChargeRequest } from "@/types";
import {
  Loader2,
  Banknote,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  X,
} from "lucide-react";

const PRESET_AMOUNTS = [500, 1000, 3000, 5000, 10000];

function ChargeContent() {
  const { liffUser, user, loading } = useAuth();
  const [requests, setRequests] = useState<ChargeRequest[]>([]);
  const [fetching, setFetching] = useState(true);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = () => {
    if (!liffUser) return;
    getChargeRequests(liffUser.userId)
      .then(setRequests)
      .catch(console.error)
      .finally(() => setFetching(false));
  };

  useEffect(() => {
    if (!liffUser) return;
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liffUser]);

  const chargeAmount =
    selectedAmount === -1 ? parseInt(customAmount, 10) || 0 : selectedAmount || 0;

  const handleSubmit = async () => {
    if (!liffUser || !user || chargeAmount <= 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await Promise.race([
        createChargeRequest(liffUser.userId, user.displayName, chargeAmount),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("タイムアウトしました")), 15000)
        ),
      ]);
      setShowConfirm(false);
      setShowComplete(true);
      setSelectedAmount(null);
      setCustomAmount("");
      loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <Loader2 className="animate-spin text-orange-500" size={32} />
        <p className="text-sm text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (!user || !liffUser) {
    return (
      <div className="flex items-center justify-center h-screen px-4">
        <p className="text-red-500 text-center">認証エラー</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <h1 className="text-xl font-bold text-gray-800 mb-4">
        銀行振込チャージ
      </h1>

      {/* 振込先口座情報 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={20} className="text-blue-600" />
          <p className="font-bold text-blue-800">振込先口座情報</p>
        </div>
        <div className="space-y-1 text-sm text-gray-700">
          <p>
            <span className="text-gray-500">銀行名：</span>
            GMOあおぞらネット銀行
          </p>
          <p>
            <span className="text-gray-500">支店名：</span>
            法人営業部
          </p>
          <p>
            <span className="text-gray-500">口座種別：</span>
            普通
          </p>
          <p>
            <span className="text-gray-500">口座番号：</span>
            2172218
          </p>
          <p>
            <span className="text-gray-500">口座名義：</span>
            合同会社cfjapan
          </p>
        </div>
        <p className="text-xs text-blue-600 mt-3">
          ※ 振込人名義はLINE登録名と同じにしてください
        </p>
      </div>

      {/* 金額選択 */}
      <div className="mb-6">
        <p className="text-sm font-semibold text-gray-600 mb-3">
          チャージ金額を選択
        </p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {PRESET_AMOUNTS.map((amount) => (
            <button
              key={amount}
              onClick={() => {
                setSelectedAmount(amount);
                setCustomAmount("");
              }}
              className={`py-3 rounded-xl text-sm font-bold transition-colors ${
                selectedAmount === amount
                  ? "bg-orange-500 text-white"
                  : "bg-white border-2 border-gray-200 text-gray-700 hover:border-orange-300"
              }`}
            >
              {formatPoints(amount)}円
            </button>
          ))}
          <button
            onClick={() => {
              setSelectedAmount(-1);
            }}
            className={`py-3 rounded-xl text-sm font-bold transition-colors ${
              selectedAmount === -1
                ? "bg-orange-500 text-white"
                : "bg-white border-2 border-gray-200 text-gray-700 hover:border-orange-300"
            }`}
          >
            自由入力
          </button>
        </div>

        {selectedAmount === -1 && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="金額を入力"
              min={100}
              className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
            />
            <span className="text-sm text-gray-500 font-medium">円</span>
          </div>
        )}
      </div>

      {/* 申請ボタン */}
      <button
        onClick={() => setShowConfirm(true)}
        disabled={chargeAmount <= 0}
        className="w-full bg-orange-500 text-white rounded-xl py-4 text-base font-bold hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        <Banknote size={20} />
        {chargeAmount > 0
          ? `${formatPoints(chargeAmount)}円をチャージ申請`
          : "金額を選択してください"}
      </button>

      {/* 確認モーダル */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center relative">
            <button
              onClick={() => setShowConfirm(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
            <Banknote size={32} className="text-orange-500 mx-auto mb-3" />
            <p className="text-lg font-bold mb-2">チャージ申請確認</p>
            <p className="text-3xl font-bold text-orange-600 mb-4">
              {formatPoints(chargeAmount)}
              <span className="text-base ml-1">円</span>
            </p>
            <p className="text-xs text-gray-500 mb-4">
              上記の口座に振り込んだ後、管理者が入金確認を行います。
              <br />
              確認後にポイントが反映されます。
            </p>
            {error && (
              <p className="text-xs text-red-500 mb-3">{error}</p>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-orange-500 text-white rounded-xl py-3 font-bold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                "申請する"
              )}
            </button>
          </div>
        </div>
      )}

      {/* 完了モーダル */}
      {showComplete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
            <p className="text-lg font-bold mb-2">申請完了</p>
            <p className="text-sm text-gray-500 mb-4">
              入金確認後にポイントが反映されます。
              <br />
              振込先口座へのお振込みをお願いいたします。
            </p>
            <button
              onClick={() => setShowComplete(false)}
              className="w-full bg-gray-100 text-gray-700 rounded-xl py-3 font-medium hover:bg-gray-200"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* 過去の申請一覧 */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">
          チャージ申請履歴
        </h2>
        {requests.length === 0 ? (
          <p className="text-gray-400 text-center py-8 text-sm">
            申請履歴はありません
          </p>
        ) : (
          <div className="space-y-2">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-gray-800">
                    {formatPoints(req.amount)}
                    <span className="text-xs ml-1">円</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {req.createdAt ? formatDate(req.createdAt) : ""}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                    req.status === "approved"
                      ? "bg-green-100 text-green-700"
                      : req.status === "rejected"
                      ? "bg-red-100 text-red-600"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {req.status === "approved" ? (
                    <>
                      <CheckCircle size={12} />
                      承認済
                    </>
                  ) : req.status === "rejected" ? (
                    <>
                      <XCircle size={12} />
                      却下
                    </>
                  ) : (
                    <>
                      <Clock size={12} />
                      確認中
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
}

export default function ChargePage() {
  return (
    <AuthProvider>
      <ChargeContent />
    </AuthProvider>
  );
}
