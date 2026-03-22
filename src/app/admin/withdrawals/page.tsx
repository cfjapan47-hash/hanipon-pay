"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { getAllWithdrawals, processWithdrawal } from "@/lib/firestore";
import { formatPoints, formatDate } from "@/lib/utils";
import type { WithdrawalRequest } from "@/types";
import {
  Loader2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";

function WithdrawalsContent() {
  const { user, loading } = useAuth();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [fetching, setFetching] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadWithdrawals = () => {
    getAllWithdrawals()
      .then(setWithdrawals)
      .catch(console.error)
      .finally(() => setFetching(false));
  };

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const handleProcess = async (
    id: string,
    status: "completed" | "rejected"
  ) => {
    setProcessingId(id);
    try {
      await processWithdrawal(id, status);
      loadWithdrawals();
    } catch (err) {
      console.error(err);
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

  const pendingCount = withdrawals.filter((w) => w.status === "pending").length;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-8">
      <Link
        href="/admin"
        className="flex items-center gap-1 text-gray-500 text-sm mb-4"
      >
        <ArrowLeft size={16} /> 管理画面に戻る
      </Link>
      <h1 className="text-xl font-bold text-gray-800 mb-2">換金申請管理</h1>
      <p className="text-sm text-gray-500 mb-4">
        未処理: {pendingCount}件
      </p>

      <div className="space-y-3">
        {withdrawals.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            換金申請はありません
          </p>
        ) : (
          withdrawals.map((wd) => (
            <div
              key={wd.id}
              className="bg-white rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-gray-800">
                  {wd.merchantName}
                </p>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    wd.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : wd.status === "rejected"
                      ? "bg-red-100 text-red-600"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {wd.status === "completed"
                    ? "振込済"
                    : wd.status === "rejected"
                    ? "却下"
                    : "未処理"}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-800">
                {formatPoints(wd.amount)}
                <span className="text-sm ml-1">pt</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {wd.bankName} {wd.bankAccount}
              </p>
              <p className="text-xs text-gray-400">
                {wd.createdAt ? formatDate(wd.createdAt) : ""}
              </p>

              {wd.status === "pending" && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleProcess(wd.id!, "completed")}
                    disabled={processingId === wd.id}
                    className="flex-1 flex items-center justify-center gap-1 bg-green-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50"
                  >
                    {processingId === wd.id ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <CheckCircle size={14} />
                    )}
                    振込完了
                  </button>
                  <button
                    onClick={() => handleProcess(wd.id!, "rejected")}
                    disabled={processingId === wd.id}
                    className="flex-1 flex items-center justify-center gap-1 bg-red-100 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-200 disabled:opacity-50"
                  >
                    <XCircle size={14} />
                    却下
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function WithdrawalsPage() {
  return (
    <AuthProvider>
      <WithdrawalsContent />
    </AuthProvider>
  );
}
