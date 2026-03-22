"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  getMerchantByOwner,
  updateMerchantProfile,
  addMerchantAnnouncement,
  deleteMerchantAnnouncement,
} from "@/lib/firestore";
import type { Merchant } from "@/types";
import {
  Loader2,
  Save,
  Store,
  Clock,
  Calendar,
  Megaphone,
  Link2,
  Tag,
  Trash2,
  Plus,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import MerchantNavigation from "@/components/MerchantNavigation";

const DAYS_OF_WEEK = ["月", "火", "水", "木", "金", "土", "日"];
const CATEGORIES = ["飲食", "小売", "サービス", "その他"];

function ProfileContent() {
  const { liffUser, loading } = useAuth();
  const [merchant, setMerchant] = useState<{
    id: string;
    data: Merchant;
  } | null>(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // フォーム状態
  const [description, setDescription] = useState("");
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("18:00");
  const [closedDays, setClosedDays] = useState<string[]>([]);
  const [instagram, setInstagram] = useState("");
  const [xUrl, setXUrl] = useState("");
  const [category, setCategory] = useState("飲食");

  // お知らせ
  const [announcementText, setAnnouncementText] = useState("");
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);
  const [announcements, setAnnouncements] = useState<
    { text: string; createdAt: { seconds: number } }[]
  >([]);

  useEffect(() => {
    if (!liffUser) return;
    getMerchantByOwner(liffUser.userId)
      .then((m) => {
        if (m) {
          setMerchant(m);
          setDescription(m.data.description || "");
          setOpenTime(m.data.businessHours?.open || "09:00");
          setCloseTime(m.data.businessHours?.close || "18:00");
          setClosedDays(m.data.closedDays || []);
          setInstagram(m.data.snsLinks?.instagram || "");
          setXUrl(m.data.snsLinks?.x || "");
          setCategory(m.data.category || "飲食");
          setAnnouncements(
            (m.data.announcements as { text: string; createdAt: { seconds: number } }[]) || []
          );
        }
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [liffUser]);

  const handleSave = async () => {
    if (!merchant) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateMerchantProfile(merchant.id, {
        description,
        businessHours: { open: openTime, close: closeTime },
        closedDays,
        snsLinks: { instagram, x: xUrl },
        category,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDay = (day: string) => {
    setClosedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handlePostAnnouncement = async () => {
    if (!merchant || !announcementText.trim()) return;
    setPostingAnnouncement(true);
    try {
      await addMerchantAnnouncement(merchant.id, announcementText.trim());
      const newAnnouncement = {
        text: announcementText.trim(),
        createdAt: { seconds: Math.floor(Date.now() / 1000) },
      };
      setAnnouncements((prev) => [newAnnouncement, ...prev].slice(0, 5));
      setAnnouncementText("");
    } catch (err) {
      console.error(err);
      alert("投稿に失敗しました");
    } finally {
      setPostingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (index: number) => {
    if (!merchant) return;
    try {
      await deleteMerchantAnnouncement(merchant.id, index);
      setAnnouncements((prev) => prev.filter((_, i) => i !== index));
    } catch (err) {
      console.error(err);
    }
  };

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
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <Store className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">加盟店として登録されていません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/merchant" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-800">プロフィール編集</h1>
      </div>

      {/* 店舗名（読み取り専用） */}
      <div className="bg-blue-50 rounded-xl px-4 py-3 mb-4">
        <p className="text-xs text-blue-600 font-medium">店舗名</p>
        <p className="text-base font-bold text-blue-800">{merchant.data.name}</p>
      </div>

      {/* カテゴリ */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <div className="flex items-center gap-2 mb-3">
          <Tag size={16} className="text-gray-500" />
          <p className="text-sm font-semibold text-gray-700">カテゴリ</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                category === cat
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 店舗紹介文 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <div className="flex items-center gap-2 mb-3">
          <Store size={16} className="text-gray-500" />
          <p className="text-sm font-semibold text-gray-700">店舗紹介・こだわりストーリー</p>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="お店のこだわりや特徴を紹介してください..."
          rows={4}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
        />
      </div>

      {/* 営業時間 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} className="text-gray-500" />
          <p className="text-sm font-semibold text-gray-700">営業時間</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="time"
            value={openTime}
            onChange={(e) => setOpenTime(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <span className="text-gray-500">〜</span>
          <input
            type="time"
            value={closeTime}
            onChange={(e) => setCloseTime(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* 定休日 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={16} className="text-gray-500" />
          <p className="text-sm font-semibold text-gray-700">定休日</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day}
              onClick={() => handleToggleDay(day)}
              className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                closedDays.includes(day)
                  ? "bg-red-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {day}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          赤い曜日が定休日です
        </p>
      </div>

      {/* SNSリンク */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <div className="flex items-center gap-2 mb-3">
          <Link2 size={16} className="text-gray-500" />
          <p className="text-sm font-semibold text-gray-700">SNSリンク</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Instagram URL</label>
            <input
              type="url"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="https://instagram.com/..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">X (Twitter) URL</label>
            <input
              type="url"
              value={xUrl}
              onChange={(e) => setXUrl(e.target.value)}
              placeholder="https://x.com/..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>
      </div>

      {/* 保存ボタン */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-500 text-white rounded-xl py-3 font-bold disabled:bg-gray-300 flex items-center justify-center gap-2 mb-6 hover:bg-blue-600 transition-colors"
      >
        {saving ? (
          <Loader2 size={18} className="animate-spin" />
        ) : saved ? (
          <>
            <CheckCircle size={18} />
            保存しました
          </>
        ) : (
          <>
            <Save size={18} />
            プロフィールを保存
          </>
        )}
      </button>

      {/* お知らせ投稿 */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-3">
        <div className="flex items-center gap-2 mb-3">
          <Megaphone size={16} className="text-gray-500" />
          <p className="text-sm font-semibold text-gray-700">お知らせ投稿</p>
        </div>
        <p className="text-xs text-gray-400 mb-2">今日の入荷情報やお得な情報を投稿できます（最新5件）</p>
        <textarea
          value={announcementText}
          onChange={(e) => setAnnouncementText(e.target.value)}
          placeholder="例: 本日入荷！新鮮な地元野菜が揃いました🥬"
          rows={2}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none mb-2"
        />
        <button
          onClick={handlePostAnnouncement}
          disabled={postingAnnouncement || !announcementText.trim()}
          className="w-full bg-orange-500 text-white rounded-lg py-2.5 font-bold disabled:bg-gray-300 flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors"
        >
          {postingAnnouncement ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <Plus size={16} />
              投稿する
            </>
          )}
        </button>
      </div>

      {/* お知らせ一覧 */}
      {announcements.length > 0 && (
        <div className="space-y-2 mb-6">
          {announcements.map((a, i) => {
            const date = a.createdAt?.seconds
              ? new Date(a.createdAt.seconds * 1000)
              : new Date();
            return (
              <div
                key={i}
                className="bg-white rounded-lg px-4 py-3 shadow-sm flex items-start justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{a.text}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {date.toLocaleDateString("ja-JP")}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteAnnouncement(i)}
                  className="text-gray-400 hover:text-red-500 flex-shrink-0 mt-0.5"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <MerchantNavigation />
    </div>
  );
}

export default function MerchantProfilePage() {
  return (
    <AuthProvider>
      <ProfileContent />
    </AuthProvider>
  );
}
