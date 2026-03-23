"use client";

import { useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { registerDriver, getDriver } from "@/lib/firestore";
import { Loader2, ArrowLeft, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function DriverRegisterContent() {
  const { liffUser, user, loading } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    if (!liffUser || !user) return;
    setSubmitting(true);
    setError("");
    try {
      const existing = await getDriver(liffUser.userId);
      if (existing) {
        router.push("/driver");
        return;
      }
      await registerDriver(liffUser.userId, user.displayName);
      router.push("/driver");
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

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <Link href="/" className="flex items-center gap-1 text-sm text-gray-500 mb-4">
        <ArrowLeft size={16} />
        ホームに戻る
      </Link>

      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Truck size={40} className="text-teal-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-800">ドライバー登録</h1>
        <p className="text-sm text-gray-500 mt-2">
          地域の配達パートナーとして活動しませんか？
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">登録情報</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">お名前</span>
            <span className="font-medium">{user.displayName}</span>
          </div>
        </div>
      </div>

      <div className="bg-teal-50 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-teal-800 mb-2">ドライバーの特典</h2>
        <ul className="text-sm text-teal-700 space-y-1">
          <li>- 配達料の90%を報酬として受け取れます</li>
          <li>- 好きな時間に稼働できます</li>
          <li>- 地域の助け合いに貢献できます</li>
        </ul>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        onClick={handleRegister}
        disabled={submitting}
        className="w-full bg-teal-600 text-white rounded-xl px-4 py-3 text-sm font-bold hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <>
            <Truck size={18} />
            ドライバーとして登録する
          </>
        )}
      </button>
    </div>
  );
}

export default function DriverRegisterPage() {
  return (
    <AuthProvider>
      <DriverRegisterContent />
    </AuthProvider>
  );
}
