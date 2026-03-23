"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { getAvailableFleaItems } from "@/lib/firestore";
import { formatPoints } from "@/lib/utils";
import type { FleaItem, FleaItemCategory, FleaItemCondition } from "@/types";
import {
  Loader2,
  ArrowLeft,
  Search,
  ShoppingBag,
  Plus,
  MapPin,
  User as UserIcon,
  Tag,
} from "lucide-react";
import Link from "next/link";

const CATEGORIES: FleaItemCategory[] = ["家電", "衣類", "本", "家具", "その他"];
const CONDITIONS: FleaItemCondition[] = ["新品同様", "美品", "良好", "使用感あり"];

function FleaMarketContent() {
  const { loading } = useAuth();
  const [items, setItems] = useState<FleaItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCondition, setSelectedCondition] = useState<string>("all");

  useEffect(() => {
    getAvailableFleaItems()
      .then(setItems)
      .catch(console.error)
      .finally(() => setFetching(false));
  }, []);

  const filtered = items.filter((item) => {
    if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
    if (selectedCondition !== "all" && item.condition !== selectedCondition) return false;
    if (searchQuery && !item.title.includes(searchQuery) && !item.description.includes(searchQuery))
      return false;
    return true;
  });

  const methodLabel = (m: string) => {
    switch (m) {
      case "pickup": return "手渡し";
      case "delivery": return "配送";
      case "both": return "手渡し/配送";
      default: return m;
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
        <h1 className="text-xl font-bold text-gray-800">フリマ</h1>
        <Link
          href="/flea-market/sell"
          className="flex items-center gap-1 bg-rose-600 text-white rounded-lg px-3 py-2 text-xs font-bold hover:bg-rose-700"
        >
          <Plus size={14} />
          出品する
        </Link>
      </div>

      <Link
        href="/flea-market/my"
        className="block mb-4 text-center bg-rose-50 text-rose-700 rounded-xl px-4 py-2 text-sm font-medium hover:bg-rose-100"
      >
        マイ出品・購入履歴
      </Link>

      {/* 検索 */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="商品を検索..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
        />
      </div>

      {/* カテゴリフィルター */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
            selectedCategory === "all" ? "bg-rose-600 text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          すべて
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
              selectedCategory === cat ? "bg-rose-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 状態フィルター */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        <button
          onClick={() => setSelectedCondition("all")}
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
            selectedCondition === "all" ? "bg-amber-600 text-white" : "bg-gray-100 text-gray-600"
          }`}
        >
          全状態
        </button>
        {CONDITIONS.map((cond) => (
          <button
            key={cond}
            onClick={() => setSelectedCondition(cond)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
              selectedCondition === cond ? "bg-amber-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {cond}
          </button>
        ))}
      </div>

      {/* 商品一覧 */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <ShoppingBag size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">出品がありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <Link
              key={item.id}
              href={`/flea-market/${item.id}`}
              className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-rose-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex gap-1 mb-1">
                    <span className="inline-block bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded-full">
                      {item.category}
                    </span>
                    <span className="inline-block bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                      {item.condition}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-800">{item.title}</h3>
                </div>
                <span className="text-rose-600 font-bold text-sm whitespace-nowrap">
                  {formatPoints(item.price)}pt
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <UserIcon size={12} />
                  {item.sellerName}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {item.area}
                </span>
                <span className="flex items-center gap-1">
                  <Tag size={12} />
                  {methodLabel(item.method)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FleaMarketPage() {
  return (
    <AuthProvider>
      <FleaMarketContent />
    </AuthProvider>
  );
}
