"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateNewsPage() {
  const router = useRouter();
  const [publisherId, setPublisherId] = useState<string>("1");
  const [subjectId, setSubjectId] = useState<string>("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publisherId || !subjectId || !content.trim()) {
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
          publisherId: Number(publisherId),
          subjectId: Number(subjectId),
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
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[20%] w-[50vw] h-[50vw] bg-purple-700/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[20%] right-[10%] w-[40vw] h-[40vw] bg-emerald-700/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>
      </div>

      <div className="glass max-w-lg w-full p-8 md:p-10 rounded-3xl relative z-10 shadow-2xl border border-white/[0.08]">
        <Link href="/news" className="text-purple-400 hover:text-purple-300 text-sm font-medium mb-6 inline-flex border-b border-transparent hover:border-purple-400 transition-all">
          ← Back to News Feed
        </Link>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-emerald-400 bg-clip-text text-transparent mb-2">Publish Campus News</h1>
        <p className="text-gray-400 text-sm mb-8">
          Report events truthfully. Your credibility and stock price are at stake.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Your User ID</label>
              <input
                type="number"
                value={publisherId}
                onChange={(e) => setPublisherId(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                placeholder="Ex: 1"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Subject User ID</label>
              <input
                type="number"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                placeholder="Ex: 2"
              />
            </div>
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
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-4"
          >
            {loading ? "Publishing..." : "Submit to Verification"}
          </button>
        </form>
      </div>
    </div>
  );
}
