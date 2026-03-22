"use client";

import { useState, useCallback } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import {
  getMerchantByQrCode,
  processPayment,
  getActiveCouponsByMerchant,
  useCoupon,
} from "@/lib/firestore";
import { formatPoints } from "@/lib/utils";
import type { Merchant, Coupon } from "@/types";
import {
  Loader2,
  Camera,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Ticket,
} from "lucide-react";

type PayStep = "scan" | "amount" | "confirm" | "done" | "error";

function PayContent() {
  const { liffUser, user, loading } = useAuth();
  const [step, setStep] = useState<PayStep>("scan");
  const [merchant, setMerchant] = useState<{
    id: string;
    data: Merchant;
  } | null>(null);
  const [amount, setAmount] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [processing, setProcessing] = useState(false);
  const [qrInput, setQrInput] = useState("");
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [discount, setDiscount] = useState(0);

  const handleQrResult = useCallback(async (qrCodeId: string) => {
    try {
      const result = await getMerchantByQrCode(qrCodeId);
      if (!result) {
        setErrorMsg("この加盟店は見つかりませんでした");
        setStep("error");
        return;
      }
      setMerchant(result);
      // 加盟店のアクティブなクーポンを取得
      try {
        const coupons = await getActiveCouponsByMerchant(result.id);
        setAvailableCoupons(coupons);
      } catch {
        setAvailableCoupons([]);
      }
      setStep("amount");
    } catch {
      setErrorMsg("QRコードの読み取りに失敗しました");
      setStep("error");
    }
  }, []);

  const handleManualInput = () => {
    if (qrInput.trim()) {
      handleQrResult(qrInput.trim());
    }
  };

  const calcDiscount = (coupon: Coupon, payAmount: number): number => {
    if (coupon.minAmount && payAmount < coupon.minAmount) return 0;
    if (coupon.type === "percent") return Math.floor(payAmount * (coupon.value / 100));
    if (coupon.type === "fixed") return Math.min(coupon.value, payAmount);
    if (coupon.type === "cashback") return Math.floor(payAmount * (coupon.value / 100));
    return 0;
  };

  const handleSelectCoupon = (coupon: Coupon) => {
    if (selectedCoupon?.id === coupon.id) {
      setSelectedCoupon(null);
      setDiscount(0);
    } else {
      const numAmount = parseInt(amount, 10) || 0;
      setSelectedCoupon(coupon);
      setDiscount(calcDiscount(coupon, numAmount));
    }
  };

  const handlePay = async () => {
    if (!liffUser || !merchant || !amount) return;
    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg("正しい金額を入力してください");
      return;
    }

    const actualAmount = Math.max(numAmount - discount, 0);

    setProcessing(true);
    try {
      // クーポンが選択されている場合、先にクーポンを使用
      if (selectedCoupon?.id) {
        await useCoupon(selectedCoupon.id, liffUser.userId, numAmount);
      }
      await processPayment(
        liffUser.userId,
        merchant.id,
        actualAmount,
        selectedCoupon ? `クーポン適用: ${selectedCoupon.title} (-${discount}pt)` : ""
      );
      setStep("done");
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "支払いに失敗しました"
      );
      setStep("error");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setStep("scan");
    setMerchant(null);
    setAmount("");
    setErrorMsg("");
    setQrInput("");
    setAvailableCoupons([]);
    setSelectedCoupon(null);
    setDiscount(0);
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
      <h1 className="text-xl font-bold text-gray-800 mb-4">QR支払い</h1>

      {step === "scan" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <Camera className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 text-sm mb-4">
              加盟店のQRコードを読み取るか、
              <br />
              店舗コードを入力してください
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="店舗コードを入力"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <button
                onClick={handleManualInput}
                className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
              >
                検索
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "amount" && merchant && (
        <div className="space-y-4">
          <button
            onClick={reset}
            className="flex items-center gap-1 text-gray-500 text-sm"
          >
            <ArrowLeft size={16} /> 戻る
          </button>
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <p className="text-sm text-gray-500">支払先</p>
            <p className="text-lg font-bold text-gray-800">
              {merchant.data.name}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {merchant.data.address}
            </p>

            <div className="mt-6">
              <label className="text-sm text-gray-600">支払い金額</label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <span className="text-gray-500 font-medium">pt</span>
              </div>
              {user && (
                <p className="text-xs text-gray-400 mt-2">
                  残高: {formatPoints(user.balance)} pt
                </p>
              )}
            </div>

            {/* クーポン選択 */}
            {availableCoupons.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 flex items-center gap-1 mb-2">
                  <Ticket size={14} className="text-orange-500" />
                  使えるクーポン
                </p>
                <div className="space-y-2">
                  {availableCoupons.map((coupon) => {
                    const isSelected = selectedCoupon?.id === coupon.id;
                    const numAmt = parseInt(amount, 10) || 0;
                    const couponDiscount = calcDiscount(coupon, numAmt);
                    const meetsMin = !coupon.minAmount || numAmt >= coupon.minAmount;
                    return (
                      <button
                        key={coupon.id}
                        onClick={() => meetsMin && handleSelectCoupon(coupon)}
                        disabled={!meetsMin}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border-2 transition-colors ${
                          isSelected
                            ? "border-orange-500 bg-orange-50"
                            : meetsMin
                            ? "border-gray-200 hover:border-orange-300"
                            : "border-gray-100 opacity-50 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium text-gray-800">
                              {coupon.title}
                            </span>
                            {coupon.minAmount && !meetsMin && (
                              <p className="text-xs text-gray-400">
                                {formatPoints(coupon.minAmount)}pt以上で利用可
                              </p>
                            )}
                          </div>
                          <span className={`text-sm font-bold ${isSelected ? "text-orange-500" : "text-gray-600"}`}>
                            {coupon.type === "percent" && `${coupon.value}%OFF`}
                            {coupon.type === "fixed" && `${formatPoints(coupon.value)}pt引き`}
                            {coupon.type === "cashback" && `${coupon.value}%還元`}
                            {meetsMin && numAmt > 0 && ` (-${couponDiscount}pt)`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 割引後の金額表示 */}
            {selectedCoupon && discount > 0 && parseInt(amount, 10) > 0 && (
              <div className="mt-3 bg-orange-50 rounded-xl p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">元の金額</span>
                  <span>{formatPoints(parseInt(amount, 10))} pt</span>
                </div>
                <div className="flex justify-between text-sm text-orange-600">
                  <span>クーポン割引</span>
                  <span>-{formatPoints(discount)} pt</span>
                </div>
                <div className="flex justify-between font-bold mt-1 pt-1 border-t border-orange-200">
                  <span>お支払い額</span>
                  <span className="text-orange-600">
                    {formatPoints(Math.max(parseInt(amount, 10) - discount, 0))} pt
                  </span>
                </div>
              </div>
            )}

            {errorMsg && (
              <p className="text-red-500 text-sm mt-2">{errorMsg}</p>
            )}

            <button
              onClick={() => {
                const num = parseInt(amount, 10);
                if (isNaN(num) || num <= 0) {
                  setErrorMsg("正しい金額を入力してください");
                  return;
                }
                const actualPay = Math.max(num - discount, 0);
                if (user && actualPay > user.balance) {
                  setErrorMsg("残高が不足しています");
                  return;
                }
                setErrorMsg("");
                setStep("confirm");
              }}
              className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold mt-4 hover:bg-orange-600 transition-colors"
            >
              確認へ進む
            </button>
          </div>
        </div>
      )}

      {step === "confirm" && merchant && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <p className="text-sm text-gray-500 mb-2">以下の内容で支払います</p>
            <p className="text-lg font-bold text-gray-800">
              {merchant.data.name}
            </p>

            {selectedCoupon && discount > 0 ? (
              <div className="mt-4">
                <p className="text-lg text-gray-400 line-through">
                  {formatPoints(parseInt(amount, 10))} pt
                </p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <Ticket size={16} className="text-orange-500" />
                  <span className="text-sm text-orange-500">{selectedCoupon.title}</span>
                </div>
                <p className="text-4xl font-bold text-orange-600 mt-2">
                  {formatPoints(Math.max(parseInt(amount, 10) - discount, 0))}
                  <span className="text-lg ml-1">pt</span>
                </p>
              </div>
            ) : (
              <p className="text-4xl font-bold text-orange-600 mt-4">
                {formatPoints(parseInt(amount, 10))}
                <span className="text-lg ml-1">pt</span>
              </p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep("amount")}
                className="flex-1 border border-gray-300 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                戻る
              </button>
              <button
                onClick={handlePay}
                disabled={processing}
                className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {processing ? (
                  <Loader2 className="animate-spin mx-auto" size={20} />
                ) : (
                  "支払う"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <CheckCircle2 className="mx-auto text-green-500 mb-4" size={56} />
          <p className="text-xl font-bold text-gray-800">支払い完了</p>
          <p className="text-gray-500 mt-2">
            {merchant?.data.name} に {formatPoints(parseInt(amount, 10))} pt
            を支払いました
          </p>
          <button
            onClick={reset}
            className="mt-6 bg-orange-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors"
          >
            トップに戻る
          </button>
        </div>
      )}

      {step === "error" && (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={56} />
          <p className="text-xl font-bold text-gray-800">エラー</p>
          <p className="text-red-500 mt-2">{errorMsg}</p>
          <button
            onClick={reset}
            className="mt-6 bg-gray-200 text-gray-700 px-8 py-3 rounded-xl font-bold hover:bg-gray-300 transition-colors"
          >
            やり直す
          </button>
        </div>
      )}

      <Navigation />
    </div>
  );
}

export default function PayPage() {
  return (
    <AuthProvider>
      <PayContent />
    </AuthProvider>
  );
}
