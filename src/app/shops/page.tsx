"use client";

import { useEffect, useState, useMemo } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import {
  getActiveShops,
  getUserFavoriteShops,
  getActiveCouponsByMerchant,
} from "@/lib/firestore";
import type { Merchant } from "@/types";
import {
  Loader2,
  Heart,
  MapPin,
  Store,
  Search,
  Filter,
  Clock,
  Ticket,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

const CATEGORIES = ["すべて", "飲食", "小売", "サービス", "その他"];

function ShopsContent() {
  const { liffUser, loading } = useAuth();
  const [shops, setShops] = useState<{ id: string; data: Merchant }[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [couponShops, setCouponShops] = useState<Set<string>>(new Set());
  const [fetching, setFetching] = useState(true);

  // フィルター状態
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("すべて");
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [showCouponOnly, setShowCouponOnly] = useState(false);

  useEffect(() => {
    if (!liffUser) return;
    Promise.all([getActiveShops(), getUserFavoriteShops(liffUser.userId)])
      .then(async ([shopList, favList]) => {
        setShops(shopList);
        const favSet = new Set(favList.map((f) => f.merchantId));
        setFavorites(favSet);

        // クーポンがある店舗をチェック
        const couponSet = new Set<string>();
        await Promise.all(
          shopList.map(async (shop) => {
            try {
              const coupons = await getActiveCouponsByMerchant(shop.id);
              if (coupons.length > 0) {
                couponSet.add(shop.id);
              }
            } catch {
              // ignore
            }
          })
        );
        setCouponShops(couponSet);
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [liffUser]);

  // 今日が営業中かチェック
  const isOpenToday = (shop: Merchant): boolean => {
    const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
    const today = dayNames[new Date().getDay()];
    if (shop.closedDays?.includes(today)) return false;
    if (!shop.businessHours) return true; // 営業時間未設定の場合は営業中とみなす
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    return currentTime >= shop.businessHours.open && currentTime <= shop.businessHours.close;
  };

  // フィルター適用
  const filteredShops = useMemo(() => {
    return shops.filter((shop) => {
      // キーワード検索
      if (
        searchQuery &&
        !shop.data.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      // カテゴリフィルター
      if (selectedCategory !== "すべて" && shop.data.category !== selectedCategory) {
        return false;
      }
      // 営業中フィルター
      if (showOpenOnly && !isOpenToday(shop.data)) {
        return false;
      }
      // クーポンありフィルター
      if (showCouponOnly && !couponShops.has(shop.id)) {
        return false;
      }
      return true;
    });
  }, [shops, searchQuery, selectedCategory, showOpenOnly, showCouponOnly, couponShops]);

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <h1 className="text-xl font-bold text-gray-800 mb-4">加盟店一覧</h1>

      {/* 検索 */}
      <div className="relative mb-3">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="店舗名で検索..."
          className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* カテゴリフィルター */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* トグルフィルター */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowOpenOnly(!showOpenOnly)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            showOpenOnly
              ? "bg-green-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Clock size={12} />
          今日営業中
        </button>
        <button
          onClick={() => setShowCouponOnly(!showCouponOnly)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            showCouponOnly
              ? "bg-orange-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Ticket size={12} />
          クーポンあり
        </button>
      </div>

      {/* 結果件数 */}
      <p className="text-xs text-gray-400 mb-3">
        {filteredShops.length}件の加盟店
      </p>

      {/* 店舗一覧 */}
      {filteredShops.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <Store className="mx-auto text-gray-400 mb-3" size={40} />
          <p className="text-gray-500">
            {shops.length === 0
              ? "加盟店がまだありません"
              : "条件に一致する加盟店がありません"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredShops.map((shop) => {
            const isFav = favorites.has(shop.id);
            const hasCoupon = couponShops.has(shop.id);
            const open = isOpenToday(shop.data);
            return (
              <Link
                key={shop.id}
                href={`/shop/${shop.id}`}
                className="block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-gray-800 truncate">
                        {shop.data.name}
                      </p>
                      {isFav && (
                        <Heart
                          size={14}
                          className="text-pink-500 flex-shrink-0"
                          fill="currentColor"
                        />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin size={12} />
                      {shop.data.address || "住所未設定"}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                        {shop.data.category}
                      </span>
                      {shop.data.areaName && (
                        <span className="text-xs text-gray-400">
                          {shop.data.areaName}
                        </span>
                      )}
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          open
                            ? "bg-green-50 text-green-600"
                            : "bg-gray-50 text-gray-400"
                        }`}
                      >
                        {open ? "営業中" : "営業時間外"}
                      </span>
                      {hasCoupon && (
                        <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <Ticket size={10} />
                          クーポン
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-gray-300 flex-shrink-0 mt-1"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Navigation />
    </div>
  );
}

export default function ShopsPage() {
  return (
    <AuthProvider>
      <ShopsContent />
    </AuthProvider>
  );
}
