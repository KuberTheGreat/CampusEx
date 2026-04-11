"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, ArrowLeft } from "lucide-react";

export default function ProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tradeMode, setTradeMode] = useState<"BUY" | "SELL" | null>(null);
  const [tradeShares, setTradeShares] = useState(1);

  const executeTrade = async () => {
    if (!authUser?.id || !profile || !tradeMode) return;
    const totalCost = tradeShares * profile.currentPrice;
    
    if (tradeMode === "BUY" && totalCost > (authUser.auraCoins || 0)) {
       return alert("Insufficient AURA balance!");
    }

    try {
      const res = await fetch("http://localhost:8080/api/market/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerId: authUser.id, targetUserId: profile.id, shares: tradeShares, type: tradeMode })
      });
      if (res.ok) {
        alert(`Successfully executed ${tradeMode} of ${tradeShares} shares of ${profile.stockSymbol}! Your balance will update.`);
        const { refreshUser } = await import("@/context/AuthContext").then(() => ({ refreshUser: window.location.reload }));
        window.location.reload(); 
      } else {
        const error = await res.json();
        alert(`Trade Failed: ${error.error}`);
      }
    } catch(err) {
      console.error(err);
    }
  };

  // Mock data for the chart since we haven't implemented real price histories yet
  const mockChartData = [
    { time: "Day 1", price: 10 },
    { time: "Day 2", price: 12 },
    { time: "Day 3", price: 11.5 },
    { time: "Day 4", price: 14 },
    { time: "Day 5", price: 18 },
  ];

  useEffect(() => {
    if (id) {
      fetchProfile();
    }
  }, [id]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/user/profile/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen text-white flex items-center justify-center">Loading User Data...</div>;
  }

  if (!profile) {
    return <div className="min-h-screen text-white flex items-center justify-center">User not found</div>;
  }

  return (
    <div className="min-h-screen flex flex-col p-6 max-w-5xl mx-auto">
      <button 
        onClick={() => router.back()} 
        className="text-gray-400 hover:text-white flex items-center gap-2 w-fit mb-8 transition"
      >
        <ArrowLeft size={20} /> Back to Dashboard
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Col: Core Identity */}
        <div className="glass p-8 rounded-3xl md:col-span-1 space-y-6 text-center">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-purple-500 to-emerald-500 rounded-full flex items-center justify-center font-bold text-4xl shadow-lg shadow-purple-500/20">
            {profile.stockSymbol}
          </div>
          
          <div>
            <h1 className="text-3xl font-bold">{profile.name}</h1>
            <p className="text-gray-400 text-sm mt-1">{profile.email}</p>
          </div>

          <div className="bg-black/50 p-4 rounded-2xl border border-gray-800">
            <span className="text-gray-400 text-sm block mb-1">Current Valuation</span>
            <span className="font-extrabold text-3xl text-emerald-400">{profile.currentPrice?.toFixed(2) || "10.00"} Au</span>
          </div>

          {String(authUser?.id) !== String(profile.id) && (
            <button onClick={() => {setTradeMode("BUY"); setTradeShares(1);}} className="w-full bg-purple-600 p-4 rounded-xl font-bold hover:bg-purple-500 transition shadow-lg shadow-purple-600/20">
              Trade {profile.stockSymbol}
            </button>
          )}
        </div>

        {/* Right Col: Stats & Graph */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass p-8 rounded-3xl h-80">
            <h2 className="text-xl font-bold mb-6 flex items-center justify-between">
              Price History
              <span className="text-emerald-400 text-sm flex items-center gap-1"><TrendingUp size={16} /> +4.2% today</span>
            </h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockChartData}>
                  <XAxis dataKey="time" stroke="#4b5563" fontSize={12} />
                  <YAxis stroke="#4b5563" fontSize={12} domain={['dataMin - 2', 'dataMax + 2']} hide />
                  <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #374151', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="price" stroke="#10b981" fill="url(#colorPrice)" strokeWidth={3} />
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass p-8 rounded-3xl">
            <h2 className="text-xl font-bold mb-4">Traits & Quirks</h2>
            <p className="text-sm text-gray-400 mb-6 border-b border-gray-800 pb-4">
              Traits represent this student's core competencies.
            </p>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Public File</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {profile.traits?.filter((t: any) => !t.isHidden).length > 0 ? (
                    profile.traits.filter((t: any) => !t.isHidden).map((t: any) => (
                      <div key={t.id} className="bg-purple-900/20 border border-purple-500/50 p-4 rounded-xl flex items-center justify-center text-center shadow-inner shadow-purple-500/10">
                        <span className="font-bold text-purple-300">{t.name}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 italic col-span-full">No public traits available.</div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider flex justify-between items-center">
                  <span>Classified File</span>
                  <span className="text-xs bg-red-900/30 text-red-400 px-2 py-1 rounded-md">Market Mystery</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {profile.traits?.filter((t: any) => t.isHidden).length > 0 ? (
                    profile.traits.filter((t: any) => t.isHidden).map((t: any) => (
                      <div key={t.id} className="bg-[#111] border border-gray-800 p-4 rounded-xl flex flex-col items-center justify-center gap-2 animate-pulse cursor-help" title="This trait is hidden from public markets to sustain volatility">
                        <div className="h-4 w-16 bg-gray-800 rounded"></div>
                        <div className="h-3 w-10 bg-gray-800 rounded"></div>
                        <span className="sr-only">Hidden Trait</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 italic col-span-full">No classified traits.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {tradeMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setTradeMode(null)}>
          <div className="bg-[#111] border border-gray-800 p-8 rounded-3xl max-w-lg w-full text-center animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-bold mb-6">Execute Trade</h3>
            <div className="flex gap-4 justify-center mb-6">
              <button onClick={() => setTradeMode("BUY")} className={`px-6 py-2 rounded-lg font-bold transition ${tradeMode === "BUY" ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>BUY</button>
              <button onClick={() => setTradeMode("SELL")} className={`px-6 py-2 rounded-lg font-bold transition ${tradeMode === "SELL" ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>SELL</button>
            </div>
            <div className="max-w-xs mx-auto mb-6">
              <label className="block text-gray-400 text-sm mb-2">Number of Shares</label>
              <input type="number" min="1" value={tradeShares} onChange={(e) => setTradeShares(Math.max(1, parseInt(e.target.value) || 1))} className="w-full bg-black border border-gray-700 rounded-xl p-4 text-center text-2xl font-bold focus:border-purple-500 outline-none" />
            </div>
            <div className="flex justify-between items-center bg-gray-900/50 p-4 rounded-xl mb-6">
              <span className="text-gray-400">Total Estimated Cost</span>
              <span className={`text-xl font-bold ${tradeMode === "BUY" && (tradeShares * profile.currentPrice) > (authUser?.auraCoins || 0) ? "text-red-500" : "text-emerald-400"}`}>
                {(tradeShares * profile.currentPrice).toFixed(2)} Au
              </span>
            </div>
            <div className="flex gap-4">
              <button onClick={() => {setTradeMode(null); setTradeShares(1);}} className="flex-1 bg-gray-800 p-4 rounded-xl font-bold hover:bg-gray-700 transition">Cancel</button>
              <button onClick={executeTrade} disabled={tradeMode === "BUY" && (tradeShares * profile.currentPrice) > (authUser?.auraCoins || 0)} className="flex-1 bg-purple-600 p-4 rounded-xl font-bold hover:bg-purple-500 transition disabled:opacity-50 disabled:cursor-not-allowed">
                Confirm {tradeMode}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
