"use client";

import { formatPoints } from "@/lib/utils";

interface BalanceCardProps {
  balance: number;
  displayName: string;
}

export default function BalanceCard({ balance, displayName }: BalanceCardProps) {
  return (
    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
      <p className="text-sm opacity-90">{displayName} さん</p>
      <div className="mt-4">
        <p className="text-xs opacity-75">ポイント残高</p>
        <p className="text-4xl font-bold tracking-tight mt-1">
          {formatPoints(balance)}
          <span className="text-lg ml-1">pt</span>
        </p>
      </div>
      <p className="text-xs opacity-60 mt-4">はにぽんPay</p>
    </div>
  );
}
