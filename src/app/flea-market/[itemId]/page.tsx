"use client";

import { useEffect, useState, use } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { getFleaItem, purchaseFleaItem } from "@/lib/firestore";
import { formatPoints } from "@/lib/utils";
import type { FleaItem } from "@/types";
import {
  Loader2,
  ArrowLeft,
  ShoppingBag,
  MapPin,
  User as UserIcon,
  Tag,
  Package,
  CheckCircle,
  Coins,
} from "lucide-react";
import Link from "next/link";

function FleaItemDetailContent({ itemId }: { itemId: string }) {
  const { liffUser, user, loading } = useAuth();
  const [item, setItem] = useState<FleaItem | null>(null);
  const [fetching, setFetching] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    getFleaItem(itemId)
      .then(setItem)
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [itemId]);

  const methodLabel = (m: string) => {
    switch (m) {
      case "pickup": return "手渡し";
      case "delivery": return "配送";
      case "both": return "手渡し/配送";
      default: return m;
    }
  };

  const handlePurchase = async () => {
    if (!liffUser || !user || !item) return;
    setPurchasing(true);
    setError("");
    try {
      await purchaseFleaItem(itemId, liffUser.userId, user.displayName);
      setSuccess(true);
      setConfirmOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "購入に失敗しました");
    } finally {
      setPurchasing(false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6 pb-24">
        <Link href="/flea-market" className="flex items-center gap-1 text-sm text-gray-500 mb-4">
          <ArrowLeft size={16} />
          フリマ一覧に戻る
        </Link>
        <p className="text-center text-gray-500 py-12">商品が見つかりません</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6 pb-24">
        <div className="text-center py-12">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-lg font-bold text-gray-800 mb-2">購入しました！</h2>
          <p className="text-sm text-gray-500 mb-6">出品者と取引方法を確認してください</p>
          <div className="space-y-2">
            <Link
              href="/flea-market/my"
              className="block w-full bg-rose-600 text-white rounded-xl px-4 py-3 text-sm font-bold hover:bg-rose-700"
            >
              購入履歴を確認する
            </Link>
            <Link
              href="/flea-market"
              className="block w-full bg-gray-100 text-gray-700 rounded-xl px-4 py-3 text-sm font-medium hover:bg-gray-200"
            >
              フリマ一覧に戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const fee = Math.floor(item.price * 0.1);
  const sellerReceives = item.price - fee;

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <Link href="/flea-market" className="flex items-center gap-1 text-sm text-gray-500 mb-4">
        <ArrowLeft size={16} />
        フリマ一覧に戻る
      </Link>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex gap-2 mb-2">
          <span className="inline-block bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded-full">
            {item.category}
          </span>
          <span className="inline-block bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
            {item.condition}
          </span>
          {item.status === "sold" && (
            <span className="inline-block bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">
              売約済み
            </span>
          )}
        </div>

        <h1 className="text-xl font-bold text-gray-800 mb-2">{item.title}</h1>

        <p className="text-2xl font-bold text-rose-600 mb-4">
          {formatPoints(item.price)}pt
        </p>

        <p className="text-sm text-gray-600 mb-4">{item.description}</p>

        <div className="space-y-2 text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-2">
            <UserIcon size={14} />
            <span>出品者: {item.sellerName}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={14} />
            <span>エリア: {item.area}</span>
          </div>
          <div className="flex items-center gap-2">
            <Package size={14} />
            <span>取引方法: {methodLabel(item.method)}</span>
          </div>
        </div>

        {/* 料金内訳 */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-gray-500">購入価格</span>
            <span className="font-medium">{formatPoints(item.price)}pt</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">手数料（10%）</span>
            <span className="text-gray-600">{formatPoints(fee)}pt</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-gray-500">出品者受取額</span>
            <span className="font-bold text-rose-600">{formatPoints(sellerReceives)}pt</span>
          </div>
        </div>

        {user && (
          <div className="bg-orange-50 rounded-xl px-4 py-3 text-sm mb-4">
            <span className="text-orange-700">
              現在の残高: {formatPoints(user.balance || 0)}pt
            </span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 mb-4">
            {error}
          </div>
        )}

        {item.status === "available" && liffUser && item.sellerId !== liffUser.userId && (
          <button
            onClick={() => setConfirmOpen(true)}
            className="w-full bg-rose-600 text-white rounded-xl px-4 py-3 text-sm font-bold hover:bg-rose-700 flex items-center justify-center gap-2"
          >
            <ShoppingBag size={18} />
            購入する（{formatPoints(item.price)}pt）
          </button>
        )}

        {item.status === "sold" && (
          <div className="w-full bg-gray-200 text-gray-500 rounded-xl px-4 py-3 text-sm font-bold text-center">
            売約済み
          </div>
        )}

        {liffUser && item.sellerId === liffUser.userId && (
          <div className="w-full bg-gray-100 text-gray-500 rounded-xl px-4 py-3 text-sm font-bold text-center">
            自分の出品です
          </div>
        )}
      </div>

      {/* 購入確認モーダル */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-800 mb-2">購入確認</h3>
            <p className="text-sm text-gray-500 mb-4">
              「{item.title}」を {formatPoints(item.price)}pt で購入しますか？
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 bg-gray-200 text-gray-700 rounded-xl px-4 py-3 text-sm font-bold hover:bg-gray-300"
              >
                キャンセル
              </button>
              <button
                onClick={handlePurchase}
                disabled={purchasing}
                className="flex-1 bg-rose-600 text-white rounded-xl px-4 py-3 text-sm font-bold hover:bg-rose-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {purchasing ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <Coins size={18} />
                    購入する
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FleaItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = use(params);
  return (
    <AuthProvider>
      <FleaItemDetailContent itemId={itemId} />
    </AuthProvider>
  );
}
