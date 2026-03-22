"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  getMerchantByOwner,
  getMerchantCoupons,
  createCoupon,
  updateCouponStatus,
} from "@/lib/firestore";
import { formatPoints, formatDate } from "@/lib/utils";
import type { Merchant, Coupon } from "@/types";
import {
  Loader2,
  Plus,
  Tag,
  Percent,
  Coins,
  RotateCcw,
  ArrowLeft,
  X,
  Ticket,
} from "lucide-react";
import Link from "next/link";

function CouponContent() {
  const { liffUser, loading } = useAuth();
  const [merchant, setMerchant] = useState<{
    id: string;
    data: Merchant;
  } | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [couponType, setCouponType] = useState<Coupon["type"]>("percent");
  const [value, setValue] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  useEffect(() => {
    if (!liffUser) return;
    getMerchantByOwner(liffUser.userId)
      .then(async (m) => {
        setMerchant(m);
        if (m) {
          const c = await getMerchantCoupons(m.id);
          setCoupons(c);
        }
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [liffUser]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCouponType("percent");
    setValue("");
    setMinAmount("");
    setMaxUses("");
    setStartAt("");
    setEndAt("");
  };

  const handleCreate = async () => {
    if (!merchant || !title || !value || !maxUses || !startAt || !endAt) {
      setMessage({ type: "error", text: "必須項目を入力してください" });
      return;
    }

    const numValue = Number(value);
    if (couponType === "percent" && (numValue < 1 || numValue > 100)) {
      setMessage({ type: "error", text: "割引率は1〜100%で指定してください" });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      await createCoupon({
        merchantId: merchant.id,
        merchantName: merchant.data.name,
        title,
        description,
        type: couponType,
        value: numValue,
        minAmount: minAmount ? Number(minAmount) : undefined,
        maxUses: Number(maxUses),
        startAt: new Date(startAt),
        endAt: new Date(endAt),
      });

      const updated = await getMerchantCoupons(merchant.id);
      setCoupons(updated);
      setShowForm(false);
      resetForm();
      setMessage({ type: "success", text: "クーポンを作成しました" });
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "作成に失敗しました",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    if (!merchant) return;
    const newStatus = coupon.status === "active" ? "disabled" : "active";
    try {
      await updateCouponStatus(coupon.id!, newStatus);
      const updated = await getMerchantCoupons(merchant.id);
      setCoupons(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const getCouponTypeLabel = (type: Coupon["type"]) => {
    switch (type) {
      case "percent":
        return "割引率";
      case "fixed":
        return "値引き";
      case "cashback":
        return "還元";
    }
  };

  const getCouponValueLabel = (coupon: Coupon) => {
    switch (coupon.type) {
      case "percent":
        return `${coupon.value}%OFF`;
      case "fixed":
        return `${formatPoints(coupon.value)}pt引き`;
      case "cashback":
        return `${coupon.value}%還元`;
    }
  };

  const getCouponStatusBadge = (coupon: Coupon) => {
    const now = new Date();
    const end = coupon.endAt?.toDate();
    const isExpired = end && end < now;
    const isFull = coupon.usedCount >= coupon.maxUses;

    if (coupon.status === "disabled")
      return (
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
          停止中
        </span>
      );
    if (isExpired)
      return (
        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
          期限切れ
        </span>
      );
    if (isFull)
      return (
        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
          上限到達
        </span>
      );
    return (
      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
        配信中
      </span>
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
        <p className="text-gray-600 text-center">
          加盟店として登録されていません
        </p>
      </div>
    );
  }

  // Set default dates for form
  const setDefaultDates = () => {
    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    setStartAt(now.toISOString().slice(0, 16));
    setEndAt(oneWeekLater.toISOString().slice(0, 16));
  };

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-8">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/merchant" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-800">クーポン管理</h1>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-xl text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {!showForm ? (
        <button
          onClick={() => {
            setShowForm(true);
            setDefaultDates();
          }}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white rounded-xl px-4 py-3 font-medium hover:bg-orange-600 transition-colors mb-6"
        >
          <Plus size={18} />
          新しいクーポンを作成
        </button>
      ) : (
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800">クーポン作成</h2>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                クーポン名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 新規来店10%OFF"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                説明
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例: 初めてご来店の方限定"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                割引タイプ <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {(["percent", "fixed", "cashback"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setCouponType(t)}
                    className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      couponType === t
                        ? "bg-orange-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {t === "percent" && <Percent size={14} />}
                    {t === "fixed" && <Tag size={14} />}
                    {t === "cashback" && <RotateCcw size={14} />}
                    {getCouponTypeLabel(t)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {couponType === "fixed" ? "値引き額(pt)" : "割引率(%)"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={couponType === "fixed" ? "100" : "10"}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  最低利用額(pt)
                </label>
                <input
                  type="number"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                発行枚数 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開始日時 <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  終了日時 <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={submitting}
              className="w-full bg-orange-500 text-white rounded-xl px-4 py-3 font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Ticket size={18} />
              )}
              {submitting ? "作成中..." : "クーポンを発行"}
            </button>
          </div>
        </div>
      )}

      <h2 className="text-sm font-semibold text-gray-600 mb-3">
        発行済みクーポン ({coupons.length})
      </h2>
      <div className="space-y-3">
        {coupons.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <Ticket className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-400">クーポンはまだありません</p>
          </div>
        ) : (
          coupons.map((coupon) => (
            <div
              key={coupon.id}
              className="bg-white rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-800">{coupon.title}</h3>
                    {getCouponStatusBadge(coupon)}
                  </div>
                  {coupon.description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {coupon.description}
                    </p>
                  )}
                </div>
                <span className="text-lg font-bold text-orange-500 ml-2 whitespace-nowrap">
                  {getCouponValueLabel(coupon)}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                <span>
                  利用: {coupon.usedCount}/{coupon.maxUses}枚
                </span>
                {coupon.minAmount ? (
                  <span>{formatPoints(coupon.minAmount)}pt以上</span>
                ) : null}
                <span>
                  〜{" "}
                  {coupon.endAt?.toDate()
                    ? coupon.endAt.toDate().toLocaleDateString("ja-JP")
                    : ""}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleToggleStatus(coupon)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    coupon.status === "active"
                      ? "bg-red-50 text-red-600 hover:bg-red-100"
                      : "bg-green-50 text-green-600 hover:bg-green-100"
                  }`}
                >
                  {coupon.status === "active" ? "停止する" : "再開する"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function MerchantCouponsPage() {
  return (
    <AuthProvider>
      <CouponContent />
    </AuthProvider>
  );
}
