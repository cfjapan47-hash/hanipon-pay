"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import MerchantNavigation from "@/components/MerchantNavigation";
import {
  getMerchantByOwner,
  getInvoicesByShop,
  payInvoice,
} from "@/lib/firestore";
import { formatPoints } from "@/lib/utils";
import type { Merchant, Invoice } from "@/types";
import {
  Loader2,
  ArrowLeft,
  Plus,
  FileText,
  Send,
  Inbox,
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
} from "lucide-react";
import Link from "next/link";

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  draft: { label: "下書き", color: "bg-gray-100 text-gray-600" },
  sent: { label: "送信済み", color: "bg-blue-100 text-blue-600" },
  paid: { label: "支払済み", color: "bg-green-100 text-green-600" },
  overdue: { label: "期限超過", color: "bg-red-100 text-red-600" },
};

function InvoiceListContent() {
  const { liffUser, loading } = useAuth();
  const [myMerchant, setMyMerchant] = useState<{
    id: string;
    data: Merchant;
  } | null>(null);
  const [sentInvoices, setSentInvoices] = useState<Invoice[]>([]);
  const [receivedInvoices, setReceivedInvoices] = useState<Invoice[]>([]);
  const [fetching, setFetching] = useState(true);
  const [tab, setTab] = useState<"sent" | "received">("sent");
  const [paying, setPaying] = useState<string | null>(null);

  const fetchData = async (merchantId: string) => {
    const [sent, received] = await Promise.all([
      getInvoicesByShop(merchantId, "sent"),
      getInvoicesByShop(merchantId, "received"),
    ]);
    // 期限超過チェック
    const today = new Date().toISOString().split("T")[0];
    const markOverdue = (inv: Invoice) => {
      if (inv.status === "sent" && inv.dueDate < today) {
        return { ...inv, status: "overdue" as const };
      }
      return inv;
    };
    setSentInvoices(sent.map(markOverdue));
    setReceivedInvoices(received.map(markOverdue));
  };

  useEffect(() => {
    if (!liffUser) return;
    getMerchantByOwner(liffUser.userId)
      .then(async (m) => {
        setMyMerchant(m);
        if (m) {
          await fetchData(m.id);
        }
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [liffUser]);

  const handlePay = async (invoice: Invoice) => {
    if (!invoice.id || !myMerchant) return;
    if (
      !confirm(
        `${invoice.fromShopName}への請求書（${formatPoints(invoice.totalAmount)} pt）を支払いますか？\n\n売上残高から引き落とされます。`
      )
    )
      return;

    setPaying(invoice.id);
    try {
      await payInvoice(invoice.id);
      alert("支払いが完了しました");
      await fetchData(myMerchant.id);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "支払いに失敗しました";
      alert(message);
    } finally {
      setPaying(null);
    }
  };

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (!myMerchant) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6">
        <p className="text-gray-600 text-center">加盟店として登録されていません</p>
      </div>
    );
  }

  const invoices = tab === "sent" ? sentInvoices : receivedInvoices;

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/merchant" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold text-gray-800">BtoB請求書</h1>
      </div>

      {/* 新規作成ボタン */}
      <Link
        href="/merchant/invoices/create"
        className="flex items-center justify-center gap-2 bg-blue-500 text-white rounded-xl px-4 py-3 shadow-sm font-bold text-sm hover:bg-blue-600 transition-colors mb-4"
      >
        <Plus size={18} />
        請求書を作成
      </Link>

      {/* タブ切替 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("sent")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            tab === "sent"
              ? "bg-blue-500 text-white"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Send size={16} />
          送信済み ({sentInvoices.length})
        </button>
        <button
          onClick={() => setTab("received")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            tab === "received"
              ? "bg-blue-500 text-white"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Inbox size={16} />
          受信済み ({receivedInvoices.length})
        </button>
      </div>

      {/* 請求書一覧 */}
      <div className="space-y-3">
        {invoices.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <FileText className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-400 text-sm">
              {tab === "sent"
                ? "送信した請求書はありません"
                : "受信した請求書はありません"}
            </p>
          </div>
        ) : (
          invoices.map((invoice) => {
            const badge = STATUS_BADGE[invoice.status] || STATUS_BADGE.sent;
            const isOverdue = invoice.status === "overdue";
            return (
              <div
                key={invoice.id}
                className={`bg-white rounded-2xl p-4 shadow-sm ${
                  isOverdue ? "border-2 border-red-300" : ""
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">
                      {tab === "sent"
                        ? `→ ${invoice.toShopName}`
                        : `← ${invoice.fromShopName}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      期限: {invoice.dueDate}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}
                  >
                    {isOverdue && <AlertTriangle size={12} className="inline mr-1" />}
                    {badge.label}
                  </span>
                </div>

                {/* 品目一覧 */}
                <div className="text-xs text-gray-500 mb-2">
                  {invoice.items.map((item, i) => (
                    <span key={i}>
                      {item.name}({item.qty}x{formatPoints(item.unitPrice)})
                      {i < invoice.items.length - 1 ? "、" : ""}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-gray-800">
                      {formatPoints(invoice.totalAmount)} pt
                    </span>
                    <span className="text-xs text-gray-400 ml-2">
                      手数料: {invoice.feeRate * 100}%
                    </span>
                  </div>

                  {/* 受信した未払い請求書に支払いボタン */}
                  {tab === "received" &&
                    (invoice.status === "sent" ||
                      invoice.status === "overdue") && (
                      <button
                        onClick={() => handlePay(invoice)}
                        disabled={paying === invoice.id}
                        className="flex items-center gap-1 bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-600 transition-colors disabled:opacity-50"
                      >
                        {paying === invoice.id ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          <CreditCard size={14} />
                        )}
                        支払う
                      </button>
                    )}

                  {invoice.status === "paid" && (
                    <CheckCircle size={20} className="text-green-500" />
                  )}
                  {tab === "sent" && invoice.status === "sent" && (
                    <Clock size={20} className="text-blue-400" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <MerchantNavigation />
    </div>
  );
}

export default function InvoiceListPage() {
  return (
    <AuthProvider>
      <InvoiceListContent />
    </AuthProvider>
  );
}
