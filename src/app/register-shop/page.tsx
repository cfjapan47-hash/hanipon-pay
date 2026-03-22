"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { registerMerchantSelf } from "@/lib/firestore";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Store,
} from "lucide-react";

function RegisterContent() {
  const searchParams = useSearchParams();
  const referrerId = searchParams.get("ref") || "";
  const { liffUser, loading } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    category: "",
    phone: "",
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [qrCodeId, setQrCodeId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!liffUser) return;
    if (!formData.name.trim()) {
      setErrorMsg("店舗名を入力してください");
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMsg("電話番号を入力してください");
      return;
    }

    setSaving(true);
    setErrorMsg("");
    try {
      const merchantId = await Promise.race([
        registerMerchantSelf({
          name: formData.name.trim(),
          ownerUserId: liffUser.userId,
          address: formData.address.trim(),
          category: formData.category.trim(),
          phone: formData.phone.trim(),
          referrerId: referrerId || "",
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("登録がタイムアウトしました。Firestoreへの接続に問題がある可能性があります。")), 15000)
        ),
      ]);
      setQrCodeId(merchantId);
      setSuccess(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      console.error("[RegisterShop] Error:", msg, err);
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 pt-8">
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <CheckCircle2 className="mx-auto text-green-500 mb-4" size={56} />
          <p className="text-xl font-bold text-gray-800">
            加盟店登録が完了しました！
          </p>
          <p className="text-gray-500 mt-2">
            仮登録が完了しました。すぐにお支払いを受け取れます。
          </p>
          {referrerId && (
            <p className="text-sm text-orange-500 mt-3">
              紹介者への報酬は本登録完了後に付与されます
            </p>
          )}
          <a
            href="/merchant"
            className="inline-block mt-6 bg-orange-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors"
          >
            加盟店ダッシュボードへ
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-8">
      <div className="text-center mb-6">
        <Store className="mx-auto text-orange-500 mb-3" size={48} />
        <h1 className="text-xl font-bold text-gray-800">加盟店登録</h1>
        <p className="text-sm text-gray-500 mt-1">
          はにぽんありがとうPayの加盟店に無料登録できます
        </p>
      </div>

      {referrerId && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-4 text-sm text-orange-700">
          紹介者コード: {referrerId.slice(0, 8)}...
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">
            店舗名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            placeholder="例: 本庄八百屋"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">
            電話番号 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            placeholder="例: 0495-XX-XXXX"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">住所</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
            placeholder="例: 埼玉県本庄市○○町1-2-3"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">業種</label>
          <select
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="">選択してください</option>
            <option value="飲食">飲食</option>
            <option value="小売">小売</option>
            <option value="サービス">サービス</option>
            <option value="美容">美容</option>
            <option value="医療">医療</option>
            <option value="直売所">直売所・農家</option>
            <option value="その他">その他</option>
          </select>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle size={16} />
            {errorMsg}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="animate-spin mx-auto" size={20} />
          ) : (
            "無料で加盟店登録する"
          )}
        </button>

        <p className="text-xs text-gray-400 text-center">
          登録は無料です。手数料もかかりません。
        </p>
      </div>
    </div>
  );
}

export default function RegisterShopPage() {
  return (
    <AuthProvider>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-screen">
            <Loader2 className="animate-spin text-orange-500" size={32} />
          </div>
        }
      >
        <RegisterContent />
      </Suspense>
    </AuthProvider>
  );
}
