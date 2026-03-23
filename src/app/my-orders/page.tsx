"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import { getOrdersByBuyer, cancelOrder } from "@/lib/firestore";
import { formatPoints, formatDate } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types";
import {
  Loader2,
  ArrowLeft,
  ShoppingCart,
  Package,
  XCircle,
  Truck,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "注文受付",
  confirmed: "確認済み",
  preparing: "準備中",
  ready: "受取可能",
  delivered: "完了",
  cancelled: "キャンセル",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  preparing: "bg-purple-100 text-purple-700",
  ready: "bg-green-100 text-green-700",
  delivered: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
};

function MyOrdersContent() {
  const { liffUser, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetching, setFetching] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!liffUser) return;
    getOrdersByBuyer(liffUser.userId)
      .then(setOrders)
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [liffUser]);

  const handleCancel = async (orderId: string) => {
    if (!confirm("この注文をキャンセルしますか？ポイントは返金されます。")) return;
    setCancellingId(orderId);
    try {
      await cancelOrder(orderId);
      if (liffUser) {
        const updated = await getOrdersByBuyer(liffUser.userId);
        setOrders(updated);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "キャンセルに失敗しました";
      alert(msg);
    } finally {
      setCancellingId(null);
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
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/marketplace" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-800 flex-1">注文履歴</h1>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <ShoppingCart className="mx-auto text-gray-400 mb-3" size={40} />
          <p className="text-gray-500">注文履歴はありません</p>
          <Link
            href="/marketplace"
            className="inline-block mt-4 text-orange-600 font-medium text-sm hover:text-orange-700"
          >
            マーケットで商品を探す
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-800 truncate">
                      {order.productName}
                    </h3>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                        STATUS_COLORS[order.status]
                      }`}
                    >
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{order.shopName}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 text-gray-500">
                  <span>x{order.quantity}</span>
                  <span className="flex items-center gap-1">
                    {order.method === "pickup" ? (
                      <ShoppingBag size={12} />
                    ) : (
                      <Truck size={12} />
                    )}
                    {order.method === "pickup" ? "店頭受取" : "配達"}
                  </span>
                </div>
                <p className="font-bold text-orange-600">
                  {formatPoints(order.amount)} pt
                </p>
              </div>

              {order.method === "delivery" && order.deliveryAddress && (
                <p className="text-xs text-gray-400 mt-1">
                  配達先: {order.deliveryAddress}
                </p>
              )}

              {order.memo && (
                <p className="text-xs text-gray-400 mt-1">
                  メモ: {order.memo}
                </p>
              )}

              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-400">
                  {order.createdAt ? formatDate(order.createdAt) : ""}
                </p>
                {order.status === "pending" && (
                  <button
                    onClick={() => handleCancel(order.id!)}
                    disabled={cancellingId === order.id}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium disabled:opacity-50"
                  >
                    {cancellingId === order.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <XCircle size={12} />
                    )}
                    キャンセル
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Navigation />
    </div>
  );
}

export default function MyOrdersPage() {
  return (
    <AuthProvider>
      <MyOrdersContent />
    </AuthProvider>
  );
}
