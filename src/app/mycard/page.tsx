"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  linkCardToCitizen,
  getCardsByCitizen,
  unlinkCard,
} from "@/lib/firestore";
import { formatPoints } from "@/lib/utils";
import {
  Loader2,
  CreditCard,
  Link2,
  Unlink,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import type { Card } from "@/types";

function MyCardContent() {
  const { liffUser, user, loading } = useAuth();
  const [cards, setCards] = useState<{ id: string; data: Card }[]>([]);
  const [fetching, setFetching] = useState(true);
  const [cardNumber, setCardNumber] = useState("");
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchMyCards = async () => {
    if (!liffUser) return;
    try {
      setFetching(true);
      const result = await getCardsByCitizen(liffUser.userId);
      setCards(result);
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (liffUser && !loading) {
      fetchMyCards();
    }
  }, [liffUser, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (!liffUser) {
    return (
      <div className="flex items-center justify-center h-screen px-4">
        <p className="text-gray-500 text-center">ログインしてください</p>
      </div>
    );
  }

  const handleLink = async () => {
    const trimmed = cardNumber.trim().toUpperCase();
    if (!trimmed) {
      setErrorMsg("カード番号を入力してください");
      return;
    }

    // HANIPON- プレフィックスがなければ自動付与
    const fullNumber = trimmed.startsWith("HANIPON-")
      ? trimmed
      : `HANIPON-${trimmed.padStart(5, "0")}`;

    setLinking(true);
    setErrorMsg("");
    setMessage("");

    try {
      await linkCardToCitizen(fullNumber, liffUser.userId);
      setMessage("カードを紐付けました。カード残高はアカウント残高に統合されました。");
      setCardNumber("");
      await fetchMyCards();
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "紐付けに失敗しました");
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (cardId: string) => {
    if (!confirm("カードの紐付けを解除しますか？")) return;

    setUnlinking(cardId);
    try {
      await unlinkCard(cardId);
      setMessage("紐付けを解除しました");
      await fetchMyCards();
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "解除に失敗しました");
    } finally {
      setUnlinking(null);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <h1 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <CreditCard size={24} />
        マイカード
      </h1>

      {/* カード紐付けセクション */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <h2 className="font-medium text-gray-800 mb-3">カードを紐付ける</h2>
        <p className="text-xs text-gray-500 mb-3">
          紙カードに記載されたカード番号を入力してください。
          カード残高はアカウント残高に自動統合されます。
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            placeholder="HANIPON-00001"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button
            onClick={handleLink}
            disabled={linking}
            className="flex items-center gap-1 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
          >
            {linking ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Link2 size={16} />
            )}
            紐付け
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

      {/* 紐付け済みカード一覧 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-medium text-gray-800">紐付け済みカード</h2>
        </div>

        {fetching ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-orange-500" size={24} />
          </div>
        ) : cards.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">
            紐付けられたカードはありません
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {cards.map((card) => (
              <div
                key={card.id}
                className="px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-mono text-sm font-medium text-gray-800">
                    {card.data.cardNumber}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    カード残高: {formatPoints(card.data.balance)}pt
                  </p>
                </div>
                <button
                  onClick={() => handleUnlink(card.id)}
                  disabled={unlinking === card.id}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                >
                  {unlinking === card.id ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <Unlink size={14} />
                  )}
                  解除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Navigation />
    </div>
  );
}

export default function MyCardPage() {
  return (
    <AuthProvider>
      <MyCardContent />
    </AuthProvider>
  );
}
