"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  getRequesterDeliveries,
  cancelDeliveryRequest,
  rateDriver,
} from "@/lib/firestore";
import { formatPoints, formatDate } from "@/lib/utils";
import type { Delivery, DeliveryStatus } from "@/types";
import {
  Loader2,
  ArrowLeft,
  Truck,
  MapPin,
  Clock,
  Star,
  XCircle,
  CircleDot,
} from "lucide-react";
import Link from "next/link";

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  open: "募集中",
  accepted: "受注済み",
  picked_up: "配達中",
  delivered: "配達完了",
  cancelled: "キャンセル",
};

const STATUS_COLORS: Record<DeliveryStatus, string> = {
  open: "bg-yellow-100 text-yellow-700",
  accepted: "bg-blue-100 text-blue-700",
  picked_up: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function MyDeliveriesContent() {
  const { liffUser, loading } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [fetching, setFetching] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [ratingDeliveryId, setRatingDeliveryId] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!liffUser) return;
    getRequesterDeliveries(liffUser.userId)
      .then(setDeliveries)
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [liffUser]);

  const handleCancel = async (deliveryId: string) => {
    if (!confirm("この配達依頼をキャンセルしますか？ポイントは返金されます。"))
      return;
    setActionLoading(deliveryId);
    setError("");
    try {
      await cancelDeliveryRequest(deliveryId);
      if (liffUser) {
        const updated = await getRequesterDeliveries(liffUser.userId);
        setDeliveries(updated);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "キャンセルに失敗しました");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRate = async (deliveryId: string) => {
    if (ratingValue < 1 || ratingValue > 5) return;
    setActionLoading(deliveryId);
    setError("");
    try {
      await rateDriver(deliveryId, ratingValue);
      if (liffUser) {
        const updated = await getRequesterDeliveries(liffUser.userId);
        setDeliveries(updated);
      }
      setRatingDeliveryId(null);
      setRatingValue(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "評価に失敗しました");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-teal-500" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <Link
        href="/"
        className="flex items-center gap-1 text-sm text-gray-500 mb-4"
      >
        <ArrowLeft size={16} />
        ホームに戻る
      </Link>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">配達履歴</h1>
        <Link
          href="/delivery/request"
          className="bg-teal-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-teal-700"
        >
          新しい依頼
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {deliveries.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Truck size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-400 mb-4">配達依頼はまだありません</p>
          <Link
            href="/delivery/request"
            className="inline-block bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700"
          >
            配達を依頼する
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {deliveries.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-gray-800 text-sm">
                  {d.description}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    STATUS_COLORS[d.status]
                  }`}
                >
                  {STATUS_LABELS[d.status]}
                </span>
              </div>

              <div className="space-y-1 text-xs text-gray-500 mb-2">
                <div className="flex items-center gap-1">
                  <CircleDot size={12} />
                  <span>集荷: {d.pickup}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin size={12} />
                  <span>配達先: {d.destination}</span>
                </div>
                {d.preferredTime && (
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>希望: {d.preferredTime}</span>
                  </div>
                )}
                {d.driverName && (
                  <div className="flex items-center gap-1">
                    <Truck size={12} />
                    <span>ドライバー: {d.driverName}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">
                  配達料: {formatPoints(d.fee)}
                </span>
                <span className="text-gray-400">
                  {d.createdAt ? formatDate(d.createdAt) : ""}
                </span>
              </div>

              {/* キャンセルボタン（openのみ） */}
              {d.status === "open" && (
                <button
                  onClick={() => handleCancel(d.id!)}
                  disabled={actionLoading === d.id}
                  className="mt-3 w-full bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-xs font-medium hover:bg-red-100 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {actionLoading === d.id ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <>
                      <XCircle size={14} />
                      キャンセルする
                    </>
                  )}
                </button>
              )}

              {/* 評価（配達完了後、未評価） */}
              {d.status === "delivered" && !d.rating && (
                <div className="mt-3">
                  {ratingDeliveryId === d.id ? (
                    <div className="bg-yellow-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-2">
                        ドライバーを評価してください
                      </p>
                      <div className="flex items-center gap-1 mb-2 justify-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRatingValue(star)}
                            className="p-1"
                          >
                            <Star
                              size={24}
                              className={
                                star <= ratingValue
                                  ? "text-yellow-500 fill-yellow-500"
                                  : "text-gray-300"
                              }
                            />
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setRatingDeliveryId(null);
                            setRatingValue(0);
                          }}
                          className="flex-1 bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs"
                        >
                          キャンセル
                        </button>
                        <button
                          onClick={() => handleRate(d.id!)}
                          disabled={
                            ratingValue === 0 || actionLoading === d.id
                          }
                          className="flex-1 bg-yellow-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
                        >
                          {actionLoading === d.id ? "送信中..." : "評価する"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRatingDeliveryId(d.id!)}
                      className="w-full bg-yellow-50 text-yellow-700 border border-yellow-200 px-4 py-2 rounded-lg text-xs font-medium hover:bg-yellow-100 flex items-center justify-center gap-1"
                    >
                      <Star size={14} />
                      ドライバーを評価する
                    </button>
                  )}
                </div>
              )}

              {/* 評価済み表示 */}
              {d.rating && (
                <div className="mt-2 flex items-center gap-1 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={14}
                      className={
                        star <= d.rating!
                          ? "text-yellow-500 fill-yellow-500"
                          : "text-gray-300"
                      }
                    />
                  ))}
                  <span className="text-xs text-gray-400 ml-1">評価済み</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyDeliveriesPage() {
  return (
    <AuthProvider>
      <MyDeliveriesContent />
    </AuthProvider>
  );
}
