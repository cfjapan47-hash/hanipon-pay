"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { getAllInvoices } from "@/lib/firestore";
import { formatPoints } from "@/lib/utils";
import type { Invoice, InvoiceStatus } from "@/types";
import {
  Loader2,
  ArrowLeft,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Send,
  Filter,
} from "lucide-react";
import Link from "next/link";

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  draft: { label: "下書き", color: "bg-gray-100 text-gray-600" },
  sent: { label: "送信済み", color: "bg-blue-100 text-blue-600" },
  paid: { label: "支払済み", color: "bg-green-100 text-green-600" },
  overdue: { label: "期限超過", color: "bg-red-100 text-red-600" },
};

const FILTER_OPTIONS: { key: string; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "sent", label: "送信済み" },
  { key: "paid", label: "支払済み" },
  { key: "overdue", label: "期限超過" },
];

function AdminInvoicesContent() {
  const { user, loading } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [fetching, setFetching] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    getAllInvoices()
      .then((data) => {
        const today = new Date().toISOString().split("T")[0];
        const processed = data.map((inv) => {
          if (inv.status === "sent" && inv.dueDate < today) {
            return { ...inv, status: "overdue" as InvoiceStatus };
          }
          return inv;
        });
        setInvoices(processed);
      })
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

  const filtered =
    filter === "all"
      ? invoices
      : invoices.filter((inv) => inv.status === filter);

  const totalAmount = filtered.reduce((s, inv) => s + inv.totalAmount, 0);
  const totalFee = filtered.reduce((s, inv) => s + inv.fee, 0);
  const overdueCount = invoices.filter((inv) => inv.status === "overdue").length;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold text-gray-800">BtoB請求書管理</h1>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <p className="text-2xl font-bold text-gray-800">{invoices.length}</p>
          <p className="text-xs text-gray-500">総請求書</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <p className="text-2xl font-bold text-green-600">
            {formatPoints(totalFee)}
          </p>
          <p className="text-xs text-gray-500">手数料収入(pt)</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <p className={`text-2xl font-bold ${overdueCount > 0 ? "text-red-600" : "text-gray-800"}`}>
            {overdueCount}
          </p>
          <p className="text-xs text-gray-500">期限超過</p>
        </div>
      </div>

      {/* フィルター */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto">
        <Filter size={16} className="text-gray-400 shrink-0" />
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === opt.key
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 請求書一覧 */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <FileText className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-400 text-sm">請求書はありません</p>
          </div>
        ) : (
          filtered.map((invoice) => {
            const badge =
              STATUS_BADGE[invoice.status] || STATUS_BADGE.sent;
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
                      {invoice.fromShopName} → {invoice.toShopName}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      期限: {invoice.dueDate}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}
                  >
                    {isOverdue && (
                      <AlertTriangle size={12} className="inline mr-1" />
                    )}
                    {badge.label}
                  </span>
                </div>

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
                      手数料: {formatPoints(invoice.fee)} pt (
                      {invoice.feeRate * 100}%)
                    </span>
                  </div>
                  <div>
                    {invoice.status === "paid" && (
                      <CheckCircle size={20} className="text-green-500" />
                    )}
                    {invoice.status === "sent" && (
                      <Clock size={20} className="text-blue-400" />
                    )}
                    {isOverdue && (
                      <AlertTriangle size={20} className="text-red-500" />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function AdminInvoicesPage() {
  return (
    <AuthProvider>
      <AdminInvoicesContent />
    </AuthProvider>
  );
}
