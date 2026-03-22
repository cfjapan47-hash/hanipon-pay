"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  getPendingChargeRequests,
  approveChargeRequest,
  rejectChargeRequest,
} from "@/lib/firestore";
import { formatPoints, formatDate } from "@/lib/utils";
import type { ChargeRequest } from "@/types";
import {
  Loader2,
  ArrowLeft,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";

function ChargesContent() {
  const { liffUser, user, loading } = useAuth();
  const [requests, setRequests] = useState<ChargeRequest[]>([]);
  const [fetching, setFetching] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = () => {
    getPendingChargeRequests()
      .then(setRequests)
      .catch(console.error)
      .finally(() => setFetching(false));
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (id: string) => {
    if (!liffUser) return;
    setProcessingId(id);
    setError(null);
    try {
      await Promise.race([
        approveChargeRequest(id, liffUser.userId),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("タイムアウトしました")), 15000)
        ),
      ]);
      loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    setError(null);
    try {
      await Promise.race([
        rejectChargeRequest(id),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("タイムアウトしました")), 15000)
        ),
      ]);
      loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading || fetching) {
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

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-8">
      <Link
        href="/admin"
        className="flex items-center gap-1 text-gray-500 text-sm mb-4"
      >
        <ArrowLeft size={16} /> 管理画面に戻る
      </Link>
      <h1 className="text-xl font-bold text-gray-800 mb-2">
        チャージ申請管理
      </h1>
      <p className="text-sm text-gray-500 mb-4">
        未処理: {requests.length}件
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-xs text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {requests.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            未処理のチャージ申請はありません
          </p>
        ) : (
          requests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-gray-800">{req.userName}</p>
                <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                  未処理
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-800">
                {formatPoints(req.amount)}
                <span className="text-sm ml-1">円</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {req.createdAt ? formatDate(req.createdAt) : ""}
              </p>
              <p className="text-xs text-gray-400">
                ID: {req.userId?.slice(0, 12)}...
              </p>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleApprove(req.id!)}
                  disabled={processingId === req.id}
                  className="flex-1 flex items-center justify-center gap-1 bg-green-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50"
                >
                  {processingId === req.id ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <CheckCircle size={14} />
                  )}
                  承認（ポイント付与）
                </button>
                <button
                  onClick={() => handleReject(req.id!)}
                  disabled={processingId === req.id}
                  className="flex-1 flex items-center justify-center gap-1 bg-red-100 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-200 disabled:opacity-50"
                >
                  <XCircle size={14} />
                  却下
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function AdminChargesPage() {
  return (
    <AuthProvider>
      <ChargesContent />
    </AuthProvider>
  );
}
