"use client";

import { useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { grantPoints, grantLocalPoints } from "@/lib/firestore";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

function GrantContent() {
  const { liffUser, user, loading } = useAuth();
  const [toUserId, setToUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [pointType, setPointType] = useState<"common" | "local">("common");
  const [areaId, setAreaId] = useState("honjo");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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

  const handleGrant = async () => {
    if (!liffUser) return;
    const numAmount = parseInt(amount, 10);
    if (!toUserId.trim()) {
      setErrorMsg("対象ユーザーIDを入力してください");
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg("正しいポイント数を入力してください");
      return;
    }
    if (!reason.trim()) {
      setErrorMsg("付与理由を入力してください");
      return;
    }

    setProcessing(true);
    setErrorMsg("");
    try {
      if (pointType === "local") {
        await grantLocalPoints(toUserId.trim(), numAmount, areaId, reason.trim(), liffUser.userId);
      } else {
        await grantPoints(toUserId.trim(), numAmount, reason.trim(), liffUser.userId);
      }
      setSuccess(true);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "ポイント発行に失敗しました"
      );
    } finally {
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6">
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <CheckCircle2 className="mx-auto text-green-500 mb-4" size={56} />
          <p className="text-xl font-bold text-gray-800">ポイント発行完了</p>
          <p className="text-gray-500 mt-2">
            {toUserId} に {amount} pt
            {pointType === "local" ? `（${areaId}限定）` : "（共通）"}
            を付与しました
          </p>
          <button
            onClick={() => {
              setSuccess(false);
              setToUserId("");
              setAmount("");
              setReason("");
            }}
            className="mt-6 bg-orange-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors"
          >
            続けて発行する
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6">
      <Link
        href="/admin"
        className="flex items-center gap-1 text-gray-500 text-sm mb-4"
      >
        <ArrowLeft size={16} /> 管理画面に戻る
      </Link>
      <h1 className="text-xl font-bold text-gray-800 mb-4">ポイント発行</h1>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <label className="text-sm text-gray-600">対象ユーザーID</label>
          <input
            type="text"
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value)}
            placeholder="LINE User ID"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div>
          <label className="text-sm text-gray-600">ポイント数</label>
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div>
          <label className="text-sm text-gray-600">付与理由</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="例: プレミアム付与、ボランティア報酬"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div>
          <label className="text-sm text-gray-600">ポイント種類</label>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => setPointType("common")}
              className={`flex-1 py-2 rounded-lg text-sm font-bold ${
                pointType === "common"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              共通ポイント
            </button>
            <button
              onClick={() => setPointType("local")}
              className={`flex-1 py-2 rounded-lg text-sm font-bold ${
                pointType === "local"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              地域限定
            </button>
          </div>
        </div>
        {pointType === "local" && (
          <div>
            <label className="text-sm text-gray-600">対象エリア</label>
            <select
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="honjo">本庄市</option>
              <option value="kumagaya">熊谷市</option>
              <option value="fukaya">深谷市</option>
              <option value="kodama">児玉郡</option>
            </select>
            <p className="text-xs text-blue-500 mt-1">
              このエリアの加盟店でのみ使えるポイントです
            </p>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle size={16} />
            {errorMsg}
          </div>
        )}

        <button
          onClick={handleGrant}
          disabled={processing}
          className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          {processing ? (
            <Loader2 className="animate-spin mx-auto" size={20} />
          ) : (
            "ポイントを発行する"
          )}
        </button>
      </div>
    </div>
  );
}

export default function GrantPage() {
  return (
    <AuthProvider>
      <GrantContent />
    </AuthProvider>
  );
}
