"use client";

import { formatPoints } from "@/lib/utils";

interface BalanceCardProps {
  balance: number;
  displayName: string;
  localBalance?: Record<string, number>;
}

const AREA_NAMES: Record<string, string> = {
  honjo: "本庄",
  kumagaya: "熊谷",
  fukaya: "深谷",
  kodama: "児玉",
};

export default function BalanceCard({ balance, displayName, localBalance }: BalanceCardProps) {
  const localEntries = localBalance
    ? Object.entries(localBalance).filter(([, v]) => v > 0)
    : [];

  return (
    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
      <p className="text-sm opacity-90">{displayName} さん</p>
      <div className="mt-4">
        <p className="text-xs opacity-75">共通ポイント</p>
        <p className="text-4xl font-bold tracking-tight mt-1">
          {formatPoints(balance)}
          <span className="text-lg ml-1">pt</span>
        </p>
      </div>
      {localEntries.length > 0 && (
        <div className="mt-3 border-t border-white/20 pt-3 space-y-1">
          <p className="text-xs opacity-75">地域限定ポイント</p>
          {localEntries.map(([areaId, amount]) => (
            <div key={areaId} className="flex justify-between text-sm">
              <span className="opacity-80">
                {AREA_NAMES[areaId] || areaId}限定
              </span>
              <span className="font-bold">{formatPoints(amount)} pt</span>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs opacity-60 mt-4">はにぽんありがとうPay</p>
    </div>
  );
}
