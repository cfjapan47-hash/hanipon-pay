"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  getReservationsByUser,
  processReservationCancellation,
  updateReservationStatus,
} from "@/lib/firestore";
import type { Reservation } from "@/types";
import {
  Loader2,
  ArrowLeft,
  CalendarCheck,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import Navigation from "@/components/Navigation";

const statusConfig: Record<
  Reservation["status"],
  { label: string; color: string; bg: string }
> = {
  pending: { label: "保留中", color: "text-yellow-700", bg: "bg-yellow-100" },
  confirmed: { label: "確認済み", color: "text-blue-700", bg: "bg-blue-100" },
  cancelled: { label: "キャンセル", color: "text-red-700", bg: "bg-red-100" },
  completed: { label: "完了", color: "text-green-700", bg: "bg-green-100" },
};

function MyReservationsContent() {
  const { liffUser, loading } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [fetching, setFetching] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<Reservation | null>(null);

  useEffect(() => {
    if (!liffUser) return;
    getReservationsByUser(liffUser.userId)
      .then(setReservations)
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [liffUser]);

  const handleCancel = async (reservation: Reservation) => {
    if (!reservation.id) return;
    setCancelling(reservation.id);
    try {
      if (reservation.prepaid && reservation.prepaidAmount > 0) {
        await processReservationCancellation(
          reservation.id,
          reservation.userId,
          reservation.merchantId,
          reservation.cancellationFee,
          reservation.prepaidAmount
        );
      } else {
        await updateReservationStatus(reservation.id, "cancelled");
      }
      setReservations((prev) =>
        prev.map((r) =>
          r.id === reservation.id ? { ...r, status: "cancelled" } : r
        )
      );
      setConfirmCancel(null);
    } catch (err) {
      console.error(err);
      alert("キャンセルに失敗しました");
    } finally {
      setCancelling(null);
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
      <div className="flex items-center gap-3 mb-5">
        <Link href="/" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-800">予約一覧</h1>
      </div>

      {reservations.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <CalendarCheck className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">予約はありません</p>
          <Link
            href="/shops"
            className="inline-block mt-4 text-sm text-blue-500 hover:underline"
          >
            お店を探す
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {reservations.map((r) => {
            const sc = statusConfig[r.status];
            const canCancel =
              r.status === "pending" || r.status === "confirmed";
            const d = new Date(r.date);
            const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
            const dayLabel = dayNames[d.getDay()];

            return (
              <div
                key={r.id}
                className="bg-white rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-800">
                      {r.merchantName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {d.getMonth() + 1}/{d.getDate()}（{dayLabel}）{r.time}
                    </p>
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

                {canCancel && (
                  <button
                    onClick={() => setConfirmCancel(r)}
                    className="w-full mt-1 flex items-center justify-center gap-1 text-red-500 bg-red-50 rounded-lg py-2 text-xs font-bold hover:bg-red-100"
                  >
                    <XCircle size={14} />
                    キャンセル
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* キャンセル確認モーダル */}
      {confirmCancel && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="text-red-500" size={24} />
              <h3 className="font-bold text-gray-800">
                予約をキャンセルしますか？
              </h3>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-3 text-sm">
              <p className="text-gray-700 font-medium">
                {confirmCancel.merchantName}
              </p>
              <p className="text-gray-500">
                {confirmCancel.date} {confirmCancel.time}
              </p>
            </div>

            {confirmCancel.cancellationFee > 0 && (
              <div className="bg-red-50 rounded-lg p-3 mb-3">
                <p className="text-sm text-red-700 font-bold">
                  キャンセル料: {confirmCancel.cancellationFee}pt
                </p>
                {confirmCancel.prepaid && (
                  <p className="text-xs text-red-600 mt-1">
                    返金額:{" "}
                    {confirmCancel.prepaidAmount - confirmCancel.cancellationFee}
                    pt
                  </p>
                )}
              </div>
            )}

            {confirmCancel.prepaid &&
              confirmCancel.cancellationFee === 0 && (
                <div className="bg-green-50 rounded-lg p-3 mb-3">
                  <p className="text-sm text-green-700">
                    事前決済分 {confirmCancel.prepaidAmount}pt は全額返金されます
                  </p>
                </div>
              )}

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmCancel(null)}
                className="flex-1 bg-gray-100 text-gray-600 rounded-lg py-3 font-bold text-sm"
              >
                戻る
              </button>
              <button
                onClick={() => handleCancel(confirmCancel)}
                disabled={cancelling === confirmCancel.id}
                className="flex-1 bg-red-500 text-white rounded-lg py-3 font-bold text-sm hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {cancelling === confirmCancel.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <XCircle size={16} />
                )}
                キャンセルする
              </button>
            </div>
          </div>
        </div>
      )}

      <Navigation />
    </div>
  );
}

export default function MyReservationsPage() {
  return (
    <AuthProvider>
      <MyReservationsContent />
    </AuthProvider>
  );
}
