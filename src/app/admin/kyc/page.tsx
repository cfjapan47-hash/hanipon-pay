"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  getPendingKycRecords,
  approveKyc,
  rejectKyc,
  getMerchant,
} from "@/lib/firestore";
import type { KycRecord } from "@/types";
import {
  Loader2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

interface KycWithMerchantName {
  id: string;
  data: KycRecord;
  merchantName: string;
}

function AdminKycContent() {
  const { user, liffUser, loading } = useAuth();
  const [records, setRecords] = useState<KycWithMerchantName[]>([]);
  const [fetching, setFetching] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadRecords = async () => {
    try {
      const pending = await getPendingKycRecords();
      const withNames = await Promise.all(
        pending.map(async (r) => {
          const merchant = await getMerchant(r.id);
          return {
            id: r.id,
            data: r.data,
            merchantName: merchant?.name || r.id,
          };
        })
      );
      setRecords(withNames);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const handleApprove = async (merchantId: string) => {
    setProcessingId(merchantId);
    try {
      await approveKyc(merchantId, liffUser?.userId || "admin");
      setRecords((prev) => prev.filter((r) => r.id !== merchantId));
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (merchantId: string) => {
    if (!rejectReason.trim()) return;
    setProcessingId(merchantId);
    try {
      await rejectKyc(merchantId, rejectReason.trim());
      setRecords((prev) => prev.filter((r) => r.id !== merchantId));
      setRejectingId(null);
      setRejectReason("");
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date();
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
        <ArrowLeft size={16} /> 管理者ダッシュボードに戻る
      </Link>
      <h1 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <ShieldCheck size={24} />
        本人確認 (KYC) 審査
      </h1>

      {records.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <CheckCircle className="mx-auto text-green-400 mb-4" size={48} />
          <p className="text-gray-500">審査待ちの本人確認はありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <div
              key={record.id}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpandedId(expandedId === record.id ? null : record.id)
                }
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="text-left">
                  <p className="font-medium text-gray-800">
                    {record.merchantName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {record.data.fullName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isExpired(record.data.expiryDate) && (
                    <span className="flex items-center gap-1 text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">
                      <AlertTriangle size={12} />
                      期限切れ
                    </span>
                  )}
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                    審査待ち
                  </span>
                </div>
              </button>

              {expandedId === record.id && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  <div className="bg-gray-50 rounded-xl p-4 mt-3 space-y-2 text-sm">
                    <p>
                      <span className="text-gray-500">氏名:</span>{" "}
                      <span className="font-medium">{record.data.fullName}</span>
                    </p>
                    <p>
                      <span className="text-gray-500">住所:</span>{" "}
                      <span className="font-medium">{record.data.address}</span>
                    </p>
                    <p>
                      <span className="text-gray-500">生年月日:</span>{" "}
                      <span className="font-medium">
                        {record.data.dateOfBirth}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-500">有効期限:</span>{" "}
                      <span
                        className={`font-medium ${
                          isExpired(record.data.expiryDate)
                            ? "text-red-500"
                            : ""
                        }`}
                      >
                        {record.data.expiryDate}
                        {isExpired(record.data.expiryDate) && " (期限切れ)"}
                      </span>
                    </p>
                  </div>

                  {isExpired(record.data.expiryDate) && (
                    <div className="flex items-center gap-2 text-red-500 text-sm mt-3 bg-red-50 p-3 rounded-lg">
                      <AlertTriangle size={16} />
                      免許証の有効期限が切れています。却下を推奨します。
                    </div>
                  )}

                  {rejectingId === record.id ? (
                    <div className="mt-3 space-y-2">
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="却下理由を入力..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(record.id)}
                          disabled={
                            !rejectReason.trim() ||
                            processingId === record.id
                          }
                          className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50"
                        >
                          {processingId === record.id ? (
                            <Loader2
                              className="animate-spin mx-auto"
                              size={16}
                            />
                          ) : (
                            "却下する"
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setRejectingId(null);
                            setRejectReason("");
                          }}
                          className="flex-1 bg-gray-200 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-300"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleApprove(record.id)}
                        disabled={processingId === record.id}
                        className="flex-1 flex items-center justify-center gap-1 bg-green-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50"
                      >
                        {processingId === record.id ? (
                          <Loader2
                            className="animate-spin"
                            size={16}
                          />
                        ) : (
                          <>
                            <CheckCircle size={16} />
                            承認
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setRejectingId(record.id)}
                        className="flex-1 flex items-center justify-center gap-1 bg-red-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-600"
                      >
                        <XCircle size={16} />
                        却下
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminKycPage() {
  return (
    <AuthProvider>
      <AdminKycContent />
    </AuthProvider>
  );
}
