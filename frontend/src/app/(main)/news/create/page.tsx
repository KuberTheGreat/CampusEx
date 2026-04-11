"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

type SearchedUser = {
  id: number;
  name: string;
  stockSymbol: string;
};

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

  // Handle Search Fetching
  useEffect(() => {
    if (!searchQuery.trim() || subjectId !== null) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`http://localhost:8080/api/user/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          // Hide self from results
          const filtered = data.users.filter((u: SearchedUser) => u.id !== user?.id);
          setSearchResults(filtered);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error("Search failed", err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, subjectId, user?.id]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectUser = (u: SearchedUser) => {
    setSubjectId(u.id);
    setSearchQuery(`${u.name} ($${u.stockSymbol})`);
    setShowDropdown(false);
  };

  const handleClearSubject = () => {
    setSubjectId(null);
    setSearchQuery("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      setError("You must be logged in to post news.");
      return;
    }
    if (!subjectId || !content.trim()) {
      setError("Please fill out all fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:8080/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publisherId: user.id,
          subjectId: subjectId,
          content,
        }),
      });

      if (res.ok) {
        router.push("/news");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create news");
      }
    } catch (err) {
      setError("Network error. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-(--background) flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[20%] w-[50vw] h-[50vw] bg-purple-700/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[20%] right-[10%] w-[40vw] h-[40vw] bg-emerald-700/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>
      </div>

      <div className="glass max-w-lg w-full p-8 md:p-10 rounded-3xl relative z-10 shadow-2xl border border-white/8">
        <Link href="/news" className="text-purple-400 hover:text-purple-300 text-sm font-medium mb-6 inline-flex border-b border-transparent hover:border-purple-400 transition-all">
          ← Back to News Feed
        </Link>
        <h1 className="text-3xl font-bold bg-linear-to-r from-purple-400 to-emerald-400 bg-clip-text text-transparent mb-2">Publish Campus News</h1>
        <p className="text-gray-400 text-sm mb-8">
          Report events truthfully. Your credibility and stock price are at stake.
        </p>

        {!user ? (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-sm">
            Please log in first to publish news.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2 relative" ref={dropdownRef}>
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Search Subject User</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (subjectId !== null) setSubjectId(null);
                  }}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowDropdown(true);
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-gray-600"
                  placeholder="Ex: Kuber or KBR..."
                />
                {subjectId !== null && (
                  <button 
                    type="button" 
                    onClick={handleClearSubject}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white bg-white/5 rounded-full w-6 h-6 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 w-full mt-2 bg-gray-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden max-h-48 overflow-y-auto backdrop-blur-xl">
                  {searchResults.map((su) => (
                    <button
                      key={su.id}
                      type="button"
                      onClick={() => handleSelectUser(su)}
                      className="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/10 transition flex justify-between items-center group"
                    >
                      <span className="font-medium text-white">{su.name}</span>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md group-hover:bg-emerald-500/20">
                        ${su.stockSymbol}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">The Scoop</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all min-h-[120px] resize-y"
                placeholder="What happened? Be specific. e.g., 'Kuber just bagged a 50LPA intern at Google!'"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !subjectId}
              className="w-full py-4 bg-linear-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-4 disabled:transform-none"
            >
              {loading ? "Publishing..." : "Submit to Verification"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
