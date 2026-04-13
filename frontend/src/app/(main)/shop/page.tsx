"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { IconLightning } from "@/components/Icons";
import toast from "react-hot-toast";

interface ShopItem {
  id: number;
  name: string;
  description: string;
  price: number;
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
  requiredScore: number;
  effectType: string;
  imageUrl: string;
}

const RARITY_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  Common: { bg: "rgba(160,160,160,0.1)", border: "rgba(160,160,160,0.3)", text: "#999" },
  Rare: { bg: "rgba(0,122,255,0.1)", border: "rgba(0,122,255,0.3)", text: "var(--accent-blue)" },
  Epic: { bg: "rgba(175,82,222,0.1)", border: "rgba(175,82,222,0.3)", text: "var(--accent-purple)" },
  Legendary: { bg: "rgba(255,140,0,0.1)", border: "rgba(255,140,0,0.3)", text: "var(--primary)" },
};

export default function PowerShop() {
  const { user, refreshUser } = useAuth();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [auraCoins, setAuraCoins] = useState(0);

  useEffect(() => { fetchItems(); }, []);
  useEffect(() => { if (user) { setAuraCoins(user.auraCoins || 0); fetchInventory(); } }, [user]);

  const fetchInventory = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`http://localhost:8080/api/shop/inventory/${user.id}`);
      if (res.ok) { const data = await res.json(); setInventory(data || []); }
    } catch (e) { console.error(e); }
  };

  const fetchItems = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/shop/items");
      if (res.ok) {
        const data = await res.json();
        if (data.length === 0) {
          setItems([
            { id: 1, name: "Trait Reveal Lens", description: "Uncover one hidden trait of a targeted user.", price: 200, rarity: "Rare", requiredScore: 400, effectType: "REVEAL_TRAIT", imageUrl: "🔍" },
            { id: 2, name: "Credibility Shield", description: "Protect your stock from negative news impact for 24h.", price: 500, rarity: "Epic", requiredScore: 800, effectType: "SHIELD", imageUrl: "🛡️" },
            { id: 3, name: "Market Whisper", description: "Get early access to a breaking scoop before others.", price: 1000, rarity: "Legendary", requiredScore: 1200, effectType: "EARLY_NEWS", imageUrl: "🤫" },
            { id: 4, name: "Aura Boost", description: "Immediately gain +50 credibility score.", price: 300, rarity: "Common", requiredScore: 0, effectType: "BOOST_CRED", imageUrl: "✨" }
          ]);
        } else setItems(data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleBuy = async (item: ShopItem) => {
    if (!user) return;
    if (auraCoins < item.price) return toast.error("Not enough Aura Coins!");
    try {
      const res = await fetch(`http://localhost:8080/api/shop/buy/${item.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      if (res.ok) { toast.success(`Bought ${item.name}!`); await refreshUser(); fetchInventory(); }
      else { const err = await res.json(); toast.error(`Failed: ${err.error}`); }
    } catch { toast.error("Error purchasing item."); }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3" style={{ color: "var(--text)" }}>
              <IconLightning size={32} color="var(--accent)" />
              Power Shop
            </h1>
            <p className="text-sm mt-1 ml-11" style={{ color: "var(--text-secondary)" }}>spend aura. unlock abilities. dominate.</p>
          </div>
          <div className="card px-5 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-soft)" }}>
              <IconLightning size={18} color="var(--accent)" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Aura Coins</div>
              <div className="text-lg font-extrabold" style={{ color: "var(--primary)" }}>{auraCoins.toLocaleString()}</div>
            </div>
          </div>
        </header>

        {/* Shop Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1,2,3,4].map(i => <div key={i} className="card p-6 h-52 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {items.map((item) => {
              const rStyle = RARITY_STYLES[item.rarity] || RARITY_STYLES.Common;
              return (
                <div key={item.id} className="card p-6 flex flex-col transition-all hover:-translate-y-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                      {item.imageUrl || "🔮"}
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full" style={{
                      background: rStyle.bg, color: rStyle.text, border: `1px solid ${rStyle.border}`
                    }}>
                      {item.rarity}
                    </span>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text)" }}>{item.name}</h3>
                    <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-secondary)" }}>{item.description}</p>
                  </div>

                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                    <button onClick={() => handleBuy(item)} disabled={auraCoins < item.price}
                      className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40">
                      <span>Purchase</span>
                      <span className="font-extrabold">{item.price} Au</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Inventory */}
        <div className="mt-12" style={{ borderTop: "1px solid var(--border)", paddingTop: "32px" }}>
          <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>My Perks</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Your current arsenal of abilities.</p>

          {inventory.length === 0 ? (
            <div className="card p-12 text-center" style={{ border: "1px dashed var(--border-strong)" }}>
              <div className="text-4xl mb-3">📭</div>
              <h3 className="font-bold mb-1" style={{ color: "var(--text-secondary)" }}>Inventory Empty</h3>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Acquire perks from the shop above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.values(inventory.reduce((acc: any, inv: any) => {
                const id = inv.shopItemId;
                if (!acc[id]) acc[id] = { ...inv, count: 1 };
                else acc[id].count += 1;
                return acc;
              }, {})).map((inv: any) => (
                <div key={inv.id} className="card p-5 relative">
                  {inv.count > 1 && (
                    <div className="absolute -top-2 -right-2 text-[10px] font-extrabold px-2 py-1 rounded-lg text-white" style={{ background: "var(--primary)" }}>
                      x{inv.count}
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-2xl">{inv.Item?.imageUrl || "🔮"}</div>
                    <span className="badge text-[10px]">Active</span>
                  </div>
                  <h4 className="font-bold" style={{ color: "var(--text)" }}>{inv.Item?.name}</h4>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{inv.Item?.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
