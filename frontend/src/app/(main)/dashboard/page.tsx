"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Search, Filter, TrendingUp, TrendingDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState("price");
  const [filterYear, setFilterYear] = useState("");
  const [filterTrait, setFilterTrait] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [tradeMode, setTradeMode] = useState<"BUY" | "SELL" | null>(null);
  const [tradeShares, setTradeShares] = useState(1);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartRange, setChartRange] = useState<"24h" | "7d" | "30d">("7d");
  const router = useRouter();

  const openTradeModal = (targetUser: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user?.id) return alert("Please log in to trade!");
    setSelectedUser(targetUser);
    setTradeMode("BUY");
    setTradeShares(1);
  };

  const executeTrade = async () => {
    if (!user?.id || !selectedUser || !tradeMode) return;
    const totalCost = tradeShares * selectedUser.currentPrice;
    
    if (tradeMode === "BUY" && totalCost > (user.auraCoins || 0)) {
       return alert("Insufficient AURA balance!");
    }

    try {
      const res = await fetch("http://localhost:8080/api/market/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerId: user.id, targetUserId: selectedUser.id, shares: tradeShares, type: tradeMode })
      });
      if (res.ok) {
        alert(`Successfully executed ${tradeMode} of ${tradeShares} shares of ${selectedUser.stockSymbol}! Your balance will update.`);
        window.location.reload(); 
      } else {
        const error = await res.json();
        alert(`Trade Failed: ${error.error}`);
      }
    } catch(err) {
      console.error(err);
    }
  };

  // Fetch real price history for selected stock
  const fetchPriceHistory = async (userId: number, range: string) => {
    try {
      const res = await fetch(`http://localhost:8080/api/market/stocks/${userId}/history?range=${range}`);
      const data = await res.json();
      if (res.ok && data.history) {
        const formatted = data.history.map((h: any) => ({
          time: new Date(h.recordedAt).toLocaleString("en-IN", {
            hour: "numeric",
            minute: "2-digit",
            ...(range !== "24h" ? { month: "short", day: "numeric" } : {})
          }),
          price: parseFloat(h.price.toFixed(2)),
        }));
        setChartData(formatted);
      } else {
        setChartData([]);
      }
    } catch (err) {
      console.error(err);
      setChartData([]);
    }
  };

  // Whenever selectedUser or chartRange changes, fetch history
  useEffect(() => {
    if (selectedUser?.id) {
      fetchPriceHistory(selectedUser.id, chartRange);
    }
  }, [selectedUser?.id, chartRange]);

  useEffect(() => {
    fetchLeaderboard();
  }, [sortBy, filterYear, filterTrait]);

  useEffect(() => {
    if (user?.id) {
      fetch(`http://localhost:8080/api/user/portfolio/${user.id}`)
        .then(res => res.json())
        .then(data => { if (data.portfolio) setPortfolio(data.portfolio) })
        .catch(console.error);
    }
  }, [user?.id]);

  const fetchLeaderboard = async () => {
    try {
      const params = new URLSearchParams();
      params.append("sort", sortBy);
      if (filterYear) params.append("year", filterYear);
      if (filterTrait) params.append("trait", filterTrait);

      const res = await fetch(`http://localhost:8080/api/market/leaderboard?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setLeaderboard(data.leaderboard);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Determine chart color based on trend
  const chartColor = chartData.length >= 2 && chartData[chartData.length - 1].price >= chartData[0].price 
    ? "#10b981" : "#ef4444";

  return (
    <div className="min-h-screen bg-black text-white p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="fixed top-0 left-[-20%] w-[40%] h-[40%] bg-purple-900 rounded-full mix-blend-multiply blur-[128px] opacity-40" />
      <div className="fixed bottom-0 right-[-20%] w-[40%] h-[40%] bg-emerald-900 rounded-full mix-blend-multiply blur-[128px] opacity-40" />

      <div className="max-w-7xl mx-auto z-10 relative">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-emerald-400">
            Market Dashboard
          </h1>
          <div className="flex gap-4">
            <div className="glass p-3 rounded-xl flex items-center justify-between min-w-[150px]">
              <span className="text-gray-400 text-sm">Your AURA</span>
              <span className="font-bold text-emerald-400 text-lg">{user && user.auraCoins !== undefined ? Number(user.auraCoins).toFixed(2) : "0.00"}</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Action Area / Leaderboard */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass p-6 rounded-2xl flex flex-wrap gap-4 items-center justify-between">
              <div className="flex bg-black/50 p-1 rounded-xl w-fit">
                <button 
                  onClick={() => setSortBy("price")}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${sortBy === "price" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}
                >
                  Top Price
                </button>
                <button 
                  onClick={() => setSortBy("popularity")}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${sortBy === "popularity" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}
                >
                  Popularity
                </button>
                <button 
                  onClick={() => setSortBy("recent")}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${sortBy === "recent" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}
                >
                  Recent IPOs
                </button>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1">
                  <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <input 
                    type="text" 
                    placeholder="Filter by Year (e.g. 2024)"
                    className="w-full pl-9 pr-4 py-2 bg-black/50 border border-gray-700 rounded-xl focus:border-purple-500 outline-none text-sm"
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                  />
                </div>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <input 
                    type="text" 
                    placeholder="Search trait..."
                    className="w-full pl-9 pr-4 py-2 bg-black/50 border border-gray-700 rounded-xl focus:border-purple-500 outline-none text-sm"
                    value={filterTrait}
                    onChange={(e) => setFilterTrait(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {leaderboard.length === 0 ? (
                <div className="glass p-12 rounded-2xl text-center text-gray-500">
                  No stocks found currently.
                </div>
              ) : (
                leaderboard.map((stockUser, idx) => (
                  <div key={stockUser.id} onClick={() => { setSelectedUser(stockUser); setChartRange("7d"); }} className="glass p-4 rounded-xl flex justify-between items-center hover:bg-white/5 transition cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-emerald-500 rounded-full flex items-center justify-center font-bold text-lg">
                        {stockUser.stockSymbol}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-xl">{stockUser.currentPrice?.toFixed(2) || "10.00"} Au</div>
                      <div className="text-sm text-gray-500 flex items-center justify-end gap-1">
                        Vol: {stockUser.totalVolume || 0}
                      </div>
                    </div>

                    {String(user?.id) !== String(stockUser.id) && (
                      <button onClick={(e) => openTradeModal(stockUser, e)} className="hidden group-hover:block ml-4 px-4 py-2 bg-purple-600 rounded-lg font-bold hover:bg-purple-500">
                        Trade
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="glass p-6 rounded-2xl">
              <h2 className="text-xl font-bold mb-4">Your Portfolio</h2>
              {portfolio.length === 0 ? (
                <div className="text-center py-8 text-gray-500 border border-dashed border-gray-700 rounded-xl">
                  No stocks owned yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {portfolio.map((p, idx) => (
                    <div key={idx} className="bg-black/40 border border-gray-800 p-3 rounded-xl flex justify-between items-center group cursor-pointer hover:bg-white/5 transition" onClick={() => { setSelectedUser({ id: p.targetUserId, stockSymbol: p.stockSymbol, name: p.name, currentPrice: p.currentPrice }); setChartRange("7d"); }}>
                      <div>
                        <div className="font-bold text-lg text-purple-400">{p.stockSymbol}</div>
                        <div className="text-xs text-gray-500">{p.shares} Shares</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{p.currentPrice?.toFixed(2)} Au</div>
                        <div className={`text-xs font-bold ${p.currentPrice >= p.averagePrice ? 'text-emerald-400' : 'text-red-400'}`}>
                          {p.currentPrice >= p.averagePrice ? '+' : ''}{(((p.currentPrice - p.averagePrice) / p.averagePrice) * 100).toFixed(1)}% P/L
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Modal for detailed stock view */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
          <div className="bg-[#111] border border-gray-800 p-8 rounded-3xl max-w-2xl w-full relative" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-bold">{selectedUser.name}</h2>
                <p className="text-gray-400">{selectedUser.email}</p>
                <div className="mt-2 inline-flex items-center gap-2 bg-purple-900/30 text-purple-400 px-3 py-1 rounded-full text-sm font-bold">
                  {selectedUser.stockSymbol}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-emerald-400">{selectedUser.currentPrice?.toFixed(2)} Au</div>
              </div>
            </div>

            {tradeMode ? (
              <div className="bg-black/40 rounded-xl p-8 mb-6 border border-gray-800 text-center animate-in slide-in-from-bottom-2 fade-in">
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
                  <span className={`text-xl font-bold ${tradeMode === "BUY" && (tradeShares * selectedUser.currentPrice) > (user?.auraCoins || 0) ? "text-red-500" : "text-emerald-400"}`}>
                    {(tradeShares * selectedUser.currentPrice).toFixed(2)} Au
                  </span>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => {setTradeMode(null); setTradeShares(1);}} className="flex-1 bg-gray-800 p-4 rounded-xl font-bold hover:bg-gray-700 transition">Cancel</button>
                  <button onClick={executeTrade} disabled={tradeMode === "BUY" && (tradeShares * selectedUser.currentPrice) > (user?.auraCoins || 0)} className="flex-1 bg-purple-600 p-4 rounded-xl font-bold hover:bg-purple-500 transition disabled:opacity-50 disabled:cursor-not-allowed">
                    Confirm {tradeMode}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Chart Range Toggle */}
                <div className="flex gap-2 mb-3">
                  {(["24h", "7d", "30d"] as const).map((r) => (
                    <button key={r} onClick={() => setChartRange(r)} className={`px-3 py-1 rounded-lg text-xs font-bold transition ${chartRange === r ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                      {r.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Real Price Chart */}
                <div className="h-64 w-full bg-black/40 rounded-xl p-4 mb-6 border border-gray-800">
                  {chartData.length >= 2 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <XAxis dataKey="time" stroke="#4b5563" fontSize={11} />
                        <YAxis stroke="#4b5563" fontSize={11} domain={['dataMin - 2', 'dataMax + 2']} />
                        <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #374151', borderRadius: '8px' }} />
                        <Area type="monotone" dataKey="price" stroke={chartColor} fill={chartColor} fillOpacity={0.15} strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                      No price history yet. Trades will generate data on the next engine tick.
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => router.push(`/profile/${selectedUser.id}`)}
                    className="flex-1 bg-gray-800 p-4 rounded-xl font-bold hover:bg-gray-700 transition"
                  >
                    Visit Profile
                  </button>
                  {String(user?.id) !== String(selectedUser.id) && (
                    <button onClick={() => {setTradeMode("BUY"); setTradeShares(1);}} className="flex-1 bg-purple-600 p-4 rounded-xl font-bold hover:bg-purple-500 transition">
                      Trade {selectedUser.stockSymbol}
                    </button>
                  )}
                </div>
              </>
            )}
            
            <button onClick={() => {setSelectedUser(null); setTradeMode(null);}} className="absolute top-6 right-6 text-gray-500 hover:text-white">
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
