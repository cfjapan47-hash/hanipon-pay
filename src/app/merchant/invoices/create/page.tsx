"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import MerchantNavigation from "@/components/MerchantNavigation";
import {
  getMerchantByOwner,
  getAllMerchants,
  createInvoice,
  getMonthlyB2BVolume,
} from "@/lib/firestore";
import { formatPoints } from "@/lib/utils";
import type { Merchant, InvoiceItem } from "@/types";
import {
  Loader2,
  ArrowLeft,
  Plus,
  Trash2,
  Send,
  FileText,
} from "lucide-react";
import Link from "next/link";

function CreateInvoiceContent() {
  const { liffUser, loading } = useAuth();
  const [myMerchant, setMyMerchant] = useState<{
    id: string;
    data: Merchant;
  } | null>(null);
  const [merchants, setMerchants] = useState<{ id: string; data: Merchant }[]>(
    []
  );
  const [fetching, setFetching] = useState(true);

  // Form state
  const [toShopId, setToShopId] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([
    { name: "", qty: 1, unitPrice: 0, amount: 0 },
  ]);
  const [dueDate, setDueDate] = useState("");
  const [feeRate, setFeeRate] = useState(0.02);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!liffUser) return;
    Promise.all([getMerchantByOwner(liffUser.userId), getAllMerchants()])
      .then(([m, all]) => {
        setMyMerchant(m);
        if (m) {
          setMerchants(all.filter((a) => a.id !== m.id && a.data.isActive));
        }
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [liffUser]);

  // 請求先選択時に手数料率を計算
  useEffect(() => {
    if (!myMerchant || !toShopId) return;
    getMonthlyB2BVolume(myMerchant.id, toShopId).then((volume) => {
      setFeeRate(volume >= 100000 ? 0.01 : 0.02);
    });
  }, [myMerchant, toShopId]);

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      if (field === "name") {
        item.name = value as string;
      } else if (field === "qty") {
        item.qty = Math.max(1, Number(value));
      } else if (field === "unitPrice") {
        item.unitPrice = Math.max(0, Number(value));
      }
      item.amount = item.qty * item.unitPrice;
      updated[index] = item;
      return updated;
    });
  };

  const addItem = () => {
    setItems((prev) => [...prev, { name: "", qty: 1, unitPrice: 0, amount: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const fee = Math.floor(totalAmount * feeRate);

  const handleSubmit = async () => {
    if (!myMerchant || !toShopId || totalAmount <= 0 || !dueDate) return;
    const toMerchant = merchants.find((m) => m.id === toShopId);
    if (!toMerchant) return;

    const validItems = items.filter((item) => item.name && item.amount > 0);
    if (validItems.length === 0) return;

    setSubmitting(true);
    try {
      await createInvoice({
        fromShopId: myMerchant.id,
        fromShopName: myMerchant.data.name,
        toShopId,
        toShopName: toMerchant.data.name,
        items: validItems,
        totalAmount,
        fee,
        feeRate,
        dueDate,
        status: "sent",
      });
      setSuccess(true);
    } catch (e) {
      console.error(e);
      alert("請求書の送信に失敗しました");
    } finally {
      setSubmitting(false);
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

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6 pb-24">
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <FileText className="mx-auto text-green-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-gray-800 mb-2">請求書を送信しました</h2>
          <p className="text-gray-500 text-sm mb-6">
            請求先の加盟店に通知されます
          </p>
          <Link
            href="/merchant/invoices"
            className="inline-block bg-blue-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-600 transition-colors"
          >
            請求書一覧に戻る
          </Link>
        </div>
        <MerchantNavigation />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/merchant/invoices" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold text-gray-800">請求書作成</h1>
      </div>

      {/* 請求先選択 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          請求先加盟店
        </label>
        <select
          value={toShopId}
          onChange={(e) => setToShopId(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">選択してください</option>
          {merchants.map((m) => (
            <option key={m.id} value={m.id}>
              {m.data.name}
            </option>
          ))}
        </select>
      </div>

      {/* 品目入力 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h2 className="text-sm font-medium text-gray-700 mb-3">品目</h2>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  placeholder="品目名"
                  value={item.name}
                  onChange={(e) => updateItem(index, "name", e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(index)}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-500">数量</label>
                  <input
                    type="number"
                    min="1"
                    value={item.qty}
                    onChange={(e) => updateItem(index, "qty", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">単価</label>
                  <input
                    type="number"
                    min="0"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">金額</label>
                  <p className="px-3 py-2 text-sm font-bold text-gray-800">
                    {formatPoints(item.amount)} pt
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={addItem}
          className="flex items-center gap-1 text-blue-500 text-sm font-medium mt-3 hover:text-blue-700"
        >
          <Plus size={16} />
          品目を追加
        </button>
      </div>

      {/* 支払期限 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          支払期限
        </label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          min={new Date().toISOString().split("T")[0]}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 合計・手数料 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">小計</span>
          <span className="font-bold text-gray-800">
            {formatPoints(totalAmount)} pt
          </span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">
            手数料（{feeRate * 100}%）
          </span>
          <span className="text-sm text-red-500">-{formatPoints(fee)} pt</span>
        </div>
        <div className="border-t pt-2 flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">受取額</span>
          <span className="text-lg font-bold text-green-600">
            {formatPoints(totalAmount - fee)} pt
          </span>
        </div>
        {feeRate === 0.01 && (
          <p className="text-xs text-green-600 mt-2">
            月間取引額10万pt以上のため優遇手数料1%が適用されています
          </p>
        )}
      </div>

      {/* 送信ボタン */}
      <button
        onClick={handleSubmit}
        disabled={
          submitting || !toShopId || totalAmount <= 0 || !dueDate
        }
        className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white rounded-xl px-4 py-4 font-bold text-base hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <Loader2 className="animate-spin" size={20} />
        ) : (
          <Send size={20} />
        )}
        請求書を送信
      </button>

      <MerchantNavigation />
    </div>
  );
}

export default function CreateInvoicePage() {
  return (
    <AuthProvider>
      <CreateInvoiceContent />
    </AuthProvider>
  );
}
