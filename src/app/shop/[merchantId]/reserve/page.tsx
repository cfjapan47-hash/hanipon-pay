"use client";

import { useEffect, useState, use } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  getMerchantWithId,
  getReservationSettings,
  getReservationsByMerchantAndDate,
  createReservation,
  processReservationPrepayment,
} from "@/lib/firestore";
import type { Merchant, ReservationSettings } from "@/types";
import { Loader2, ArrowLeft, Calendar, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";
import Navigation from "@/components/Navigation";

function ReserveContent({ merchantId }: { merchantId: string }) {
  const { liffUser, user, loading } = useAuth();
  const [shop, setShop] = useState<{ id: string; data: Merchant } | null>(null);
  const [settings, setSettings] = useState<ReservationSettings | null>(null);
  const [fetching, setFetching] = useState(true);

  // カレンダーの状態
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<
    { time: string; available: boolean }[]
  >([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    Promise.all([
      getMerchantWithId(merchantId),
      getReservationSettings(merchantId),
    ])
      .then(([shopData, settingsData]) => {
        setShop(shopData);
        setSettings(settingsData);
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [merchantId]);

  // 日付選択時に空き枠を計算
  useEffect(() => {
    if (!selectedDate || !settings) return;
    setLoadingSlots(true);
    setSelectedTime(null);

    getReservationsByMerchantAndDate(merchantId, selectedDate)
      .then((existing) => {
        const slots: { time: string; available: boolean }[] = [];
        const { open, close } = settings.businessHours;

        // open〜closeまでslotDuration分刻みでスロット生成
        const [openH, openM] = open.split(":").map(Number);
        const [closeH, closeM] = close.split(":").map(Number);
        const openMinutes = openH * 60 + openM;
        const closeMinutes = closeH * 60 + closeM;

        for (let m = openMinutes; m + settings.slotDuration <= closeMinutes; m += settings.slotDuration) {
          const h = Math.floor(m / 60);
          const min = m % 60;
          const timeStr = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;

          // 該当時間の予約数をカウント
          const count = existing.filter((r) => r.time === timeStr).length;
          const available = count < settings.maxReservationsPerSlot;

          // 今日の場合、過去の時間枠は非表示
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
          if (selectedDate === todayStr) {
            const nowMinutes = today.getHours() * 60 + today.getMinutes();
            if (m <= nowMinutes) {
              continue; // 過去の時間枠はスキップ
            }
          }

          slots.push({ time: timeStr, available });
        }
        setAvailableSlots(slots);
      })
      .catch(console.error)
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, settings, merchantId]);

  const handleSubmit = async () => {
    if (!liffUser || !user || !shop || !settings || !selectedDate || !selectedTime)
      return;

    setSubmitting(true);
    try {
      const reservationData = {
        merchantId,
        merchantName: shop.data.name,
        userId: liffUser.userId,
        userName: user.displayName,
        date: selectedDate,
        time: selectedTime,
        status: "pending" as const,
        prepaid: settings.prepaymentRequired,
        prepaidAmount: settings.prepaymentRequired ? settings.prepaymentAmount : 0,
        cancellationFee: settings.cancellationFee,
        memo,
      };

      if (settings.prepaymentRequired && settings.prepaymentAmount > 0) {
        // 事前決済あり
        if ((user.balance || 0) < settings.prepaymentAmount) {
          alert("ポイント残高が不足しています");
          setSubmitting(false);
          return;
        }
        await processReservationPrepayment(
          liffUser.userId,
          merchantId,
          settings.prepaymentAmount,
          reservationData
        );
      } else {
        // 事前決済なし
        await createReservation(reservationData);
      }

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "予約に失敗しました";
      alert(msg);
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

  if (!shop || !settings || !settings.isEnabled) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6">
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <p className="text-gray-600">
            {!shop ? "店舗が見つかりません" : "この店舗は予約を受け付けていません"}
          </p>
          <Link
            href={`/shop/${merchantId}`}
            className="inline-block mt-4 text-sm text-blue-500 hover:underline"
          >
            店舗ページに戻る
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6 pb-24">
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-gray-800 mb-2">予約完了</h2>
          <p className="text-sm text-gray-600 mb-1">
            {shop.data.name}
          </p>
          <p className="text-lg font-bold text-gray-800 mb-1">
            {selectedDate} {selectedTime}
          </p>
          {settings.prepaymentRequired && (
            <p className="text-sm text-green-600 mb-2">
              事前決済: {settings.prepaymentAmount}pt
            </p>
          )}
          <p className="text-xs text-gray-400 mb-4">
            お店からの確認をお待ちください
          </p>
          <div className="flex gap-2">
            <Link
              href="/my-reservations"
              className="flex-1 bg-blue-500 text-white rounded-xl py-3 font-bold text-sm hover:bg-blue-600"
            >
              予約一覧を見る
            </Link>
            <Link
              href={`/shop/${merchantId}`}
              className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-3 font-bold text-sm hover:bg-gray-200"
            >
              店舗に戻る
            </Link>
          </div>
        </div>
        <Navigation />
      </div>
    );
  }

  // カレンダーの生成
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 30);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
  const closedDayNames = settings.closedDays || [];

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const canPrevMonth =
    new Date(year, month, 1) > new Date(today.getFullYear(), today.getMonth(), 1);
  const canNextMonth =
    new Date(year, month + 1, 1) <= maxDate;

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href={`/shop/${merchantId}`}
          className="text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-800">予約</h1>
          <p className="text-xs text-gray-500">{shop.data.name}</p>
        </div>
      </div>

      {/* ステップ1: 日付選択 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={16} className="text-blue-500" />
          <span className="text-sm font-bold text-gray-700">日付を選択</span>
        </div>

        {/* 月ナビゲーション */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() =>
              setCurrentMonth(new Date(year, month - 1, 1))
            }
            disabled={!canPrevMonth}
            className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 px-2 py-1"
          >
            &lt;
          </button>
          <span className="text-sm font-bold text-gray-700">
            {year}年{month + 1}月
          </span>
          <button
            onClick={() =>
              setCurrentMonth(new Date(year, month + 1, 1))
            }
            disabled={!canNextMonth}
            className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 px-2 py-1"
          >
            &gt;
          </button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayNames.map((name) => (
            <div
              key={name}
              className={`text-center text-xs font-medium py-1 ${
                name === "日" ? "text-red-400" : name === "土" ? "text-blue-400" : "text-gray-400"
              }`}
            >
              {name}
            </div>
          ))}
        </div>

        {/* カレンダーグリッド */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            if (day === null)
              return <div key={`empty-${i}`} className="h-10" />;

            const date = new Date(year, month, day);
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayOfWeek = dayNames[date.getDay()];
            const isPast = date < today;
            const isFuture = date > maxDate;
            const isClosed = closedDayNames.includes(dayOfWeek);
            const isDisabled = isPast || isFuture || isClosed;
            const isSelected = selectedDate === dateStr;

            return (
              <button
                key={dateStr}
                onClick={() => !isDisabled && setSelectedDate(dateStr)}
                disabled={isDisabled}
                className={`h-10 rounded-lg text-sm font-medium transition-colors ${
                  isSelected
                    ? "bg-blue-500 text-white"
                    : isDisabled
                    ? "text-gray-300 cursor-not-allowed"
                    : isClosed
                    ? "text-red-300"
                    : "text-gray-700 hover:bg-blue-50"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* ステップ2: 時間枠選択 */}
      {selectedDate && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-blue-500" />
            <span className="text-sm font-bold text-gray-700">時間を選択</span>
          </div>

          {loadingSlots ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={20} className="animate-spin text-blue-500" />
            </div>
          ) : availableSlots.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              この日に予約可能な枠はありません
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {availableSlots.map((slot) => (
                <button
                  key={slot.time}
                  onClick={() => slot.available && setSelectedTime(slot.time)}
                  disabled={!slot.available}
                  className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedTime === slot.time
                      ? "bg-blue-500 text-white"
                      : slot.available
                      ? "bg-gray-50 text-gray-700 hover:bg-blue-50 border border-gray-200"
                      : "bg-gray-100 text-gray-300 cursor-not-allowed line-through"
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ステップ3: メモ・確認 */}
      {selectedDate && selectedTime && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            メモ（任意）
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="ご要望があればご記入ください"
            rows={2}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />

          {/* 事前決済情報 */}
          {settings.prepaymentRequired && (
            <div className="mt-3 bg-orange-50 rounded-lg p-3">
              <p className="text-sm font-bold text-orange-700">
                事前決済: {settings.prepaymentAmount}pt
              </p>
              <p className="text-xs text-orange-600 mt-0.5">
                予約確定時に残高から引き落とされます
              </p>
              <p className="text-xs text-gray-500 mt-1">
                現在の残高: {user?.balance?.toLocaleString() || 0}pt
              </p>
            </div>
          )}

          {settings.cancellationFee > 0 && (
            <p className="text-xs text-red-500 mt-2">
              ※ キャンセル時にキャンセル料 {settings.cancellationFee}pt がかかります
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full mt-4 bg-blue-500 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
          >
            {submitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <CheckCircle size={18} />
            )}
            {submitting
              ? "予約中..."
              : settings.prepaymentRequired
              ? `予約する（${settings.prepaymentAmount}pt 決済）`
              : "予約する"}
          </button>
        </div>
      )}

      <Navigation />
    </div>
  );
}

export default function ReservePage({
  params,
}: {
  params: Promise<{ merchantId: string }>;
}) {
  const { merchantId } = use(params);
  return (
    <AuthProvider>
      <ReserveContent merchantId={merchantId} />
    </AuthProvider>
  );
}
