"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { IconPen } from "@/components/Icons";

type SearchedUser = { id: number; name: string; stockSymbol: string; };

export default function CreateNewsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!searchQuery.trim() || subjectId !== null) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`http://localhost:8080/api/user/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) { const data = await res.json(); setSearchResults(data.users.filter((u: SearchedUser) => u.id !== user?.id)); setShowDropdown(true); }
      } catch (err) { console.error("Search failed", err); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, subjectId, user?.id]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleSelectUser = (u: SearchedUser) => { setSubjectId(u.id); setSearchQuery(`${u.name} ($${u.stockSymbol})`); setShowDropdown(false); };
  const handleClearSubject = () => { setSubjectId(null); setSearchQuery(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) { setError("You must be logged in."); return; }
    if (!content.trim()) { setError("Please write something."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("http://localhost:8080/api/news", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publisherId: user.id, ...(subjectId ? { subjectId } : {}), content }),
      });
      if (res.ok) router.push("/news");
      else { const d = await res.json(); setError(d.error || "Failed to create news"); }
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card max-w-lg w-full p-8 relative animate-fade-in">
        <Link href="/news" className="text-sm font-medium mb-6 inline-block transition" style={{ color: "var(--accent)" }}>
          ← Back to News Feed
        </Link>
        <h1 className="text-2xl font-black mb-1 flex items-center gap-2" style={{ color: "var(--text)" }}>
          <IconPen size={24} color="var(--accent)" />
          Publish News
        </h1>
        <p className="text-sm mb-6 ml-8" style={{ color: "var(--text-secondary)" }}>spill the tea. your credibility is at stake.</p>

        {!user ? (
          <div className="p-4 rounded-xl text-sm" style={{ background: "rgba(255,59,48,0.08)", color: "var(--accent-red)", border: "1px solid rgba(255,59,48,0.2)" }}>
            Please log in first.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="p-3 rounded-xl text-sm" style={{ background: "rgba(255,59,48,0.08)", color: "var(--accent-red)", border: "1px solid rgba(255,59,48,0.2)" }}>{error}</div>}

            <div className="relative" ref={dropdownRef}>
              <label className="block text-xs font-bold mb-1 uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>Subject (optional)</label>
              <div className="relative">
                <input type="text" value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); if (subjectId !== null) setSubjectId(null); }}
                  onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                  className="input w-full" placeholder="Search a user..." />
                {subjectId !== null && (
                  <button type="button" onClick={handleClearSubject} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-xs" style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}>×</button>
                )}
              </div>
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 w-full mt-1 rounded-xl overflow-hidden z-50 max-h-48 overflow-y-auto" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 8px 30px var(--shadow-lg)" }}>
                  {searchResults.map((su) => (
                    <button key={su.id} type="button" onClick={() => handleSelectUser(su)} className="w-full text-left px-4 py-3 flex justify-between items-center transition"
                      style={{ borderBottom: "1px solid var(--border)" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                      <span className="font-medium" style={{ color: "var(--text)" }}>{su.name}</span>
                      <span className="badge text-xs">${su.stockSymbol}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold mb-1 uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>The Scoop</label>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} className="input w-full min-h-[120px] resize-y" placeholder="What happened? Be specific." />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? "Publishing..." : "Submit to Verification"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
