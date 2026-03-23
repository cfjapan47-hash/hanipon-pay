"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  getMerchantByOwner,
  getProductsByMerchant,
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/firestore";
import { formatPoints } from "@/lib/utils";
import type { Merchant, Product, ProductCategory } from "@/types";
import {
  Loader2,
  Plus,
  ArrowLeft,
  X,
  Minus,
  Edit2,
  Trash2,
  AlertTriangle,
  Package,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import MerchantNavigation from "@/components/MerchantNavigation";

const CATEGORIES: ProductCategory[] = ["食品", "日用品", "服飾", "その他"];

function ProductsContent() {
  const { liffUser, loading } = useAuth();
  const [merchant, setMerchant] = useState<{
    id: string;
    data: Merchant;
  } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ProductCategory>("食品");

  useEffect(() => {
    if (!liffUser) return;
    getMerchantByOwner(liffUser.userId)
      .then(async (m) => {
        setMerchant(m);
        if (m) {
          const prods = await getProductsByMerchant(m.id);
          setProducts(prods);
        }
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [liffUser]);

  const resetForm = () => {
    setName("");
    setPrice("");
    setStock("");
    setDescription("");
    setCategory("食品");
    setEditingProduct(null);
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setPrice(String(product.price));
    setStock(String(product.stock));
    setDescription(product.description);
    setCategory(product.category);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!merchant || !name.trim() || !price) return;
    setSubmitting(true);
    setMessage(null);

    try {
      if (editingProduct?.id) {
        // 編集モード
        await updateProduct(editingProduct.id, {
          name: name.trim(),
          price: Number(price),
          stock: Number(stock) || 0,
          description: description.trim(),
          category,
        });
        setMessage({ type: "success", text: "商品を更新しました" });
      } else {
        // 新規作成
        await createProduct({
          shopId: merchant.id,
          shopName: merchant.data.name,
          name: name.trim(),
          price: Number(price),
          stock: Number(stock) || 0,
          description: description.trim(),
          category,
          isActive: true,
        });
        setMessage({ type: "success", text: "商品を登録しました" });
      }

      // リフレッシュ
      const prods = await getProductsByMerchant(merchant.id);
      setProducts(prods);
      setShowForm(false);
      resetForm();
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "エラーが発生しました" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStockChange = async (product: Product, delta: number) => {
    if (!product.id || !merchant) return;
    const newStock = Math.max(0, product.stock + delta);
    try {
      await updateProduct(product.id, { stock: newStock });
      const prods = await getProductsByMerchant(merchant.id);
      setProducts(prods);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStockDirect = async (product: Product, value: string) => {
    if (!product.id || !merchant) return;
    const newStock = Math.max(0, Number(value) || 0);
    try {
      await updateProduct(product.id, { stock: newStock });
      const prods = await getProductsByMerchant(merchant.id);
      setProducts(prods);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (product: Product) => {
    if (!product.id || !merchant) return;
    try {
      await updateProduct(product.id, { isActive: !product.isActive });
      const prods = await getProductsByMerchant(merchant.id);
      setProducts(prods);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!product.id || !merchant) return;
    if (!confirm(`「${product.name}」を削除しますか？`)) return;
    try {
      await deleteProduct(product.id);
      const prods = await getProductsByMerchant(merchant.id);
      setProducts(prods);
      setMessage({ type: "success", text: "商品を削除しました" });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "削除に失敗しました" });
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
        <p className="text-gray-600 text-center">加盟店として登録されていません</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/merchant" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-800 flex-1">商品管理</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 bg-orange-500 text-white rounded-lg px-3 py-2 text-sm font-bold hover:bg-orange-600"
        >
          <Plus size={16} />
          商品追加
        </button>
      </div>

      {/* メッセージ */}
      {message && (
        <div
          className={`rounded-lg px-4 py-3 mb-4 text-sm font-medium ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 商品登録/編集フォーム */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-gray-800">
                {editingProduct ? "商品を編集" : "商品を追加"}
              </p>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-gray-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  商品名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: 手作りパン"
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  価格（ポイント） <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="例: 300"
                  min="0"
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  在庫数
                </label>
                <input
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="例: 10"
                  min="0"
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  カテゴリ
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ProductCategory)}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  商品説明
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="商品の説明を入力..."
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || !name.trim() || !price}
                className="w-full bg-orange-500 text-white rounded-lg py-3 font-bold disabled:bg-gray-300 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : editingProduct ? (
                  "更新する"
                ) : (
                  "登録する"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 商品一覧 */}
      {products.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <Package className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">商品が登録されていません</p>
          <p className="text-xs text-gray-400 mt-1">
            「商品追加」から登録してください
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <div
              key={product.id}
              className={`bg-white rounded-xl p-4 shadow-sm ${
                !product.isActive ? "opacity-60" : ""
              }`}
            >
              {/* 上部: 商品情報 */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-800 truncate">
                      {product.name}
                    </h3>
                    <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full flex-shrink-0">
                      {product.category}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-orange-600">
                    {formatPoints(product.price)}
                    <span className="text-sm ml-0.5">pt</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <button
                    onClick={() => handleToggleActive(product)}
                    className={`p-1.5 rounded-lg ${
                      product.isActive
                        ? "text-green-600 bg-green-50 hover:bg-green-100"
                        : "text-gray-400 bg-gray-50 hover:bg-gray-100"
                    }`}
                    title={product.isActive ? "販売中（クリックで非表示に）" : "非表示（クリックで販売開始）"}
                  >
                    {product.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button
                    onClick={() => openEditForm(product)}
                    className="p-1.5 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100"
                    title="編集"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(product)}
                    className="p-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100"
                    title="削除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* 説明文 */}
              {product.description && (
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                  {product.description}
                </p>
              )}

              {/* 在庫管理 */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">在庫:</span>
                  {product.stock <= 5 && (
                    <AlertTriangle
                      size={14}
                      className="text-amber-500"
                    />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStockChange(product, -1)}
                    disabled={product.stock <= 0}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    value={product.stock}
                    onChange={(e) => handleStockDirect(product, e.target.value)}
                    className="w-16 text-center border rounded-lg py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
                    min="0"
                  />
                  <button
                    onClick={() => handleStockChange(product, 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border text-gray-600 hover:bg-gray-100"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* 在庫少量警告 */}
              {product.stock <= 5 && product.stock > 0 && product.isActive && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5">
                  <AlertTriangle size={12} />
                  在庫が少なくなっています（残り{product.stock}個）
                </div>
              )}
              {product.stock === 0 && product.isActive && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5">
                  <AlertTriangle size={12} />
                  在庫切れです
                </div>
              )}

              {/* ステータス表示 */}
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    product.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {product.isActive ? "販売中" : "非表示"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <MerchantNavigation />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <AuthProvider>
      <ProductsContent />
    </AuthProvider>
  );
}
