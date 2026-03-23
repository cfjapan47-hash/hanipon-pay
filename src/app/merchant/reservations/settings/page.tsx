"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  getMerchantByOwner,
  getReservationSettings,
  saveReservationSettings,
} from "@/lib/firestore";
import type { Merchant, ReservationSettings } from "@/types";
import { Loader2, ArrowLeft, Save, Settings } from "lucide-react";
import Link from "next/link";
import MerchantNavigation from "@/components/MerchantNavigation";

function ReservationSettingsContent() {
  const { liffUser, loading } = useAuth();
  const [merchant, setMerchant] = useState<{ id: string; data: Merchant } | null>(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // 設定フォームの状態
  const [isEnabled, setIsEnabled] = useState(false);
  const [slotDuration, setSlotDuration] = useState(60);
  const [maxReservationsPerSlot, setMaxReservationsPerSlot] = useState(1);
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("18:00");
  const [closedDays, setClosedDays] = useState<string[]>([]);
  const [cancellationFee, setCancellationFee] = useState(0);
  const [prepaymentRequired, setPrepaymentRequired] = useState(false);
  const [prepaymentAmount, setPrepaymentAmount] = useState(0);

  const dayOptions = ["月", "火", "水", "木", "金", "土", "日"];

  useEffect(() => {
    if (!liffUser) return;
    getMerchantByOwner(liffUser.userId)
      .then(async (m) => {
        setMerchant(m);
        if (m) {
          const settings = await getReservationSettings(m.id);
          if (settings) {
            setIsEnabled(settings.isEnabled);
            setSlotDuration(settings.slotDuration);
            setMaxReservationsPerSlot(settings.maxReservationsPerSlot);
            setOpenTime(settings.businessHours?.open || "09:00");
            setCloseTime(settings.businessHours?.close || "18:00");
            setClosedDays(settings.closedDays || []);
            setCancellationFee(settings.cancellationFee || 0);
            setPrepaymentRequired(settings.prepaymentRequired || false);
            setPrepaymentAmount(settings.prepaymentAmount || 0);
          } else if (m.data.businessHours) {
            setOpenTime(m.data.businessHours.open);
            setCloseTime(m.data.businessHours.close);
          }
          if (!settings && m.data.closedDays) {
            setClosedDays(m.data.closedDays);
          }
        }
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [liffUser]);

  const handleSave = async () => {
    if (!merchant) return;
    setSaving(true);
    setSaved(false);
    try {
      await saveReservationSettings(merchant.id, {
        isEnabled,
        slotDuration,
        maxReservationsPerSlot,
        businessHours: { open: openTime, close: closeTime },
        closedDays,
        cancellationFee,
        prepaymentRequired,
        prepaymentAmount: prepaymentRequired ? prepaymentAmount : 0,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const toggleClosedDay = (day: string) => {
    setClosedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
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

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/merchant/reservations" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-800">予約設定</h1>
      </div>

      <div className="space-y-4">
        {/* 予約受付ON/OFF */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings size={18} className="text-blue-500" />
              <span className="font-bold text-gray-800">予約受付</span>
            </div>
            <button
              onClick={() => setIsEnabled(!isEnabled)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                isEnabled ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow ${
                  isEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            ONにすると店舗ページに「予約する」ボタンが表示されます
          </p>
        </div>

        {/* 1枠の時間 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            1枠の時間
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[30, 60, 90, 120].map((min) => (
              <button
                key={min}
                onClick={() => setSlotDuration(min)}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                  slotDuration === min
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {min}分
              </button>
            ))}
          </div>
        </div>

        {/* 1枠あたりの予約上限 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            1枠あたりの予約上限
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMaxReservationsPerSlot(Math.max(1, maxReservationsPerSlot - 1))}
              className="w-10 h-10 rounded-lg bg-gray-100 text-gray-600 font-bold text-lg hover:bg-gray-200"
            >
              -
            </button>
            <span className="text-2xl font-bold text-gray-800 w-12 text-center">
              {maxReservationsPerSlot}
            </span>
            <button
              onClick={() => setMaxReservationsPerSlot(maxReservationsPerSlot + 1)}
              className="w-10 h-10 rounded-lg bg-gray-100 text-gray-600 font-bold text-lg hover:bg-gray-200"
            >
              +
            </button>
            <span className="text-sm text-gray-500">組</span>
          </div>
        </div>

        {/* 営業時間 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            予約受付時間
          </label>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={openTime}
              onChange={(e) => setOpenTime(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            />
            <span className="text-gray-400">〜</span>
            <input
              type="time"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* 定休日 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            定休日
          </label>
          <div className="flex gap-2 flex-wrap">
            {dayOptions.map((day) => (
              <button
                key={day}
                onClick={() => toggleClosedDay(day)}
                className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                  closedDays.includes(day)
                    ? "bg-red-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* キャンセル料 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            キャンセル料
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={cancellationFee}
              onChange={(e) => setCancellationFee(Math.max(0, Number(e.target.value)))}
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
              min={0}
            />
            <span className="text-sm text-gray-500">pt</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">0にするとキャンセル無料</p>
        </div>

        {/* 事前決済 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-700">事前決済</span>
            <button
              onClick={() => setPrepaymentRequired(!prepaymentRequired)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                prepaymentRequired ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow ${
                  prepaymentRequired ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          {prepaymentRequired && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                value={prepaymentAmount}
                onChange={(e) => setPrepaymentAmount(Math.max(0, Number(e.target.value)))}
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
                min={0}
                placeholder="事前決済金額"
              />
              <span className="text-sm text-gray-500">pt</span>
            </div>
          )}
        </div>

        {/* 保存ボタン */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-500 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
        >
          {saving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Save size={18} />
          )}
          {saving ? "保存中..." : saved ? "保存しました！" : "設定を保存"}
        </button>

        {saved && (
          <p className="text-center text-sm text-green-600 font-medium">
            設定を保存しました
          </p>
        )}
      </div>

      <MerchantNavigation />
    </div>
  );
}

export default function ReservationSettingsPage() {
  return (
    <AuthProvider>
      <ReservationSettingsContent />
    </AuthProvider>
  );
}
