"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  getMerchantByOwner,
  createWithdrawalRequest,
  getMerchantWithdrawals,
  getKycRecord,
} from "@/lib/firestore";
import { formatPoints, formatDate } from "@/lib/utils";
import type { Merchant, WithdrawalRequest, KycRecord } from "@/types";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";

function WithdrawContent() {
  const { liffUser, loading } = useAuth();
  const [merchant, setMerchant] = useState<{
    id: string;
    data: Merchant;
  } | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [kycRecord, setKycRecord] = useState<KycRecord | null>(null);
  const [fetching, setFetching] = useState(true);
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!liffUser) return;
    getMerchantByOwner(liffUser.userId)
      .then(async (m) => {
        setMerchant(m);
        if (m) {
          setBankName(m.data.bankName || "");
          setBankAccount(m.data.bankAccount || "");
          const [wds, kyc] = await Promise.all([
            getMerchantWithdrawals(m.id),
            getKycRecord(m.id),
          ]);
          setWithdrawals(wds);
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

  const salesBalance = merchant.data.salesBalance || 0;

  const handleSubmit = async () => {
    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg("正しい金額を入力してください");
      return;
    }
    if (numAmount > salesBalance) {
      setErrorMsg("売上残高を超える金額は申請できません");
      return;
    }
    if (!bankName.trim() || !bankAccount.trim()) {
      setErrorMsg("銀行名と口座番号を入力してください");
      return;
    }

    setProcessing(true);
    setErrorMsg("");
    try {
      await createWithdrawalRequest(
        merchant.id,
        merchant.data.name,
        numAmount,
        bankAccount.trim(),
        bankName.trim()
      );
      setSuccess(true);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "申請に失敗しました"
      );
    } finally {
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 pt-8">
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <CheckCircle2 className="mx-auto text-green-500 mb-4" size={56} />
          <p className="text-xl font-bold text-gray-800">換金申請完了</p>
          <p className="text-gray-500 mt-2">
            {formatPoints(parseInt(amount, 10))} pt の換金申請を受け付けました
          </p>
          <p className="text-sm text-gray-400 mt-2">
            処理完了後にご登録口座へ振り込まれます
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

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-8">
      <Link
        href="/merchant"
        className="flex items-center gap-1 text-gray-500 text-sm mb-4"
      >
        <ArrowLeft size={16} /> 加盟店ダッシュボードに戻る
      </Link>
      <h1 className="text-xl font-bold text-gray-800 mb-4">換金申請</h1>

      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white shadow-lg mb-4">
        <p className="text-xs opacity-75">換金可能な売上残高</p>
        <p className="text-3xl font-bold mt-1">
          {formatPoints(salesBalance)}
          <span className="text-lg ml-1">pt</span>
        </p>
      </div>

      {kycRecord?.status !== "verified" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 text-yellow-700 font-medium mb-1">
            <ShieldAlert size={18} />
            本人確認が必要です
          </div>
          <p className="text-sm text-yellow-600">
            換金申請には本人確認（eKYC）が必要です。先に本人確認を完了してください。
          </p>
          <Link
            href="/merchant/kyc"
            className="inline-block mt-3 bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors"
          >
            本人確認ページへ
          </Link>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4 mb-6">
        <div>
          <label className="text-sm font-medium text-gray-700">
            換金金額 <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="5000"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <span className="text-gray-500">pt</span>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">
            銀行名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="例: ゆうちょ銀行"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">
            口座番号 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={bankAccount}
            onChange={(e) => setBankAccount(e.target.value)}
            placeholder="例: 普通 1234567"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
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
          disabled={processing || kycRecord?.status !== "verified"}
          className="w-full bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 transition-colors disabled:opacity-50"
        >
          {processing ? (
            <Loader2 className="animate-spin mx-auto" size={20} />
          ) : kycRecord?.status !== "verified" ? (
            "本人確認が必要です"
          ) : (
            "換金を申請する"
          )}
        </button>
        <p className="text-xs text-gray-400 text-center">
          振込手数料は換金額から差し引かれます
        </p>
      </div>

      {withdrawals.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-gray-600 mb-3">
            換金申請履歴
          </h2>
          <div className="space-y-2">
            {withdrawals.map((wd) => (
              <div
                key={wd.id}
                className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      wd.status === "completed"
                        ? "bg-green-100 text-green-600"
                        : wd.status === "rejected"
                        ? "bg-red-100 text-red-500"
                        : "bg-yellow-100 text-yellow-600"
                    }`}
                  >
                    {wd.status === "completed" ? (
                      <CheckCircle size={16} />
                    ) : wd.status === "rejected" ? (
                      <XCircle size={16} />
                    ) : (
                      <Clock size={16} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {formatPoints(wd.amount)} pt
                    </p>
                    <p className="text-xs text-gray-400">
                      {wd.createdAt ? formatDate(wd.createdAt) : ""}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    wd.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : wd.status === "rejected"
                      ? "bg-red-100 text-red-600"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {wd.status === "completed"
                    ? "振込済"
                    : wd.status === "rejected"
                    ? "却下"
                    : "処理中"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function WithdrawPage() {
  return (
    <AuthProvider>
      <WithdrawContent />
    </AuthProvider>
  );
}
