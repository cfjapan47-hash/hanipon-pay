"use client";

import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import { updateUser } from "@/lib/firestore";
import { Loader2, User, Cake, Save, ArrowLeft, Check } from "lucide-react";
import Link from "next/link";

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));

function ProfileContent() {
  const { liffUser, user, loading } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      if (user.birthday) {
        const parts = user.birthday.split("-");
        if (parts.length === 2) {
          setBirthMonth(parts[0]);
          setBirthDay(parts[1]);
        }
      }
    }
  }, [user]);

  const handleSave = async () => {
    if (!liffUser) return;
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const updates: Record<string, string | undefined> = {};

      if (displayName.trim()) {
        updates.displayName = displayName.trim();
      }

      if (birthMonth && birthDay) {
        updates.birthday = `${birthMonth}-${birthDay}`;
      }

      await updateUser(liffUser.userId, updates);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (!user || !liffUser) {
    return (
      <div className="flex items-center justify-center h-screen px-4">
        <p className="text-red-500 text-center">認証エラー</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-800">プロフィール</h1>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
        {/* 表示名 */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <User size={16} className="text-blue-500" />
            <label className="text-sm font-semibold text-gray-700">表示名</label>
          </div>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="表示名を入力"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* 誕生日 */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Cake size={16} className="text-pink-500" />
            <label className="text-sm font-semibold text-gray-700">誕生日</label>
          </div>
          <p className="text-xs text-gray-400 mb-2">
            誕生日を登録すると、お誕生日にクーポンがもらえます
          </p>
          <div className="flex gap-3">
            <div className="flex-1">
              <select
                value={birthMonth}
                onChange={(e) => setBirthMonth(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">月</option>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>
                    {parseInt(m)}月
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <select
                value={birthDay}
                onChange={(e) => setBirthDay(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">日</option>
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {parseInt(d)}日
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {saved && (
          <div className="bg-green-50 text-green-600 text-sm rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
            <Check size={16} />
            保存しました
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !displayName.trim()}
          className="w-full bg-blue-500 text-white rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
        >
          {saving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              <Save size={18} />
              保存する
            </>
          )}
        </button>
      </div>

      <Navigation />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthProvider>
      <ProfileContent />
    </AuthProvider>
  );
}
