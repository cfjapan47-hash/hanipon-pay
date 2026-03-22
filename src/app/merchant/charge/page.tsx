"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { getMerchantByOwner, processCashCharge, getUser } from "@/lib/firestore";
import { formatPoints } from "@/lib/utils";
import type { Merchant, User } from "@/types";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Banknote,
  Camera,
  Keyboard,
} from "lucide-react";
import Link from "next/link";

type ChargeStep = "scan" | "amount" | "confirm" | "done" | "error";

const FEE_RATE = 0.02;
const QUICK_AMOUNTS = [500, 1000, 3000, 5000, 10000];

function ChargeContent() {
  const { liffUser, loading } = useAuth();
  const [step, setStep] = useState<ChargeStep>("scan");
  const [merchant, setMerchant] = useState<{
    id: string;
    data: Merchant;
  } | null>(null);
  const [citizenId, setCitizenId] = useState("");
  const [citizenName, setCitizenName] = useState("");
  const [amount, setAmount] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [processing, setProcessing] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [qrInput, setQrInput] = useState("");
  const [scanMode, setScanMode] = useState<"camera" | "manual">("camera");
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<unknown>(null);

  useEffect(() => {
    if (!liffUser) return;
    getMerchantByOwner(liffUser.userId)
      .then((m) => setMerchant(m))
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [liffUser]);

  // カメラスキャン開始・停止
  const startScanner = useCallback(async () => {
    if (!scannerRef.current || scanning) return;
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
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
  }, [scanning]);

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

  const fee = Math.floor(Number(amount) * FEE_RATE);
  const merchantDeduction = Number(amount) - fee;

  const handleCharge = async () => {
    if (!merchant || !citizenId) return;
    const chargeAmount = Number(amount);
    if (chargeAmount < 500) {
      setErrorMsg("最低チャージ額は500ptです");
      return;
    }

    setProcessing(true);
    setErrorMsg("");
    try {
      await Promise.race([
        processCashCharge(
          merchant.id,
          merchant.data.name,
          citizenId,
          chargeAmount,
          FEE_RATE
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("処理がタイムアウトしました")), 15000)
        ),
      ]);
      setStep("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "チャージに失敗しました");
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
        <Link href="/merchant" className="text-blue-500 mt-3 inline-block">
          戻る
        </Link>
      </div>
    );
  }

  const salesBalance = merchant.data.salesBalance || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <Link href="/merchant" className="text-gray-600">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-lg font-bold">現金チャージ</h1>
      </div>

      <div className="p-4 max-w-md mx-auto">
        {/* 売上残高表示 */}
        <div className="bg-blue-50 rounded-xl p-4 mb-4 text-center">
          <p className="text-sm text-blue-600">売上残高</p>
          <p className="text-2xl font-bold text-blue-700">
            {formatPoints(salesBalance)}
          </p>
        </div>

        {/* ステップ: QRスキャン */}
        {step === "scan" && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold">市民のQRをスキャン</h2>
              <p className="text-sm text-gray-500 mt-1">
                チャージするお客様のQRコードを読み取ります
              </p>
            </div>

            {/* モード切替 */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { stopScanner(); setScanMode("camera"); }}
                className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-sm font-bold ${
                  scanMode === "camera"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <Camera size={16} />
                カメラ
              </button>
              <button
                onClick={() => { stopScanner(); setScanMode("manual"); }}
                className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-sm font-bold ${
                  scanMode === "manual"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <Keyboard size={16} />
                手入力
              </button>
            </div>

            {scanMode === "camera" ? (
              <div className="space-y-3">
                <div
                  id="qr-reader"
                  ref={scannerRef}
                  className="w-full rounded-lg overflow-hidden bg-black min-h-[250px]"
                />
                {!scanning && (
                  <button
                    onClick={startScanner}
                    className="w-full bg-blue-500 text-white rounded-lg py-3 font-bold"
                  >
                    カメラを起動
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="ユーザーIDを入力"
                  className="w-full border rounded-lg px-4 py-3 text-center"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                />
                <button
                  onClick={handleManualInput}
                  className="w-full bg-blue-500 text-white rounded-lg py-3 font-bold hover:bg-blue-600"
                >
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
              <p className="text-sm text-gray-500">チャージ先</p>
              <p className="text-lg font-bold">{citizenName} さん</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                チャージ金額
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  min="500"
                  step="100"
                  className="w-full border rounded-lg px-4 py-3 text-xl text-center font-bold"
                  placeholder="金額を入力"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                  円
                </span>
              </div>
            </div>

            {/* クイック金額ボタン */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAmount(String(a))}
                  className={`rounded-lg py-2 text-sm font-bold border ${
                    amount === String(a)
                      ? "bg-blue-500 text-white border-blue-500"
                      : "bg-gray-50 text-gray-700 border-gray-200"
                  }`}
                >
                  {a.toLocaleString()}円
                </button>
              ))}
            </div>

            {Number(amount) >= 500 && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">お客様に付与</span>
                  <span className="font-bold text-green-600">
                    +{Number(amount).toLocaleString()} pt
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">売上残高から差引</span>
                  <span className="font-bold text-red-500">
                    -{merchantDeduction.toLocaleString()} pt
                  </span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="text-gray-600">手数料収益(2%)</span>
                  <span className="font-bold text-blue-600">
                    +{fee.toLocaleString()} pt
                  </span>
                </div>
              </div>
            )}

            {merchantDeduction > salesBalance && Number(amount) >= 500 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                売上残高が不足しています
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep("scan");
                  setAmount("");
                }}
                className="flex-1 border rounded-lg py-3 text-gray-600 font-bold"
              >
                戻る
              </button>
              <button
                onClick={() => setStep("confirm")}
                disabled={
                  Number(amount) < 500 || merchantDeduction > salesBalance
                }
                className="flex-1 bg-blue-500 text-white rounded-lg py-3 font-bold hover:bg-blue-600 disabled:bg-gray-300"
              >
                確認
              </button>
            </div>
          </div>
        )}

        {/* ステップ: 確認 */}
        {step === "confirm" && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-center mb-6">
              <Banknote className="w-16 h-16 text-green-500 mx-auto mb-3" />
              <h2 className="text-lg font-bold">チャージ内容の確認</h2>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">チャージ先</span>
                <span className="font-bold">{citizenName} さん</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">受取現金</span>
                <span className="font-bold text-xl">
                  {Number(amount).toLocaleString()} 円
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">付与ポイント</span>
                <span className="font-bold text-green-600">
                  +{Number(amount).toLocaleString()} pt
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">売上残高から差引</span>
                <span className="font-bold text-red-500">
                  -{merchantDeduction.toLocaleString()} pt
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">手数料収益</span>
                <span className="font-bold text-blue-600">
                  +{fee.toLocaleString()} pt
                </span>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-sm text-yellow-700">
              お客様から現金 {Number(amount).toLocaleString()}円 を受け取ってから
              実行してください
            </div>

            {errorMsg && (
              <p className="text-red-500 text-sm mb-3">{errorMsg}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep("amount")}
                disabled={processing}
                className="flex-1 border rounded-lg py-3 text-gray-600 font-bold"
              >
                戻る
              </button>
              <button
                onClick={handleCharge}
                disabled={processing}
                className="flex-1 bg-green-500 text-white rounded-lg py-3 font-bold hover:bg-green-600 disabled:bg-gray-300"
              >
                {processing ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  "チャージ実行"
                )}
              </button>
            </div>
          </div>
        )}

        {/* ステップ: 完了 */}
        {step === "done" && (
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">チャージ完了！</h2>
            <p className="text-gray-600 mb-2">
              {citizenName} さんに{" "}
              <span className="font-bold text-green-600">
                {Number(amount).toLocaleString()} pt
              </span>{" "}
              をチャージしました
            </p>
            <p className="text-sm text-gray-500 mb-6">
              手数料収益: +{fee.toLocaleString()} pt
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep("scan");
                  setAmount("");
                  setCitizenId("");
                  setCitizenName("");
                  setQrInput("");
                }}
                className="flex-1 border rounded-lg py-3 font-bold text-blue-500"
              >
                続けてチャージ
              </button>
              <Link
                href="/merchant"
                className="flex-1 bg-blue-500 text-white rounded-lg py-3 font-bold text-center"
              >
                ホームに戻る
              </Link>
            </div>
          </div>
        )}

        {/* ステップ: エラー */}
        {step === "error" && (
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">エラーが発生しました</h2>
            <p className="text-red-500 mb-6">{errorMsg}</p>
            <button
              onClick={() => {
                setStep("scan");
                setErrorMsg("");
              }}
              className="bg-blue-500 text-white rounded-lg px-6 py-3 font-bold"
            >
              やり直す
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChargePage() {
  return (
    <AuthProvider>
      <ChargeContent />
    </AuthProvider>
  );
}
