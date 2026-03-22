"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import {
  getActiveShops,
  getUserFavoriteShops,
  favoriteShop,
  sendMessage,
} from "@/lib/firestore";
import type { Merchant, ShopCustomer } from "@/types";
import {
  Loader2,
  Heart,
  HeartOff,
  MessageCircle,
  MapPin,
  Store,
  Send,
  X,
} from "lucide-react";

function ShopsContent() {
  const { liffUser, user, loading } = useAuth();
  const [shops, setShops] = useState<{ id: string; data: Merchant }[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [fetching, setFetching] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  // メッセージモーダル
  const [msgShop, setMsgShop] = useState<{ id: string; data: Merchant } | null>(null);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [msgSent, setMsgSent] = useState(false);

  useEffect(() => {
    if (!liffUser) return;
    Promise.all([getActiveShops(), getUserFavoriteShops(liffUser.userId)])
      .then(([shopList, favList]) => {
        setShops(shopList);
        const favSet = new Set(favList.map((f) => f.merchantId));
        setFavorites(favSet);
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [liffUser]);

  const handleFavorite = async (shopId: string) => {
    if (!liffUser || !user) return;
    setProcessing(shopId);
    try {
      await favoriteShop(
        liffUser.userId,
        user.displayName,
        user.pictureUrl,
        shopId
      );
      setFavorites((prev) => new Set([...prev, shopId]));
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };

  const handleSendMessage = async () => {
    if (!liffUser || !user || !msgShop || !msgText.trim()) return;
    setSending(true);
    try {
      // お気に入り登録されていなければ先に登録
      if (!favorites.has(msgShop.id)) {
        await favoriteShop(liffUser.userId, user.displayName, user.pictureUrl, msgShop.id);
        setFavorites((prev) => new Set([...prev, msgShop.id]));
      }
      await sendMessage({
        merchantId: msgShop.id,
        merchantName: msgShop.data.name,
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

      {shops.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <Store className="mx-auto text-gray-400 mb-3" size={40} />
          <p className="text-gray-500">加盟店がまだありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shops.map((shop) => {
            const isFav = favorites.has(shop.id);
            return (
              <div key={shop.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{shop.data.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin size={12} />
                      {shop.data.address || "住所未設定"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {shop.data.category} {shop.data.areaName && `・${shop.data.areaName}`}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  {isFav ? (
                    <div className="flex items-center gap-1 text-xs text-pink-500 bg-pink-50 rounded-lg px-3 py-2">
                      <Heart size={14} fill="currentColor" />
                      お気に入り済み
                    </div>
                  ) : (
                    <button
                      onClick={() => handleFavorite(shop.id)}
                      disabled={processing === shop.id}
                      className="flex items-center gap-1 text-xs text-pink-500 bg-pink-50 rounded-lg px-3 py-2 hover:bg-pink-100 disabled:opacity-50"
                    >
                      {processing === shop.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Heart size={14} />
                      )}
                      お気に入り
                    </button>
                  )}
                  <button
                    onClick={() => { setMsgShop(shop); setMsgSent(false); }}
                    className="flex items-center gap-1 text-xs text-blue-500 bg-blue-50 rounded-lg px-3 py-2 hover:bg-blue-100"
                  >
                    <MessageCircle size={14} />
                    メッセージ
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* メッセージモーダル */}
      {msgShop && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-2xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bold text-gray-800">{msgShop.data.name}</p>
                <p className="text-xs text-gray-400">にメッセージを送る</p>
              </div>
              <button onClick={() => { setMsgShop(null); setMsgSent(false); }}
                className="text-gray-400">
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
                <button onClick={() => { setMsgShop(null); setMsgSent(false); }}
                  className="mt-4 bg-gray-100 text-gray-600 rounded-lg px-6 py-2 text-sm font-bold">
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

export default function ShopsPage() {
  return (
    <AuthProvider>
      <ShopsContent />
    </AuthProvider>
  );
}
