"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Avatar from "@/components/Avatar";

export default function ProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tradeMode, setTradeMode] = useState<"BUY" | "SELL" | null>(null);
  const [tradeShares, setTradeShares] = useState(1);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartRange, setChartRange] = useState<"24h" | "7d" | "30d">("7d");

  const executeTrade = async () => {
    if (!authUser?.id || !profile || !tradeMode) return;
    const totalCost = tradeShares * profile.currentPrice;
    if (tradeMode === "BUY" && totalCost > (authUser.auraCoins || 0)) return alert("Insufficient AURA!");
    try {
      const res = await fetch("http://localhost:8080/api/market/trade", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerId: authUser.id, targetUserId: profile.id, shares: tradeShares, type: tradeMode })
      });
      if (res.ok) { alert(`${tradeMode} of ${tradeShares} shares executed!`); window.location.reload(); }
      else { const e = await res.json(); alert(`Failed: ${e.error}`); }
    } catch(err) { console.error(err); }
  };

  const fetchHistory = async (userId: number, range: string) => {
    try {
      const res = await fetch(`http://localhost:8080/api/market/stocks/${userId}/history?range=${range}`);
      const data = await res.json();
      if (res.ok && data.history?.length > 0) {
        setChartData(data.history.map((h: any) => ({
          time: new Date(h.recordedAt).toLocaleString("en-IN", { hour: "numeric", minute: "2-digit", ...(range !== "24h" ? { month: "short", day: "numeric" } : {}) }),
          price: parseFloat(h.price.toFixed(2)),
        })));
      } else setChartData([]);
    } catch { setChartData([]); }
  };

  useEffect(() => { if (id) fetchProfile(); }, [id]);
  useEffect(() => { if (profile?.id) fetchHistory(profile.id, chartRange); }, [profile?.id, chartRange]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/user/profile/${id}`);
      if (res.ok) { const data = await res.json(); setProfile(data.user); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const chartColor = chartData.length >= 2 && chartData[chartData.length - 1].price >= chartData[0].price ? "var(--accent-green)" : "var(--accent-red)";

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)", color: "var(--text-muted)" }}>Loading...</div>;
  if (!profile) return <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)", color: "var(--text-muted)" }}>User not found</div>;

  return (
    <div className="min-h-screen p-6 animate-fade-in" style={{ background: "var(--bg)" }}>
      <div className="max-w-5xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 mb-6 text-sm font-medium transition" style={{ color: "var(--text-secondary)" }}>
          ← Back
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Identity */}
          <div className="card p-8 text-center space-y-5">
            <Avatar userId={profile.id} name={profile.name} size={112} />
            <div>
              <h1 className="text-2xl font-extrabold" style={{ color: "var(--text)" }}>{profile.name}</h1>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{profile.email}</p>
            </div>
            <div className="p-4 rounded-xl" style={{ background: "var(--bg)" }}>
              <span className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Current Valuation</span>
              <span className="font-extrabold text-2xl" style={{ color: "var(--primary)" }}>{profile.currentPrice?.toFixed(2) || "10.00"} Au</span>
            </div>
            {String(authUser?.id) !== String(profile.id) && (
              <button onClick={() => { setTradeMode("BUY"); setTradeShares(1); }} className="btn-primary w-full py-3">
                Trade {profile.stockSymbol}
              </button>
            )}
          </div>

          {/* Right: Stats & Chart */}
          <div className="md:col-span-2 space-y-5">
            <div className="card p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold" style={{ color: "var(--text)" }}>Price History</h2>
                <div className="flex gap-1">
                  {(["24h", "7d", "30d"] as const).map((r) => (
                    <button key={r} onClick={() => setChartRange(r)} className="px-3 py-1 rounded-lg text-xs font-bold transition" style={{ background: chartRange === r ? "var(--primary)" : "var(--bg)", color: chartRange === r ? "#fff" : "var(--text-muted)" }}>{r.toUpperCase()}</button>
                  ))}
                </div>
              </div>
              <div className="h-52">
                {chartData.length >= 2 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={10} />
                      <YAxis stroke="var(--text-muted)" fontSize={10} domain={["dataMin - 2", "dataMax + 2"]} />
                      <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", color: "var(--text)", fontSize: 12 }} />
                      <Area type="monotone" dataKey="price" stroke={chartColor} fill={chartColor} fillOpacity={0.1} strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>No price history yet.</div>
                )}
              </div>
            </div>

            <div className="card p-6">
              <h2 className="font-bold mb-4" style={{ color: "var(--text)" }}>Traits & Quirks</h2>
              <div className="space-y-5">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-secondary)" }}>Public File</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {profile.traits?.filter((t: any) => !t.isHidden).length > 0 ? (
                      profile.traits.filter((t: any) => !t.isHidden).map((t: any) => (
                        <div key={t.id} className="card p-3 text-center">
                          <span className="font-bold text-sm" style={{ color: "var(--primary)" }}>{t.name}</span>
                        </div>
                      ))
                    ) : <div className="col-span-full text-sm italic" style={{ color: "var(--text-muted)" }}>No public traits.</div>}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-3 flex justify-between items-center" style={{ color: "var(--text-secondary)" }}>
                    <span>Classified File</span>
                    <span className="badge-red text-[10px]">Mystery</span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {profile.traits?.filter((t: any) => t.isHidden).length > 0 ? (
                      profile.traits.filter((t: any) => t.isHidden).map((t: any) => (
                        <div key={t.id} className="p-3 rounded-xl flex flex-col items-center gap-1 cursor-help" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                          <div className="h-3 w-14 rounded" style={{ background: "var(--border)" }} />
                          <div className="h-2 w-8 rounded" style={{ background: "var(--border)" }} />
                        </div>
                      ))
                    ) : <div className="col-span-full text-sm italic" style={{ color: "var(--text-muted)" }}>No classified traits.</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trade Modal */}
        {tradeMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }} onClick={() => setTradeMode(null)}>
            <div className="card p-8 max-w-md w-full text-center animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-5" style={{ color: "var(--text)" }}>Execute Trade</h3>
              <div className="flex gap-3 justify-center mb-5">
                <button onClick={() => setTradeMode("BUY")} className="px-5 py-2 rounded-xl font-bold text-sm transition" style={{ background: tradeMode === "BUY" ? "var(--accent-green)" : "var(--bg)", color: tradeMode === "BUY" ? "#fff" : "var(--text-secondary)", border: "1px solid var(--border)" }}>BUY</button>
                <button onClick={() => setTradeMode("SELL")} className="px-5 py-2 rounded-xl font-bold text-sm transition" style={{ background: tradeMode === "SELL" ? "var(--accent-red)" : "var(--bg)", color: tradeMode === "SELL" ? "#fff" : "var(--text-secondary)", border: "1px solid var(--border)" }}>SELL</button>
              </div>
              <div className="max-w-xs mx-auto mb-5">
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--text-secondary)" }}>Shares</label>
                <input type="number" min="1" value={tradeShares} onChange={(e) => setTradeShares(Math.max(1, parseInt(e.target.value) || 1))} className="input w-full text-center text-xl font-bold" />
              </div>
              <div className="flex justify-between items-center p-4 rounded-xl mb-5" style={{ background: "var(--bg)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Total Cost</span>
                <span className="text-lg font-bold" style={{ color: tradeMode === "BUY" && (tradeShares * profile.currentPrice) > (authUser?.auraCoins || 0) ? "var(--accent-red)" : "var(--primary)" }}>
                  {(tradeShares * profile.currentPrice).toFixed(2)} Au
                </span>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setTradeMode(null); setTradeShares(1); }} className="btn-secondary flex-1">Cancel</button>
                <button onClick={executeTrade} disabled={tradeMode === "BUY" && (tradeShares * profile.currentPrice) > (authUser?.auraCoins || 0)} className="btn-primary flex-1 disabled:opacity-40">Confirm {tradeMode}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
