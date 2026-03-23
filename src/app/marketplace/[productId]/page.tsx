"use client";

import { useEffect, useState, use } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import {
  getProduct,
  getUser,
  processEcPurchase,
} from "@/lib/firestore";
import { formatPoints } from "@/lib/utils";
import type { Product, User } from "@/types";
import {
  Loader2,
  ArrowLeft,
  Store,
  Package,
  Minus,
  Plus,
  MapPin,
  Truck,
  ShoppingBag,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";

function ProductDetailContent({ productId }: { productId: string }) {
  const { liffUser, user, loading } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [fetching, setFetching] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState<"pickup" | "delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getProduct(productId)
      .then(setProduct)
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [productId]);

  const totalAmount = product ? product.price * quantity : 0;

  const handlePurchase = async () => {
    if (!liffUser || !user || !product) return;
    if (method === "delivery" && !deliveryAddress.trim()) {
      setError("配達先住所を入力してください");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await processEcPurchase({
        productId: product.id!,
        productName: product.name,
        buyerId: liffUser.userId,
        buyerName: user.displayName,
        shopId: product.shopId,
        shopName: product.shopName,
        unitPrice: product.price,
        quantity,
        method,
        deliveryAddress: method === "delivery" ? deliveryAddress.trim() : "",
        memo: memo.trim(),
      });
      setSuccess(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "購入に失敗しました";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6">
        <Link href="/marketplace" className="text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
          <ArrowLeft size={18} />
          戻る
        </Link>
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <Package className="mx-auto text-gray-400 mb-3" size={40} />
          <p className="text-gray-500">商品が見つかりません</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6 pb-24">
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={56} />
          <h2 className="text-xl font-bold text-gray-800 mb-2">注文完了</h2>
          <p className="text-gray-600 mb-1">
            {product.name} x{quantity}
          </p>
          <p className="text-lg font-bold text-orange-600 mb-4">
            {formatPoints(totalAmount)} pt
          </p>
          <p className="text-sm text-gray-500 mb-6">
            お店からの確認をお待ちください
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/my-orders"
              className="bg-orange-500 text-white rounded-xl px-4 py-3 font-bold hover:bg-orange-600 transition-colors"
            >
              注文履歴を見る
            </Link>
            <Link
              href="/marketplace"
              className="bg-gray-100 text-gray-700 rounded-xl px-4 py-3 font-bold hover:bg-gray-200 transition-colors"
            >
              マーケットに戻る
            </Link>
          </div>
        </div>
        <Navigation />
      </div>
    );
  }

  const canPurchase =
    product.isActive &&
    product.stock >= quantity &&
    user &&
    user.balance >= totalAmount &&
    quantity >= 1;

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/marketplace" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-800 flex-1 truncate">
          {product.name}
        </h1>
      </div>

      {/* 商品画像エリア */}
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-8 flex items-center justify-center mb-4">
        <Package size={64} className="text-orange-300" />
      </div>

      {/* 商品情報 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {product.category}
          </span>
          <span className="text-xs text-gray-400">残り{product.stock}個</span>
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-1">{product.name}</h2>
        <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
          <Store size={12} />
          {product.shopName}
        </p>
        {product.description && (
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            {product.description}
          </p>
        )}
        <p className="text-2xl font-bold text-orange-600">
          {formatPoints(product.price)}
          <span className="text-sm ml-1">pt</span>
        </p>
      </div>

      {/* 注文フォーム */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4 space-y-4">
        {/* 数量 */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">
            数量
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30"
            >
              <Minus size={18} />
            </button>
            <span className="text-xl font-bold text-gray-800 w-12 text-center">
              {quantity}
            </span>
            <button
              onClick={() =>
                setQuantity(Math.min(product.stock, quantity + 1))
              }
              disabled={quantity >= product.stock}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* 受取方法 */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">
            受取方法
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMethod("pickup")}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                method === "pickup"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <ShoppingBag size={16} />
              店頭受取
            </button>
            <button
              onClick={() => setMethod("delivery")}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                method === "delivery"
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Truck size={16} />
              配達
            </button>
          </div>
        </div>

        {/* 配達先住所 */}
        {method === "delivery" && (
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              配達先住所 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin
                size={16}
                className="absolute left-3 top-3 text-gray-400"
              />
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="例: 本庄市駅前町1-2-3"
                className="w-full border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>
        )}

        {/* メモ */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            メモ（任意）
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="店舗への連絡事項があれば入力..."
            rows={2}
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          />
        </div>
      </div>

      {/* 合計・決済 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">
            {formatPoints(product.price)} pt x {quantity}個
          </span>
          <span className="text-xl font-bold text-orange-600">
            {formatPoints(totalAmount)}
            <span className="text-sm ml-0.5">pt</span>
          </span>
        </div>
        {user && (
          <p className="text-xs text-gray-400 text-right">
            現在の残高: {formatPoints(user.balance)} pt
            {user.balance < totalAmount && (
              <span className="text-red-500 ml-1">（残高不足）</span>
            )}
          </p>
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm font-medium">
          {error}
        </div>
      )}

      {/* 購入ボタン */}
      <button
        onClick={handlePurchase}
        disabled={!canPurchase || submitting}
        className="w-full bg-orange-500 text-white rounded-xl py-4 font-bold text-base disabled:bg-gray-300 flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors"
      >
        {submitting ? (
          <Loader2 size={20} className="animate-spin" />
        ) : (
          <>
            <ShoppingBag size={20} />
            ありがとうPayで購入する
          </>
        )}
      </button>

      <Navigation />
    </div>
  );
}

export default function ProductPurchasePage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = use(params);
  return (
    <AuthProvider>
      <ProductDetailContent productId={productId} />
    </AuthProvider>
  );
}
