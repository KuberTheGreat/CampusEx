"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Heart, MessageCircle, Star, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function MatchesDashboard() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchMatches();
    }
  }, [user]);

  const fetchMatches = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/dating/matches?userId=${user?.id}`);
      const data = await res.json();
      if (res.ok && data.matches) {
        setMatches(data.matches);
      }
    } catch (err) {
      console.error("Failed to fetch matches", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <div className="p-10 text-center text-gray-500">Please log in to view matches.</div>;
  }

  const activeMatches = matches.filter(m => m.status === 'ACTIVE');
  const pastMatches = matches.filter(m => m.status === 'ENDED');

  return (
    <div className="min-h-screen p-6 relative overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      {/* Background aesthetics */}
      <div className="fixed top-[0%] left-[-10%] w-[40%] h-[40%] rounded-full mix-blend-multiply blur-[150px] opacity-20" style={{ background: "var(--primary)" }} />
      <div className="fixed bottom-[10%] right-[-10%] w-[50%] h-[50%] rounded-full mix-blend-multiply blur-[150px] opacity-20" style={{ background: "var(--primary-soft)" }} />

      <div className="max-w-5xl mx-auto z-10 relative">
        <header className="mb-10">
          <h1 className="text-5xl font-extrabold mb-3 flex items-center gap-3 text-[var(--text)]">
            <Heart className="fill-current text-[var(--primary)]" strokeWidth={0} size={40} />
            Your Matches
          </h1>
          <p className="text-[var(--text-secondary)] text-lg">Connections forged through the arena of value.</p>
        </header>

        {isLoading ? (
          <div className="text-center py-10 animate-pulse text-[var(--text-muted)]">Synchronizing connections...</div>
        ) : matches.length === 0 ? (
          <div className="card p-16 flex flex-col items-center justify-center text-center">
            <AlertCircle size={64} className="mb-6 opacity-80 text-[var(--primary)]" />
            <h2 className="text-2xl font-bold mb-2">No Matches Yet</h2>
            <p className="text-center max-w-md text-[var(--text-secondary)]">Win a Profile Auction or have someone win yours to unlock private connections.</p>
            <Link href="/profile-bidding">
              <button className="btn-primary mt-8">
                View Auctions
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Active Matches Section */}
            {activeMatches.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6 border-b pb-2" style={{ borderColor: 'var(--border)' }}>Active Connections</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeMatches.map((match) => {
                    const partner = match.user1.id === user.id ? match.user2 : match.user1;
                    return (
                      <Link href={`/matches/${match.id}`} key={match.id} className="block group">
                        <div className="card p-6 hover:-translate-y-1 transition-all duration-300 overflow-hidden relative">
                          <div className="flex items-center gap-5 relative z-10">
                            <div className="relative">
                              <div className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl text-white shadow-lg border-2 border-transparent" style={{ background: 'var(--primary)' }}>
                                {partner?.profilePicture ? (
                                  <img src={partner.profilePicture} alt="Profile" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  partner?.stockSymbol || "?"
                                )}
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2" style={{ background: 'var(--accent-green)', borderColor: 'var(--bg-card)' }}></div>
                            </div>
                            <div>
                              <h3 className="text-xl font-bold transition-colors group-hover:text-[var(--primary)]">{partner?.name || "Unknown"}</h3>
                              <p className="text-sm flex items-center gap-1 mt-1 text-[var(--text-secondary)]">
                                <MessageCircle size={14} className="text-[var(--primary)]" /> Tap to open chat
                              </p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Past Matches Section */}
            {pastMatches.length > 0 && (
              <section className="opacity-80 transition-all duration-300 hover:opacity-100">
                <h2 className="text-xl font-bold mb-6 border-b pb-2 text-[var(--text-secondary)]" style={{ borderColor: 'var(--border)' }}>Completed</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {pastMatches.map((match) => {
                    const partner = match.user1.id === user.id ? match.user2 : match.user1;
                    const iRated = match.user1.id === user.id ? match.user1Rated : match.user2Rated;
                    return (
                      <div key={match.id} className="card p-4 flex items-center justify-between" style={{ background: 'var(--bg-input)' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-[var(--text)] border" style={{ borderColor: 'var(--border-strong)' }}>
                            {partner?.stockSymbol || "?"}
                          </div>
                          <div>
                            <p className="font-medium text-[var(--text)]">{partner?.name || "Unknown"}</p>
                            <p className="text-xs text-[var(--text-muted)]">Ended</p>
                          </div>
                        </div>
                        {iRated && (
                          <div className="text-yellow-500 flex">
                            <Star size={16} className="fill-current" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
