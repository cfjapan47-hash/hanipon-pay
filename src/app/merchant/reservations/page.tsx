"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  getMerchantByOwner,
  getReservationsByMerchant,
  updateReservationStatus,
} from "@/lib/firestore";
import type { Merchant, Reservation } from "@/types";
import {
  Loader2,
  ArrowLeft,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  CalendarCheck,
} from "lucide-react";
import Link from "next/link";
import MerchantNavigation from "@/components/MerchantNavigation";

const statusConfig: Record<
  Reservation["status"],
  { label: string; color: string; bg: string }
> = {
  pending: { label: "保留中", color: "text-yellow-700", bg: "bg-yellow-100" },
  confirmed: { label: "確認済み", color: "text-blue-700", bg: "bg-blue-100" },
  cancelled: { label: "キャンセル", color: "text-red-700", bg: "bg-red-100" },
  completed: { label: "完了", color: "text-green-700", bg: "bg-green-100" },
};

function ReservationManagementContent() {
  const { liffUser, loading } = useAuth();
  const [merchant, setMerchant] = useState<{ id: string; data: Merchant } | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [fetching, setFetching] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!liffUser) return;
    getMerchantByOwner(liffUser.userId)
      .then(async (m) => {
        setMerchant(m);
        if (m) {
          const res = await getReservationsByMerchant(m.id);
          setReservations(res);
        }
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [liffUser]);

  const handleStatusChange = async (
    reservationId: string,
    newStatus: Reservation["status"]
  ) => {
    if (!reservationId) return;
    setUpdating(reservationId);
    try {
      await updateReservationStatus(reservationId, newStatus);
      setReservations((prev) =>
        prev.map((r) =>
          r.id === reservationId ? { ...r, status: newStatus } : r
        )
      );
    } catch (err) {
      console.error(err);
      alert("更新に失敗しました");
    } finally {
      setUpdating(null);
    }
  };

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
        <p className="text-gray-600 text-center">加盟店として登録されていません</p>
      </div>
    );
  }

  // 日付でグループ化
  const grouped: Record<string, Reservation[]> = {};
  reservations.forEach((r) => {
    if (!grouped[r.date]) grouped[r.date] = [];
    grouped[r.date].push(r);
  });
  // 各日付内で時間順にソート
  Object.values(grouped).forEach((list) =>
    list.sort((a, b) => a.time.localeCompare(b.time))
  );
  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link href="/merchant" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-gray-800">予約管理</h1>
        </div>
        <Link
          href="/merchant/reservations/settings"
          className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700"
        >
          <Settings size={16} />
          設定
        </Link>
      </div>

      {reservations.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <CalendarCheck className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">予約はまだありません</p>
          <Link
            href="/merchant/reservations/settings"
            className="inline-block mt-4 text-sm text-blue-500 hover:underline"
          >
            予約設定を行う
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => {
            const d = new Date(date);
            const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
            const dayLabel = dayNames[d.getDay()];
            return (
              <div key={date}>
                <h2 className="text-sm font-bold text-gray-600 mb-2">
                  {d.getMonth() + 1}/{d.getDate()}（{dayLabel}）
                </h2>
                <div className="space-y-2">
                  {grouped[date].map((r) => {
                    const sc = statusConfig[r.status];
                    const isUpdating = updating === r.id;
                    return (
                      <div
                        key={r.id}
                        className="bg-white rounded-xl p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-bold text-gray-800">
                              {r.time}
                            </p>
                            <p className="text-sm text-gray-600">{r.userName}</p>
                          </div>
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full ${sc.bg} ${sc.color}`}
                          >
                            {sc.label}
                          </span>
                        </div>

                        {r.memo && (
                          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-2">
                            {r.memo}
                          </p>
                        )}

                        {r.prepaid && (
                          <p className="text-xs text-green-600 mb-2">
                            事前決済済み: {r.prepaidAmount}pt
                          </p>
                        )}

                        {(r.status === "pending" || r.status === "confirmed") && (
                          <div className="flex gap-2 mt-2">
                            {r.status === "pending" && (
                              <button
                                onClick={() =>
                                  handleStatusChange(r.id!, "confirmed")
                                }
                                disabled={isUpdating}
                                className="flex-1 flex items-center justify-center gap-1 bg-blue-500 text-white rounded-lg py-2 text-xs font-bold hover:bg-blue-600 disabled:opacity-50"
                              >
                                {isUpdating ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <CheckCircle size={14} />
                                )}
                                確認
                              </button>
                            )}
                            <button
                              onClick={() =>
                                handleStatusChange(r.id!, "completed")
                              }
                              disabled={isUpdating}
                              className="flex-1 flex items-center justify-center gap-1 bg-green-500 text-white rounded-lg py-2 text-xs font-bold hover:bg-green-600 disabled:opacity-50"
                            >
                              {isUpdating ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <CalendarCheck size={14} />
                              )}
                              完了
                            </button>
                            <button
                              onClick={() =>
                                handleStatusChange(r.id!, "cancelled")
                              }
                              disabled={isUpdating}
                              className="flex-1 flex items-center justify-center gap-1 bg-red-500 text-white rounded-lg py-2 text-xs font-bold hover:bg-red-600 disabled:opacity-50"
                            >
                              {isUpdating ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <XCircle size={14} />
                              )}
                              キャンセル
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MerchantNavigation />
    </div>
  );
}

export default function ReservationManagementPage() {
  return (
    <AuthProvider>
      <ReservationManagementContent />
    </AuthProvider>
  );
}
