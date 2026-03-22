"use client";

import { formatPoints, formatDate } from "@/lib/utils";
import type { Transaction } from "@/types";
import { ArrowDownLeft, ArrowUpRight, Gift } from "lucide-react";

interface TransactionListProps {
  transactions: Transaction[];
  currentUserId: string;
}

export default function TransactionList({
  transactions,
  currentUserId,
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <p>取引履歴はありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx) => {
        const isPayment = tx.type === "payment" && tx.fromUserId === currentUserId;
        const isGrant = tx.type === "grant";

        return (
          <div
            key={tx.id}
            className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isGrant
                    ? "bg-green-100 text-green-600"
                    : isPayment
                    ? "bg-red-100 text-red-500"
                    : "bg-blue-100 text-blue-500"
                }`}
              >
                {isGrant ? (
                  <Gift size={18} />
                ) : isPayment ? (
                  <ArrowUpRight size={18} />
                ) : (
                  <ArrowDownLeft size={18} />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {isGrant
                    ? "ポイント付与"
                    : isPayment
                    ? "支払い"
                    : "受け取り"}
                </p>
                <p className="text-xs text-gray-400">
                  {tx.memo || (tx.createdAt ? formatDate(tx.createdAt) : "")}
                </p>
              </div>
            </div>
            <p
              className={`text-base font-bold ${
                isPayment ? "text-red-500" : "text-green-600"
              }`}
            >
              {isPayment ? "-" : "+"}
              {formatPoints(tx.amount)} pt
            </p>
          </div>
        );
      })}
    </div>
  );
}
