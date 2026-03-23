"use client";

import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { getMerchantByOwner } from "@/lib/firestore";
import type { Merchant } from "@/types";
import {
  Loader2,
  Link as LinkIcon,
  Copy,
  Check,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://hanipon-pay.vercel.app";

function PaymentLinkContent() {
  const { liffUser, loading: authLoading } = useAuth();
  const [merchant, setMerchant] = useState<{
    id: string;
    data: Merchant;
  } | null>(null);
  const [fetching, setFetching] = useState(true);

  const [amount, setAmount] = useState("");
  const [orderId, setOrderId] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [memo, setMemo] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!liffUser) return;
    getMerchantByOwner(liffUser.userId)
      .then((m) => setMerchant(m))
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [liffUser]);

  const generateLink = () => {
    if (!merchant || !amount) return;

    const numAmount = parseInt(amount, 10);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const params = new URLSearchParams();
    params.set("shopId", merchant.id);
    params.set("amount", String(numAmount));
    if (orderId.trim()) params.set("orderId", orderId.trim());
    if (redirectUrl.trim()) params.set("redirect", redirectUrl.trim());
    if (memo.trim()) params.set("memo", memo.trim());

    setGeneratedUrl(`${BASE_URL}/pay/online?${params.toString()}`);
    setCopied(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // フォールバック: テキスト選択
      const textArea = document.createElement("textarea");
      textArea.value = generatedUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (authLoading || fetching) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6">
        <p className="text-gray-600 text-center">
          加盟店として登録されていません
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <Link
        href="/merchant"
        className="flex items-center gap-1 text-gray-500 text-sm mb-4"
      >
        <ArrowLeft size={16} /> 加盟店管理に戻る
      </Link>

      <h1 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
        <LinkIcon size={22} className="text-blue-600" />
        決済リンク生成
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        ウェブサイトやSNSに貼れる決済リンクを作成します
      </p>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">
            金額（必須）
          </label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <span className="text-gray-500 font-medium">pt</span>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">
            注文ID（任意）
          </label>
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="例: ORDER-001"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">
            メモ（任意）
          </label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="例: ランチセット"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">
            リダイレクトURL（任意）
          </label>
          <input
            type="url"
            value={redirectUrl}
            onChange={(e) => setRedirectUrl(e.target.value)}
            placeholder="https://shop.example.com/thanks"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <p className="text-xs text-gray-400 mt-1">
            決済完了後に顧客をリダイレクトするURL
          </p>
        </div>

        <button
          onClick={generateLink}
          disabled={!amount || parseInt(amount, 10) <= 0}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          リンクを生成
        </button>
      </div>

      {generatedUrl && (
        <div className="mt-6 space-y-4">
          {/* 生成されたURL */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-700 mb-2">
              決済リンク
            </p>
            <div className="bg-gray-50 rounded-lg p-3 break-all text-sm text-blue-600 font-mono">
              {generatedUrl}
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleCopy}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                  copied
                    ? "bg-green-500 text-white"
                    : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                }`}
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    コピーしました
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    URLをコピー
                  </>
                )}
              </button>
              <a
                href={generatedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 bg-gray-100 text-gray-600 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
              >
                <ExternalLink size={16} />
                開く
              </a>
            </div>
          </div>

          {/* QRコード */}
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <p className="text-sm font-medium text-gray-700 mb-4">
              QRコード
            </p>
            <div className="inline-block bg-white p-4 rounded-xl border-2 border-gray-100">
              <QRCodeSVG
                value={generatedUrl}
                size={200}
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="text-xs text-gray-400 mt-3">
              このQRコードを印刷してチラシやポスターに貼れます
            </p>
          </div>

          {/* 使い方ヒント */}
          <div className="bg-blue-50 rounded-2xl p-4">
            <p className="text-sm font-bold text-blue-800 mb-2">使い方</p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>
                - ウェブサイトの「支払う」ボタンのリンク先にURLを設定
              </li>
              <li>
                - SNSの投稿やDMでURLを共有
              </li>
              <li>
                - QRコードをチラシやポスターに印刷
              </li>
              <li>
                - LINEメッセージでURLを送信
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaymentLinkPage() {
  return (
    <AuthProvider>
      <PaymentLinkContent />
    </AuthProvider>
  );
}
