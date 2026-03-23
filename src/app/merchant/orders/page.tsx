"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import MerchantNavigation from "@/components/MerchantNavigation";
import {
  getMerchantByOwner,
  getOrdersByShop,
  updateOrderStatus,
} from "@/lib/firestore";
import { formatPoints, formatDate } from "@/lib/utils";
import type { Merchant, Order, OrderStatus } from "@/types";
import {
  Loader2,
  ArrowLeft,
  Package,
  Truck,
  ShoppingBag,
  MapPin,
  CheckCircle,
  Clock,
  ChefHat,
  PackageCheck,
} from "lucide-react";
import Link from "next/link";

const TABS: { key: string; label: string; statuses: OrderStatus[] }[] = [
  { key: "new", label: "新規", statuses: ["pending"] },
  { key: "preparing", label: "準備中", statuses: ["confirmed", "preparing"] },
  { key: "ready", label: "受取待ち", statuses: ["ready"] },
  { key: "done", label: "完了", statuses: ["delivered", "cancelled"] },
];

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

function MerchantOrdersContent() {
  const { liffUser, loading } = useAuth();
  const [merchant, setMerchant] = useState<{
    id: string;
    data: Merchant;
  } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState("new");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!liffUser) return;
    getMerchantByOwner(liffUser.userId)
      .then(async (m) => {
        setMerchant(m);
        if (m) {
          const orderList = await getOrdersByShop(m.id);
          setOrders(orderList);
        }
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [liffUser]);

  const handleStatusUpdate = async (
    orderId: string,
    newStatus: OrderStatus
  ) => {
    if (!merchant) return;
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      const updated = await getOrdersByShop(merchant.id);
      setOrders(updated);
    } catch (err) {
      console.error(err);
      alert("ステータス更新に失敗しました");
    } finally {
      setUpdatingId(null);
    }
  };

  const currentTab = TABS.find((t) => t.key === activeTab)!;
  const filteredOrders = orders.filter((o) =>
    currentTab.statuses.includes(o.status)
  );

  // 新規注文の件数
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6">
        <p className="text-gray-600 text-center">
          加盟店として登録されていません
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/merchant" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-800 flex-1">注文管理</h1>
        {pendingCount > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2.5 py-1">
            {pendingCount}件
          </span>
        )}
      </div>

      {/* タブ */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
        {TABS.map((tab) => {
          const count = orders.filter((o) =>
            tab.statuses.includes(o.status)
          ).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 px-1 rounded-lg text-xs font-medium transition-colors relative ${
                activeTab === tab.key
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-1 text-[10px] bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 注文リスト */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <Package className="mx-auto text-gray-400 mb-3" size={40} />
          <p className="text-gray-500">
            {activeTab === "new"
              ? "新規注文はありません"
              : "該当する注文はありません"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl p-4 shadow-sm">
              {/* 注文ヘッダー */}
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
                  <p className="text-xs text-gray-500">
                    購入者: {order.buyerName}
                  </p>
                </div>
                <p className="font-bold text-green-600 flex-shrink-0 ml-2">
                  {formatPoints(order.amount)} pt
                </p>
              </div>

              {/* 注文詳細 */}
              <div className="text-xs text-gray-500 space-y-1 mb-3">
                <div className="flex items-center gap-2">
                  <span>数量: {order.quantity}個</span>
                  <span className="flex items-center gap-1">
                    {order.method === "pickup" ? (
                      <ShoppingBag size={12} />
                    ) : (
                      <Truck size={12} />
                    )}
                    {order.method === "pickup" ? "店頭受取" : "配達"}
                  </span>
                </div>
                {order.method === "delivery" && order.deliveryAddress && (
                  <p className="flex items-center gap-1">
                    <MapPin size={12} />
                    {order.deliveryAddress}
                  </p>
                )}
                {order.memo && <p>メモ: {order.memo}</p>}
                <p>{order.createdAt ? formatDate(order.createdAt) : ""}</p>
              </div>

              {/* アクションボタン */}
              {order.status === "pending" && (
                <button
                  onClick={() => handleStatusUpdate(order.id!, "confirmed")}
                  disabled={updatingId === order.id}
                  className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-blue-600 disabled:opacity-50"
                >
                  {updatingId === order.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      注文を確認する
                    </>
                  )}
                </button>
              )}
              {order.status === "confirmed" && (
                <button
                  onClick={() => handleStatusUpdate(order.id!, "preparing")}
                  disabled={updatingId === order.id}
                  className="w-full flex items-center justify-center gap-2 bg-purple-500 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-purple-600 disabled:opacity-50"
                >
                  {updatingId === order.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <ChefHat size={16} />
                      準備開始
                    </>
                  )}
                </button>
              )}
              {order.status === "preparing" && (
                <button
                  onClick={() => handleStatusUpdate(order.id!, "ready")}
                  disabled={updatingId === order.id}
                  className="w-full flex items-center justify-center gap-2 bg-green-500 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-green-600 disabled:opacity-50"
                >
                  {updatingId === order.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <PackageCheck size={16} />
                      受取可能にする
                    </>
                  )}
                </button>
              )}
              {order.status === "ready" && (
                <button
                  onClick={() => handleStatusUpdate(order.id!, "delivered")}
                  disabled={updatingId === order.id}
                  className="w-full flex items-center justify-center gap-2 bg-gray-700 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-gray-800 disabled:opacity-50"
                >
                  {updatingId === order.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      受渡完了
                    </>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <MerchantNavigation />
    </div>
  );
}

export default function MerchantOrdersPage() {
  return (
    <AuthProvider>
      <MerchantOrdersContent />
    </AuthProvider>
  );
}
