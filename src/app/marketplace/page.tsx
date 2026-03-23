"use client";

import { useEffect, useState, useMemo } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import { getAllActiveProducts } from "@/lib/firestore";
import { formatPoints } from "@/lib/utils";
import type { Product, ProductCategory } from "@/types";
import {
  Loader2,
  Search,
  Package,
  Store,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";

const CATEGORIES: ("すべて" | ProductCategory)[] = ["すべて", "食品", "日用品", "服飾", "その他"];

function MarketplaceContent() {
  const { loading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"すべて" | ProductCategory>("すべて");

  useEffect(() => {
    getAllActiveProducts()
      .then((prods) => {
        // 在庫あり商品のみ
        setProducts(prods.filter((p) => p.stock > 0));
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (
        searchQuery &&
        !p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !p.shopName.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      if (selectedCategory !== "すべて" && p.category !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [products, searchQuery, selectedCategory]);

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">マーケット</h1>
        <Link
          href="/my-orders"
          className="flex items-center gap-1.5 text-sm text-orange-600 font-medium hover:text-orange-700"
        >
          <ShoppingCart size={16} />
          注文履歴
        </Link>
      </div>

      {/* 検索 */}
      <div className="relative mb-3">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="商品名・店舗名で検索..."
          className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      {/* カテゴリフィルター */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 結果件数 */}
      <p className="text-xs text-gray-400 mb-3">
        {filteredProducts.length}件の商品
      </p>

      {/* 商品一覧 */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <Package className="mx-auto text-gray-400 mb-3" size={40} />
          <p className="text-gray-500">
            {products.length === 0
              ? "現在販売中の商品はありません"
              : "条件に一致する商品がありません"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filteredProducts.map((product) => (
            <Link
              key={product.id}
              href={`/marketplace/${product.id}`}
              className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 flex items-center justify-center h-28">
                <Package size={36} className="text-orange-300" />
              </div>
              <div className="p-3">
                <h3 className="font-bold text-sm text-gray-800 truncate">
                  {product.name}
                </h3>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                  <Store size={10} />
                  {product.shopName}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-base font-bold text-orange-600">
                    {formatPoints(product.price)}
                    <span className="text-xs ml-0.5">pt</span>
                  </p>
                  <span className="text-xs text-gray-400">
                    残{product.stock}個
                  </span>
                </div>
                <span className="inline-block mt-1.5 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {product.category}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Navigation />
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <AuthProvider>
      <MarketplaceContent />
    </AuthProvider>
  );
}
