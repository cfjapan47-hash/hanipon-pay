"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

function QRContent() {
  const searchParams = useSearchParams();
  const qrCodeId = searchParams.get("id") || "";

  return (
    <div className="max-w-md mx-auto px-4 pt-6">
      <Link
        href="/merchant"
        className="flex items-center gap-1 text-gray-500 text-sm mb-6"
      >
        <ArrowLeft size={16} /> 戻る
      </Link>

      <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
        <h1 className="text-lg font-bold text-gray-800 mb-6">
          店頭用QRコード
        </h1>
        <div className="inline-block p-4 bg-white border-2 border-gray-100 rounded-2xl">
          <QRCodeSVG
            value={qrCodeId}
            size={240}
            level="H"
            includeMargin
          />
        </div>
        <p className="text-xs text-gray-400 mt-4">
          店舗コード: {qrCodeId}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          お客様にこのQRコードを読み取ってもらってください
        </p>
      </div>
    </div>
  );
}

export default function MerchantQRPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <p className="text-gray-400">読み込み中...</p>
        </div>
      }
    >
      <QRContent />
    </Suspense>
  );
}
