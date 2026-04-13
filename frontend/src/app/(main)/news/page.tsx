"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

// ── Types ────────────────────────────────────────────────────────────────────
type Subject = {
  id: number;
  name: string;
  stockSymbol: string;
};

type NewsImpact = {
  id: number;
  subjectId: number;
  subject: Subject;
  finalImpactDir: string;
  finalImpactPct: number;
};

type NewsItem = {
  id: number;
  publisher: { name: string; credibilityScore: number };
  content: string;
  evidenceUrl: string;
  status: string;
  endsAt: string;
  impacts: NewsImpact[];
};

// ── Countdown helper ─────────────────────────────────────────────────────────
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

// ── @mention parser ──────────────────────────────────────────────────────────
// Builds a name→Subject map from impacts, then replaces every @Name in the
// content with a clickable chip linking to /profile/[id].
function MentionContent({ content, impacts }: { content: string; impacts: NewsImpact[] }) {
  // Build lookup: lowercased name → subject
  const nameMap = new Map<string, Subject>();
  for (const impact of impacts ?? []) {
    if (impact.subject?.name) {
      // Mention tags have spaces stripped (e.g. @DevangVaishnav), so we must strip spaces from the DB name to match them
      const cleanName = impact.subject.name.replace(/\s+/g, '').toLowerCase();
      nameMap.set(cleanName, impact.subject);
    }
  }

  if (nameMap.size === 0) {
    return <span>&quot;{content}&quot;</span>;
  }

  // Sort names longest-first to avoid short names shadowing longer ones
  const sortedNames = [...nameMap.keys()].sort((a, b) => b.length - a.length);
  const escapedNames = sortedNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const mentionRegex = new RegExp(`@(${escapedNames.join("|")})`, "gi");

  const parts: (string | React.ReactElement)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(content)) !== null) {
    // Text before the mention
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    const mentionedName = match[1];
    const subject = nameMap.get(mentionedName.toLowerCase());

    if (subject) {
      parts.push(
        <Link
          key={match.index}
          href={`/profile/${subject.id}`}
          className="inline-flex items-center gap-1 font-semibold text-emerald-400 hover:text-white bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/20 hover:border-emerald-400/50 px-2 py-0.5 rounded-full text-sm transition-all duration-150 mx-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          @{mentionedName}
          <span className="text-[10px] text-emerald-600 font-bold">${subject.stockSymbol}</span>
        </Link>
      );
    } else {
      parts.push(`@${mentionedName}`);
    }

    lastIndex = mentionRegex.lastIndex;
  }

  // Remaining text after last mention
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return (
    <span>
      &quot;{parts.map((p, i) => (typeof p === "string" ? <span key={i}>{p}</span> : p))}&quot;
    </span>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function NewsPage() {
  const { user } = useAuth();
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchNews(); }, []);

  const fetchNews = async () => {
    try {
      const res = await fetch("/api/news");
      if (res.ok) { const data = await res.json(); setNewsList(data.news ?? []); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleVote = async (newsId: number, isConfirmed: boolean) => {
    if (!user?.id) return toast.error("Please log in first.");
    try {
      const res = await fetch(`/api/news/${newsId}/vote`, {
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

                  {/* Publisher */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm" style={{ background: "var(--primary)" }}>
                      {news.publisher?.name?.[0] || "?"}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm" style={{ color: "var(--text)" }}>
                        {news.publisher?.name || "Unknown"}{" "}
                        <span className="font-normal text-xs" style={{ color: "var(--accent-purple)" }}>Cred: {news.publisher?.credibilityScore}</span>
                      </h3>
                      {/* Subjects chips */}
                      {news.impacts && news.impacts.length > 0 && (
                        <p className="text-xs flex flex-wrap gap-1 mt-0.5">
                          <span style={{ color: "var(--text-secondary)" }}>Reporting on</span>
                          {news.impacts.map((imp) => (
                            <Link
                              key={imp.id}
                              href={`/profile/${imp.subject?.id}`}
                              className="font-medium hover:underline"
                              style={{ color: "var(--primary)" }}
                            >
                              {imp.subject?.name}
                            </Link>
                          ))}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Content with clickable @mentions */}
                  <div className="text-base leading-relaxed mb-5 pl-[52px]" style={{ color: "var(--text)" }}>
                    <MentionContent content={news.content} impacts={news.impacts ?? []} />
                  </div>

                  {/* Evidence */}
                  {news.evidenceUrl && (
                    <div className="pl-[52px] mb-4">
                      {news.evidenceUrl.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) ? (
                        <img src={news.evidenceUrl} alt="Evidence" className="rounded-xl max-h-[400px] w-auto object-contain border border-white/10 shadow-lg" loading="lazy" />
                      ) : news.evidenceUrl.match(/\.(mp4|webm)($|\?)/i) ? (
                        <video src={news.evidenceUrl} controls className="rounded-xl max-h-[400px] w-auto border border-white/10 shadow-lg" />
                      ) : (
                        <a href={news.evidenceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 hover:bg-white/5 border border-white/10 rounded-xl transition-colors text-sm text-purple-300">
                          📄 View Evidence Document
                        </a>
                      )}
                    </div>
                  )}

                  {/* Vote buttons */}
                  {news.status === "PENDING" && (
                    <div className="pl-[52px] flex gap-3">
                      <button onClick={() => handleVote(news.id, true)} className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all" style={{ background: "rgba(52,199,89,0.08)", color: "var(--accent-green)", border: "1px solid rgba(52,199,89,0.2)" }}>✓ Confirm</button>
                      <button onClick={() => handleVote(news.id, false)} className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all" style={{ background: "rgba(255,59,48,0.08)", color: "var(--accent-red)", border: "1px solid rgba(255,59,48,0.2)" }}>✗ Deny</button>
                    </div>
                  )}

                  {/* AI Impact cards */}
                  {news.status === "CONFIRMED" && news.impacts && news.impacts.length > 0 && (
                    <div className="pl-[52px] mt-4 space-y-2">
                      <h4 className="text-xs font-bold" style={{ color: "var(--accent-green)" }}>🤖 AI Market Impact</h4>
                      {news.impacts.map((impact) => {
                        const dir = impact.finalImpactDir;
                        if (!dir || dir === "NEUTRAL" || dir === "PENDING" || impact.finalImpactPct === 0) return null;
                        const isPositive = dir === "POSITIVE";
                        return (
                          <Link
                            key={impact.id}
                            href={`/profile/${impact.subject?.id}`}
                            className="flex items-center gap-3 p-3 rounded-xl transition-all hover:opacity-80"
                            style={{
                              background: isPositive ? "rgba(52,199,89,0.06)" : "rgba(255,59,48,0.06)",
                              border: isPositive ? "1px solid rgba(52,199,89,0.15)" : "1px solid rgba(255,59,48,0.15)",
                            }}
                          >
                            <span className="text-xl">{isPositive ? "📈" : "📉"}</span>
                            <p className="text-sm" style={{ color: "var(--text)" }}>
                              <span className="font-bold">{impact.subject?.name}</span>&apos;s stock {isPositive ? "surged" : "dropped"} by{" "}
                              <span className="font-bold" style={{ color: isPositive ? "var(--accent-green)" : "var(--accent-red)" }}>
                                {impact.finalImpactPct}%
                              </span>
                            </p>
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  {/* Rejected message */}
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
