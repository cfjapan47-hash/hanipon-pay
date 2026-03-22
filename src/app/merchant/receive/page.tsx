"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  getMerchantByOwner,
  processPayment,
  getUser,
  getActiveCouponsByMerchant,
  useCoupon,
} from "@/lib/firestore";
import { formatPoints } from "@/lib/utils";
import type { Merchant, User, Coupon } from "@/types";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Camera,
  Keyboard,
  ShoppingBag,
  Ticket,
} from "lucide-react";
import Link from "next/link";

type ReceiveStep = "scan" | "amount" | "confirm" | "done" | "error";

const QUICK_AMOUNTS = [300, 500, 1000, 2000, 3000, 5000];

function ReceiveContent() {
  const { liffUser, loading } = useAuth();
  const [step, setStep] = useState<ReceiveStep>("scan");
  const [merchant, setMerchant] = useState<{
    id: string;
    data: Merchant;
  } | null>(null);
  const [citizenId, setCitizenId] = useState("");
  const [citizenName, setCitizenName] = useState("");
  const [citizenBalance, setCitizenBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [processing, setProcessing] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [qrInput, setQrInput] = useState("");
  const [scanMode, setScanMode] = useState<"camera" | "manual">("camera");
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<unknown>(null);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    if (!liffUser) return;
    getMerchantByOwner(liffUser.userId)
      .then(async (m) => {
        setMerchant(m);
        if (m) {
          try {
            const coupons = await getActiveCouponsByMerchant(m.id);
            setAvailableCoupons(coupons);
          } catch {
            setAvailableCoupons([]);
          }
        }
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [liffUser]);

  const handleQrResult = useCallback(async (userId: string) => {
    try {
      const user = await getUser(userId);
      if (!user) {
        setErrorMsg("ユーザーが見つかりません");
        setStep("error");
        return;
      }
      setCitizenId(userId);
      setCitizenName((user as User).displayName || "ユーザー");
      setCitizenBalance((user as User).balance || 0);
      setStep("amount");
    } catch {
      setErrorMsg("QRコードの読み取りに失敗しました");
      setStep("error");
    }
  }, []);

  // カメラスキャン
  const startScanner = useCallback(async () => {
    if (!scannerRef.current || scanning) return;
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("receive-qr-reader");
      html5QrCodeRef.current = scanner;
      setScanning(true);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          scanner.stop().catch(() => {});
          setScanning(false);
          handleQrResult(decodedText);
        },
        () => {}
      );
    } catch (err) {
      console.error("Scanner error:", err);
      setScanning(false);
      setScanMode("manual");
    }
  }, [scanning, handleQrResult]);

  const stopScanner = useCallback(async () => {
    const scanner = html5QrCodeRef.current as { stop: () => Promise<void> } | null;
    if (scanner) {
      try { await scanner.stop(); } catch {}
      html5QrCodeRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    if (step === "scan" && scanMode === "camera") {
      const timer = setTimeout(() => startScanner(), 300);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    }
  }, [step, scanMode]);

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

  // 最もお得なクーポンを自動選択
  const autoBestCoupon = useCallback((numAmount: number) => {
    if (availableCoupons.length === 0 || numAmount <= 0) {
      setSelectedCoupon(null);
      setDiscount(0);
      return;
    }
    let bestCoupon: Coupon | null = null;
    let bestDiscount = 0;
    for (const c of availableCoupons) {
      const d = calcDiscount(c, numAmount);
      if (d > bestDiscount) {
        bestDiscount = d;
        bestCoupon = c;
      }
    }
    setSelectedCoupon(bestCoupon);
    setDiscount(bestDiscount);
  }, [availableCoupons]);

  const handleRemoveCoupon = () => {
    setSelectedCoupon(null);
    setDiscount(0);
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

  const actualAmount = Math.max((parseInt(amount, 10) || 0) - discount, 0);

  const handleReceive = async () => {
    if (!merchant || !citizenId) return;
    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg("正しい金額を入力してください");
      return;
    }

    setProcessing(true);
    setErrorMsg("");
    try {
      await Promise.race([
        (async () => {
          if (selectedCoupon?.id) {
            await useCoupon(selectedCoupon.id, citizenId, numAmount);
          }
          await processPayment(
            citizenId,
            merchant.id,
            actualAmount,
            selectedCoupon ? `クーポン適用: ${selectedCoupon.title} (-${discount}pt)` : ""
          );
        })(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("処理がタイムアウトしました")), 15000)
        ),
      ]);
      setStep("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "支払い処理に失敗しました");
      setStep("error");
    } finally {
      setProcessing(false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">加盟店として登録されていません</p>
        <Link href="/merchant" className="text-blue-500 mt-3 inline-block">戻る</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <Link href="/merchant" className="text-gray-600">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-lg font-bold">支払いを受ける</h1>
      </div>

      <div className="p-4 max-w-md mx-auto">
        {/* ステップ: QRスキャン */}
        {step === "scan" && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold">お客様のQRをスキャン</h2>
              <p className="text-sm text-gray-500 mt-1">
                お客様のマイQRコードを読み取ります
              </p>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { stopScanner(); setScanMode("camera"); }}
                className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-sm font-bold ${
                  scanMode === "camera" ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                <Camera size={16} /> カメラ
              </button>
              <button
                onClick={() => { stopScanner(); setScanMode("manual"); }}
                className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-sm font-bold ${
                  scanMode === "manual" ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                <Keyboard size={16} /> 手入力
              </button>
            </div>

            {scanMode === "camera" ? (
              <div className="space-y-3">
                <div id="receive-qr-reader" ref={scannerRef}
                  className="w-full rounded-lg overflow-hidden bg-black min-h-[250px]" />
                {!scanning && (
                  <button onClick={startScanner}
                    className="w-full bg-green-500 text-white rounded-lg py-3 font-bold">
                    カメラを起動
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <input type="text" placeholder="ユーザーIDを入力"
                  className="w-full border rounded-lg px-4 py-3 text-center"
                  value={qrInput} onChange={(e) => setQrInput(e.target.value)} />
                <button onClick={handleManualInput}
                  className="w-full bg-green-500 text-white rounded-lg py-3 font-bold">
                  確認
                </button>
              </div>
            )}
          </div>
        )}

        {/* ステップ: 金額入力 */}
        {step === "amount" && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-center mb-4">
              <p className="text-sm text-gray-500">お客様</p>
              <p className="text-lg font-bold">{citizenName} さん</p>
              <p className="text-xs text-gray-400">残高: {formatPoints(citizenBalance)} pt</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">お会計金額</label>
              <div className="relative">
                <input type="number" inputMode="numeric" min="1"
                  className="w-full border rounded-lg px-4 py-3 text-xl text-center font-bold"
                  placeholder="金額を入力" value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    autoBestCoupon(parseInt(e.target.value, 10) || 0);
                  }} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">pt</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {QUICK_AMOUNTS.map((a) => (
                <button key={a} onClick={() => {
                  setAmount(String(a));
                  autoBestCoupon(a);
                }}
                  className={`rounded-lg py-2 text-sm font-bold border ${
                    amount === String(a) ? "bg-green-500 text-white border-green-500" : "bg-gray-50 text-gray-700 border-gray-200"
                  }`}>
                  {a.toLocaleString()}pt
                </button>
              ))}
            </div>

            {/* クーポン自動適用バナー */}
            {selectedCoupon && discount > 0 && (
              <div className="bg-green-50 border-2 border-green-400 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Ticket size={18} className="text-green-600" />
                    <span className="font-bold text-green-700">クーポン適用中 ✅</span>
                  </div>
                  <button onClick={handleRemoveCoupon}
                    className="text-xs text-gray-400 border border-gray-300 rounded px-2 py-1">
                    解除
                  </button>
                </div>
                <p className="text-sm font-bold text-green-700">{selectedCoupon.title}</p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">お会計</span>
                    <span>{parseInt(amount, 10).toLocaleString()} pt</span>
                  </div>
                  <div className="flex justify-between text-green-600 font-bold">
                    <span>割引</span>
                    <span>-{discount.toLocaleString()} pt</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t border-green-300 pt-1">
                    <span>お支払い額</span>
                    <span className="text-green-700">{actualAmount.toLocaleString()} pt</span>
                  </div>
                </div>
              </div>
            )}

            {/* クーポンなし or 金額未入力 */}
            {!selectedCoupon && availableCoupons.length > 0 && parseInt(amount, 10) > 0 && (
              <div className="bg-gray-50 rounded-xl p-3 mb-4 text-center">
                <p className="text-sm text-gray-400">適用可能なクーポンはありません</p>
              </div>
            )}

            {/* 他のクーポンに変更 */}
            {availableCoupons.length > 1 && parseInt(amount, 10) > 0 && (
              <details className="mb-4">
                <summary className="text-xs text-gray-400 cursor-pointer">他のクーポンに変更</summary>
                <div className="space-y-2 mt-2">
                  {availableCoupons.map((coupon) => {
                    const isSelected = selectedCoupon?.id === coupon.id;
                    const numAmt = parseInt(amount, 10) || 0;
                    const couponDiscount = calcDiscount(coupon, numAmt);
                    const meetsMin = !coupon.minAmount || numAmt >= coupon.minAmount;
                    if (isSelected || !meetsMin) return null;
                    return (
                      <button key={coupon.id} onClick={() => handleSelectCoupon(coupon)}
                        className="w-full text-left px-3 py-2 rounded-xl border border-gray-200 hover:border-green-300">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{coupon.title}</span>
                          <span className="text-sm text-gray-600">-{couponDiscount.toLocaleString()}pt</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </details>
            )}

            {actualAmount > citizenBalance && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                お客様の残高が不足しています
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setStep("scan"); setAmount(""); setSelectedCoupon(null); setDiscount(0); }}
                className="flex-1 border rounded-lg py-3 text-gray-600 font-bold">戻る</button>
              <button onClick={() => setStep("confirm")}
                disabled={!amount || parseInt(amount, 10) <= 0 || actualAmount > citizenBalance}
                className="flex-1 bg-green-500 text-white rounded-lg py-3 font-bold disabled:bg-gray-300">
                確認
              </button>
            </div>
          </div>
        )}

        {/* ステップ: 確認 */}
        {step === "confirm" && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-center mb-6">
              <ShoppingBag className="w-16 h-16 text-green-500 mx-auto mb-3" />
              <h2 className="text-lg font-bold">お支払い確認</h2>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">お客様</span>
                <span className="font-bold">{citizenName} さん</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">お会計金額</span>
                <span className="font-bold">{parseInt(amount, 10).toLocaleString()} pt</span>
              </div>
              {selectedCoupon && discount > 0 && (
                <div className="flex justify-between py-2 border-b text-green-600">
                  <span>クーポン割引</span>
                  <span>-{discount.toLocaleString()} pt</span>
                </div>
              )}
              <div className="flex justify-between py-2 text-xl">
                <span className="font-bold">お支払い額</span>
                <span className="font-bold text-green-600">{actualAmount.toLocaleString()} pt</span>
              </div>
            </div>
            {errorMsg && <p className="text-red-500 text-sm mb-3">{errorMsg}</p>}
            <div className="flex gap-3">
              <button onClick={() => setStep("amount")} disabled={processing}
                className="flex-1 border rounded-lg py-3 text-gray-600 font-bold">戻る</button>
              <button onClick={handleReceive} disabled={processing}
                className="flex-1 bg-green-500 text-white rounded-lg py-3 font-bold disabled:bg-gray-300">
                {processing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "お支払い"}
              </button>
            </div>
          </div>
        )}

        {/* ステップ: 完了 */}
        {step === "done" && (
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">お支払い完了！</h2>
            <p className="text-gray-600 mb-1">
              {citizenName} さんから
            </p>
            <p className="text-2xl font-bold text-green-600 mb-4">
              {actualAmount.toLocaleString()} pt
            </p>
            <div className="flex gap-3">
              <button onClick={() => {
                setStep("scan"); setAmount(""); setCitizenId(""); setCitizenName("");
                setQrInput(""); setSelectedCoupon(null); setDiscount(0);
              }} className="flex-1 border rounded-lg py-3 font-bold text-green-500">
                続けて受付
              </button>
              <Link href="/merchant"
                className="flex-1 bg-green-500 text-white rounded-lg py-3 font-bold text-center">
                ホームに戻る
              </Link>
            </div>
          </div>
        )}

        {/* ステップ: エラー */}
        {step === "error" && (
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">エラー</h2>
            <p className="text-red-500 mb-6">{errorMsg}</p>
            <button onClick={() => { setStep("scan"); setErrorMsg(""); }}
              className="bg-green-500 text-white rounded-lg px-6 py-3 font-bold">
              やり直す
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReceivePage() {
  return (
    <AuthProvider>
      <ReceiveContent />
    </AuthProvider>
  );
}
