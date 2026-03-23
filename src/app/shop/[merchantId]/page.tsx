"use client";

import { useEffect, useState, use } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  getMerchantWithId,
  getActiveCouponsByMerchant,
  getUserFavoriteShops,
  favoriteShop,
  sendMessage,
  getStampCardByMerchant,
  getUserStamp,
  getReservationSettings,
} from "@/lib/firestore";
import type { Merchant, Coupon, StampCard, UserStamp, ReservationSettings } from "@/types";
import {
  Loader2,
  MapPin,
  Clock,
  Calendar,
  Megaphone,
  Heart,
  MessageCircle,
  Ticket,
  ArrowLeft,
  Send,
  X,
  ExternalLink,
  Star,
  Stamp,
  CalendarCheck,
} from "lucide-react";
import Link from "next/link";
import Navigation from "@/components/Navigation";

function ShopDetailContent({ merchantId }: { merchantId: string }) {
  const { liffUser, user, loading } = useAuth();
  const [shop, setShop] = useState<{ id: string; data: Merchant } | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [stampCard, setStampCard] = useState<StampCard | null>(null);
  const [userStamp, setUserStamp] = useState<UserStamp | null>(null);
  const [reservationEnabled, setReservationEnabled] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [favoriting, setFavoriting] = useState(false);

  // メッセージモーダル
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [msgSent, setMsgSent] = useState(false);

  useEffect(() => {
    if (!liffUser) return;

    Promise.all([
      getMerchantWithId(merchantId),
      getActiveCouponsByMerchant(merchantId),
      getUserFavoriteShops(liffUser.userId),
      getStampCardByMerchant(merchantId),
      getUserStamp(merchantId, liffUser.userId),
      getReservationSettings(merchantId),
    ])
      .then(([shopData, couponList, favList, sc, us, resSetting]) => {
        setShop(shopData);
        setCoupons(couponList);
        setStampCard(sc);
        setUserStamp(us);
        setReservationEnabled(resSetting?.isEnabled || false);
        const favSet = new Set(favList.map((f) => f.merchantId));
        setIsFavorite(favSet.has(merchantId));
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [liffUser, merchantId]);

  const handleFavorite = async () => {
    if (!liffUser || !user || isFavorite) return;
    setFavoriting(true);
    try {
      await favoriteShop(
        liffUser.userId,
        user.displayName,
        user.pictureUrl,
        merchantId
      );
      setIsFavorite(true);
    } catch (err) {
      console.error(err);
    } finally {
      setFavoriting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!liffUser || !user || !shop || !msgText.trim()) return;
    setSending(true);
    try {
      if (!isFavorite) {
        await favoriteShop(liffUser.userId, user.displayName, user.pictureUrl, merchantId);
        setIsFavorite(true);
      }
      await sendMessage({
        merchantId,
        merchantName: shop.data.name,
        userId: liffUser.userId,
        userName: user.displayName,
        senderType: "citizen",
        senderId: liffUser.userId,
        text: msgText.trim(),
      });
      setMsgSent(true);
      setMsgText("");
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  // 今日が営業中かチェック
  const isOpenToday = () => {
    if (!shop) return false;
    const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
    const today = dayNames[new Date().getDay()];
    if (shop.data.closedDays?.includes(today)) return false;
    if (!shop.data.businessHours) return true;
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    return currentTime >= shop.data.businessHours.open && currentTime <= shop.data.businessHours.close;
  };

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6">
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <p className="text-gray-600">店舗が見つかりません</p>
          <Link
            href="/shops"
            className="inline-block mt-4 text-blue-500 hover:underline text-sm"
          >
            加盟店一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  const open = isOpenToday();
  const announcements = (shop.data.announcements || []) as {
    text: string;
    createdAt: { seconds: number };
  }[];

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/shops" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-800 flex-1 truncate">
          {shop.data.name}
        </h1>
      </div>

      {/* 店舗基本情報 */}
      <div className="bg-white rounded-xl p-5 shadow-sm mb-3">
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="inline-block bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full mb-2">
              {shop.data.category}
            </span>
            <h2 className="text-lg font-bold text-gray-800">{shop.data.name}</h2>
          </div>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              open
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {open ? "営業中" : "営業時間外"}
          </span>
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-gray-400 flex-shrink-0" />
            <span>{shop.data.address || "住所未設定"}</span>
          </div>
          {shop.data.businessHours && (
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-gray-400 flex-shrink-0" />
              <span>
                {shop.data.businessHours.open} 〜 {shop.data.businessHours.close}
              </span>
            </div>
          )}
          {shop.data.closedDays && shop.data.closedDays.length > 0 && (
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gray-400 flex-shrink-0" />
              <span>定休日: {shop.data.closedDays.join("・")}曜日</span>
            </div>
          )}
        </div>

        {/* SNSリンク */}
        {(shop.data.snsLinks?.instagram || shop.data.snsLinks?.x) && (
          <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100">
            {shop.data.snsLinks?.instagram && (
              <a
                href={shop.data.snsLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-pink-600 bg-pink-50 rounded-lg px-3 py-2 hover:bg-pink-100"
              >
                <ExternalLink size={12} />
                Instagram
              </a>
            )}
            {shop.data.snsLinks?.x && (
              <a
                href={shop.data.snsLinks.x}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-700 bg-gray-100 rounded-lg px-3 py-2 hover:bg-gray-200"
              >
                <ExternalLink size={12} />X
              </a>
            )}
          </div>
        )}
      </div>

      {/* 店舗紹介文 */}
      {shop.data.description && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
          <p className="text-sm font-semibold text-gray-700 mb-2">お店の紹介</p>
          <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
            {shop.data.description}
          </p>
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex gap-2 mb-3">
        {isFavorite ? (
          <div className="flex-1 flex items-center justify-center gap-2 text-sm text-pink-500 bg-pink-50 rounded-xl px-4 py-3 font-medium">
            <Heart size={18} fill="currentColor" />
            お気に入り済み
          </div>
        ) : (
          <button
            onClick={handleFavorite}
            disabled={favoriting}
            className="flex-1 flex items-center justify-center gap-2 text-sm text-pink-500 bg-pink-50 rounded-xl px-4 py-3 font-medium hover:bg-pink-100 disabled:opacity-50"
          >
            {favoriting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Heart size={18} />
            )}
            お気に入り登録
          </button>
        )}
        <button
          onClick={() => {
            setShowMsgModal(true);
            setMsgSent(false);
          }}
          className="flex-1 flex items-center justify-center gap-2 text-sm text-blue-500 bg-blue-50 rounded-xl px-4 py-3 font-medium hover:bg-blue-100"
        >
          <MessageCircle size={18} />
          メッセージ
        </button>
      </div>

      {/* 予約ボタン */}
      {reservationEnabled && (
        <Link
          href={`/shop/${merchantId}/reserve`}
          className="flex items-center justify-center gap-2 bg-green-500 text-white rounded-xl px-4 py-3.5 shadow-sm font-bold text-sm hover:bg-green-600 transition-colors mb-3"
        >
          <CalendarCheck size={18} />
          予約する
        </Link>
      )}

      {/* お知らせ */}
      {announcements.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
          <div className="flex items-center gap-2 mb-3">
            <Megaphone size={16} className="text-orange-500" />
            <p className="text-sm font-semibold text-gray-700">お知らせ</p>
          </div>
          <div className="space-y-2">
            {announcements.map((a, i) => {
              const date = a.createdAt?.seconds
                ? new Date(a.createdAt.seconds * 1000)
                : new Date();
              return (
                <div key={i} className="bg-orange-50 rounded-lg px-3 py-2.5">
                  <p className="text-sm text-gray-700">{a.text}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {date.toLocaleDateString("ja-JP")}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* クーポン一覧 */}
      {coupons.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
          <div className="flex items-center gap-2 mb-3">
            <Ticket size={16} className="text-orange-500" />
            <p className="text-sm font-semibold text-gray-700">クーポン</p>
          </div>
          <div className="space-y-2">
            {coupons.map((coupon) => {
              const endDate = coupon.endAt?.toDate
                ? coupon.endAt.toDate()
                : new Date((coupon.endAt as unknown as { seconds: number })?.seconds * 1000);
              const remaining = coupon.maxUses - coupon.usedCount;
              return (
                <div
                  key={coupon.id}
                  className="border border-orange-200 rounded-lg px-3 py-2.5 bg-orange-50"
                >
                  <p className="text-sm font-bold text-orange-700">
                    {coupon.title}
                  </p>
                  {coupon.description && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {coupon.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <span>
                      {coupon.type === "percent"
                        ? `${coupon.value}%OFF`
                        : coupon.type === "fixed"
                        ? `${coupon.value}pt引き`
                        : `${coupon.value}%還元`}
                    </span>
                    <span>残り{remaining}枚</span>
                    <span>
                      〜{endDate.toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* スタンプカード */}
      {stampCard && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
          <div className="flex items-center gap-2 mb-3">
            <Stamp size={16} className="text-orange-500" />
            <p className="text-sm font-semibold text-gray-700">スタンプカード</p>
          </div>
          <p className="text-xs text-gray-500 mb-2">
            {stampCard.requiredStamps}スタンプで{stampCard.rewardDescription}
          </p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {Array.from({ length: stampCard.requiredStamps }).map((_, i) => (
              <div
                key={i}
                className={`w-7 h-7 rounded-full flex items-center justify-center ${
                  i < (userStamp?.currentStamps || 0)
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-300"
                }`}
              >
                <Star
                  size={14}
                  fill={i < (userStamp?.currentStamps || 0) ? "currentColor" : "none"}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {userStamp?.currentStamps || 0}/{stampCard.requiredStamps} スタンプ
            </p>
            <Link
              href="/stamps"
              className="text-xs text-orange-500 hover:underline font-medium"
            >
              すべて見る
            </Link>
          </div>
        </div>
      )}

      {/* メッセージモーダル */}
      {showMsgModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bold text-gray-800">{shop.data.name}</p>
                <p className="text-xs text-gray-400">にメッセージを送る</p>
              </div>
              <button
                onClick={() => {
                  setShowMsgModal(false);
                  setMsgSent(false);
                }}
                className="text-gray-400"
              >
                <X size={24} />
              </button>
            </div>

            {msgSent ? (
              <div className="text-center py-6">
                <Send className="mx-auto text-green-500 mb-3" size={32} />
                <p className="font-bold text-green-600">送信しました！</p>
                <p className="text-xs text-gray-400 mt-1">
                  お店からの返信をお待ちください
                </p>
                <button
                  onClick={() => {
                    setShowMsgModal(false);
                    setMsgSent(false);
                  }}
                  className="mt-4 bg-gray-100 text-gray-600 rounded-lg px-6 py-2 text-sm font-bold"
                >
                  閉じる
                </button>
              </div>
            ) : (
              <>
                <textarea
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  placeholder="メッセージを入力..."
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !msgText.trim()}
                  className="w-full mt-3 bg-blue-500 text-white rounded-lg py-3 font-bold disabled:bg-gray-300 flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Send size={16} />
                      送信
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <Navigation />
    </div>
  );
}

export default function ShopPage({
  params,
}: {
  params: Promise<{ merchantId: string }>;
}) {
  const { merchantId } = use(params);
  return (
    <AuthProvider>
      <ShopDetailContent merchantId={merchantId} />
    </AuthProvider>
  );
}
