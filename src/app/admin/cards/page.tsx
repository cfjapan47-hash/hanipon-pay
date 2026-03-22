"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { issueCards, getAllCards, toggleCardActive } from "@/lib/firestore";
import { formatPoints, formatDate } from "@/lib/utils";
import {
  Loader2,
  ArrowLeft,
  CreditCard,
  Plus,
  CheckCircle2,
  AlertCircle,
  Ban,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import type { Card } from "@/types";

function CardsContent() {
  const { user, loading } = useAuth();
  const [cards, setCards] = useState<{ id: string; data: Card }[]>([]);
  const [fetching, setFetching] = useState(true);
  const [issueCount, setIssueCount] = useState("10");
  const [issuing, setIssuing] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchCards = async () => {
    try {
      setFetching(true);
      const result = await getAllCards();
      setCards(result);
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      fetchCards();
    }
  }, [user]);

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

  const handleIssue = async () => {
    const count = parseInt(issueCount, 10);
    if (isNaN(count) || count <= 0) {
      setErrorMsg("正しい枚数を入力してください");
      return;
    }
    if (count > 1000) {
      setErrorMsg("一度に発行できるのは1000枚までです");
      return;
    }

    setIssuing(true);
    setErrorMsg("");
    setMessage("");

    try {
      const ids = await issueCards(count);
      setMessage(`${ids.length}枚のカードを発行しました`);
      await fetchCards();
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "発行に失敗しました");
    } finally {
      setIssuing(false);
    }
  };

  const handleToggle = async (cardId: string, currentActive: boolean) => {
    setToggling(cardId);
    try {
      await toggleCardActive(cardId, !currentActive);
      await fetchCards();
    } catch (e) {
      console.error(e);
    } finally {
      setToggling(null);
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
        <CreditCard size={24} />
        カード発行・管理
      </h1>

      {/* 一括発行セクション */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <h2 className="font-medium text-gray-800 mb-3">カード一括発行</h2>
        <div className="flex gap-2">
          <input
            type="number"
            value={issueCount}
            onChange={(e) => setIssueCount(e.target.value)}
            placeholder="発行枚数"
            min="1"
            max="1000"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button
            onClick={handleIssue}
            disabled={issuing}
            className="flex items-center gap-1 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
          >
            {issuing ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Plus size={16} />
            )}
            発行
          </button>
        </div>

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

      {/* カード一覧 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-medium text-gray-800">
            カード一覧（{cards.length}枚）
          </h2>
          <button
            onClick={fetchCards}
            disabled={fetching}
            className="text-gray-400 hover:text-gray-600"
          >
            <RefreshCw size={16} className={fetching ? "animate-spin" : ""} />
          </button>
        </div>

        {fetching && cards.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-orange-500" size={24} />
          </div>
        ) : cards.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">
            カードがありません
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {cards.map((card) => (
              <div
                key={card.id}
                className="px-4 py-3 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-medium text-gray-800">
                    {card.data.cardNumber}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <span>残高: {formatPoints(card.data.balance)}pt</span>
                    <span>|</span>
                    {card.data.citizenId ? (
                      <span className="text-blue-600">紐付け済</span>
                    ) : (
                      <span className="text-gray-400">未紐付け</span>
                    )}
                    {!card.data.isActive && (
                      <>
                        <span>|</span>
                        <span className="text-red-500">無効</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(card.id, card.data.isActive)}
                  disabled={toggling === card.id}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    card.data.isActive
                      ? "bg-red-50 text-red-600 hover:bg-red-100"
                      : "bg-green-50 text-green-600 hover:bg-green-100"
                  } disabled:opacity-50`}
                >
                  {toggling === card.id ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : card.data.isActive ? (
                    <Ban size={14} />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  {card.data.isActive ? "無効化" : "有効化"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminCardsPage() {
  return (
    <AuthProvider>
      <CardsContent />
    </AuthProvider>
  );
}
