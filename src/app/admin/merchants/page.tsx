"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  getAllMerchants,
  createMerchant,
  updateMerchant,
} from "@/lib/firestore";
import { generateQrCodeId } from "@/lib/utils";
import type { Merchant } from "@/types";
import {
  Loader2,
  ArrowLeft,
  Plus,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";

function MerchantsContent() {
  const { user, loading } = useAuth();
  const [merchants, setMerchants] = useState<
    { id: string; data: Merchant }[]
  >([]);
  const [fetching, setFetching] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    ownerUserId: "",
    address: "",
    category: "",
  });
  const [saving, setSaving] = useState(false);

  const loadMerchants = () => {
    getAllMerchants()
      .then(setMerchants)
      .catch(console.error)
      .finally(() => setFetching(false));
  };

  useEffect(() => {
    loadMerchants();
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

  const handleCreate = async () => {
    if (!formData.name || !formData.ownerUserId) return;
    setSaving(true);
    try {
      await createMerchant({
        name: formData.name,
        ownerUserId: formData.ownerUserId,
        address: formData.address,
        category: formData.category,
        qrCodeId: generateQrCodeId(),
        isActive: true,
      });
      setFormData({ name: "", ownerUserId: "", address: "", category: "" });
      setShowForm(false);
      loadMerchants();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (merchantId: string, currentActive: boolean) => {
    await updateMerchant(merchantId, { isActive: !currentActive });
    loadMerchants();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-8">
      <Link
        href="/admin"
        className="flex items-center gap-1 text-gray-500 text-sm mb-4"
      >
        <ArrowLeft size={16} /> 管理画面に戻る
      </Link>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">加盟店管理</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 bg-orange-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          <Plus size={16} /> 新規登録
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4 space-y-3">
          <input
            type="text"
            placeholder="店舗名 *"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <input
            type="text"
            placeholder="オーナー LINE User ID *"
            value={formData.ownerUserId}
            onChange={(e) =>
              setFormData({ ...formData, ownerUserId: e.target.value })
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <input
            type="text"
            placeholder="住所"
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <input
            type="text"
            placeholder="カテゴリ（飲食、小売 等）"
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button
            onClick={handleCreate}
            disabled={saving || !formData.name || !formData.ownerUserId}
            className="w-full bg-orange-500 text-white py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="animate-spin mx-auto" size={18} />
            ) : (
              "登録する"
            )}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {merchants.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            加盟店はまだ登録されていません
          </p>
        ) : (
          merchants.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm"
            >
              <div>
                <p className="font-medium text-gray-800">{m.data.name}</p>
                <p className="text-xs text-gray-400">
                  {m.data.category} | {m.data.address}
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  QR: {m.data.qrCodeId}
                </p>
              </div>
              <button
                onClick={() => toggleActive(m.id, m.data.isActive)}
                className={`flex items-center gap-1 text-sm px-3 py-1 rounded-full ${
                  m.data.isActive
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {m.data.isActive ? (
                  <>
                    <CheckCircle size={14} /> 有効
                  </>
                ) : (
                  <>
                    <XCircle size={14} /> 無効
                  </>
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function MerchantsPage() {
  return (
    <AuthProvider>
      <MerchantsContent />
    </AuthProvider>
  );
}
