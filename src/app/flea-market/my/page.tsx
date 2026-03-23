"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  getUserFleaItems,
  getUserPurchasedFleaItems,
  cancelFleaItem,
} from "@/lib/firestore";
import { formatPoints } from "@/lib/utils";
import type { FleaItem } from "@/types";
import {
  Loader2,
  ArrowLeft,
  ShoppingBag,
  XCircle,
  Tag,
} from "lucide-react";
import Link from "next/link";

function MyFleaContent() {
  const { liffUser, loading } = useAuth();
  const [myItems, setMyItems] = useState<FleaItem[]>([]);
  const [purchased, setPurchased] = useState<FleaItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [tab, setTab] = useState<"selling" | "purchased">("selling");

  useEffect(() => {
    if (!liffUser) return;
    Promise.all([
      getUserFleaItems(liffUser.userId),
      getUserPurchasedFleaItems(liffUser.userId),
    ])
      .then(([items, purchases]) => {
        setMyItems(items);
        setPurchased(purchases);
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [liffUser]);

  const handleCancel = async (itemId: string) => {
    await cancelFleaItem(itemId);
    setMyItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, status: "cancelled" as const } : i))
    );
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "available": return "出品中";
      case "sold": return "売約済み";
      case "cancelled": return "キャンセル";
      default: return status;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "available": return "bg-green-100 text-green-700";
      case "sold": return "bg-blue-100 text-blue-700";
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
      <Link href="/flea-market" className="flex items-center gap-1 text-sm text-gray-500 mb-4">
        <ArrowLeft size={16} />
        フリマ一覧に戻る
      </Link>

      <h1 className="text-xl font-bold text-gray-800 mb-4">マイフリマ</h1>

      {/* タブ */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
        <button
          onClick={() => setTab("selling")}
          className={`flex-1 py-2 rounded-lg text-xs font-medium ${
            tab === "selling" ? "bg-white text-rose-700 shadow-sm" : "text-gray-500"
          }`}
        >
          出品一覧
        </button>
        <button
          onClick={() => setTab("purchased")}
          className={`flex-1 py-2 rounded-lg text-xs font-medium ${
            tab === "purchased" ? "bg-white text-rose-700 shadow-sm" : "text-gray-500"
          }`}
        >
          購入履歴
        </button>
      </div>

      {tab === "selling" && (
        <div className="space-y-3">
          {myItems.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ShoppingBag size={40} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">出品はありません</p>
            </div>
          ) : (
            myItems.map((item) => (
              <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex gap-1 mb-1">
                      <span className="inline-block bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded-full">
                        {item.category}
                      </span>
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${statusColor(item.status)}`}>
                        {statusLabel(item.status)}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-800">{item.title}</h3>
                  </div>
                  <span className="text-rose-600 font-bold text-sm">
                    {formatPoints(item.price)}pt
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">{item.description}</p>
                {item.status === "available" && (
                  <button
                    onClick={() => handleCancel(item.id!)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500"
                  >
                    <XCircle size={14} />
                    出品を取り消す
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "purchased" && (
        <div className="space-y-3">
          {purchased.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Tag size={40} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">購入履歴はありません</p>
            </div>
          ) : (
            purchased.map((item) => (
              <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="inline-block bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded-full mb-1">
                      {item.category}
                    </span>
                    <h3 className="font-bold text-gray-800">{item.title}</h3>
                  </div>
                  <span className="text-rose-600 font-bold text-sm">
                    {formatPoints(item.price)}pt
                  </span>
                </div>
                <p className="text-xs text-gray-500">出品者: {item.sellerName}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function MyFleaMarketPage() {
  return (
    <AuthProvider>
      <MyFleaContent />
    </AuthProvider>
  );
}
