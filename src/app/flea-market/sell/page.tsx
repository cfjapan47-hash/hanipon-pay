"use client";

import { useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { createFleaItem } from "@/lib/firestore";
import { formatPoints } from "@/lib/utils";
import type { FleaItemCategory, FleaItemCondition, FleaItemMethod } from "@/types";
import {
  Loader2,
  ArrowLeft,
  CheckCircle,
  ShoppingBag,
  Tag,
  FileText,
  Coins,
  MapPin,
  Package,
} from "lucide-react";
import Link from "next/link";

const CATEGORIES: FleaItemCategory[] = ["家電", "衣類", "本", "家具", "その他"];
const CONDITIONS: FleaItemCondition[] = ["新品同様", "美品", "良好", "使用感あり"];
const METHODS: { value: FleaItemMethod; label: string }[] = [
  { value: "pickup", label: "手渡し" },
  { value: "delivery", label: "配送" },
  { value: "both", label: "手渡し/配送" },
];

function SellContent() {
  const { liffUser, user, loading } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<FleaItemCategory>("その他");
  const [condition, setCondition] = useState<FleaItemCondition>("良好");
  const [method, setMethod] = useState<FleaItemMethod>("pickup");
  const [area, setArea] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!liffUser || !user) return;
    if (!title.trim()) return setError("タイトルを入力してください");
    if (!description.trim()) return setError("説明を入力してください");
    const priceNum = parseInt(price);
    if (!priceNum || priceNum < 1) return setError("価格は1以上を入力してください");
    if (!area.trim()) return setError("エリアを入力してください");

    setSubmitting(true);
    setError("");
    try {
      await createFleaItem({
        sellerId: liffUser.userId,
        sellerName: user.displayName,
        title: title.trim(),
        description: description.trim(),
        price: priceNum,
        category,
        condition,
        method,
        area: area.trim(),
      });
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "出品に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (!liffUser || !user) {
    return (
      <div className="flex items-center justify-center h-screen px-4">
        <p className="text-red-500">認証エラー</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6 pb-24">
        <div className="text-center py-12">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-lg font-bold text-gray-800 mb-2">出品しました</h2>
          <p className="text-sm text-gray-500 mb-6">フリマ一覧に表示されます</p>
          <div className="space-y-2">
            <Link
              href="/flea-market"
              className="block w-full bg-rose-600 text-white rounded-xl px-4 py-3 text-sm font-bold hover:bg-rose-700"
            >
              フリマ一覧を見る
            </Link>
            <Link
              href="/"
              className="block w-full bg-gray-100 text-gray-700 rounded-xl px-4 py-3 text-sm font-medium hover:bg-gray-200"
            >
              ホームに戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <Link href="/flea-market" className="flex items-center gap-1 text-sm text-gray-500 mb-4">
        <ArrowLeft size={16} />
        フリマ一覧に戻る
      </Link>

      <h1 className="text-xl font-bold text-gray-800 mb-4">出品する</h1>

      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            <ShoppingBag size={14} />
            商品名
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: Nintendo Switch"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            <FileText size={14} />
            商品説明
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="商品の状態や特徴を入力してください"
            rows={3}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
          />
        </div>

        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            <Coins size={14} />
            価格（ポイント）
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="例: 3000"
            min={1}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            <Tag size={14} />
            カテゴリ
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as FleaItemCategory)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            <Tag size={14} />
            商品の状態
          </label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as FleaItemCondition)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            <Package size={14} />
            取引方法
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as FleaItemMethod)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            <MapPin size={14} />
            エリア
          </label>
          <input
            type="text"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="例: 本庄市"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        {/* 手数料の説明 */}
        {parseInt(price) > 0 && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">販売価格</span>
              <span className="font-medium">{formatPoints(parseInt(price))}pt</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">手数料（10%）</span>
              <span className="text-gray-600">
                {formatPoints(Math.floor(parseInt(price) * 0.1))}pt
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-500">受取額</span>
              <span className="font-bold text-rose-600">
                {formatPoints(parseInt(price) - Math.floor(parseInt(price) * 0.1))}pt
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-rose-600 text-white rounded-xl px-4 py-3 text-sm font-bold hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <>
              <ShoppingBag size={18} />
              出品する
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function SellPage() {
  return (
    <AuthProvider>
      <SellContent />
    </AuthProvider>
  );
}
