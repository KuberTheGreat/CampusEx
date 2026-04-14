"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { IconCrown, IconTrendUp, IconTrendDown, IconMarket, IconLightning, IconPortfolio, IconFire } from "@/components/Icons";
import toast from "react-hot-toast";

const CARD_FLAVORS = [
  "var(--card-1)", "var(--card-2)", "var(--card-3)",
  "var(--card-4)", "var(--card-5)", "var(--card-6)",
];

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
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
      const res = await fetch("/api/market/trade", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerId: user.id, targetUserId: selectedUser.id, shares: tradeShares, type: tradeMode })
      });
      if (res.ok) { toast.success(`${tradeMode} executed!`); setSelectedUser(null); setTradeMode(null); window.location.reload(); }
      else { const e = await res.json(); toast.error(`Trade Failed: ${e.error}`); }
    } catch { toast.error("Network error."); }
    finally { setExecutingTrade(false); }
  };

  const fetchPriceHistory = async (userId: number, range: string) => {
    try {
      const res = await fetch(`/api/market/stocks/${userId}/history?range=${range}`);
      const data = await res.json();
      if (res.ok && data.history) {
        setChartData(data.history.map((h: any) => ({
          time: new Date(h.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          price: h.price,
        })));
      }
    } catch { setChartData([]); }
  };

  useEffect(() => {
    if (selectedUser?.id) fetchPriceHistory(selectedUser.id, chartRange);
  }, [selectedUser?.id, chartRange]);

  useEffect(() => {
    fetchLeaderboard(); fetchPortfolio();
  }, [user, sortBy, filterYear, filterTrait]);

  const fetchPortfolio = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/user/portfolio/${user.id}`);
      const data = await res.json();
      if (res.ok) setPortfolio(data.portfolio || []);
    } catch { }
  };

  const fetchLeaderboard = async () => {
    let url = `/api/market/leaderboard?sortBy=${sortBy}`;
    if (filterYear) url += `&year=${filterYear}`;
    if (filterTrait) url += `&trait=${filterTrait}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setLeaderboard(data.leaderboard);
        // Fetch mini charts for all users
        for (const u of data.leaderboard) {
          fetch(`/api/market/stocks/${u.id}/history?range=7d`)
            .then(r => r.json())
            .then(d => {
              if (d.history?.length >= 2) {
                setMiniCharts(prev => ({
                  ...prev,
                  [u.id]: d.history.map((h: any) => ({ price: h.price }))
                }));
              }
            })
            .catch(() => {});
        }
      }
    } catch { }
  };

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  const chartColor = chartData.length >= 2 && chartData[chartData.length - 1].price >= chartData[0].price ? "var(--green)" : "var(--red)";

  return (
    <div className="min-h-screen p-4 md:p-6 relative z-10">
      <div className="max-w-7xl mx-auto">

        {/* ═══ HEADER ═══ */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 animate-fade-in gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <IconMarket size={32} color="var(--accent)" />
              <h1 className="text-3xl md:text-4xl font-black tracking-tight" style={{ color: "var(--text)" }}>
                The Market
              </h1>
            </div>
            <p className="text-sm font-medium ml-11" style={{ color: "var(--text-secondary)" }}>
              trade people like stocks. yes, we went there.
            </p>
          </div>
          <div
            className="card px-6 py-4 flex items-center gap-4"
            style={{ background: "var(--bg-card)", border: "2px solid var(--accent)", boxShadow: "0 0 20px var(--accent-glow)" }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-soft)" }}>
              <IconLightning size={22} color="var(--accent)" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Your AURA
              </div>
              <div className="text-xl font-black" style={{ color: "var(--accent)" }}>
                {user?.auraCoins !== undefined ? Number(user.auraCoins).toFixed(2) : "—"}
              </div>
            </div>
          </div>
        </header>

        {/* ═══ TOP 3 SPOTLIGHT ═══ */}
        {top3.length >= 3 && (
          <section className="mb-12 animate-fade-in">
            <div className="flex items-center gap-2 mb-6">
              <IconCrown size={24} color="var(--yellow)" />
              <h2 className="text-xl font-black" style={{ color: "var(--text)" }}>
                Leaderboard Spotlight
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 items-end">
              {/* Silver (rank 2) — left, shorter */}
              {(() => {
                const s = top3[1]; const miniData = miniCharts[s.id] || [];
                const trend = miniData.length >= 2 ? ((miniData[miniData.length - 1].price - miniData[0].price) / miniData[0].price * 100) : 0;
                return (
                  <div className="spotlight-card silver cursor-pointer animate-bounce-in" onClick={() => openTradeModal(s)} style={{ minHeight: 280 }}>
                    <div className="flex justify-center mb-2">
                      <span className="text-xl font-black" style={{ color: "#C0C0C0" }}>#2</span>
                    </div>
                    <div className="flex justify-center mb-3"><Avatar userId={s.id} name={s.name} size={60} /></div>
                    <h3 className="feature-text text-base font-black mb-1" style={{ color: "var(--text)" }}>{s.name}</h3>
                    <div className="text-xs font-bold mb-2" style={{ color: "var(--accent)" }}>${s.stockSymbol}</div>
                    <div className="text-xl font-black" style={{ color: "var(--text)" }}>{s.currentPrice?.toFixed(2)} <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Au</span></div>
                    <div className="flex justify-center mt-2">
                      <span className="badge text-xs" style={{ background: trend >= 0 ? "rgba(45,212,160,0.15)" : "rgba(255,77,106,0.15)", color: trend >= 0 ? "var(--green)" : "var(--red)" }}>
                        {trend >= 0 ? <IconTrendUp size={12} /> : <IconTrendDown size={12} />} <span className="ml-1">{Math.abs(trend).toFixed(1)}%</span>
                      </span>
                    </div>
                    {miniData.length >= 2 && (
                      <div className="graph-container mt-3" style={{ height: 48 }}>
                        <ResponsiveContainer width="99%" height="100%" minHeight={1} minWidth={1}><AreaChart data={miniData}><YAxis hide domain={['dataMin - 1', 'dataMax + 1']} /><Area type="monotone" dataKey="price" stroke={trend >= 0 ? "var(--green)" : "var(--red)"} fill={trend >= 0 ? "var(--green)" : "var(--red)"} fillOpacity={0.2} strokeWidth={2} /></AreaChart></ResponsiveContainer>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Gold (rank 1) — center, taller */}
              {(() => {
                const s = top3[0]; const miniData = miniCharts[s.id] || [];
                const trend = miniData.length >= 2 ? ((miniData[miniData.length - 1].price - miniData[0].price) / miniData[0].price * 100) : 0;
                return (
                  <div className="spotlight-card gold cursor-pointer animate-bounce-in" onClick={() => openTradeModal(s)} style={{ minHeight: 340, animationDelay: "0.1s" }}>
                    <div className="flex justify-center mb-2">
                      <IconCrown size={28} color="#FFD700" />
                    </div>
                    <div className="flex justify-center mb-4"><Avatar userId={s.id} name={s.name} size={84} /></div>
                    <h3 className="feature-text text-xl font-black mb-1" style={{ color: "var(--text)" }}>{s.name}</h3>
                    <div className="text-sm font-bold mb-3" style={{ color: "var(--accent)" }}>${s.stockSymbol}</div>
                    <div className="flex items-center justify-center gap-1">
                      <span className="tag tag-hot"><IconFire size={10} /> HOT</span>
                    </div>
                    <div className="text-3xl font-black mt-2" style={{ color: "var(--text)" }}>{s.currentPrice?.toFixed(2)} <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Au</span></div>
                    <div className="flex justify-center mt-2">
                      <span className="badge text-xs" style={{ background: trend >= 0 ? "rgba(45,212,160,0.15)" : "rgba(255,77,106,0.15)", color: trend >= 0 ? "var(--green)" : "var(--red)" }}>
                        {trend >= 0 ? <IconTrendUp size={14} /> : <IconTrendDown size={14} />} <span className="ml-1">{Math.abs(trend).toFixed(1)}%</span>
                      </span>
                    </div>
                    {miniData.length >= 2 && (
                      <div className="graph-container mt-3" style={{ height: 64 }}>
                        <ResponsiveContainer width="99%" height="100%" minHeight={1} minWidth={1}><AreaChart data={miniData}><YAxis hide domain={['dataMin - 1', 'dataMax + 1']} /><Area type="monotone" dataKey="price" stroke={trend >= 0 ? "var(--green)" : "var(--red)"} fill={trend >= 0 ? "var(--green)" : "var(--red)"} fillOpacity={0.2} strokeWidth={2} /></AreaChart></ResponsiveContainer>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Bronze (rank 3) — right, shorter */}
              {(() => {
                const s = top3[2]; const miniData = miniCharts[s.id] || [];
                const trend = miniData.length >= 2 ? ((miniData[miniData.length - 1].price - miniData[0].price) / miniData[0].price * 100) : 0;
                return (
                  <div className="spotlight-card bronze cursor-pointer animate-bounce-in" onClick={() => openTradeModal(s)} style={{ minHeight: 280, animationDelay: "0.2s" }}>
                    <div className="flex justify-center mb-2">
                      <span className="text-xl font-black" style={{ color: "#CD7F32" }}>#3</span>
                    </div>
                    <div className="flex justify-center mb-3"><Avatar userId={s.id} name={s.name} size={60} /></div>
                    <h3 className="feature-text text-base font-black mb-1" style={{ color: "var(--text)" }}>{s.name}</h3>
                    <div className="text-xs font-bold mb-2" style={{ color: "var(--accent)" }}>${s.stockSymbol}</div>
                    <div className="text-xl font-black" style={{ color: "var(--text)" }}>{s.currentPrice?.toFixed(2)} <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Au</span></div>
                    <div className="flex justify-center mt-2">
                      <span className="badge text-xs" style={{ background: trend >= 0 ? "rgba(45,212,160,0.15)" : "rgba(255,77,106,0.15)", color: trend >= 0 ? "var(--green)" : "var(--red)" }}>
                        {trend >= 0 ? <IconTrendUp size={12} /> : <IconTrendDown size={12} />} <span className="ml-1">{Math.abs(trend).toFixed(1)}%</span>
                      </span>
                    </div>
                    {miniData.length >= 2 && (
                      <div className="graph-container mt-3" style={{ height: 48 }}>
                        <ResponsiveContainer width="99%" height="100%" minHeight={1} minWidth={1}><AreaChart data={miniData}><YAxis hide domain={['dataMin - 1', 'dataMax + 1']} /><Area type="monotone" dataKey="price" stroke={trend >= 0 ? "var(--green)" : "var(--red)"} fill={trend >= 0 ? "var(--green)" : "var(--red)"} fillOpacity={0.2} strokeWidth={2} /></AreaChart></ResponsiveContainer>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </section>
        )}

        {/* ═══ FILTERS ═══ */}
        <div className="card p-4 mb-6 flex flex-wrap gap-3 items-center" style={{ background: "var(--bg-card)" }}>
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
            {["price", "popularity", "recent"].map((s) => (
              <button key={s} onClick={() => setSortBy(s)}
                className="px-4 py-2 text-sm font-bold transition-all capitalize"
                style={{ background: sortBy === s ? "var(--accent)" : "transparent", color: sortBy === s ? "#fff" : "var(--text-secondary)" }}>
                {s === "price" ? "Top Price" : s === "popularity" ? "Popular" : "Recent"}
              </button>
            ))}
          </div>
          <input className="input flex-1 min-w-[140px]" placeholder="Filter by year..." value={filterYear} onChange={(e) => setFilterYear(e.target.value)} />
          <input className="input flex-1 min-w-[140px]" placeholder="Search trait..." value={filterTrait} onChange={(e) => setFilterTrait(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
          {/* ═══ STOCK CARDS GRID ═══ */}
          <div className="lg:col-span-3">
            {rest.length === 0 && top3.length === 0 ? (
              <div className="card p-12 text-center" style={{ color: "var(--text-muted)" }}>No stocks found.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {rest.map((s, idx) => {
                  const accent = CARD_FLAVORS[(idx + 3) % CARD_FLAVORS.length];
                  const miniData = miniCharts[s.id] || [];
                  const trend = miniData.length >= 2 ? ((miniData[miniData.length - 1].price - miniData[0].price) / miniData[0].price * 100) : 0;
                  const trendPositive = trend >= 0;
                  // Playful tag logic
                  const vol = s.totalVolume || 0;
                  const tagType = vol > 20 ? "hot" : trend > 5 ? "trending" : trend < -5 ? "risky" : null;

                  return (
                    <div key={s.id} className="stock-card cursor-pointer animate-bounce-in" style={{ background: accent, animationDelay: `${idx * 0.05}s` }}
                      onClick={() => openTradeModal(s)}>
                      <div className="p-5 flex flex-col h-full">
                        <div className="flex items-center gap-3 mb-4">
                          <Avatar userId={s.id} name={s.name} size={48} />
                          <div className="flex-1 min-w-0">
                            <div className="feature-text font-bold text-sm truncate" style={{ color: "var(--text)" }}>{s.name}</div>
                            <div className="text-xs font-bold" style={{ color: "var(--accent)" }}>${s.stockSymbol}</div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: "var(--bg-card)", color: "var(--text-muted)" }}>#{idx + 4}</span>
                            {tagType && (
                              <span className={`tag tag-${tagType}`}>
                                {tagType === "hot" && <><IconFire size={10} /> HOT</>}
                                {tagType === "trending" && <><IconTrendUp size={10} /> UP</>}
                                {tagType === "risky" && <><IconTrendDown size={10} /> DIP</>}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-end justify-between mb-4">
                          <div>
                            <div className="text-2xl font-black leading-none" style={{ color: "var(--text)" }}>
                              {s.currentPrice?.toFixed(2)}
                              <span className="text-xs font-medium ml-1" style={{ color: "var(--text-muted)" }}>Au</span>
                            </div>
                          </div>
                          <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg" style={{
                            background: trendPositive ? "rgba(45,212,160,0.12)" : "rgba(255,77,106,0.12)",
                            color: trendPositive ? "var(--green)" : "var(--red)"
                          }}>
                            {trendPositive ? <IconTrendUp size={14} /> : <IconTrendDown size={14} />}
                            {Math.abs(trend).toFixed(1)}%
                          </span>
                        </div>

                        {/* Graph — fixed height container */}
                        <div className="graph-container mb-4 h-16">
                          {miniData.length >= 2 ? (
                            <ResponsiveContainer width="99%" height="100%" minHeight={1} minWidth={1}>
                              <AreaChart data={miniData}><YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                                <Area type="monotone" dataKey="price"
                                  stroke={trendPositive ? "var(--green)" : "var(--red)"}
                                  fill={trendPositive ? "var(--green)" : "var(--red)"}
                                  fillOpacity={0.15} strokeWidth={2} />
                              </AreaChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px]" style={{ color: "var(--text-muted)" }}>
                              awaiting data...
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 mt-auto">
                          <button onClick={(e) => { e.stopPropagation(); router.push(`/profile/${s.id}`); }}
                            className="btn-secondary flex-1 text-xs py-2.5">Visit</button>
                          {String(user?.id) !== String(s.id) && (
                            <button onClick={(e) => openTradeModal(s, e)}
                              className="btn-accent flex-1 text-xs py-2.5">Trade</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ═══ PORTFOLIO SIDEBAR ═══ */}
          <div className="space-y-4">
            <div className="card p-5">
              <h2 className="font-black text-base mb-4 flex items-center gap-2" style={{ color: "var(--text)" }}>
                <IconPortfolio size={18} color="var(--accent)" /> Your Bag
              </h2>
              {portfolio.length === 0 ? (
                <div className="text-center py-8 text-sm rounded-2xl" style={{ color: "var(--text-muted)", border: "1px dashed var(--border)" }}>
                  Nothing here yet. Start trading!
                </div>
              ) : (
                <div className="space-y-2">
                  {portfolio.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                      style={{ background: "var(--bg)" }}
                      onClick={() => { setSelectedUser({ id: p.targetUserId, stockSymbol: p.stockSymbol, name: p.name, currentPrice: p.currentPrice }); setChartRange("7d"); }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg)"; }}>
                      <Avatar userId={p.targetUserId} name={p.name} size={32} />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs truncate" style={{ color: "var(--accent)" }}>{p.stockSymbol}</div>
                        <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{p.shares} Shares</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-xs" style={{ color: "var(--text)" }}>{p.currentPrice?.toFixed(2)} Au</div>
                        <div className="text-[10px] font-bold" style={{ color: p.currentPrice >= p.averagePrice ? "var(--green)" : "var(--red)" }}>
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

      {/* ═══ TRADE MODAL ═══ */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(12px)" }}
          onClick={() => setSelectedUser(null)}>
          <div className="card p-6 md:p-8 max-w-2xl w-full relative animate-fade-in rounded-t-3xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <button onClick={() => { setSelectedUser(null); setTradeMode(null); }} className="absolute top-4 right-5 text-xl" style={{ color: "var(--text-muted)" }}>✕</button>

            <div className="flex items-center gap-4 mb-6">
              <Avatar userId={selectedUser.id} name={selectedUser.name} size={64} />
              <div>
                <h2 className="text-2xl font-black" style={{ color: "var(--text)" }}>{selectedUser.name}</h2>
                <div className="text-sm font-bold" style={{ color: "var(--accent)" }}>${selectedUser.stockSymbol}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="text-3xl font-black" style={{ color: "var(--text)" }}>{selectedUser.currentPrice?.toFixed(2)}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>AURA per share</div>
              </div>
            </div>

            {/* Chart */}
            <div className="rounded-2xl overflow-hidden mb-6" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <div className="flex justify-end gap-1 p-3">
                {(["24h", "7d", "30d"] as const).map((r) => (
                  <button key={r} onClick={() => setChartRange(r)}
                    className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
                    style={{ background: chartRange === r ? "var(--accent)" : "transparent", color: chartRange === r ? "#fff" : "var(--text-muted)" }}>
                    {r}
                  </button>
                ))}
              </div>
              <div className="h-40 px-3 pb-3">
                {chartData.length >= 2 ? (
                  <ResponsiveContainer width="99%" height="100%" minHeight={1} minWidth={1}>
                    <AreaChart data={chartData}>
                      <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                      <Area type="monotone" dataKey="price" stroke={chartColor} fill={chartColor} fillOpacity={0.1} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>Loading chart...</div>
                )}
              </div>
            </div>

            {/* Trade controls */}
            <div className="flex gap-3 mb-4">
              <button onClick={() => setTradeMode("BUY")}
                className="flex-1 py-3 font-bold text-sm rounded-xl transition-all"
                style={{ background: tradeMode === "BUY" ? "var(--green)" : "var(--bg)", color: tradeMode === "BUY" ? "#fff" : "var(--text-secondary)", border: `1px solid ${tradeMode === "BUY" ? "var(--green)" : "var(--border)"}` }}>
                BUY
              </button>
              <button onClick={() => setTradeMode("SELL")}
                className="flex-1 py-3 font-bold text-sm rounded-xl transition-all"
                style={{ background: tradeMode === "SELL" ? "var(--red)" : "var(--bg)", color: tradeMode === "SELL" ? "#fff" : "var(--text-secondary)", border: `1px solid ${tradeMode === "SELL" ? "var(--red)" : "var(--border)"}` }}>
                SELL
              </button>
            </div>
            {tradeMode && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-4 mb-4 p-4 rounded-xl" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <div className="flex-1">
                    <label className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--text-muted)" }}>Shares</label>
                    <input type="number" min="1" value={tradeShares} onChange={(e) => setTradeShares(Math.max(1, parseInt(e.target.value) || 1))} className="input w-full text-xl font-black mt-1" />
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "var(--text-muted)" }}>Total Cost</div>
                    <div className="text-2xl font-black mt-1" style={{ color: "var(--text)" }}>{(tradeShares * selectedUser.currentPrice).toFixed(2)} Au</div>
                  </div>
                </div>
                <button
                  onClick={executeTrade}
                  disabled={executingTrade || (tradeMode === "BUY" && (tradeShares * selectedUser.currentPrice) > (user?.auraCoins || 0))}
                  className="btn-accent w-full py-4 text-base disabled:opacity-40">
                  {executingTrade ? "Processing..." : `Confirm ${tradeMode}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
