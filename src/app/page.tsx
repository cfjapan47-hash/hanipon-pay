"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import BalanceCard from "@/components/BalanceCard";
import TransactionList from "@/components/TransactionList";
import { getUserTransactions } from "@/lib/firestore";
import type { Transaction } from "@/types";
import { Loader2, Store, Shield, UserPlus, Gift } from "lucide-react";
import Link from "next/link";
import { getMerchantByOwner } from "@/lib/firestore";

function HomeContent() {
  const state = useAuth();
  const { liffUser, user, loading, error } = state;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isMerchant, setIsMerchant] = useState(false);

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
      <BalanceCard balance={user.balance} displayName={user.displayName} />

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
