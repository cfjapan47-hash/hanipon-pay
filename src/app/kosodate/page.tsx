"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { getOpenKosodateRequests, acceptKosodateRequest } from "@/lib/firestore";
import { formatPoints } from "@/lib/utils";
import type { KosodateRequest, KosodateType } from "@/types";
import {
  Loader2,
  ArrowLeft,
  Heart,
  Plus,
  Calendar,
  Clock,
  Coins,
  User as UserIcon,
  CheckCircle,
  HandHeart,
} from "lucide-react";
import Link from "next/link";

const TYPES: KosodateType[] = ["保育", "送迎", "家事", "その他"];

function KosodateContent() {
  const { liffUser, user, loading } = useAuth();
  const [requests, setRequests] = useState<KosodateRequest[]>([]);
  const [fetching, setFetching] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [accepting, setAccepting] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getOpenKosodateRequests()
      .then(setRequests)
      .catch(console.error)
      .finally(() => setFetching(false));
  }, []);

  const filtered = requests.filter((r) => {
    if (selectedType !== "all" && r.type !== selectedType) return false;
    return true;
  });

  const handleAccept = async (req: KosodateRequest) => {
    if (!liffUser || !user) return;
    setAccepting(req.id!);
    try {
      await acceptKosodateRequest(req.id!, liffUser.userId, user.displayName);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setAccepting(null);
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
      <Link href="/" className="flex items-center gap-1 text-sm text-gray-500 mb-4">
        <ArrowLeft size={16} />
        ホームに戻る
      </Link>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">子育てシェア</h1>
        <Link
          href="/kosodate/request"
          className="flex items-center gap-1 bg-pink-600 text-white rounded-lg px-3 py-2 text-xs font-bold hover:bg-pink-700"
        >
          <Plus size={14} />
          依頼する
        </Link>
      </div>

      <Link
        href="/kosodate/my"
        className="block mb-4 text-center bg-pink-50 text-pink-700 rounded-xl px-4 py-2 text-sm font-medium hover:bg-pink-100"
      >
        マイ依頼・お手伝い履歴
      </Link>

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-600 flex items-center gap-2">
          <CheckCircle size={16} />
          お手伝いを受け付けました！
        </div>
      )}

      {/* タイプフィルター */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        <button
          onClick={() => setSelectedType("all")}
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
            selectedType === "all" ? "bg-pink-600 text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          すべて
        </button>
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedType(t)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
              selectedType === t ? "bg-pink-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* 依頼一覧 */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Heart size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">依頼はありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="inline-block bg-pink-100 text-pink-700 text-xs px-2 py-0.5 rounded-full mb-1">
                    {req.type}
                  </span>
                  <h3 className="font-bold text-gray-800">{req.title}</h3>
                </div>
                <span className="text-pink-600 font-bold text-sm whitespace-nowrap">
                  {formatPoints(req.reward)}pt
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{req.description}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-3">
                <span className="flex items-center gap-1">
                  <UserIcon size={12} />
                  {req.requesterName}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {req.date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {req.time}（{req.duration}分）
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 mb-3 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>報酬</span>
                  <span>{formatPoints(req.reward)}pt</span>
                </div>
                <div className="flex justify-between">
                  <span>手数料（5%）</span>
                  <span>{formatPoints(Math.floor(req.reward * 0.05))}pt</span>
                </div>
                <div className="flex justify-between font-bold text-pink-600">
                  <span>受取額</span>
                  <span>{formatPoints(req.reward - Math.floor(req.reward * 0.05))}pt</span>
                </div>
              </div>
              {liffUser && req.requesterId !== liffUser.userId && (
                <button
                  onClick={() => handleAccept(req)}
                  disabled={accepting === req.id}
                  className="w-full flex items-center justify-center gap-1 bg-pink-600 text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-pink-700 disabled:opacity-50"
                >
                  {accepting === req.id ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <>
                      <HandHeart size={14} />
                      お手伝いする
                    </>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function KosodatePage() {
  return (
    <AuthProvider>
      <KosodateContent />
    </AuthProvider>
  );
}
