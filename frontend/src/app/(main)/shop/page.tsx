"use client";

import { useEffect, useState } from "react";

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
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [auraCoins, setAuraCoins] = useState(1000); // Mock value for now
  const [credibility, setCredibility] = useState(500); // Mock value for now
  const userId = 5; // Hardcoded user ID for testing

  useEffect(() => {
    fetchItems();
  }, []);

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
    if (auraCoins < item.price) {
      alert("Not enough Aura Coins!");
      return;
    }
    if (credibility < item.requiredScore) {
      alert(`You need ${item.requiredScore} credibility to buy this.`);
      return;
    }

    try {
      const res = await fetch(`http://localhost:8080/api/shop/buy/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const data = await res.json();
        setAuraCoins(data.auraCoins);
        alert(`Successfully bought ${item.name}!`);
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
            <div className="glass px-6 py-3 rounded-2xl border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] backdrop-blur-md flex items-center gap-3">
              <span className="text-2xl">👑</span>
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">Credibility</div>
                <div className="text-xl font-black text-white">
                  {credibility.toLocaleString()}
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
                  
                  {/* Requirements & Action */}
                  <div className="mt-auto space-y-4 pt-4 border-t border-white/10">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">Requirement:</span>
                      <span className={`font-bold ${credibility >= item.requiredScore ? "text-emerald-400" : "text-red-400"}`}>
                        {item.requiredScore} Cred
                      </span>
                    </div>

                    <button 
                      onClick={() => handleBuy(item)}
                      disabled={auraCoins < item.price || credibility < item.requiredScore}
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
      </div>
    </div>
  );
}
