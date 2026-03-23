"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  getUserSkills,
  getSkillRequestsForProvider,
  getSkillRequestsForRequester,
  updateSkillStatus,
  updateSkillRequestStatus,
} from "@/lib/firestore";
import { formatPoints } from "@/lib/utils";
import type { Skill, SkillRequest } from "@/types";
import {
  Loader2,
  ArrowLeft,
  Wrench,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";

function MySkillsContent() {
  const { liffUser, loading } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<SkillRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SkillRequest[]>([]);
  const [fetching, setFetching] = useState(true);
  const [tab, setTab] = useState<"skills" | "received" | "sent">("skills");

  useEffect(() => {
    if (!liffUser) return;
    Promise.all([
      getUserSkills(liffUser.userId),
      getSkillRequestsForProvider(liffUser.userId),
      getSkillRequestsForRequester(liffUser.userId),
    ])
      .then(([s, r, sr]) => {
        setSkills(s);
        setReceivedRequests(r);
        setSentRequests(sr);
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [liffUser]);

  const handleToggleActive = async (skill: Skill) => {
    await updateSkillStatus(skill.id!, !skill.isActive);
    setSkills((prev) =>
      prev.map((s) => (s.id === skill.id ? { ...s, isActive: !s.isActive } : s))
    );
  };

  const handleRequestAction = async (requestId: string, action: "accepted" | "completed" | "cancelled") => {
    await updateSkillRequestStatus(requestId, action);
    setReceivedRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: action } : r))
    );
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "pending": return "待機中";
      case "accepted": return "受付済み";
      case "completed": return "完了";
      case "cancelled": return "キャンセル";
      default: return status;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-700";
      case "accepted": return "bg-blue-100 text-blue-700";
      case "completed": return "bg-green-100 text-green-700";
      case "cancelled": return "bg-gray-100 text-gray-500";
      default: return "bg-gray-100 text-gray-500";
    }
  };

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <Link href="/skills" className="flex items-center gap-1 text-sm text-gray-500 mb-4">
        <ArrowLeft size={16} />
        スキル一覧に戻る
      </Link>

      <h1 className="text-xl font-bold text-gray-800 mb-4">マイスキル管理</h1>

      {/* タブ */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
        {(["skills", "received", "sent"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium ${
              tab === t ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500"
            }`}
          >
            {t === "skills" ? "登録スキル" : t === "received" ? "受信した依頼" : "送信した依頼"}
          </button>
        ))}
      </div>

      {/* 登録スキル */}
      {tab === "skills" && (
        <div className="space-y-3">
          {skills.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Wrench size={40} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">登録スキルはありません</p>
            </div>
          ) : (
            skills.map((skill) => (
              <div key={skill.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <span className="inline-block bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full mb-1">
                      {skill.category}
                    </span>
                    <h3 className="font-bold text-gray-800">{skill.title}</h3>
                  </div>
                  <span className="text-indigo-600 font-bold text-sm">
                    {formatPoints(skill.price)}pt
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-3">{skill.description}</p>
                <button
                  onClick={() => handleToggleActive(skill)}
                  className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full ${
                    skill.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {skill.isActive ? <Eye size={12} /> : <EyeOff size={12} />}
                  {skill.isActive ? "公開中" : "非公開"}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* 受信した依頼 */}
      {tab === "received" && (
        <div className="space-y-3">
          {receivedRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Clock size={40} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">受信した依頼はありません</p>
            </div>
          ) : (
            receivedRequests.map((req) => (
              <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-bold text-gray-800 text-sm">{req.requesterName} さんから</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(req.status)}`}>
                    {statusLabel(req.status)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{req.message}</p>
                <p className="text-xs text-gray-400 mb-3">金額: {formatPoints(req.amount)}pt</p>
                {req.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRequestAction(req.id!, "accepted")}
                      className="flex-1 flex items-center justify-center gap-1 bg-indigo-600 text-white rounded-lg px-3 py-2 text-xs font-bold hover:bg-indigo-700"
                    >
                      <CheckCircle size={14} />
                      受け付ける
                    </button>
                    <button
                      onClick={() => handleRequestAction(req.id!, "cancelled")}
                      className="flex-1 flex items-center justify-center gap-1 bg-gray-200 text-gray-700 rounded-lg px-3 py-2 text-xs font-bold hover:bg-gray-300"
                    >
                      <XCircle size={14} />
                      辞退する
                    </button>
                  </div>
                )}
                {req.status === "accepted" && (
                  <button
                    onClick={() => handleRequestAction(req.id!, "completed")}
                    className="w-full flex items-center justify-center gap-1 bg-green-600 text-white rounded-lg px-3 py-2 text-xs font-bold hover:bg-green-700"
                  >
                    <CheckCircle size={14} />
                    完了にする
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 送信した依頼 */}
      {tab === "sent" && (
        <div className="space-y-3">
          {sentRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Clock size={40} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">送信した依頼はありません</p>
            </div>
          ) : (
            sentRequests.map((req) => (
              <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-bold text-gray-800 text-sm">{req.providerName} さんへ</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(req.status)}`}>
                    {statusLabel(req.status)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">{req.message}</p>
                <p className="text-xs text-gray-400">金額: {formatPoints(req.amount)}pt</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function MySkillsPage() {
  return (
    <AuthProvider>
      <MySkillsContent />
    </AuthProvider>
  );
}
