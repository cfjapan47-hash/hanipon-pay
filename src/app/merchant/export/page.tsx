"use client";

import { useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import MerchantNavigation from "@/components/MerchantNavigation";
import {
  getMerchantByOwner,
  getTransactionsByMerchantDateRange,
} from "@/lib/firestore";
import type { Transaction } from "@/types";
import { Loader2, Download, FileSpreadsheet, ArrowLeft } from "lucide-react";
import Link from "next/link";

type ExportFormat = "standard" | "freee";

function ExportContent() {
  const { liffUser, loading } = useAuth();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [format, setFormat] = useState<ExportFormat>("standard");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [resultCount, setResultCount] = useState<number | null>(null);

  const handleExport = async () => {
    if (!liffUser) return;
    setExporting(true);
    setError("");
    setResultCount(null);

    try {
      const merchant = await getMerchantByOwner(liffUser.userId);
      if (!merchant) {
        setError("加盟店情報が見つかりません");
        return;
      }

      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const transactions = await getTransactionsByMerchantDateRange(
        merchant.id,
        start,
        end
      );

      if (transactions.length === 0) {
        setError("指定期間の取引データがありません");
        return;
      }

      setResultCount(transactions.length);

      let csvContent: string;
      let filename: string;

      if (format === "freee") {
        csvContent = generateFreeeCsv(transactions);
        filename = `freee_売上データ_${startDate}_${endDate}.csv`;
      } else {
        csvContent = generateStandardCsv(transactions);
        filename = `売上データ_${startDate}_${endDate}.csv`;
      }

      // BOM付きUTF-8でダウンロード
      const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
      const blob = new Blob([bom, csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("エクスポートに失敗しました");
    } finally {
      setExporting(false);
    }
  };

  const generateStandardCsv = (transactions: Transaction[]): string => {
    const header = "日付,種類,金額,メモ";
    const rows = transactions.map((tx) => {
      const date = tx.createdAt?.toDate
        ? tx.createdAt.toDate().toLocaleDateString("ja-JP")
        : "";
      const typeLabel = getTransactionTypeLabel(tx.type);
      return `${date},${typeLabel},${tx.amount},"${(tx.memo || "").replace(/"/g, '""')}"`;
    });
    return [header, ...rows].join("\n");
  };

  const generateFreeeCsv = (transactions: Transaction[]): string => {
    const header = "日付,勘定科目,税区分,金額,摘要";
    const rows = transactions.map((tx) => {
      const date = tx.createdAt?.toDate
        ? tx.createdAt.toDate().toLocaleDateString("ja-JP")
        : "";
      const account = tx.type === "refund" ? "売上値引" : "売上高";
      const taxType = "課税売上10%";
      const memo = (tx.memo || "はにぽんPay決済").replace(/"/g, '""');
      return `${date},${account},${taxType},${tx.amount},"${memo}"`;
    });
    return [header, ...rows].join("\n");
  };

  const getTransactionTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      payment: "支払い",
      grant: "付与",
      refund: "返金",
      referral_reward: "紹介報酬",
      cash_charge: "現金チャージ",
      card_charge: "カードチャージ",
      card_balance_transfer: "カード残高移行",
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/merchant" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-800">売上データエクスポート</h1>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-4">
          <FileSpreadsheet size={20} className="text-green-600" />
          <p className="font-semibold text-gray-700">エクスポート設定</p>
        </div>

        {/* 期間選択 */}
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">開始日</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">終了日</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* フォーマット選択 */}
        <div className="mb-4">
          <label className="block text-xs text-gray-500 mb-2">出力フォーマット</label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3 cursor-pointer">
              <input
                type="radio"
                name="format"
                value="standard"
                checked={format === "standard"}
                onChange={() => setFormat("standard")}
                className="accent-blue-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-700">標準CSV</p>
                <p className="text-xs text-gray-400">日付, 種類, 金額, メモ</p>
              </div>
            </label>
            <label className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3 cursor-pointer">
              <input
                type="radio"
                name="format"
                value="freee"
                checked={format === "freee"}
                onChange={() => setFormat("freee")}
                className="accent-blue-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-700">freee取り込み用</p>
                <p className="text-xs text-gray-400">日付, 勘定科目, 税区分, 金額, 摘要</p>
              </div>
            </label>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {resultCount !== null && (
          <div className="bg-green-50 text-green-600 text-sm rounded-lg px-4 py-3 mb-4">
            {resultCount}件の取引データをダウンロードしました
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={exporting || !startDate || !endDate}
          className="w-full bg-green-500 text-white rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 hover:bg-green-600 disabled:bg-gray-300 transition-colors"
        >
          {exporting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              <Download size={18} />
              CSVダウンロード
            </>
          )}
        </button>
      </div>

      <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-700">
        <p className="font-semibold mb-1">使い方</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>期間を選択して「CSVダウンロード」をタップ</li>
          <li>freee形式は会計freeeの取引データ取り込みに対応</li>
          <li>CSV ファイルはUTF-8（BOM付き）で出力されます</li>
        </ul>
      </div>

      <MerchantNavigation />
    </div>
  );
}

export default function ExportPage() {
  return (
    <AuthProvider>
      <ExportContent />
    </AuthProvider>
  );
}
