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
    <div className="min-h-screen bg-black text-white p-6 relative overflow-hidden">
      {/* Background aesthetics */}
      <div className="fixed top-[0%] left-[-10%] w-[40%] h-[40%] bg-pink-900 rounded-full mix-blend-multiply blur-[150px] opacity-20" />
      <div className="fixed bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-red-900 rounded-full mix-blend-multiply blur-[150px] opacity-20" />

      <div className="max-w-5xl mx-auto z-10 relative">
        <header className="mb-10">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-red-500 mb-3 flex items-center gap-3">
            <Heart className="text-pink-500 fill-pink-500" strokeWidth={0} size={40} />
            Your Matches
          </h1>
          <p className="text-gray-400 text-lg">Connections forged through the arena of value.</p>
        </header>

        {isLoading ? (
          <div className="text-center text-gray-500 py-10 animate-pulse">Synchronizing connections...</div>
        ) : matches.length === 0 ? (
          <div className="glass p-16 rounded-3xl flex flex-col items-center justify-center text-gray-500 border border-dashed border-gray-700 bg-black/40 backdrop-blur-xl">
            <AlertCircle size={64} className="mb-6 opacity-30 text-pink-500" />
            <h2 className="text-2xl font-bold mb-2 text-white/70">No Matches Yet</h2>
            <p className="text-center max-w-md">Win a Profile Auction or have someone win yours to unlock private connections.</p>
            <Link href="/profile-bidding">
              <button className="mt-8 px-8 py-3 bg-white/5 border border-white/10 hover:border-pink-500/50 hover:bg-pink-500/10 rounded-xl transition-all duration-300 text-pink-400 font-bold">
                View Auctions
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Active Matches Section */}
            {activeMatches.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-2">Active Connections</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeMatches.map((match) => {
                    const partner = match.user1.id === user.id ? match.user2 : match.user1;
                    return (
                      <Link href={`/matches/${match.id}`} key={match.id} className="block group">
                        <div className="glass p-6 rounded-3xl border border-white/10 hover:border-pink-500/50 transition-all duration-500 relative overflow-hidden bg-gradient-to-b from-white/5 to-black/40 hover:shadow-[0_0_30px_rgba(236,72,153,0.15)] hover:-translate-y-1">
                          <div className="flex items-center gap-5 relative z-10">
                            <div className="relative">
                              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-red-500 rounded-full flex items-center justify-center font-bold text-2xl shadow-[0_0_15px_rgba(236,72,153,0.5)] border-2 border-black">
                                {partner?.profilePicture ? (
                                  <img src={partner.profilePicture} alt="Profile" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  partner?.stockSymbol || "?"
                                )}
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-black"></div>
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-white group-hover:text-pink-300 transition-colors">{partner?.name || "Unknown"}</h3>
                              <p className="text-gray-400 text-sm flex items-center gap-1 mt-1">
                                <MessageCircle size={14} className="text-pink-400" /> Tap to open chat
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
              <section className="opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
                <h2 className="text-xl font-bold text-gray-400 mb-6 border-b border-white/5 pb-2">Completed</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {pastMatches.map((match) => {
                    const partner = match.user1.id === user.id ? match.user2 : match.user1;
                    const iRated = match.user1.id === user.id ? match.user1Rated : match.user2Rated;
                    return (
                      <div key={match.id} className="glass p-4 rounded-2xl border border-white/5 bg-black/60 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center font-bold text-sm">
                            {partner?.stockSymbol || "?"}
                          </div>
                          <div>
                            <p className="text-white font-medium">{partner?.name || "Unknown"}</p>
                            <p className="text-xs text-gray-500">Ended</p>
                          </div>
                        </div>
                        {iRated && (
                          <div className="text-yellow-500 flex opacity-50">
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
