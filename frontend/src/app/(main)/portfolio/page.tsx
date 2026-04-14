"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";

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

  useEffect(() => { if (user?.id) fetchPortfolio(); }, [user?.id]);
  useEffect(() => { if (selectedStock) fetchHistory(selectedStock.targetUserId); }, [selectedStock?.targetUserId]);

  const fetchPortfolio = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/user/portfolio/${user!.id}`);
      const data = await res.json();
      if (res.ok && data.portfolio) setPortfolio(data.portfolio);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchHistory = async (userId: number) => {
    try {
      const res = await fetch(`http://localhost:8080/api/market/stocks/${userId}/history?range=7d`);
      const data = await res.json();
      if (res.ok && data.history?.length > 0) {
        setChartData(data.history.map((h: any) => ({ time: new Date(h.recordedAt).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }), price: parseFloat(h.price.toFixed(2)) })));
      } else setChartData([]);
    } catch { setChartData([]); }
  };

  const totalInvested = portfolio.reduce((s, p) => s + p.shares * p.averagePrice, 0);
  const totalCurrent = portfolio.reduce((s, p) => s + p.shares * p.currentPrice, 0);
  const totalPL = totalCurrent - totalInvested;
  const totalPLPct = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

  if (!user) return <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)", color: "var(--text-muted)" }}>Please log in to view your portfolio.</div>;

  return (
    <div className="min-h-screen p-6 animate-fade-in">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-black flex items-center gap-3" style={{ color: "var(--text)" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
              <rect x="3" y="7" width="18" height="14" rx="3" stroke="var(--accent)" strokeWidth="2" />
              <path d="M8 7V5C8 3.9 8.9 3 10 3H14C15.1 3 16 3.9 16 5V7" stroke="var(--accent)" strokeWidth="2" />
              <circle cx="12" cy="14" r="2.5" fill="var(--accent)" opacity="0.5" />
            </svg>
            Portfolio
          </h1>
          <p className="text-sm mt-1 ml-11" style={{ color: "var(--text-secondary)" }}>your bags. your gains. your call.</p>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "AURA Balance", value: Number(user.auraCoins || 0).toFixed(2), color: "var(--primary)" },
            { label: "Total Invested", value: `${totalInvested.toFixed(2)} Au`, color: "var(--accent-blue)" },
            { label: "Current Value", value: `${totalCurrent.toFixed(2)} Au`, color: "var(--accent-purple)" },
            { label: "Unrealized P/L", value: `${totalPL >= 0 ? '+' : ''}${totalPL.toFixed(2)} Au`, color: totalPL >= 0 ? "var(--accent-green)" : "var(--accent-red)", sub: `(${totalPLPct >= 0 ? '+' : ''}${totalPLPct.toFixed(1)}%)` },
          ].map((c, i) => (
            <div key={i} className="card p-5">
              <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>{c.label}</div>
              <div className="text-xl font-extrabold" style={{ color: c.color }}>{c.value} {c.sub && <span className="text-sm opacity-70">{c.sub}</span>}</div>
            </div>
          ))}
        </div>

        {/* Holdings */}
        <div className="card overflow-hidden">
          <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
            <h2 className="font-bold" style={{ color: "var(--text)" }}>Holdings ({portfolio.length})</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center" style={{ color: "var(--text-muted)" }}>Loading...</div>
          ) : portfolio.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-lg mb-4" style={{ color: "var(--text-muted)" }}>You don't own any stocks yet.</p>
              <button onClick={() => router.push("/dashboard")} className="btn-primary">Browse Market</button>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Stock", "Shares", "Avg Buy", "Current", "Invested", "Value", "P/L"].map(h => (
                    <th key={h} className="p-4 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {portfolio.map((p, i) => {
                  const inv = p.shares * p.averagePrice;
                  const cur = p.shares * p.currentPrice;
                  const pl = cur - inv;
                  const plPct = inv > 0 ? (pl / inv) * 100 : 0;
                  const profit = pl >= 0;
                  return (
                    <tr key={i} onClick={() => setSelectedStock(p)} className="cursor-pointer transition-all" style={{ borderBottom: "1px solid var(--border)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar userId={p.targetUserId} name={p.name} size={36} />
                          <div><div className="font-bold" style={{ color: "var(--text)" }}>{p.name}</div><div className="text-xs" style={{ color: "var(--text-muted)" }}>{p.stockSymbol}</div></div>
                        </div>
                      </td>
                      <td className="p-4 font-bold" style={{ color: "var(--text)" }}>{p.shares}</td>
                      <td className="p-4" style={{ color: "var(--text-secondary)" }}>{p.averagePrice.toFixed(2)}</td>
                      <td className="p-4 font-bold" style={{ color: "var(--text)" }}>{p.currentPrice.toFixed(2)}</td>
                      <td className="p-4" style={{ color: "var(--accent-blue)" }}>{inv.toFixed(2)}</td>
                      <td className="p-4" style={{ color: "var(--accent-purple)" }}>{cur.toFixed(2)}</td>
                      <td className="p-4">
                        <span className="font-bold" style={{ color: profit ? "var(--accent-green)" : "var(--accent-red)" }}>{profit ? "+" : ""}{pl.toFixed(2)}</span>
                        <div className="text-xs" style={{ color: profit ? "var(--accent-green)" : "var(--accent-red)", opacity: 0.7 }}>{profit ? "+" : ""}{plPct.toFixed(1)}%</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }} onClick={() => setSelectedStock(null)}>
          <div className="card p-8 max-w-lg w-full relative animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedStock(null)} className="absolute top-4 right-5 text-xl" style={{ color: "var(--text-muted)" }}>✕</button>
            <div className="flex items-center gap-4 mb-6">
              <Avatar userId={selectedStock.targetUserId} name={selectedStock.name} size={48} />
              <div>
                <h2 className="text-xl font-extrabold" style={{ color: "var(--text)" }}>{selectedStock.name}</h2>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{selectedStock.stockSymbol} · {selectedStock.shares} Shares</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: "Avg Buy", val: selectedStock.averagePrice.toFixed(2) + " Au", color: "var(--accent-blue)" },
                { label: "Current", val: selectedStock.currentPrice.toFixed(2) + " Au", color: "var(--accent-purple)" },
                { label: "Invested", val: (selectedStock.shares * selectedStock.averagePrice).toFixed(2) + " Au", color: "var(--text)" },
                { label: "P/L", val: (() => { const pl = (selectedStock.currentPrice - selectedStock.averagePrice) * selectedStock.shares; return (pl >= 0 ? "+" : "") + pl.toFixed(2) + " Au"; })(), color: (selectedStock.currentPrice - selectedStock.averagePrice) >= 0 ? "var(--accent-green)" : "var(--accent-red)" },
              ].map((m, i) => (
                <div key={i} className="p-3 rounded-xl" style={{ background: "var(--bg)" }}>
                  <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{m.label}</div>
                  <div className="text-lg font-bold" style={{ color: m.color }}>{m.val}</div>
                </div>
              ))}
            </div>
            <div className="h-40 rounded-xl p-3 mb-5" style={{ background: "var(--bg)" }}>
              {chartData.length >= 2 ? (
                <ResponsiveContainer width="99%" height="100%" minHeight={1} minWidth={1}>
                  <AreaChart data={chartData}>
                    <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={9} />
                    <YAxis stroke="var(--text-muted)" fontSize={9} domain={["dataMin - 1", "dataMax + 1"]} />
                    <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", fontSize: 11 }} />
                    <Area type="monotone" dataKey="price" stroke={chartData[chartData.length - 1].price >= chartData[0].price ? "var(--accent-green)" : "var(--accent-red)"} fill={chartData[chartData.length - 1].price >= chartData[0].price ? "var(--accent-green)" : "var(--accent-red)"} fillOpacity={0.1} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>No history</div>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => router.push(`/profile/${selectedStock.targetUserId}`)} className="btn-secondary flex-1">Profile</button>
              <button onClick={() => router.push("/dashboard")} className="btn-primary flex-1">Trade</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
