"use client";

import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  getBirthdayCouponSettings,
  saveBirthdayCouponSettings,
} from "@/lib/firestore";
import type { BirthdayCouponSettings } from "@/types";
import { Loader2, Cake, Save, ArrowLeft, Check } from "lucide-react";
import Link from "next/link";

function BirthdayCouponContent() {
  const { user, loading } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("fixed");
  const [discountValue, setDiscountValue] = useState(500);
  const [validDays, setValidDays] = useState(7);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getBirthdayCouponSettings()
      .then((settings) => {
        if (settings) {
          setIsEnabled(settings.isEnabled);
          setDiscountType(settings.discountType);
          setDiscountValue(settings.discountValue);
          setValidDays(settings.validDays);
        }
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      await saveBirthdayCouponSettings({
        isEnabled,
        discountType,
        discountValue,
        validDays,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-screen px-4">
        <p className="text-red-500 text-center">管理者権限がありません</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-8">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/admin" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-800">誕生日クーポン設定</h1>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-5">
          <Cake size={20} className="text-pink-500" />
          <p className="font-semibold text-gray-700">クーポン設定</p>
        </div>

        {/* 有効/無効トグル */}
        <div className="flex items-center justify-between mb-5 bg-gray-50 rounded-lg px-4 py-3">
          <span className="text-sm font-medium text-gray-700">
            誕生日クーポンを有効にする
          </span>
          <button
            onClick={() => setIsEnabled(!isEnabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              isEnabled ? "bg-green-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                isEnabled ? "translate-x-6" : ""
              }`}
            />
          </button>
        </div>

        {/* 割引タイプ */}
        <div className="mb-4">
          <label className="block text-xs text-gray-500 mb-2">割引タイプ</label>
          <div className="flex gap-2">
            <button
              onClick={() => setDiscountType("fixed")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                discountType === "fixed"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              固定値引き（pt）
            </button>
            <button
              onClick={() => setDiscountType("percentage")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                discountType === "percentage"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              割引率（%）
            </button>
          </div>
        </div>

        {/* 割引値 */}
        <div className="mb-4">
          <label className="block text-xs text-gray-500 mb-1">
            {discountType === "fixed" ? "割引額（ポイント）" : "割引率（%）"}
          </label>
          <input
            type="number"
            value={discountValue}
            onChange={(e) => setDiscountValue(Number(e.target.value))}
            min={1}
            max={discountType === "percentage" ? 100 : 10000}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* 有効日数 */}
        <div className="mb-5">
          <label className="block text-xs text-gray-500 mb-1">有効日数</label>
          <select
            value={validDays}
            onChange={(e) => setValidDays(Number(e.target.value))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value={3}>3日間</option>
            <option value={7}>7日間</option>
            <option value={14}>14日間</option>
            <option value={30}>30日間</option>
          </select>
        </div>

        {/* 現在の設定サマリー */}
        <div className="bg-pink-50 rounded-lg px-4 py-3 mb-5">
          <p className="text-xs font-semibold text-pink-700 mb-1">現在の設定</p>
          <p className="text-sm text-pink-600">
            {isEnabled ? (
              <>
                誕生日に
                {discountType === "fixed"
                  ? `${discountValue}ポイント値引き`
                  : `${discountValue}%割引`}
                クーポンを配信（有効期限: {validDays}日間）
              </>
            ) : (
              "無効（誕生日クーポンは配信されません）"
            )}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {saved && (
          <div className="bg-green-50 text-green-600 text-sm rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
            <Check size={16} />
            保存しました
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-pink-500 text-white rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 hover:bg-pink-600 disabled:bg-gray-300 transition-colors"
        >
          {saving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              <Save size={18} />
              設定を保存
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function BirthdayCouponPage() {
  return (
    <AuthProvider>
      <BirthdayCouponContent />
    </AuthProvider>
  );
}
