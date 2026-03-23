"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  getMerchantByOwner,
  getMerchantTransactions,
} from "@/lib/firestore";
import { formatPoints, formatDate } from "@/lib/utils";
import type { Merchant, Transaction } from "@/types";
import { Loader2, Store, QrCode, Banknote, Ticket, MessageCircle, Users, Wallet, ShoppingBag, Home, UserCog, Stamp, CalendarCheck, Package, ClipboardList, Link as LinkIcon, ShieldCheck, FileText, Download } from "lucide-react";
import Link from "next/link";
import MerchantNavigation from "@/components/MerchantNavigation";

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
          <Link
            href="/register-shop"
            className="inline-block mt-4 bg-orange-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors"
          >
            無料で加盟店登録する
          </Link>
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
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <h1 className="text-xl font-bold text-gray-800 mb-4">加盟店管理</h1>

      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg mb-4">
        <p className="text-sm opacity-90">{merchant.data.name}</p>
        <div className="flex justify-between items-end mt-4">
          <div>
            <p className="text-xs opacity-75">本日の売上</p>
            <p className="text-3xl font-bold mt-1">
              {formatPoints(todayTotal)}
              <span className="text-lg ml-1">pt</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-75">売上残高</p>
            <p className="text-xl font-bold mt-1">
              {formatPoints(merchant.data.salesBalance || 0)}
              <span className="text-sm ml-1">pt</span>
            </p>
          </div>
        </div>
      </div>

      {/* メイン操作ボタン */}
      <Link
        href="/merchant/receive"
        className="flex items-center justify-center gap-2 bg-green-500 text-white rounded-xl px-4 py-4 shadow-sm font-bold text-base hover:bg-green-600 transition-colors mb-3"
      >
        <ShoppingBag size={22} />
        支払いを受ける
      </Link>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <Link
          href={`/merchant/qr?id=${merchant.data.qrCodeId}`}
          className="flex flex-col items-center justify-center gap-1.5 bg-white rounded-xl px-3 py-3 shadow-sm text-blue-600 font-medium hover:bg-blue-50 transition-colors"
        >
          <QrCode size={20} />
          <span className="text-xs">QRコード</span>
        </Link>
        <Link
          href="/merchant/coupons"
          className="flex flex-col items-center justify-center gap-1.5 bg-white rounded-xl px-3 py-3 shadow-sm text-orange-600 font-medium hover:bg-orange-50 transition-colors"
        >
          <Ticket size={20} />
          <span className="text-xs">クーポン</span>
        </Link>
        <Link
          href="/merchant/withdraw"
          className="flex flex-col items-center justify-center gap-1.5 bg-white rounded-xl px-3 py-3 shadow-sm text-green-600 font-medium hover:bg-green-50 transition-colors"
        >
          <Banknote size={20} />
          <span className="text-xs">換金申請</span>
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <Link
          href="/merchant/charge"
          className="flex flex-col items-center justify-center gap-1.5 bg-white rounded-xl px-3 py-3 shadow-sm text-amber-600 font-medium hover:bg-amber-50 transition-colors"
        >
          <Wallet size={20} />
          <span className="text-xs">現金チャージ</span>
        </Link>
        <Link
          href="/merchant/messages"
          className="flex flex-col items-center justify-center gap-1.5 bg-white rounded-xl px-3 py-3 shadow-sm text-purple-600 font-medium hover:bg-purple-50 transition-colors"
        >
          <MessageCircle size={20} />
          <span className="text-xs">メッセージ</span>
        </Link>
        <Link
          href="/merchant/customers"
          className="flex flex-col items-center justify-center gap-1.5 bg-white rounded-xl px-3 py-3 shadow-sm text-teal-600 font-medium hover:bg-teal-50 transition-colors"
        >
          <Users size={20} />
          <span className="text-xs">顧客リスト</span>
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <Link
          href="/merchant/stamps"
          className="flex flex-col items-center justify-center gap-1.5 bg-white rounded-xl px-3 py-3 shadow-sm text-pink-600 font-medium hover:bg-pink-50 transition-colors"
        >
          <Stamp size={20} />
          <span className="text-xs">スタンプカード</span>
        </Link>
        <Link
          href="/merchant/reservations"
          className="flex flex-col items-center justify-center gap-1.5 bg-white rounded-xl px-3 py-3 shadow-sm text-indigo-600 font-medium hover:bg-indigo-50 transition-colors"
        >
          <CalendarCheck size={20} />
          <span className="text-xs">予約管理</span>
        </Link>
        <Link
          href="/merchant/products"
          className="flex flex-col items-center justify-center gap-1.5 bg-white rounded-xl px-3 py-3 shadow-sm text-emerald-600 font-medium hover:bg-emerald-50 transition-colors"
        >
          <Package size={20} />
          <span className="text-xs">商品管理</span>
        </Link>
      </div>
      <Link
        href="/merchant/invoices"
        className="flex items-center justify-center gap-2 bg-cyan-500 text-white rounded-xl px-4 py-3 shadow-sm font-bold text-sm hover:bg-cyan-600 transition-colors mb-3"
      >
        <FileText size={18} />
        BtoB請求書
      </Link>
      <Link
        href="/merchant/orders"
        className="flex items-center justify-center gap-2 bg-emerald-500 text-white rounded-xl px-4 py-3 shadow-sm font-bold text-sm hover:bg-emerald-600 transition-colors mb-3"
      >
        <ClipboardList size={18} />
        注文管理（EC）
      </Link>
      <Link
        href="/merchant/payment-link"
        className="flex items-center justify-center gap-2 bg-blue-500 text-white rounded-xl px-4 py-3 shadow-sm font-bold text-sm hover:bg-blue-600 transition-colors mb-3"
      >
        <LinkIcon size={18} />
        オンライン決済リンク生成
      </Link>
      <Link
        href="/merchant/profile"
        className="flex items-center justify-center gap-2 bg-white border-2 border-blue-200 text-blue-600 rounded-xl px-4 py-3 shadow-sm font-bold text-sm hover:bg-blue-50 transition-colors mb-3"
      >
        <UserCog size={18} />
        プロフィール編集（店舗ホームページ）
      </Link>
      <Link
        href="/merchant/export"
        className="flex items-center justify-center gap-2 bg-white border-2 border-emerald-200 text-emerald-600 rounded-xl px-4 py-3 shadow-sm font-bold text-sm hover:bg-emerald-50 transition-colors mb-3"
      >
        <Download size={18} />
        売上データエクスポート（CSV）
      </Link>
      <Link
        href="/merchant/kyc"
        className="flex items-center justify-center gap-2 bg-white border-2 border-green-200 text-green-600 rounded-xl px-4 py-3 shadow-sm font-bold text-sm hover:bg-green-50 transition-colors mb-6"
      >
        <ShieldCheck size={18} />
        本人確認 (eKYC)
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
      <div className="mt-6 mb-20 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-orange-600 transition-colors"
        >
          <Home size={16} />
          市民画面に切り替え
        </Link>
      </div>
      <MerchantNavigation />
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
