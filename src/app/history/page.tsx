"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import TransactionList from "@/components/TransactionList";
import { getUserTransactions } from "@/lib/firestore";
import type { Transaction } from "@/types";
import { Loader2 } from "lucide-react";

function HistoryContent() {
  const { liffUser, loading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!liffUser) return;
    getUserTransactions(liffUser.userId, 50)
      .then(setTransactions)
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

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <h1 className="text-xl font-bold text-gray-800 mb-4">取引履歴</h1>
      <TransactionList
        transactions={transactions}
        currentUserId={liffUser?.userId || ""}
      />
      <Navigation />
    </div>
  );
}

export default function HistoryPage() {
  return (
    <AuthProvider>
      <HistoryContent />
    </AuthProvider>
  );
}
