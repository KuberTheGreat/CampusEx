"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import Avatar from "@/components/Avatar";
import toast from "react-hot-toast";

type NewsItem = {
  id: number;
  publisher: { name: string; credibilityScore: number };
  subject: { name: string; stockPrice: number } | null;
  content: string;
  status: string;
  endsAt: string;
  finalImpactDir: string;
  finalImpactPct: number;
};

function Countdown({ endsAt }: { endsAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const update = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Evaluating"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [endsAt]);
  return <span>{timeLeft}</span>;
}

export default function NewsPage() {
  const { user } = useAuth();
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchNews(); }, []);

  const fetchNews = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/news");
      if (res.ok) { const data = await res.json(); setNewsList(data.news); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleVote = async (newsId: number, isConfirmed: boolean) => {
    if (!user?.id) return toast.error("Please log in first.");
    try {
      const res = await fetch(`http://localhost:8080/api/news/${newsId}/vote`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, isConfirmed }),
      });
      if (res.ok) { toast.success("Vote recorded!"); fetchNews(); }
      else { const d = await res.json(); toast.error("Error: " + d.error); }
    } catch { toast.error("Failed to submit vote"); }
  };

  const statusStyle = (s: string) => {
    if (s === "CONFIRMED") return { bg: "rgba(52,199,89,0.1)", color: "var(--accent-green)", border: "1px solid rgba(52,199,89,0.2)" };
    if (s === "REJECTED") return { bg: "rgba(255,59,48,0.1)", color: "var(--accent-red)", border: "1px solid rgba(255,59,48,0.2)" };
    return { bg: "var(--primary-soft)", color: "var(--primary)", border: "1px solid rgba(255,140,0,0.2)" };
  };

  return (
    <div className="min-h-screen p-6 animate-fade-in" style={{ background: "var(--bg)" }}>
      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold" style={{ color: "var(--text)" }}>Campus News</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Verify updates and shape the market.</p>
          </div>
          <div className="flex gap-3 items-center">
            {user && (
              <div className="card px-4 py-2 text-sm flex items-center gap-2">
                <span style={{ color: "var(--text-secondary)" }}>Logged in as</span>
                <span className="font-bold" style={{ color: "var(--text)" }}>{user.name}</span>
              </div>
            )}
            <Link href="/news/create" className="btn-primary">Publish News</Link>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }} />
          </div>
        ) : newsList.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-lg mb-4" style={{ color: "var(--text-muted)" }}>No campus news yet. Be the first!</p>
            <Link href="/news/create" className="btn-primary">Create Post</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {newsList.map((news) => {
              const st = statusStyle(news.status);
              return (
                <div key={news.id} className="card p-6 relative">
                  {/* Status badge */}
                  <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold uppercase" style={{ background: st.bg, color: st.color, border: st.border }}>
                    {news.status}
                    {news.status === "PENDING" && <span className="ml-2 opacity-75 text-[10px]"><Countdown endsAt={news.endsAt} /></span>}
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <Avatar userId={news.id} name={news.publisher?.name} size={40} />
                    <div>
                      <h3 className="font-bold text-sm" style={{ color: "var(--text)" }}>
                        {news.publisher?.name || "Unknown"}{" "}
                        <span className="font-normal text-xs" style={{ color: "var(--accent-purple)" }}>Cred: {news.publisher?.credibilityScore}</span>
                      </h3>
                      {news.subject && <p className="text-xs" style={{ color: "var(--text-secondary)" }}>About <span className="font-medium" style={{ color: "var(--primary)" }}>{news.subject.name}</span></p>}
                    </div>
                  </div>

                  <p className="text-base leading-relaxed mb-5 pl-[52px]" style={{ color: "var(--text)" }}>"{news.content}"</p>

                  {news.status === "PENDING" && (
                    <div className="pl-[52px] flex gap-3">
                      <button onClick={() => handleVote(news.id, true)} className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all" style={{ background: "rgba(52,199,89,0.08)", color: "var(--accent-green)", border: "1px solid rgba(52,199,89,0.2)" }}>✓ Confirm</button>
                      <button onClick={() => handleVote(news.id, false)} className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all" style={{ background: "rgba(255,59,48,0.08)", color: "var(--accent-red)", border: "1px solid rgba(255,59,48,0.2)" }}>✗ Deny</button>
                    </div>
                  )}

                  {news.status === "CONFIRMED" && news.finalImpactDir !== "NEUTRAL" && (
                    <div className="pl-[52px] mt-3 p-4 rounded-xl flex items-center gap-3" style={{ background: "rgba(52,199,89,0.06)", border: "1px solid rgba(52,199,89,0.15)" }}>
                      <span className="text-2xl">🤖</span>
                      <div>
                        <h4 className="font-bold text-xs" style={{ color: "var(--accent-green)" }}>AI Market Impact</h4>
                        <p className="text-sm mt-1" style={{ color: "var(--text)" }}>
                          {news.subject && <><span className="font-bold">{news.subject.name}</span>'s price {news.finalImpactDir === "POSITIVE" ? "surged" : "dropped"} by </>}
                          <span className="font-bold" style={{ color: news.finalImpactDir === "POSITIVE" ? "var(--accent-green)" : "var(--accent-red)" }}>{news.finalImpactPct}%</span>.
                        </p>
                      </div>
                    </div>
                  )}

                  {news.status === "REJECTED" && (
                    <div className="pl-[52px] mt-3 text-sm p-3 rounded-xl" style={{ background: "rgba(255,59,48,0.06)", color: "var(--accent-red)", border: "1px solid rgba(255,59,48,0.15)" }}>
                      This news was rejected by the community.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
