"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { getUserReferrals } from "@/lib/firestore";
import type { Referral } from "@/types";
import { QRCodeSVG } from "qrcode.react";
import Navigation from "@/components/Navigation";
import {
  Loader2,
  Gift,
  Store,
  CheckCircle,
  Clock,
} from "lucide-react";

function ReferralContent() {
  const { liffUser, user, loading } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!liffUser) return;
    getUserReferrals(liffUser.userId)
      .then(setReferrals)
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [liffUser]);

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://hanipon-pay.vercel.app";
  const referralUrl = `${baseUrl}/register-shop?ref=${liffUser?.userId || ""}`;
  const totalReward = referrals
    .filter((r) => r.rewarded)
    .reduce((sum, r) => sum + r.reward, 0);

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <h1 className="text-xl font-bold text-gray-800 mb-4">
        加盟店を紹介する
      </h1>

      {/* QRコード */}
      <div className="bg-white rounded-2xl p-6 shadow-sm text-center mb-4">
        <p className="text-sm text-gray-600 mb-4">
          このQRコードをお店の方に
          <br />
          読み取ってもらってください
        </p>
        <div className="inline-block p-4 bg-white border-2 border-orange-100 rounded-2xl">
          <QRCodeSVG value={referralUrl} size={200} level="H" includeMargin />
        </div>
        <p className="text-xs text-gray-400 mt-3">
          加盟店が本登録完了で
          <span className="text-orange-600 font-bold"> 500pt </span>
          もらえます！
        </p>
      </div>

      {/* 紹介実績 */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg mb-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs opacity-75">紹介実績</p>
            <p className="text-2xl font-bold mt-1">
              {referrals.length}
              <span className="text-sm ml-1">店舗</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-75">獲得報酬</p>
            <p className="text-2xl font-bold mt-1">
              {totalReward.toLocaleString()}
              <span className="text-sm ml-1">pt</span>
            </p>
          </div>
        </div>
      </div>

      {/* 紹介一覧 */}
      {referrals.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-600 mb-3">
            紹介した加盟店
          </h2>
          <div className="space-y-2">
            {referrals.map((ref) => (
              <div
                key={ref.id}
                className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      ref.rewarded
                        ? "bg-green-100 text-green-600"
                        : "bg-yellow-100 text-yellow-600"
                    }`}
                  >
                    {ref.rewarded ? (
                      <CheckCircle size={18} />
                    ) : (
                      <Clock size={18} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {ref.merchantName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {ref.rewarded ? "報酬済み" : "本登録待ち"}
                    </p>
                  </div>
                </div>
                <p
                  className={`text-sm font-bold ${
                    ref.rewarded ? "text-green-600" : "text-gray-400"
                  }`}
                >
                  {ref.rewarded ? "+" : ""}
                  {ref.reward} pt
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {referrals.length === 0 && (
        <div className="text-center py-8">
          <Store className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-400 text-sm">
            まだ紹介した加盟店はありません
          </p>
          <p className="text-gray-400 text-xs mt-1">
            上のQRコードをお店の方に見せてみましょう！
          </p>
        </div>
      )}

      <Navigation />
    </div>
  );
}

export default function ReferralPage() {
  return (
    <AuthProvider>
      <ReferralContent />
    </AuthProvider>
  );
}
