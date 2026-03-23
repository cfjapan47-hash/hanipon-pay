"use client";

import { useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { createSkill } from "@/lib/firestore";
import type { SkillCategory } from "@/types";
import {
  Loader2,
  ArrowLeft,
  CheckCircle,
  Wrench,
  Tag,
  FileText,
  Coins,
  MapPin,
} from "lucide-react";
import Link from "next/link";

const CATEGORIES: SkillCategory[] = ["IT", "料理", "DIY", "語学", "その他"];

function SkillRegisterContent() {
  const { liffUser, user, loading } = useAuth();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<SkillCategory>("IT");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [area, setArea] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!liffUser || !user) return;
    if (!title.trim()) return setError("タイトルを入力してください");
    if (!description.trim()) return setError("説明を入力してください");
    const priceNum = parseInt(price);
    if (!priceNum || priceNum < 1) return setError("価格は1以上を入力してください");
    if (!area.trim()) return setError("エリアを入力してください");

    setSubmitting(true);
    setError("");
    try {
      await createSkill({
        userId: liffUser.userId,
        userName: user.displayName,
        title: title.trim(),
        category,
        description: description.trim(),
        price: priceNum,
        area: area.trim(),
        isActive: true,
      });
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "登録に失敗しました");
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
          <h2 className="text-lg font-bold text-gray-800 mb-2">スキルを登録しました</h2>
          <p className="text-sm text-gray-500 mb-6">スキル一覧に表示されます</p>
          <div className="space-y-2">
            <Link
              href="/skills"
              className="block w-full bg-indigo-600 text-white rounded-xl px-4 py-3 text-sm font-bold hover:bg-indigo-700"
            >
              スキル一覧を見る
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
      <Link href="/skills" className="flex items-center gap-1 text-sm text-gray-500 mb-4">
        <ArrowLeft size={16} />
        スキル一覧に戻る
      </Link>

      <h1 className="text-xl font-bold text-gray-800 mb-4">スキル登録</h1>

      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            <Wrench size={14} />
            タイトル
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: PC修理します"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            <Tag size={14} />
            カテゴリ
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as SkillCategory)}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            <FileText size={14} />
            説明
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="スキルの詳細を入力してください"
            rows={3}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            <Coins size={14} />
            価格（ポイント/時間）
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="例: 500"
            min={1}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            <MapPin size={14} />
            エリア
          </label>
          <input
            type="text"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="例: 本庄市"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-indigo-600 text-white rounded-xl px-4 py-3 text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <>
              <Wrench size={18} />
              スキルを登録する
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function SkillRegisterPage() {
  return (
    <AuthProvider>
      <SkillRegisterContent />
    </AuthProvider>
  );
}
