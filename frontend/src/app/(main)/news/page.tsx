"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type NewsItem = {
  id: number;
  publisher: { name: string; credibilityScore: number };
  subject: { name: string; stockPrice: number };
  content: string;
  status: string;
  endsAt: string;
  finalImpactDir: string;
  finalImpactPct: number;
};

function Countdown({ endsAt }: { endsAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const updateCountdown = () => {
      const end = new Date(endsAt).getTime();
      const now = new Date().getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft("Evaluating");
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      if (h > 0) {
        setTimeLeft(`${h}h ${m}m ${s}s`);
      } else {
        setTimeLeft(`${m}m ${s}s`);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  return <span>{timeLeft}</span>;
}

export default function NewsPage() {
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(1); // MOCK logged in user

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/news");
      if (res.ok) {
        const data = await res.json();
        setNewsList(data.news);
      }
    } catch (error) {
      console.error("Failed to fetch news", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (newsId: number, isConfirmed: boolean) => {
    if (!currentUserId) return alert("Please set a User ID first.");
    try {
      const res = await fetch(`http://localhost:8080/api/news/${newsId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, isConfirmed }),
      });
      if (res.ok) {
        alert("Vote recorded!");
        fetchNews();
      } else {
        const errorData = await res.json();
        alert("Error: " + errorData.error);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to submit vote");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6 md:p-12 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-purple-400 to-emerald-400 bg-clip-text text-transparent">
              Campus News & Credibility
            </h1>
            <p className="text-gray-400 text-lg">Verify updates and shape the market.</p>
          </div>
          
          <div className="flex gap-4 items-center">
            <div className="flex bg-white/5 p-1 rounded-lg border border-white/10 glass">
              <span className="px-3 py-2 text-sm text-gray-400">Mock User ID:</span>
              <input 
                type="number" 
                value={currentUserId} 
                onChange={(e) => setCurrentUserId(Number(e.target.value))}
                className="w-16 bg-transparent border-none text-white focus:outline-none focus:ring-0 text-center"
              />
            </div>
            <Link href="/news/create" className="px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold rounded-xl transition-all shadow-lg animate-pulse-glow text-sm md:text-base">
              Publish News
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : newsList.length === 0 ? (
          <div className="glass p-12 text-center rounded-2xl">
            <p className="text-xl text-gray-400 mb-4">No campus news yet. Be the first to break a story!</p>
            <Link href="/news/create" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors underline">
              Create a news post
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {newsList.map((news) => (
              <div key={news.id} className="glass p-6 md:p-8 rounded-2xl relative overflow-hidden group transition-all hover:bg-white/[0.08]">
                
                {/* Status Badge */}
                <div className={`absolute top-0 right-0 px-4 py-1.5 flex items-center gap-2 text-xs font-bold tracking-wider uppercase rounded-bl-xl shadow-md ${
                  news.status === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-400 border-b border-l border-emerald-500/30' :
                  news.status === 'REJECTED' ? 'bg-red-500/20 text-red-400 border-b border-l border-red-500/30' :
                  'bg-yellow-500/20 text-yellow-400 border-b border-l border-yellow-500/30'
                }`}>
                  {news.status}
                  {news.status === 'PENDING' && (
                    <span className="text-yellow-200/80 border-l border-yellow-500/40 pl-2 opacity-90 text-[10px] tracking-widest font-mono select-none">
                      <Countdown endsAt={news.endsAt} />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-emerald-500 flex items-center justify-center font-bold text-lg shadow-inner">
                    {news.publisher?.name?.[0] || '?'}
                  </div>
                  <div>
                    <h3 className="font-semibold">{news.publisher?.name || 'Unknown User'} <span className="text-purple-400 text-sm font-normal">Credibility: {news.publisher?.credibilityScore}</span></h3>
                    <p className="text-xs text-gray-400">Reporting on <span className="text-emerald-400 font-medium">{news.subject?.name || 'Unknown'}</span></p>
                  </div>
                </div>

                <p className="text-lg leading-relaxed mb-6 pl-13 text-gray-200">
                  "{news.content}"
                </p>

                {news.status === 'PENDING' && (
                  <div className="pl-13 flex gap-3">
                    <button 
                      onClick={() => handleVote(news.id, true)}
                      className="flex-1 py-3 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-medium transition-colors focus:ring-2 focus:ring-emerald-500/50"
                    >
                      ✓ Can Confirm
                    </button>
                    <button 
                      onClick={() => handleVote(news.id, false)}
                      className="flex-1 py-3 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-medium transition-colors focus:ring-2 focus:ring-red-500/50"
                    >
                      ✗ Cannot Confirm
                    </button>
                  </div>
                )}

                {news.status === 'CONFIRMED' && news.finalImpactDir !== 'NEUTRAL' && (
                  <div className="pl-13 mt-4">
                    <div className="bg-emerald-900/40 border border-emerald-500/20 p-4 rounded-xl flex items-center gap-4">
                      <div className="text-2xl">🤖</div>
                      <div>
                        <h4 className="font-semibold text-emerald-400 text-sm">AI Market Impact Analysis</h4>
                        <p className="text-sm mt-1">
                          <span className="font-medium text-white">{news.subject?.name}</span>'s stock price {news.finalImpactDir === 'POSITIVE' ? 'surged' : 'dropped'} by <span className={`font-bold ${news.finalImpactDir === 'POSITIVE' ? 'text-emerald-400' : 'text-red-400'}`}>{news.finalImpactPct}%</span>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {news.status === 'REJECTED' && (
                  <div className="pl-13 mt-4 text-sm text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                    This news was rejected by the community. The publisher has incurred a credibility and stock penalty.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
