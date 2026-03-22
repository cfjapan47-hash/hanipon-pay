"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { getActiveCoupons } from "@/lib/firestore";
import { formatPoints } from "@/lib/utils";
import type { Coupon } from "@/types";
import { Loader2, Ticket, Tag, Percent, RotateCcw, Store } from "lucide-react";
import Navigation from "@/components/Navigation";

function CouponsContent() {
  const { liffUser, loading } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    getActiveCoupons()
      .then(setCoupons)
      .catch(console.error)
      .finally(() => setFetching(false));
  }, []);

  const getCouponIcon = (type: Coupon["type"]) => {
    switch (type) {
      case "percent":
        return <Percent size={16} className="text-orange-500" />;
      case "fixed":
        return <Tag size={16} className="text-blue-500" />;
      case "cashback":
        return <RotateCcw size={16} className="text-green-500" />;
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

  const getCouponTypeColor = (type: Coupon["type"]) => {
    switch (type) {
      case "percent":
        return "from-orange-500 to-red-500";
      case "fixed":
        return "from-blue-500 to-indigo-500";
      case "cashback":
        return "from-green-500 to-emerald-500";
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
      <h1 className="text-xl font-bold text-gray-800 mb-1">
        クーポン
      </h1>
      <p className="text-sm text-gray-500 mb-4">
        加盟店のお得なクーポンをチェック
      </p>

      {coupons.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <Ticket className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">現在配信中のクーポンはありません</p>
          <p className="text-xs text-gray-400 mt-2">
            加盟店がクーポンを発行するとここに表示されます
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon) => (
            <div
              key={coupon.id}
              className="bg-white rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Coupon header with gradient */}
              <div
                className={`bg-gradient-to-r ${getCouponTypeColor(
                  coupon.type
                )} px-4 py-3 text-white`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store size={14} />
                    <span className="text-sm font-medium">
                      {coupon.merchantName}
                    </span>
                  </div>
                  <span className="text-2xl font-bold">
                    {getCouponValueLabel(coupon)}
                  </span>
                </div>
              </div>

              {/* Coupon body */}
              <div className="px-4 py-3">
                <h3 className="font-bold text-gray-800">{coupon.title}</h3>
                {coupon.description && (
                  <p className="text-sm text-gray-500 mt-1">
                    {coupon.description}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                  {coupon.minAmount ? (
                    <span>{formatPoints(coupon.minAmount)}pt以上で利用可</span>
                  ) : null}
                  <span>
                    残り {coupon.maxUses - coupon.usedCount}/
                    {coupon.maxUses}枚
                  </span>
                  <span>
                    〜{" "}
                    {coupon.endAt?.toDate()
                      ? coupon.endAt.toDate().toLocaleDateString("ja-JP")
                      : ""}
                  </span>
                </div>

                <p className="text-xs text-orange-500 mt-2">
                  お支払い時に自動で適用されます
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Navigation />
    </div>
  );
}

export default function CouponsPage() {
  return (
    <AuthProvider>
      <CouponsContent />
    </AuthProvider>
  );
}
