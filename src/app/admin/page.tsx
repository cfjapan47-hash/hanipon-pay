"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { getSystemStats } from "@/lib/firestore";
import { formatPoints } from "@/lib/utils";
import { Loader2, Users, Store, ArrowRightLeft, Gift, List, Banknote, CreditCard, Zap, ShieldCheck } from "lucide-react";
import Link from "next/link";

function AdminContent() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalMerchants: 0,
    totalTransactions: 0,
  });
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    getSystemStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setFetching(false));
  }, []);

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-screen px-4">
        <p className="text-red-500 text-center">管理者権限がありません</p>
      </div>
    );
  }

  const statCards = [
    {
      label: "登録ユーザー数",
      value: formatPoints(stats.totalUsers),
      icon: Users,
      color: "bg-blue-100 text-blue-600",
    },
    {
      label: "加盟店数",
      value: formatPoints(stats.totalMerchants),
      icon: Store,
      color: "bg-green-100 text-green-600",
    },
    {
      label: "総取引数",
      value: formatPoints(stats.totalTransactions),
      icon: ArrowRightLeft,
      color: "bg-purple-100 text-purple-600",
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-8">
      <h1 className="text-xl font-bold text-gray-800 mb-6">管理者ダッシュボード</h1>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-xl p-4 shadow-sm text-center"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${card.color}`}
              >
                <Icon size={18} />
              </div>
              <p className="text-2xl font-bold text-gray-800">{card.value}</p>
              <p className="text-xs text-gray-500 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <Link
          href="/admin/grant"
          className="flex items-center gap-3 bg-white rounded-xl px-4 py-4 shadow-sm hover:bg-orange-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
            <Gift size={18} />
          </div>
          <div>
            <p className="font-medium text-gray-800">ポイント発行</p>
            <p className="text-xs text-gray-400">市民にポイントを付与する</p>
          </div>
        </Link>

        <Link
          href="/admin/merchants"
          className="flex items-center gap-3 bg-white rounded-xl px-4 py-4 shadow-sm hover:bg-blue-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
            <List size={18} />
          </div>
          <div>
            <p className="font-medium text-gray-800">加盟店管理</p>
            <p className="text-xs text-gray-400">
              加盟店の登録・編集・承認
            </p>
          </div>
        </Link>

        <Link
          href="/admin/charges"
          className="flex items-center gap-3 bg-white rounded-xl px-4 py-4 shadow-sm hover:bg-yellow-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
            <CreditCard size={18} />
          </div>
          <div>
            <p className="font-medium text-gray-800">チャージ承認</p>
            <p className="text-xs text-gray-400">
              銀行振込チャージ申請を処理
            </p>
          </div>
        </Link>

        <Link
          href="/admin/withdrawals"
          className="flex items-center gap-3 bg-white rounded-xl px-4 py-4 shadow-sm hover:bg-green-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
            <Banknote size={18} />
          </div>
          <div>
            <p className="font-medium text-gray-800">換金申請管理</p>
            <p className="text-xs text-gray-400">
              加盟店からの換金申請を処理
            </p>
          </div>
        </Link>

        <Link
          href="/admin/kyc"
          className="flex items-center gap-3 bg-white rounded-xl px-4 py-4 shadow-sm hover:bg-teal-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center">
            <ShieldCheck size={18} />
          </div>
          <div>
            <p className="font-medium text-gray-800">本人確認審査</p>
            <p className="text-xs text-gray-400">
              加盟店のeKYC申請を審査
            </p>
          </div>
        </Link>

        <Link
          href="/admin/cards"
          className="flex items-center gap-3 bg-white rounded-xl px-4 py-4 shadow-sm hover:bg-indigo-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <CreditCard size={18} />
          </div>
          <div>
            <p className="font-medium text-gray-800">カード管理</p>
            <p className="text-xs text-gray-400">
              紙カードの発行・管理・無効化
            </p>
          </div>
        </Link>

        <Link
          href="/admin/card-charge"
          className="flex items-center gap-3 bg-white rounded-xl px-4 py-4 shadow-sm hover:bg-amber-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
            <Zap size={18} />
          </div>
          <div>
            <p className="font-medium text-gray-800">窓口チャージ</p>
            <p className="text-xs text-gray-400">
              紙カードへの窓口チャージ
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthProvider>
      <AdminContent />
    </AuthProvider>
  );
}
