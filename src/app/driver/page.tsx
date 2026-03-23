"use client";

import { useEffect, useState, useCallback } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  getDriver,
  updateDriverAvailability,
  getOpenDeliveries,
  getDriverDeliveries,
  acceptDelivery,
  updateDeliveryStatus,
  completeDelivery,
} from "@/lib/firestore";
import { formatPoints } from "@/lib/utils";
import type { Driver, Delivery } from "@/types";
import {
  Loader2,
  ArrowLeft,
  Truck,
  MapPin,
  Clock,
  Star,
  Package,
  CheckCircle,
  CircleDot,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const STATUS_LABELS: Record<string, string> = {
  open: "募集中",
  accepted: "受注済み",
  picked_up: "集荷完了",
  delivered: "配達完了",
  cancelled: "キャンセル",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-700",
  accepted: "bg-blue-100 text-blue-700",
  picked_up: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function DriverDashboardContent() {
  const { liffUser, loading } = useAuth();
  const router = useRouter();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [openDeliveries, setOpenDeliveries] = useState<Delivery[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<Delivery[]>([]);
  const [fetching, setFetching] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchData = useCallback(async (userId: string) => {
    try {
      const d = await getDriver(userId);
      if (!d) {
        router.push("/driver/register");
        return;
      }
      setDriver(d);
      const [open, mine] = await Promise.all([
        getOpenDeliveries(),
        getDriverDeliveries(userId),
      ]);
      setOpenDeliveries(open);
      setMyDeliveries(mine);
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  }, [router]);

  useEffect(() => {
    if (!liffUser) return;
    fetchData(liffUser.userId);
  }, [liffUser, fetchData]);

  const handleToggleAvailability = async () => {
    if (!liffUser || !driver) return;
    try {
      await updateDriverAvailability(liffUser.userId, !driver.isAvailable);
      setDriver({ ...driver, isAvailable: !driver.isAvailable });
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    }
  };

  const handleAccept = async (deliveryId: string) => {
    if (!liffUser || !driver) return;
    setActionLoading(deliveryId);
    setError("");
    try {
      await acceptDelivery(deliveryId, liffUser.userId, driver.displayName);
      await fetchData(liffUser.userId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "受注に失敗しました");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePickup = async (deliveryId: string) => {
    setActionLoading(deliveryId);
    setError("");
    try {
      await updateDeliveryStatus(deliveryId, "picked_up");
      if (liffUser) await fetchData(liffUser.userId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新に失敗しました");
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (deliveryId: string) => {
    setActionLoading(deliveryId);
    setError("");
    try {
      await completeDelivery(deliveryId);
      if (liffUser) await fetchData(liffUser.userId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "完了処理に失敗しました");
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

  if (!driver) return null;

  const activeDeliveries = myDeliveries.filter(
    (d) => d.status === "accepted" || d.status === "picked_up"
  );
  const todayDeliveries = myDeliveries.filter((d) => {
    if (d.status !== "delivered") return false;
    const today = new Date().toDateString();
    const created = d.createdAt?.toDate?.();
    return created && created.toDateString() === today;
  });
  const todayEarnings = todayDeliveries.reduce(
    (sum, d) => sum + (d.fee - d.platformFee),
    0
  );

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <Link href="/" className="flex items-center gap-1 text-sm text-gray-500 mb-4">
        <ArrowLeft size={16} />
        ホームに戻る
      </Link>

      <h1 className="text-xl font-bold text-gray-800 mb-4">ドライバーダッシュボード</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 稼働状態切替 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                driver.isAvailable ? "bg-green-500 animate-pulse" : "bg-gray-400"
              }`}
            />
            <span className="font-medium text-gray-800">
              {driver.isAvailable ? "稼働中" : "休憩中"}
            </span>
          </div>
          <button
            onClick={handleToggleAvailability}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              driver.isAvailable
                ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                : "bg-teal-600 text-white hover:bg-teal-700"
            }`}
          >
            {driver.isAvailable ? "休憩する" : "稼働開始"}
          </button>
        </div>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-xs text-gray-500">本日の配達</p>
          <p className="text-xl font-bold text-gray-800">{todayDeliveries.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-xs text-gray-500">本日の収益</p>
          <p className="text-xl font-bold text-teal-600">{formatPoints(todayEarnings)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-xs text-gray-500">累計配達</p>
          <p className="text-xl font-bold text-gray-800">{driver.totalDeliveries}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-xs text-gray-500">累計収益</p>
          <p className="text-xl font-bold text-teal-600">
            {formatPoints(driver.totalEarnings)}
          </p>
        </div>
      </div>

      {/* 平均評価 */}
      {driver.ratingCount > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 flex items-center justify-center gap-2">
          <Star size={18} className="text-yellow-500 fill-yellow-500" />
          <span className="font-bold text-gray-800">{driver.rating}</span>
          <span className="text-xs text-gray-500">({driver.ratingCount}件の評価)</span>
        </div>
      )}

      {/* 進行中の配達 */}
      {activeDeliveries.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">進行中の配達</h2>
          <div className="space-y-3">
            {activeDeliveries.map((d) => (
              <div
                key={d.id}
                className="bg-white rounded-xl border-2 border-teal-200 p-4"
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
                <div className="space-y-1 text-xs text-gray-500 mb-3">
                  <div className="flex items-center gap-1">
                    <CircleDot size={12} />
                    <span>集荷: {d.pickup}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin size={12} />
                    <span>配達先: {d.destination}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>希望: {d.preferredTime || "指定なし"}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-teal-600">
                    報酬: {formatPoints(d.fee - d.platformFee)}
                  </span>
                  {d.status === "accepted" && (
                    <button
                      onClick={() => handlePickup(d.id!)}
                      disabled={actionLoading === d.id}
                      className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {actionLoading === d.id ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : (
                        <>
                          <Package size={14} />
                          集荷完了
                        </>
                      )}
                    </button>
                  )}
                  {d.status === "picked_up" && (
                    <button
                      onClick={() => handleComplete(d.id!)}
                      disabled={actionLoading === d.id}
                      className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {actionLoading === d.id ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : (
                        <>
                          <CheckCircle size={14} />
                          配達完了
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* オープンな配達依頼 */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">
          配達依頼一覧（{openDeliveries.length}件）
        </h2>
        {openDeliveries.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            <Truck size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">現在、配達依頼はありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {openDeliveries.map((d) => (
              <div
                key={d.id}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-gray-800 text-sm">
                    {d.description}
                  </span>
                  <span className="text-sm font-bold text-teal-600">
                    {formatPoints(d.fee - d.platformFee)}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-gray-500 mb-3">
                  <div className="flex items-center gap-1">
                    <CircleDot size={12} />
                    <span>集荷: {d.pickup}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin size={12} />
                    <span>配達先: {d.destination}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>希望: {d.preferredTime || "指定なし"}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleAccept(d.id!)}
                  disabled={actionLoading === d.id || !driver.isAvailable}
                  className="w-full bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {actionLoading === d.id ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <>
                      <Truck size={16} />
                      この配達を受注する
                    </>
                  )}
                </button>
                {!driver.isAvailable && (
                  <p className="text-xs text-gray-400 text-center mt-1">
                    稼働中に切り替えると受注できます
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DriverDashboardPage() {
  return (
    <AuthProvider>
      <DriverDashboardContent />
    </AuthProvider>
  );
}
