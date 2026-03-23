"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { getActiveSkills, createSkillRequest } from "@/lib/firestore";
import { formatPoints } from "@/lib/utils";
import type { Skill, SkillCategory } from "@/types";
import {
  Loader2,
  ArrowLeft,
  Search,
  Wrench,
  MessageSquare,
  X,
  CheckCircle,
  Plus,
  User as UserIcon,
  MapPin,
  Coins,
} from "lucide-react";
import Link from "next/link";

const CATEGORIES: SkillCategory[] = ["IT", "料理", "DIY", "語学", "その他"];

function SkillsContent() {
  const { liffUser, user, loading } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [fetching, setFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // 依頼モーダル
  const [targetSkill, setTargetSkill] = useState<Skill | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getActiveSkills()
      .then(setSkills)
      .catch(console.error)
      .finally(() => setFetching(false));
  }, []);

  const filtered = skills.filter((s) => {
    if (selectedCategory !== "all" && s.category !== selectedCategory) return false;
    if (searchQuery && !s.title.includes(searchQuery) && !s.description.includes(searchQuery))
      return false;
    return true;
  });

  const handleRequest = async () => {
    if (!liffUser || !user || !targetSkill) return;
    if (!message.trim()) return setError("メッセージを入力してください");

    setSubmitting(true);
    setError("");
    try {
      await createSkillRequest({
        skillId: targetSkill.id!,
        requesterId: liffUser.userId,
        requesterName: user.displayName,
        providerId: targetSkill.userId,
        providerName: targetSkill.userName,
        message: message.trim(),
        amount: targetSkill.price,
      });
      setSuccess(true);
      setTargetSkill(null);
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "依頼に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6 pb-24">
        <div className="text-center py-12">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-lg font-bold text-gray-800 mb-2">依頼を送信しました</h2>
          <p className="text-sm text-gray-500 mb-6">提供者からの回答をお待ちください</p>
          <div className="space-y-2">
            <button
              onClick={() => setSuccess(false)}
              className="block w-full bg-indigo-600 text-white rounded-xl px-4 py-3 text-sm font-bold hover:bg-indigo-700"
            >
              スキル一覧に戻る
            </button>
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
      <Link href="/" className="flex items-center gap-1 text-sm text-gray-500 mb-4">
        <ArrowLeft size={16} />
        ホームに戻る
      </Link>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">スキルシェア</h1>
        <Link
          href="/skills/register"
          className="flex items-center gap-1 bg-indigo-600 text-white rounded-lg px-3 py-2 text-xs font-bold hover:bg-indigo-700"
        >
          <Plus size={14} />
          スキル登録
        </Link>
      </div>

      <Link
        href="/skills/my"
        className="block mb-4 text-center bg-indigo-50 text-indigo-700 rounded-xl px-4 py-2 text-sm font-medium hover:bg-indigo-100"
      >
        マイスキル・依頼管理
      </Link>

      {/* 検索 */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="スキルを検索..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* カテゴリフィルター */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
            selectedCategory === "all"
              ? "bg-indigo-600 text-white"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          すべて
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
              selectedCategory === cat
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* スキル一覧 */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Wrench size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">スキルが見つかりません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((skill) => (
            <div key={skill.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="inline-block bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full mb-1">
                    {skill.category}
                  </span>
                  <h3 className="font-bold text-gray-800">{skill.title}</h3>
                </div>
                <span className="text-indigo-600 font-bold text-sm whitespace-nowrap">
                  {formatPoints(skill.price)}pt
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{skill.description}</p>
              <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                <span className="flex items-center gap-1">
                  <UserIcon size={12} />
                  {skill.userName}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {skill.area}
                </span>
              </div>
              {liffUser && skill.userId !== liffUser.userId && (
                <button
                  onClick={() => {
                    setTargetSkill(skill);
                    setError("");
                  }}
                  className="w-full flex items-center justify-center gap-1 bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-bold hover:bg-indigo-700"
                >
                  <MessageSquare size={14} />
                  依頼する（{formatPoints(skill.price)}pt）
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 依頼モーダル */}
      {targetSkill && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm relative">
            <button
              onClick={() => setTargetSkill(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
            <h3 className="font-bold text-gray-800 mb-1">{targetSkill.title}</h3>
            <p className="text-sm text-gray-500 mb-4">
              {targetSkill.userName} さんに依頼
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="依頼メッセージを入力してください"
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <div className="bg-gray-50 rounded-xl p-3 mb-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">支払い額</span>
                <span className="font-bold">{formatPoints(targetSkill.price)}pt</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-gray-500">手数料（10%）</span>
                <span className="text-gray-600">
                  {formatPoints(Math.floor(targetSkill.price * 0.1))}pt
                </span>
              </div>
              <div className="flex justify-between mt-1 border-t pt-1">
                <span className="text-gray-500">提供者への報酬</span>
                <span className="font-bold text-indigo-600">
                  {formatPoints(targetSkill.price - Math.floor(targetSkill.price * 0.1))}pt
                </span>
              </div>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-600 mb-3">
                {error}
              </div>
            )}
            <button
              onClick={handleRequest}
              disabled={submitting}
              className="w-full bg-indigo-600 text-white rounded-xl px-4 py-3 text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <Coins size={18} />
                  依頼する
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SkillsPage() {
  return (
    <AuthProvider>
      <SkillsContent />
    </AuthProvider>
  );
}
