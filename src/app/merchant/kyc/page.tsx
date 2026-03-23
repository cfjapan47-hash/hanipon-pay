"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { getMerchantByOwner, getKycRecord, submitKycRecord } from "@/lib/firestore";
import type { Merchant, KycRecord } from "@/types";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import Link from "next/link";

function KycContent() {
  const { liffUser, loading } = useAuth();
  const [merchant, setMerchant] = useState<{
    id: string;
    data: Merchant;
  } | null>(null);
  const [kycRecord, setKycRecord] = useState<KycRecord | null>(null);
  const [fetching, setFetching] = useState(true);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!liffUser) return;
    getMerchantByOwner(liffUser.userId)
      .then(async (m) => {
        setMerchant(m);
        if (m) {
          const kyc = await getKycRecord(m.id);
          setKycRecord(kyc);
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
        <p className="text-red-500 text-center">加盟店情報が見つかりません</p>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      setErrorMsg("氏名を入力してください");
      return;
    }
    if (!address.trim()) {
      setErrorMsg("住所を入力してください");
      return;
    }
    if (!dateOfBirth) {
      setErrorMsg("生年月日を入力してください");
      return;
    }
    if (!expiryDate) {
      setErrorMsg("有効期限を入力してください");
      return;
    }

    setProcessing(true);
    setErrorMsg("");
    try {
      await submitKycRecord(merchant.id, {
        fullName: fullName.trim(),
        address: address.trim(),
        dateOfBirth,
        expiryDate,
      });
      setSuccess(true);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "提出に失敗しました"
      );
    } finally {
      setProcessing(false);
    }
  };

  // After successful submission
  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 pt-8">
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <CheckCircle2 className="mx-auto text-green-500 mb-4" size={56} />
          <p className="text-xl font-bold text-gray-800">本人確認を提出しました</p>
          <p className="text-gray-500 mt-2">
            審査完了までしばらくお待ちください
          </p>
          <Link
            href="/merchant"
            className="inline-block mt-6 bg-blue-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-600 transition-colors"
          >
            加盟店ダッシュボードへ
          </Link>
        </div>
      </div>
    );
  }

  // Verified status
  if (kycRecord?.status === "verified") {
    return (
      <div className="max-w-md mx-auto px-4 pt-6 pb-8">
        <Link
          href="/merchant"
          className="flex items-center gap-1 text-gray-500 text-sm mb-4"
        >
          <ArrowLeft size={16} /> 加盟店ダッシュボードに戻る
        </Link>
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <ShieldCheck className="mx-auto text-green-500 mb-4" size={56} />
          <p className="text-xl font-bold text-gray-800">本人確認済み</p>
          <p className="text-gray-500 mt-2">本人確認が完了しています</p>
          <div className="mt-6 bg-gray-50 rounded-xl p-4 text-left space-y-2 text-sm">
            <p><span className="text-gray-500">氏名:</span> <span className="font-medium">{kycRecord.fullName}</span></p>
            <p><span className="text-gray-500">住所:</span> <span className="font-medium">{kycRecord.address}</span></p>
            <p><span className="text-gray-500">生年月日:</span> <span className="font-medium">{kycRecord.dateOfBirth}</span></p>
            <p><span className="text-gray-500">有効期限:</span> <span className="font-medium">{kycRecord.expiryDate}</span></p>
          </div>
        </div>
      </div>
    );
  }

  // Pending status
  if (kycRecord?.status === "pending") {
    return (
      <div className="max-w-md mx-auto px-4 pt-6 pb-8">
        <Link
          href="/merchant"
          className="flex items-center gap-1 text-gray-500 text-sm mb-4"
        >
          <ArrowLeft size={16} /> 加盟店ダッシュボードに戻る
        </Link>
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <Clock className="mx-auto text-yellow-500 mb-4" size={56} />
          <p className="text-xl font-bold text-gray-800">審査中です</p>
          <p className="text-gray-500 mt-2">
            本人確認書類を審査中です。しばらくお待ちください。
          </p>
        </div>
      </div>
    );
  }

  // Rejected status - allow re-submission
  const isRejected = kycRecord?.status === "rejected";

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-8">
      <Link
        href="/merchant"
        className="flex items-center gap-1 text-gray-500 text-sm mb-4"
      >
        <ArrowLeft size={16} /> 加盟店ダッシュボードに戻る
      </Link>
      <h1 className="text-xl font-bold text-gray-800 mb-4">本人確認 (eKYC)</h1>

      {isRejected && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 text-red-600 font-medium mb-1">
            <XCircle size={18} />
            本人確認が却下されました
          </div>
          <p className="text-sm text-red-500">
            理由: {kycRecord?.rejectionReason || "不明"}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            内容を修正して再提出してください。
          </p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
        <p className="text-sm text-blue-700">
          換金申請には本人確認が必要です。運転免許証の情報を入力してください。
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">
            氏名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="例: 山田 太郎"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">
            住所 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="例: 埼玉県本庄市駅前町1-2-3"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">
            生年月日 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">
            免許証の有効期限 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle size={16} />
            {errorMsg}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={processing}
          className="w-full bg-blue-500 text-white py-3 rounded-xl font-bold hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {processing ? (
            <Loader2 className="animate-spin mx-auto" size={20} />
          ) : isRejected ? (
            "再提出する"
          ) : (
            "本人確認を提出する"
          )}
        </button>
      </div>
    </div>
  );
}

export default function KycPage() {
  return (
    <AuthProvider>
      <KycContent />
    </AuthProvider>
  );
}
