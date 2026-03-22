"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  getMerchantByOwner,
  getMerchantTransactions,
} from "@/lib/firestore";
import { formatPoints, formatDate } from "@/lib/utils";
import type { Merchant, Transaction } from "@/types";
import { Loader2, Store, QrCode } from "lucide-react";
import Link from "next/link";

function MerchantContent() {
  const { liffUser, loading } = useAuth();
  const [merchant, setMerchant] = useState<{
    id: string;
    data: Merchant;
  } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!liffUser) return;
    getMerchantByOwner(liffUser.userId)
      .then(async (m) => {
        setMerchant(m);
        if (m) {
          const txs = await getMerchantTransactions(m.id);
          setTransactions(txs);
        }
      })
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

  if (!merchant) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6">
        <h1 className="text-xl font-bold text-gray-800 mb-4">加盟店管理</h1>
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <Store className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">加盟店として登録されていません</p>
          <p className="text-sm text-gray-400 mt-2">
            管理者にお問い合わせください
          </p>
        </div>
      </div>
    );
  }

  const todayTotal = transactions
    .filter((tx) => {
      const txDate = tx.createdAt?.toDate();
      const today = new Date();
      return (
        txDate &&
        txDate.getFullYear() === today.getFullYear() &&
        txDate.getMonth() === today.getMonth() &&
        txDate.getDate() === today.getDate()
      );
    })
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-8">
      <h1 className="text-xl font-bold text-gray-800 mb-4">加盟店管理</h1>

      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg mb-4">
        <p className="text-sm opacity-90">{merchant.data.name}</p>
        <div className="mt-4">
          <p className="text-xs opacity-75">本日の売上</p>
          <p className="text-3xl font-bold mt-1">
            {formatPoints(todayTotal)}
            <span className="text-lg ml-1">pt</span>
          </p>
        </div>
      </div>

      <Link
        href={`/merchant/qr?id=${merchant.data.qrCodeId}`}
        className="flex items-center justify-center gap-2 bg-white rounded-xl px-4 py-3 shadow-sm text-blue-600 font-medium mb-6 hover:bg-blue-50 transition-colors"
      >
        <QrCode size={20} />
        店頭用QRコードを表示
      </Link>

      <h2 className="text-sm font-semibold text-gray-600 mb-3">取引一覧</h2>
      <div className="space-y-2">
        {transactions.length === 0 ? (
          <p className="text-gray-400 text-center py-4">取引はありません</p>
        ) : (
          transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm"
            >
              <div>
                <p className="text-sm text-gray-600">
                  {tx.createdAt ? formatDate(tx.createdAt) : ""}
                </p>
              </div>
              <p className="text-base font-bold text-green-600">
                +{formatPoints(tx.amount)} pt
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function MerchantPage() {
  return (
    <AuthProvider>
      <MerchantContent />
    </AuthProvider>
  );
}
