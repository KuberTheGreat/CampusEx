"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import toast from "react-hot-toast";

const CARD_ACCENTS = [
  "var(--card-mint)", "var(--card-lavender)", "var(--card-peach)",
  "var(--card-sky)", "var(--card-rose)", "var(--card-lemon)",
];

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
  const [executingTrade, setExecutingTrade] = useState(false);
  const [miniCharts, setMiniCharts] = useState<Record<number, any[]>>({});
  const router = useRouter();

  const openTradeModal = (targetUser: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user?.id) return toast.error("Please log in to trade!");
    setSelectedUser(targetUser);
    setTradeMode("BUY");
    setTradeShares(1);
  };

  const executeTrade = async () => {
    if (!user?.id || !selectedUser || !tradeMode) return;
    const totalCost = tradeShares * selectedUser.currentPrice;
    if (tradeMode === "BUY" && totalCost > (user.auraCoins || 0)) return toast.error("Insufficient AURA!");
    setExecutingTrade(true);
    try {
      const res = await fetch("http://localhost:8080/api/market/trade", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerId: user.id, targetUserId: selectedUser.id, shares: tradeShares, type: tradeMode })
      });
      if (res.ok) { toast.success(`${tradeMode} of ${tradeShares} shares of ${selectedUser.stockSymbol} executed!`); setSelectedUser(null); setTradeMode(null); window.location.reload(); }
      else { const e = await res.json(); toast.error(`Trade Failed: ${e.error}`); }
    } catch { toast.error("Network error."); }
    finally { setExecutingTrade(false); }
  };

  const fetchPriceHistory = async (userId: number, range: string) => {
    try {
      const res = await fetch(`http://localhost:8080/api/market/stocks/${userId}/history?range=${range}`);
      const data = await res.json();
      if (res.ok && data.history) {
        setChartData(data.history.map((h: any) => ({
          time: new Date(h.recordedAt).toLocaleString("en-IN", { hour: "numeric", minute: "2-digit", ...(range !== "24h" ? { month: "short", day: "numeric" } : {}) }),
          price: parseFloat(h.price.toFixed(2)),
        })));
      } else setChartData([]);
    } catch { setChartData([]); }
  };

  // Fetch mini sparklines for all leaderboard stocks
  const fetchMiniChart = async (userId: number) => {
    try {
      const res = await fetch(`http://localhost:8080/api/market/stocks/${userId}/history?range=7d`);
      const data = await res.json();
      if (res.ok && data.history?.length > 1) {
        setMiniCharts(prev => ({ ...prev, [userId]: data.history.map((h: any) => ({ price: parseFloat(h.price.toFixed(2)) })) }));
      }
    } catch { /* skip */ }
  };

  useEffect(() => { if (selectedUser?.id) fetchPriceHistory(selectedUser.id, chartRange); }, [selectedUser?.id, chartRange]);
  useEffect(() => { fetchLeaderboard(); }, [sortBy, filterYear, filterTrait]);
  useEffect(() => {
    if (user?.id) {
      fetch(`http://localhost:8080/api/user/portfolio/${user.id}`)
        .then(res => res.json()).then(data => { if (data.portfolio) setPortfolio(data.portfolio); }).catch(console.error);
    }
  }, [user?.id]);

  // Fetch mini charts when leaderboard loads
  useEffect(() => {
    leaderboard.forEach(s => { if (!miniCharts[s.id]) fetchMiniChart(s.id); });
  }, [leaderboard]);

  const fetchLeaderboard = async () => {
    try {
      const params = new URLSearchParams();
      params.append("sort", sortBy);
      if (filterYear) params.append("year", filterYear);
      if (filterTrait) params.append("trait", filterTrait);
      const res = await fetch(`http://localhost:8080/api/market/leaderboard?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setLeaderboard(data.leaderboard);
    } catch (err) { console.error(err); }
  };

  const chartColor = chartData.length >= 2 && chartData[chartData.length - 1].price >= chartData[0].price ? "var(--accent-green)" : "var(--accent-red)";

  return (
    <div className="min-h-screen p-6" style={{ background: "var(--bg)" }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-8 animate-fade-in">
          <div>
            <h1 className="text-3xl font-extrabold" style={{ color: "var(--text)" }}>Market Hub</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Browse, analyze, and trade campus stocks.</p>
          </div>
          <div className="card px-5 py-3 flex items-center gap-3">
            <span className="text-lg">✨</span>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Your AURA</div>
              <div className="text-lg font-extrabold" style={{ color: "var(--primary)" }}>
                {user?.auraCoins !== undefined ? Number(user.auraCoins).toFixed(2) : "—"}
              </div>
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="card p-4 mb-6 flex flex-wrap gap-3 items-center">
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
            {["price", "popularity", "recent"].map((s) => (
              <button key={s} onClick={() => setSortBy(s)}
                className="px-4 py-2 text-sm font-semibold transition-all capitalize"
                style={{ background: sortBy === s ? "var(--primary)" : "transparent", color: sortBy === s ? "#fff" : "var(--text-secondary)" }}>
                {s === "price" ? "Top Price" : s === "popularity" ? "Popular" : "Recent"}
              </button>
            ))}
          </div>
          <input className="input flex-1 min-w-[140px]" placeholder="Filter by year..." value={filterYear} onChange={(e) => setFilterYear(e.target.value)} />
          <input className="input flex-1 min-w-[140px]" placeholder="Search trait..." value={filterTrait} onChange={(e) => setFilterTrait(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* ═══════ STOCK CARDS GRID ═══════ */}
          <div className="lg:col-span-3">
            {leaderboard.length === 0 ? (
              <div className="card p-12 text-center" style={{ color: "var(--text-muted)" }}>No stocks found.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {leaderboard.map((s, idx) => {
                  const accent = CARD_ACCENTS[idx % CARD_ACCENTS.length];
                  const miniData = miniCharts[s.id] || [];
                  const trend = miniData.length >= 2 ? ((miniData[miniData.length - 1].price - miniData[0].price) / miniData[0].price * 100) : 0;
                  const trendPositive = trend >= 0;

                  return (
                    <div key={s.id} className="stock-card" style={{ background: accent }}>
                      {/* ── Compact top section (always visible) ── */}
                      <div className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar userId={s.id} name={s.name} size={44} />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm truncate" style={{ color: "var(--text)" }}>{s.name}</div>
                            <div className="text-xs font-bold" style={{ color: "var(--primary)" }}>${s.stockSymbol}</div>
                          </div>
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <div className="text-2xl font-extrabold leading-none" style={{ color: "var(--text)" }}>
                              {s.currentPrice?.toFixed(2)}
                              <span className="text-xs font-medium ml-1" style={{ color: "var(--text-muted)" }}>Au</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{
                              background: trendPositive ? "rgba(52,199,89,0.12)" : "rgba(255,59,48,0.12)",
                              color: trendPositive ? "var(--accent-green)" : "var(--accent-red)"
                            }}>
                              {trendPositive ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}%
                            </span>
                            <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>Vol: {s.totalVolume || 0}</div>
                          </div>
                        </div>
                      </div>

                      {/* ── Expandable section (on hover) ── */}
                      <div className="card-expand">
                        {/* Mini sparkline */}
                        <div className="h-16 w-full mb-3 rounded-lg overflow-hidden" style={{ background: "var(--bg)" }}>
                          {miniData.length >= 2 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={miniData}>
                                <Area type="monotone" dataKey="price"
                                  stroke={trendPositive ? "var(--accent-green)" : "var(--accent-red)"}
                                  fill={trendPositive ? "var(--accent-green)" : "var(--accent-red)"}
                                  fillOpacity={0.15} strokeWidth={1.5} />
                              </AreaChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px]" style={{ color: "var(--text-muted)" }}>No chart data</div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2">
                          <button onClick={(e) => { e.stopPropagation(); router.push(`/profile/${s.id}`); }}
                            className="btn-secondary flex-1 text-xs py-2">Visit</button>
                          {String(user?.id) !== String(s.id) && (
                            <button onClick={(e) => openTradeModal(s, e)}
                              className="btn-primary flex-1 text-xs py-2">Trade</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ═══════ PORTFOLIO SIDEBAR ═══════ */}
          <div className="space-y-4">
            <div className="card p-5">
              <h2 className="font-bold text-base mb-4" style={{ color: "var(--text)" }}>Your Portfolio</h2>
              {portfolio.length === 0 ? (
                <div className="text-center py-6 text-sm" style={{ color: "var(--text-muted)", border: "1px dashed var(--border)", borderRadius: "14px" }}>
                  No stocks owned yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {portfolio.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                      style={{ background: "var(--bg)" }}
                      onClick={() => { setSelectedUser({ id: p.targetUserId, stockSymbol: p.stockSymbol, name: p.name, currentPrice: p.currentPrice }); setChartRange("7d"); }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg)"; }}>
                      <Avatar userId={p.targetUserId} name={p.name} size={32} />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs truncate" style={{ color: "var(--primary)" }}>{p.stockSymbol}</div>
                        <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{p.shares} Shares</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-xs" style={{ color: "var(--text)" }}>{p.currentPrice?.toFixed(2)} Au</div>
                        <div className="text-[10px] font-bold" style={{ color: p.currentPrice >= p.averagePrice ? "var(--accent-green)" : "var(--accent-red)" }}>
                          {p.currentPrice >= p.averagePrice ? "+" : ""}{(((p.currentPrice - p.averagePrice) / p.averagePrice) * 100).toFixed(1)}%
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

      {/* ═══════ MODAL ═══════ */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }} onClick={() => setSelectedUser(null)}>
          <div className="card p-8 max-w-2xl w-full relative animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setSelectedUser(null); setTradeMode(null); }} className="absolute top-4 right-5 text-xl" style={{ color: "var(--text-muted)" }}>✕</button>

            <div className="flex items-start gap-4 mb-6">
              <Avatar userId={selectedUser.id} name={selectedUser.name} size={56} />
              <div className="flex-1">
                <h2 className="text-2xl font-extrabold" style={{ color: "var(--text)" }}>{selectedUser.name}</h2>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{selectedUser.email}</p>
                <span className="badge mt-2">{selectedUser.stockSymbol}</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-extrabold" style={{ color: "var(--primary)" }}>{selectedUser.currentPrice?.toFixed(2)} Au</div>
              </div>
            </div>

            {tradeMode ? (
              <div className="card p-6 animate-fade-in">
                <h3 className="text-xl font-bold text-center mb-5" style={{ color: "var(--text)" }}>Execute Trade</h3>
                <div className="flex gap-3 justify-center mb-5">
                  <button onClick={() => setTradeMode("BUY")} className="px-5 py-2 rounded-xl font-bold text-sm transition" style={{ background: tradeMode === "BUY" ? "var(--accent-green)" : "var(--bg)", color: tradeMode === "BUY" ? "#fff" : "var(--text-secondary)", border: "1px solid var(--border)" }}>BUY</button>
                  <button onClick={() => setTradeMode("SELL")} className="px-5 py-2 rounded-xl font-bold text-sm transition" style={{ background: tradeMode === "SELL" ? "var(--accent-red)" : "var(--bg)", color: tradeMode === "SELL" ? "#fff" : "var(--text-secondary)", border: "1px solid var(--border)" }}>SELL</button>
                </div>
                <div className="max-w-xs mx-auto mb-5">
                  <label className="block text-xs mb-2 font-bold" style={{ color: "var(--text-secondary)" }}>Number of Shares</label>
                  <input type="number" min="1" value={tradeShares} onChange={(e) => setTradeShares(Math.max(1, parseInt(e.target.value) || 1))} className="input w-full text-center text-xl font-bold" />
                </div>
                <div className="flex justify-between items-center p-4 rounded-xl mb-5" style={{ background: "var(--bg)" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Total Cost</span>
                  <span className="text-lg font-bold" style={{ color: tradeMode === "BUY" && (tradeShares * selectedUser.currentPrice) > (user?.auraCoins || 0) ? "var(--accent-red)" : "var(--primary)" }}>
                    {(tradeShares * selectedUser.currentPrice).toFixed(2)} Au
                  </span>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setTradeMode(null); setTradeShares(1); }} className="btn-secondary flex-1">Cancel</button>
                  <button onClick={executeTrade} disabled={executingTrade || (tradeMode === "BUY" && (tradeShares * selectedUser.currentPrice) > (user?.auraCoins || 0))} className="btn-primary flex-1 disabled:opacity-40">
                    {executingTrade ? "Executing..." : `Confirm ${tradeMode}`}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-3">
                  {(["24h", "7d", "30d"] as const).map((r) => (
                    <button key={r} onClick={() => setChartRange(r)} className="px-3 py-1 rounded-lg text-xs font-bold transition" style={{ background: chartRange === r ? "var(--primary)" : "var(--bg)", color: chartRange === r ? "#fff" : "var(--text-muted)" }}>{r.toUpperCase()}</button>
                  ))}
                </div>
                <div className="h-52 w-full rounded-xl p-3 mb-5" style={{ background: "var(--bg)" }}>
                  {chartData.length >= 2 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={10} />
                        <YAxis stroke="var(--text-muted)" fontSize={10} domain={["dataMin - 2", "dataMax + 2"]} />
                        <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", color: "var(--text)", fontSize: 12 }} />
                        <Area type="monotone" dataKey="price" stroke={chartColor} fill={chartColor} fillOpacity={0.12} strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>No price history yet.</div>
                  )}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => router.push(`/profile/${selectedUser.id}`)} className="btn-secondary flex-1">View Profile</button>
                  {String(user?.id) !== String(selectedUser.id) && (
                    <button onClick={() => { setTradeMode("BUY"); setTradeShares(1); }} className="btn-primary flex-1">Trade {selectedUser.stockSymbol}</button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
