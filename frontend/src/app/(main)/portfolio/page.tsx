"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

interface PortfolioItem {
  shares: number;
  averagePrice: number;
  currentPrice: number;
  stockSymbol: string;
  name: string;
  targetUserId: number;
}

export default function PortfolioPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStock, setSelectedStock] = useState<PortfolioItem | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchPortfolio();
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedStock) {
      fetchHistory(selectedStock.targetUserId);
    }
  }, [selectedStock?.targetUserId]);

  const fetchPortfolio = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/user/portfolio/${user!.id}`);
      const data = await res.json();
      if (res.ok && data.portfolio) {
        setPortfolio(data.portfolio);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (userId: number) => {
    try {
      const res = await fetch(`http://localhost:8080/api/market/stocks/${userId}/history?range=7d`);
      const data = await res.json();
      if (res.ok && data.history?.length > 0) {
        setChartData(data.history.map((h: any) => ({
          time: new Date(h.recordedAt).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
          price: parseFloat(h.price.toFixed(2)),
        })));
      } else {
        setChartData([]);
      }
    } catch {
      setChartData([]);
    }
  };

  // Computed totals
  const totalInvested = portfolio.reduce((sum, p) => sum + (p.shares * p.averagePrice), 0);
  const totalCurrentValue = portfolio.reduce((sum, p) => sum + (p.shares * p.currentPrice), 0);
  const totalPL = totalCurrentValue - totalInvested;
  const totalPLPercent = totalInvested > 0 ? ((totalPL / totalInvested) * 100) : 0;

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-500 text-xl">Please log in to view your portfolio.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 relative overflow-hidden">
      {/* Background */}
      <div className="fixed top-[-10%] right-[-15%] w-[50%] h-[50%] bg-purple-900 rounded-full mix-blend-multiply blur-[160px] opacity-30" />
      <div className="fixed bottom-[-10%] left-[-15%] w-[50%] h-[50%] bg-emerald-900 rounded-full mix-blend-multiply blur-[160px] opacity-30" />

      <div className="max-w-5xl mx-auto z-10 relative">
        <header className="mb-10">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-emerald-400">
            Your Portfolio
          </h1>
          <p className="text-gray-500 mt-2">Track your investments, unrealized gains, and stock performance.</p>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          <div className="glass p-5 rounded-2xl border border-white/10">
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">AURA Balance</div>
            <div className="text-2xl font-bold text-amber-400">{Number(user.auraCoins || 0).toFixed(2)}</div>
          </div>
          <div className="glass p-5 rounded-2xl border border-white/10">
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Total Invested</div>
            <div className="text-2xl font-bold text-blue-400">{totalInvested.toFixed(2)} Au</div>
          </div>
          <div className="glass p-5 rounded-2xl border border-white/10">
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Current Value</div>
            <div className="text-2xl font-bold text-purple-400">{totalCurrentValue.toFixed(2)} Au</div>
          </div>
          <div className="glass p-5 rounded-2xl border border-white/10">
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Unrealized P/L</div>
            <div className={`text-2xl font-bold ${totalPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalPL >= 0 ? '+' : ''}{totalPL.toFixed(2)} Au
              <span className="text-sm ml-2 opacity-70">({totalPLPercent >= 0 ? '+' : ''}{totalPLPercent.toFixed(1)}%)</span>
            </div>
          </div>
        </div>

        {/* Holdings Table */}
        <div className="glass rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-5 border-b border-white/10">
            <h2 className="text-lg font-bold">Holdings ({portfolio.length})</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading portfolio...</div>
          ) : portfolio.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-500 text-lg mb-4">You don't own any stocks yet.</div>
              <button onClick={() => router.push("/dashboard")} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold transition">
                Browse Market
              </button>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-widest border-b border-white/5">
                  <th className="p-4">Stock</th>
                  <th className="p-4 text-right">Shares</th>
                  <th className="p-4 text-right">Avg. Buy Price</th>
                  <th className="p-4 text-right">Current Price</th>
                  <th className="p-4 text-right">Invested</th>
                  <th className="p-4 text-right">Current Value</th>
                  <th className="p-4 text-right">P/L</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.map((p, idx) => {
                  const invested = p.shares * p.averagePrice;
                  const currentVal = p.shares * p.currentPrice;
                  const pl = currentVal - invested;
                  const plPct = invested > 0 ? ((pl / invested) * 100) : 0;
                  const isProfit = pl >= 0;

                  return (
                    <tr
                      key={idx}
                      onClick={() => setSelectedStock(p)}
                      className="border-b border-white/5 hover:bg-white/5 transition cursor-pointer group"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-emerald-500 rounded-full flex items-center justify-center font-bold text-sm">
                            {p.stockSymbol}
                          </div>
                          <div>
                            <div className="font-bold text-white group-hover:text-purple-300 transition">{p.name}</div>
                            <div className="text-xs text-gray-500">{p.stockSymbol}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right font-bold">{p.shares}</td>
                      <td className="p-4 text-right text-gray-400">{p.averagePrice.toFixed(2)}</td>
                      <td className="p-4 text-right font-bold">{p.currentPrice.toFixed(2)}</td>
                      <td className="p-4 text-right text-blue-400">{invested.toFixed(2)}</td>
                      <td className="p-4 text-right text-purple-400">{currentVal.toFixed(2)}</td>
                      <td className="p-4 text-right">
                        <span className={`font-bold ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isProfit ? '+' : ''}{pl.toFixed(2)}
                        </span>
                        <div className={`text-xs ${isProfit ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
                          {isProfit ? '+' : ''}{plPct.toFixed(1)}%
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Stock Detail Modal */}
      {selectedStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedStock(null)}>
          <div className="bg-[#111] border border-gray-800 p-8 rounded-3xl max-w-lg w-full relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedStock(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white text-xl">✕</button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-emerald-500 rounded-full flex items-center justify-center font-bold text-xl">
                {selectedStock.stockSymbol}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{selectedStock.name}</h2>
                <p className="text-gray-400 text-sm">{selectedStock.stockSymbol} · {selectedStock.shares} Shares</p>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-black/40 border border-gray-800 p-3 rounded-xl">
                <div className="text-[10px] text-gray-500 uppercase tracking-widest">Avg. Buy</div>
                <div className="text-lg font-bold text-blue-400">{selectedStock.averagePrice.toFixed(2)} Au</div>
              </div>
              <div className="bg-black/40 border border-gray-800 p-3 rounded-xl">
                <div className="text-[10px] text-gray-500 uppercase tracking-widest">Current</div>
                <div className="text-lg font-bold text-purple-400">{selectedStock.currentPrice.toFixed(2)} Au</div>
              </div>
              <div className="bg-black/40 border border-gray-800 p-3 rounded-xl">
                <div className="text-[10px] text-gray-500 uppercase tracking-widest">Invested</div>
                <div className="text-lg font-bold">{(selectedStock.shares * selectedStock.averagePrice).toFixed(2)} Au</div>
              </div>
              <div className="bg-black/40 border border-gray-800 p-3 rounded-xl">
                <div className="text-[10px] text-gray-500 uppercase tracking-widest">P/L</div>
                {(() => {
                  const pl = (selectedStock.currentPrice - selectedStock.averagePrice) * selectedStock.shares;
                  return <div className={`text-lg font-bold ${pl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{pl >= 0 ? '+' : ''}{pl.toFixed(2)} Au</div>;
                })()}
              </div>
            </div>

            {/* Chart */}
            <div className="h-48 bg-black/40 border border-gray-800 rounded-xl p-3 mb-6">
              {chartData.length >= 2 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <XAxis dataKey="time" stroke="#4b5563" fontSize={10} />
                    <YAxis stroke="#4b5563" fontSize={10} domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #374151', borderRadius: '8px', fontSize: 12 }} />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={chartData[chartData.length - 1].price >= chartData[0].price ? "#10b981" : "#ef4444"}
                      fill={chartData[chartData.length - 1].price >= chartData[0].price ? "#10b981" : "#ef4444"}
                      fillOpacity={0.12}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">
                  No price history available yet.
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => router.push(`/profile/${selectedStock.targetUserId}`)} className="flex-1 bg-gray-800 p-3 rounded-xl font-bold hover:bg-gray-700 transition text-sm">
                View Profile
              </button>
              <button onClick={() => router.push(`/dashboard`)} className="flex-1 bg-purple-600 p-3 rounded-xl font-bold hover:bg-purple-500 transition text-sm">
                Trade More
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
