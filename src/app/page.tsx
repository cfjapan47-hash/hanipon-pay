"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import BalanceCard from "@/components/BalanceCard";
import TransactionList from "@/components/TransactionList";
import { getUserTransactions } from "@/lib/firestore";
import type { Transaction } from "@/types";
import { Loader2, Store, Shield, UserPlus, Gift, QrCode, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { getMerchantByOwner } from "@/lib/firestore";

function HomeContent() {
  const state = useAuth();
  const { liffUser, user, loading, error } = state;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isMerchant, setIsMerchant] = useState(false);
  const [showMyQr, setShowMyQr] = useState(false);

  useEffect(() => {
    if (!liffUser) return;
    getUserTransactions(liffUser.userId, 5)
      .then(setTransactions)
      .catch(console.error);
    getMerchantByOwner(liffUser.userId)
      .then((m) => setIsMerchant(!!m))
      .catch(() => {});
  }, [liffUser]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <Loader2 className="animate-spin text-orange-500" size={32} />
        <p className="text-sm text-gray-500">{state?.status || "読み込み中..."}</p>
      </div>
    );
  }

  if (error || !user || !liffUser) {
    return (
      <div className="flex items-center justify-center h-screen px-4">
        <p className="text-red-500 text-center">{error || "認証エラー"}</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <h1 className="text-xl font-bold text-gray-800 mb-4">はにぽんPay</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-xs text-red-600 break-all">
          {error}
        </div>
      )}

      <BalanceCard balance={user.balance} displayName={user.displayName} />

      {/* マイQRコードボタン */}
      <button
        onClick={() => setShowMyQr(true)}
        className="mt-3 w-full flex items-center justify-center gap-2 bg-white border-2 border-orange-400 text-orange-600 rounded-xl px-4 py-3 text-sm font-bold hover:bg-orange-50 transition-colors"
      >
        <QrCode size={20} />
        マイQRコードを表示
      </button>

      {/* QRコードモーダル */}
      {showMyQr && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xs text-center relative">
            <button
              onClick={() => setShowMyQr(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
            <p className="text-sm text-gray-500 mb-1">マイQRコード</p>
            <p className="text-lg font-bold mb-4">{user.displayName}</p>
            <div className="flex justify-center mb-4">
              <QRCodeSVG
                value={liffUser.userId}
                size={200}
                level="M"
                includeMargin
              />
            </div>
            <p className="text-xs text-gray-400">
              加盟店でチャージ・支払い時にスキャンしてもらえます
            </p>
          </div>
        </div>
      )}

      {/* クイックメニュー */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {isMerchant && (
          <Link
            href="/merchant"
            className="flex items-center gap-2 bg-blue-50 text-blue-700 rounded-xl px-4 py-3 text-sm font-medium hover:bg-blue-100 transition-colors"
          >
            <Store size={18} />
            加盟店管理
          </Link>
        )}
        {!isMerchant && (
          <Link
            href="/register-shop"
            className="flex items-center gap-2 bg-green-50 text-green-700 rounded-xl px-4 py-3 text-sm font-medium hover:bg-green-100 transition-colors"
          >
            <UserPlus size={18} />
            加盟店登録
          </Link>
        )}
        <Link
          href="/referral"
          className="flex items-center gap-2 bg-orange-50 text-orange-700 rounded-xl px-4 py-3 text-sm font-medium hover:bg-orange-100 transition-colors"
        >
          <Gift size={18} />
          お店を紹介
        </Link>
        {user.role === "admin" && (
          <Link
            href="/admin"
            className="flex items-center gap-2 bg-purple-50 text-purple-700 rounded-xl px-4 py-3 text-sm font-medium hover:bg-purple-100 transition-colors col-span-2"
          >
            <Shield size={18} />
            管理者画面
          </Link>
        )}
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-600 mb-3">
          最近の取引
        </h2>
        <TransactionList
          transactions={transactions}
          currentUserId={liffUser.userId}
        />
      </div>
      <Navigation />
    </div>
  );
}

export default function HomePage() {
  return (
    <AuthProvider>
      <HomeContent />
    </AuthProvider>
  );
}
