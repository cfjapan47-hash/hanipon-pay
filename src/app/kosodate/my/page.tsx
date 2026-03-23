"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  getUserKosodateRequests,
  getUserKosodateHelps,
  completeKosodateRequest,
  cancelKosodateRequest,
} from "@/lib/firestore";
import { formatPoints } from "@/lib/utils";
import type { KosodateRequest } from "@/types";
import {
  Loader2,
  ArrowLeft,
  Heart,
  HandHeart,
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
} from "lucide-react";
import Link from "next/link";

function MyKosodateContent() {
  const { liffUser, loading } = useAuth();
  const [myRequests, setMyRequests] = useState<KosodateRequest[]>([]);
  const [myHelps, setMyHelps] = useState<KosodateRequest[]>([]);
  const [fetching, setFetching] = useState(true);
  const [tab, setTab] = useState<"requests" | "helps">("requests");

  useEffect(() => {
    if (!liffUser) return;
    Promise.all([
      getUserKosodateRequests(liffUser.userId),
      getUserKosodateHelps(liffUser.userId),
    ])
      .then(([reqs, helps]) => {
        setMyRequests(reqs);
        setMyHelps(helps);
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [liffUser]);

  const handleComplete = async (requestId: string) => {
    try {
      await completeKosodateRequest(requestId);
      setMyRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: "completed" as const } : r))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      await cancelKosodateRequest(requestId);
      setMyRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: "cancelled" as const } : r))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "open": return "募集中";
      case "accepted": return "マッチ済み";
      case "completed": return "完了";
      case "cancelled": return "キャンセル";
      default: return status;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-yellow-100 text-yellow-700";
      case "accepted": return "bg-blue-100 text-blue-700";
      case "completed": return "bg-green-100 text-green-700";
      case "cancelled": return "bg-gray-100 text-gray-500";
      default: return "bg-gray-100 text-gray-500";
    }
  };

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <Link href="/kosodate" className="flex items-center gap-1 text-sm text-gray-500 mb-4">
        <ArrowLeft size={16} />
        依頼一覧に戻る
      </Link>

      <h1 className="text-xl font-bold text-gray-800 mb-4">マイ子育てシェア</h1>

      {/* タブ */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
        <button
          onClick={() => setTab("requests")}
          className={`flex-1 py-2 rounded-lg text-xs font-medium ${
            tab === "requests" ? "bg-white text-pink-700 shadow-sm" : "text-gray-500"
          }`}
        >
          依頼した一覧
        </button>
        <button
          onClick={() => setTab("helps")}
          className={`flex-1 py-2 rounded-lg text-xs font-medium ${
            tab === "helps" ? "bg-white text-pink-700 shadow-sm" : "text-gray-500"
          }`}
        >
          お手伝い履歴
        </button>
      </div>

      {/* 依頼した一覧 */}
      {tab === "requests" && (
        <div className="space-y-3">
          {myRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Heart size={40} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">依頼はありません</p>
            </div>
          ) : (
            myRequests.map((req) => (
              <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex gap-1 mb-1">
                      <span className="inline-block bg-pink-100 text-pink-700 text-xs px-2 py-0.5 rounded-full">
                        {req.type}
                      </span>
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${statusColor(req.status)}`}>
                        {statusLabel(req.status)}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-800">{req.title}</h3>
                  </div>
                  <span className="text-pink-600 font-bold text-sm">
                    {formatPoints(req.reward)}pt
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {req.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {req.time}（{req.duration}分）
                  </span>
                </div>
                {req.helperName && (
                  <p className="text-xs text-gray-500 mb-2">
                    お手伝い: {req.helperName} さん
                  </p>
                )}
                {req.status === "accepted" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleComplete(req.id!)}
                      className="flex-1 flex items-center justify-center gap-1 bg-green-600 text-white rounded-lg px-3 py-2 text-xs font-bold hover:bg-green-700"
                    >
                      <CheckCircle size={14} />
                      完了にする
                    </button>
                    <button
                      onClick={() => handleCancel(req.id!)}
                      className="flex-1 flex items-center justify-center gap-1 bg-gray-200 text-gray-700 rounded-lg px-3 py-2 text-xs font-bold hover:bg-gray-300"
                    >
                      <XCircle size={14} />
                      キャンセル
                    </button>
                  </div>
                )}
                {req.status === "open" && (
                  <button
                    onClick={() => handleCancel(req.id!)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500"
                  >
                    <XCircle size={14} />
                    依頼を取り消す
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* お手伝い履歴 */}
      {tab === "helps" && (
        <div className="space-y-3">
          {myHelps.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <HandHeart size={40} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">お手伝い履歴はありません</p>
            </div>
          ) : (
            myHelps.map((req) => (
              <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex gap-1 mb-1">
                      <span className="inline-block bg-pink-100 text-pink-700 text-xs px-2 py-0.5 rounded-full">
                        {req.type}
                      </span>
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${statusColor(req.status)}`}>
                        {statusLabel(req.status)}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-800">{req.title}</h3>
                  </div>
                  <span className="text-pink-600 font-bold text-sm">
                    {formatPoints(req.reward - Math.floor(req.reward * 0.05))}pt
                  </span>
                </div>
                <p className="text-xs text-gray-500">依頼者: {req.requesterName}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {req.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {req.time}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function MyKosodatePage() {
  return (
    <AuthProvider>
      <MyKosodateContent />
    </AuthProvider>
  );
}
