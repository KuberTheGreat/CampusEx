"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

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

export default function PowerShop() {
  const { user, refreshUser } = useAuth();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [auraCoins, setAuraCoins] = useState(0);

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (user) {
        setAuraCoins(user.auraCoins || 0);
        fetchInventory();
    }
  }, [user]);

  const fetchInventory = async () => {
    if (!user?.id) return;
    try {
        const res = await fetch(`http://localhost:8080/api/shop/inventory/${user.id}`);
        if (res.ok) {
            const data = await res.json();
            setInventory(data || []);
        }
    } catch(e) {
        console.error("Failed to fetch inventory", e);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/shop/items");
      if (res.ok) {
        const data = await res.json();
        if (data.length === 0) {
          // If no items, we mock them for presentation
          setItems([
            { id: 1, name: "Trait Reveal Lens", description: "Uncover one hidden trait of a targeted user.", price: 200, rarity: "Rare", requiredScore: 400, effectType: "REVEAL_TRAIT", imageUrl: "🔍" },
            { id: 2, name: "Credibility Shield", description: "Protect your stock from negative news impact for 24h.", price: 500, rarity: "Epic", requiredScore: 800, effectType: "SHIELD", imageUrl: "🛡️" },
            { id: 3, name: "Market Whisper", description: "Get early access to a breaking scoop before others.", price: 1000, rarity: "Legendary", requiredScore: 1200, effectType: "EARLY_NEWS", imageUrl: "🤫" },
            { id: 4, name: "Aura Boost", description: "Immediately gain +50 credibility score.", price: 300, rarity: "Common", requiredScore: 0, effectType: "BOOST_CRED", imageUrl: "✨" }
          ]);
        } else {
          setItems(data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (item: ShopItem) => {
    if (!user) return;
    if (auraCoins < item.price) {
      alert("Not enough Aura Coins!");
      return;
    }

    try {
      const res = await fetch(`http://localhost:8080/api/shop/buy/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      if (res.ok) {
        alert(`Successfully bought ${item.name}!`);
        await refreshUser();
        fetchInventory();
      } else {
        const err = await res.json();
        alert(`Failed: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
      alert("Error purchasing item.");
    }
  };

  const rarityColors = {
    Common: "from-gray-400 to-gray-600 border-gray-400/50 shadow-gray-500/20 text-gray-300",
    Rare: "from-blue-400 to-blue-600 border-blue-400/50 shadow-blue-500/20 text-blue-300",
    Epic: "from-purple-400 to-purple-600 border-purple-400/50 shadow-purple-500/20 text-purple-300",
    Legendary: "from-yellow-400 to-orange-600 border-yellow-400/50 shadow-yellow-500/20 text-yellow-300",
  };

  return (
    <div className="p-8 pb-20 min-h-screen bg-black text-white selection:bg-purple-500/30">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-5xl font-black bg-gradient-to-r from-purple-400 my-2 via-fuchsia-400 to-emerald-400 bg-clip-text text-transparent">
              Power Shop ⚡
            </h1>
            <p className="text-gray-400 text-lg mt-2 font-medium">
              Spend Aura Coins. Unlock abilities. Dominate the market.
            </p>
          </div>
          
          <div className="flex gap-4">
            <div className="glass px-6 py-3 rounded-2xl border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-md flex items-center gap-3">
              <span className="text-2xl">✨</span>
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">Aura Coins</div>
                <div className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500">
                  {auraCoins.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Shop Grid */}
        {loading ? (
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-6 py-1">
              <div className="h-2 bg-slate-700 rounded w-1/4"></div>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="h-40 bg-slate-700 rounded-2xl"></div>
                  <div className="h-40 bg-slate-700 rounded-2xl"></div>
                  <div className="h-40 bg-slate-700 rounded-2xl"></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <div 
                key={item.id} 
                className="group relative glass p-1 rounded-3xl overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:-translate-y-2 focus-within:ring-2 focus-within:ring-purple-500"
              >
                {/* Glow behind card */}
                <div className={`absolute inset-0 bg-gradient-to-br ${rarityColors[item.rarity]} opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-3xl blur-xl`}></div>
                
                <div className="relative h-full glass rounded-[22px] p-6 flex flex-col border border-white/5 bg-black/40 backdrop-blur-xl z-10">
                  {/* Image/Icon Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-4xl shadow-inner border border-white/10">
                      {item.imageUrl || "🔮"}
                    </div>
                    <div className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border bg-black/50 backdrop-blur-md ${rarityColors[item.rarity]}`}>
                      {item.rarity}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">{item.name}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-6">
                      {item.description}
                    </p>
                  </div>
                  
                  {/* Action */}
                  <div className="mt-auto pt-4 border-t border-white/10">
                    <button 
                      onClick={() => handleBuy(item)}
                      disabled={auraCoins < item.price}
                      className="w-full relative group/btn overflow-hidden rounded-xl p-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="absolute inset-0 bg-gradient-to-r from-purple-500 to-emerald-500 rounded-xl opacity-70 group-hover/btn:opacity-100 transition-opacity duration-300"></span>
                      <div className="relative bg-black px-4 py-3 rounded-xl flex items-center justify-center gap-2 group-hover/btn:bg-opacity-0 transition-all duration-300">
                        <span className="font-bold text-white tracking-wide">Purchase</span>
                        <div className="flex items-center text-yellow-400 font-black">
                          <span className="text-xs mr-1">✨</span>
                          {item.price}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* My Perks Section */}
        <div className="pt-12 border-t border-white/5">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-4xl font-black text-white">My Perks</h2>
                    <p className="text-gray-500 mt-1">Your current arsenal of abilities.</p>
                </div>
                <div className="text-xs font-mono text-gray-700 tracking-[0.5em] uppercase">Inventory_v1.0</div>
            </div>

            {inventory.length === 0 ? (
                <div className="glass rounded-[32px] p-20 text-center border-2 border-dashed border-white/5">
                    <div className="text-5xl mb-4">📭</div>
                    <h3 className="text-xl font-bold text-gray-400">Inventory Empty</h3>
                    <p className="text-gray-600 max-w-xs mx-auto mt-2">Acquire perks from the shop to see them manifested here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Object.values(inventory.reduce((acc: any, inv: any) => {
                        const id = inv.shopItemId;
                        if (!acc[id]) {
                            acc[id] = { ...inv, count: 1 };
                        } else {
                            acc[id].count += 1;
                        }
                        return acc;
                    }, {})).map((inv: any) => (
                        <div key={inv.id} className="glass p-6 rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent hover:border-purple-500/50 transition-colors group relative">
                           {inv.count > 1 && (
                               <div className="absolute -top-2 -right-2 bg-purple-600 text-white text-[10px] font-black px-2 py-1 rounded-lg border border-purple-400 shadow-[0_0_10px_rgba(147,51,234,0.5)] z-20">
                                   x{inv.count}
                               </div>
                           )}
                           <div className="flex items-center justify-between mb-4">
                               <div className="text-3xl">{inv.Item?.imageUrl || "🔮"}</div>
                               <div className="px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter bg-purple-500/10 text-purple-400 border border-purple-500/20">Active</div>
                           </div>
                           <h4 className="text-lg font-bold text-white">{inv.Item?.name}</h4>
                           <p className="text-xs text-gray-500 mt-1 line-clamp-2">{inv.Item?.description}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

