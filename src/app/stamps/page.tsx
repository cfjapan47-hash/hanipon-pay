"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  getUserFavoriteShops,
  getStampCardByMerchant,
  getUserStamp,
  claimStampReward,
  getMerchant,
} from "@/lib/firestore";
import type { StampCard, UserStamp } from "@/types";
import {
  Loader2,
  ArrowLeft,
  Stamp,
  PartyPopper,
  Star,
} from "lucide-react";
import Link from "next/link";
import Navigation from "@/components/Navigation";

interface StampInfo {
  merchantId: string;
  merchantName: string;
  stampCard: StampCard;
  userStamp: UserStamp | null;
}

function StampsContent() {
  const { liffUser, loading } = useAuth();
  const [stampInfos, setStampInfos] = useState<StampInfo[]>([]);
  const [fetching, setFetching] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!liffUser) return;

    (async () => {
      try {
        const favorites = await getUserFavoriteShops(liffUser.userId);
        const infos: StampInfo[] = [];

        await Promise.all(
          favorites.map(async (fav) => {
            try {
              const stampCard = await getStampCardByMerchant(fav.merchantId);
              if (!stampCard) return;

              const merchant = await getMerchant(fav.merchantId);
              const userStamp = await getUserStamp(
                fav.merchantId,
                liffUser.userId
              );

              infos.push({
                merchantId: fav.merchantId,
                merchantName: merchant?.name || fav.displayName || "不明な店舗",
                stampCard,
                userStamp,
              });
            } catch {
              // skip
            }
          })
        );

        setStampInfos(infos);
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    })();
  }, [liffUser]);

  const handleClaim = async (info: StampInfo) => {
    if (!liffUser) return;
    setClaiming(info.merchantId);
    try {
      const success = await claimStampReward(info.merchantId, liffUser.userId);
      if (success) {
        setMessage({
          type: "success",
          text: `${info.stampCard.rewardDescription}を受け取りました！`,
        });
        // リロード
        const userStamp = await getUserStamp(info.merchantId, liffUser.userId);
        setStampInfos((prev) =>
          prev.map((i) =>
            i.merchantId === info.merchantId ? { ...i, userStamp } : i
          )
        );
      } else {
        setMessage({ type: "error", text: "報酬の受け取りに失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "エラーが発生しました" });
    } finally {
      setClaiming(null);
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
        <Link href="/shops" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-800">スタンプカード</h1>
      </div>

      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {stampInfos.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <Stamp className="mx-auto text-gray-400 mb-3" size={40} />
          <p className="text-gray-500 text-sm">
            スタンプカードがある加盟店がまだありません
          </p>
          <p className="text-gray-400 text-xs mt-1">
            お気に入り登録した加盟店のスタンプカードがここに表示されます
          </p>
          <Link
            href="/shops"
            className="inline-block mt-4 text-orange-500 text-sm font-medium hover:underline"
          >
            加盟店を探す
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {stampInfos.map((info) => {
            const current = info.userStamp?.currentStamps || 0;
            const required = info.stampCard.requiredStamps;
            const isCompleted = current >= required;

            return (
              <div
                key={info.merchantId}
                className="bg-white rounded-2xl p-5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-800">
                      {info.merchantName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {info.stampCard.rewardDescription}（{required}スタンプで達成）
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-orange-500">
                      {current}/{required}
                    </p>
                    {info.userStamp && info.userStamp.completedCount > 0 && (
                      <p className="text-xs text-gray-400">
                        達成{info.userStamp.completedCount}回
                      </p>
                    )}
                  </div>
                </div>

                {/* スタンプ表示 */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {Array.from({ length: required }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        i < current
                          ? "bg-orange-500 text-white"
                          : "bg-gray-100 text-gray-300"
                      }`}
                    >
                      <Star
                        size={16}
                        fill={i < current ? "currentColor" : "none"}
                      />
                    </div>
                  ))}
                </div>

                {/* 達成時ボタン */}
                {isCompleted && (
                  <button
                    onClick={() => handleClaim(info)}
                    disabled={claiming === info.merchantId}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl py-3 font-bold hover:from-yellow-500 hover:to-orange-600 disabled:opacity-50 transition-all"
                  >
                    {claiming === info.merchantId ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        <PartyPopper size={18} />
                        達成！報酬を受け取る
                      </>
                    )}
                  </button>
                )}

                {/* プログレスバー */}
                {!isCompleted && (
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${(current / required) * 100}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Navigation />
    </div>
  );
}

export default function StampsPage() {
  return (
    <AuthProvider>
      <StampsContent />
    </AuthProvider>
  );
}
