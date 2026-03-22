"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import BalanceCard from "@/components/BalanceCard";
import TransactionList from "@/components/TransactionList";
import { getUserTransactions } from "@/lib/firestore";
import type { Transaction } from "@/types";
import { Loader2 } from "lucide-react";

function HomeContent() {
  const { liffUser, user, loading, error } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!liffUser) return;
    getUserTransactions(liffUser.userId, 5)
      .then(setTransactions)
      .catch(console.error);
  }, [liffUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-orange-500" size={32} />
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
