"use client";

import { useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { createKosodateRequest } from "@/lib/firestore";
import { formatPoints } from "@/lib/utils";
import type { KosodateType } from "@/types";
import {
  Loader2,
  ArrowLeft,
  CheckCircle,
  Heart,
  FileText,
  Calendar,
  Clock,
  Coins,
  Tag,
} from "lucide-react";
import Link from "next/link";

const TYPES: KosodateType[] = ["保育", "送迎", "家事", "その他"];

function KosodateRequestContent() {
  const { liffUser, user, loading } = useAuth();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<KosodateType>("保育");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("");
  const [reward, setReward] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const rewardNum = parseInt(reward) || 0;
  const fee = Math.floor(rewardNum * 0.05);
  const helperReceives = rewardNum - fee;

  const handleSubmit = async () => {
    if (!liffUser || !user) return;
    if (!title.trim()) return setError("タイトルを入力してください");
    if (!description.trim()) return setError("説明を入力してください");
    if (!date) return setError("日付を選択してください");
    if (!time) return setError("時間を入力してください");
    const durationNum = parseInt(duration);
    if (!durationNum || durationNum < 1) return setError("時間（分）を入力してください");
    if (rewardNum < 100) return setError("報酬は100ポイント以上を設定してください");
    if (rewardNum > (user.balance || 0)) return setError("ポイント残高が不足しています");

    setSubmitting(true);
    setError("");
    try {
      await createKosodateRequest({
        requesterId: liffUser.userId,
        requesterName: user.displayName,
        type,
        title: title.trim(),
        description: description.trim(),
        date,
        time,
        duration: durationNum,
        reward: rewardNum,
      });
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "依頼に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (!liffUser || !user) {
    return (
      <div className="flex items-center justify-center h-screen px-4">
        <p className="text-red-500">認証エラー</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6 pb-24">
        <div className="text-center py-12">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-lg font-bold text-gray-800 mb-2">依頼を作成しました</h2>
          <p className="text-sm text-gray-500 mb-6">お手伝いさんが見つかるまでお待ちください</p>
          <div className="space-y-2">
            <Link
              href="/kosodate"
              className="block w-full bg-pink-600 text-white rounded-xl px-4 py-3 text-sm font-bold hover:bg-pink-700"
            >
              依頼一覧を見る
            </Link>
            <Link
              href="/"
              className="block w-full bg-gray-100 text-gray-700 rounded-xl px-4 py-3 text-sm font-medium hover:bg-gray-200"
            >
              ホームに戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <Link href="/kosodate" className="flex items-center gap-1 text-sm text-gray-500 mb-4">
        <ArrowLeft size={16} />
        依頼一覧に戻る
      </Link>

      <h1 className="text-xl font-bold text-gray-800 mb-4">子育てシェア依頼</h1>

      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            <Heart size={14} />
            タイトル
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 保育園のお迎えをお願いしたい"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>

        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            <Tag size={14} />
            種別
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as KosodateType)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            <FileText size={14} />
            詳細
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="お願いしたい内容の詳細を入力してください"
            rows={3}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
          />
        </div>

        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            <Calendar size={14} />
            日付
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>

        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            <Clock size={14} />
            時間
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>

        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            <Clock size={14} />
            所要時間（分）
          </label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="例: 60"
            min={1}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>

        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            <Coins size={14} />
            報酬（ポイント）
          </label>
          <input
            type="number"
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            placeholder="例: 500"
            min={100}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>

        {/* 料金内訳 */}
        {rewardNum > 0 && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">報酬</span>
              <span className="font-medium">{formatPoints(rewardNum)}pt</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">手数料（5%）</span>
              <span className="text-gray-600">{formatPoints(fee)}pt</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-500">お手伝いさんへの報酬</span>
              <span className="font-bold text-pink-600">{formatPoints(helperReceives)}pt</span>
            </div>
          </div>
        )}

        {/* 残高表示 */}
        <div className="bg-orange-50 rounded-xl px-4 py-3 text-sm">
          <span className="text-orange-700">
            現在の残高: {formatPoints(user.balance || 0)}pt
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-pink-600 text-white rounded-xl px-4 py-3 text-sm font-bold hover:bg-pink-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <>
              <Heart size={18} />
              依頼を作成する（{formatPoints(rewardNum)}pt）
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function KosodateRequestPage() {
  return (
    <AuthProvider>
      <KosodateRequestContent />
    </AuthProvider>
  );
}
