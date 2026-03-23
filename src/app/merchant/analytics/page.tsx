"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { getMerchantByOwner, getMerchantAnalytics } from "@/lib/firestore";
import type { AnalyticsData } from "@/lib/firestore";
import type { Merchant } from "@/types";
import { formatPoints } from "@/lib/utils";
import {
  Loader2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  DollarSign,
  ShoppingBag,
  Repeat,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import MerchantNavigation from "@/components/MerchantNavigation";

function BarChart({
  data,
  valueKey,
  labelKey,
  color = "bg-orange-500",
  suffix = "",
}: {
  data: { [key: string]: string | number }[];
  valueKey: string;
  labelKey: string;
  color?: string;
  suffix?: string;
}) {
  const maxValue = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);

  return (
    <div className="flex items-end gap-1.5 h-40">
      {data.map((d, i) => {
        const value = Number(d[valueKey]) || 0;
        const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-gray-500 font-medium">
              {value > 0
                ? value >= 10000
                  ? `${(value / 10000).toFixed(1)}万`
                  : formatPoints(value)
                : ""}
              {value > 0 ? suffix : ""}
            </span>
            <div className="w-full flex items-end justify-center" style={{ height: "100px" }}>
              <div
                className={`w-full max-w-[40px] ${color} rounded-t-md transition-all duration-500`}
                style={{ height: `${Math.max(height, 2)}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-500">{String(d[labelKey])}</span>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({
  percentage,
  label,
}: {
  percentage: number;
  label: string;
}) {
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="#f97316"
            strokeWidth="8"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-800">
            {percentage.toFixed(0)}%
          </span>
          <span className="text-xs text-gray-500">{label}</span>
        </div>
      </div>
    </div>
  );
}

function AnalyticsContent() {
  const { liffUser, loading } = useAuth();
  const [merchant, setMerchant] = useState<{
    id: string;
    data: Merchant;
  } | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!liffUser) return;
    getMerchantByOwner(liffUser.userId)
      .then(async (m) => {
        setMerchant(m);
        if (m) {
          const data = await getMerchantAnalytics(m.id);
          setAnalytics(data);
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
        <h1 className="text-xl font-bold text-gray-800 mb-4">売上分析</h1>
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <p className="text-gray-500">加盟店が見つかりません</p>
          <Link
            href="/merchant"
            className="text-orange-500 mt-4 inline-block"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6">
        <p className="text-gray-500 text-center">データを取得できませんでした</p>
      </div>
    );
  }

  const monthlyChange =
    analytics.monthlySales.previous > 0
      ? (
          ((analytics.monthlySales.current - analytics.monthlySales.previous) /
            analytics.monthlySales.previous) *
          100
        ).toFixed(1)
      : analytics.monthlySales.current > 0
      ? "+100"
      : "0";
  const isPositive = Number(monthlyChange) >= 0;

  // 客単価の推移
  const avgPerDay = analytics.dailySales.map((d) => ({
    date: d.date,
    avg: d.count > 0 ? Math.round(d.total / d.count) : 0,
  }));

  return (
    <div className="max-w-md mx-auto px-4 pt-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/merchant" className="text-gray-500">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 size={22} className="text-orange-500" />
            売上・客層分析
          </h1>
          <p className="text-sm text-gray-500">{merchant.data.name}</p>
        </div>
      </div>

      {/* 基本統計 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <DollarSign size={14} />
            累計売上
          </div>
          <p className="text-lg font-bold text-gray-800">
            {formatPoints(analytics.basicStats.totalSales)}
            <span className="text-sm font-normal text-gray-500">pt</span>
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <ShoppingBag size={14} />
            総取引数
          </div>
          <p className="text-lg font-bold text-gray-800">
            {formatPoints(analytics.basicStats.totalTransactions)}
            <span className="text-sm font-normal text-gray-500">件</span>
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <Users size={14} />
            ユニーク顧客数
          </div>
          <p className="text-lg font-bold text-gray-800">
            {formatPoints(analytics.basicStats.uniqueCustomers)}
            <span className="text-sm font-normal text-gray-500">人</span>
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <DollarSign size={14} />
            平均客単価
          </div>
          <p className="text-lg font-bold text-gray-800">
            {formatPoints(analytics.basicStats.avgPerTransaction)}
            <span className="text-sm font-normal text-gray-500">pt</span>
          </p>
        </div>
      </div>

      {/* 日別売上グラフ */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <BarChart3 size={16} className="text-orange-500" />
          日別売上（過去7日間）
        </h2>
        <BarChart
          data={analytics.dailySales}
          valueKey="total"
          labelKey="date"
          color="bg-orange-500"
        />
      </div>

      {/* 月別売上比較 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          {isPositive ? (
            <TrendingUp size={16} className="text-green-500" />
          ) : (
            <TrendingDown size={16} className="text-red-500" />
          )}
          月別売上比較
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">先月</p>
            <p className="text-lg font-bold text-gray-600">
              {formatPoints(analytics.monthlySales.previous)}
              <span className="text-sm font-normal">pt</span>
            </p>
          </div>
          <div className="text-center">
            <span
              className={`text-sm font-bold px-3 py-1 rounded-full ${
                isPositive
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {isPositive ? "+" : ""}
              {monthlyChange}%
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">今月</p>
            <p className="text-lg font-bold text-gray-800">
              {formatPoints(analytics.monthlySales.current)}
              <span className="text-sm font-normal">pt</span>
            </p>
          </div>
        </div>
        {/* 比較バー */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-8">先月</span>
            <div className="flex-1 bg-gray-100 rounded-full h-3">
              <div
                className="bg-gray-400 h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${
                    Math.max(analytics.monthlySales.previous, analytics.monthlySales.current) > 0
                      ? (analytics.monthlySales.previous /
                          Math.max(
                            analytics.monthlySales.previous,
                            analytics.monthlySales.current
                          )) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 w-8">今月</span>
            <div className="flex-1 bg-gray-100 rounded-full h-3">
              <div
                className="bg-orange-500 h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${
                    Math.max(analytics.monthlySales.previous, analytics.monthlySales.current) > 0
                      ? (analytics.monthlySales.current /
                          Math.max(
                            analytics.monthlySales.previous,
                            analytics.monthlySales.current
                          )) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 時間帯別来客数 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <Clock size={16} className="text-blue-500" />
          時間帯別来客数（過去30日）
        </h2>
        <BarChart
          data={analytics.hourlyVisits}
          valueKey="count"
          labelKey="label"
          color="bg-blue-500"
          suffix="件"
        />
      </div>

      {/* リピーター率 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <Repeat size={16} className="text-purple-500" />
          リピーター率
        </h2>
        <div className="flex items-center justify-between">
          <DonutChart
            percentage={
              analytics.repeaterRate.total > 0
                ? (analytics.repeaterRate.repeaters /
                    analytics.repeaterRate.total) *
                  100
                : 0
            }
            label="リピーター"
          />
          <div className="text-right space-y-2">
            <div>
              <p className="text-xs text-gray-500">リピーター</p>
              <p className="text-lg font-bold text-orange-600">
                {analytics.repeaterRate.repeaters}
                <span className="text-sm font-normal text-gray-500">人</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">総顧客数</p>
              <p className="text-lg font-bold text-gray-800">
                {analytics.repeaterRate.total}
                <span className="text-sm font-normal text-gray-500">人</span>
              </p>
            </div>
            <p className="text-[10px] text-gray-400">
              ※ 2回以上来店をリピーターと定義
            </p>
          </div>
        </div>
      </div>

      {/* 客単価の推移 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          <DollarSign size={16} className="text-green-500" />
          客単価の推移（過去7日間）
        </h2>
        <BarChart
          data={avgPerDay}
          valueKey="avg"
          labelKey="date"
          color="bg-green-500"
        />
      </div>

      <MerchantNavigation />
    </div>
  );
}

export default function MerchantAnalyticsPage() {
  return (
    <AuthProvider>
      <AnalyticsContent />
    </AuthProvider>
  );
}
