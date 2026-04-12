"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Clock, ArrowRight, Gavel, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function ProfileBiddingDashboard() {
  const [auctions, setAuctions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/profile-bids/active");
      const data = await res.json();
      if (res.ok && data.auctions) {
        setAuctions(data.auctions);
      }
    } catch (err) {
      console.error("Failed to fetch auctions", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 relative overflow-hidden">
      <div className="fixed top-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-900 rounded-full mix-blend-multiply blur-[128px] opacity-20" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900 rounded-full mix-blend-multiply blur-[128px] opacity-20" />

      <div className="max-w-6xl mx-auto z-10 relative">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
              Profile Bidding
            </h1>
            <p className="text-gray-400">Bid on top profiles to unlock exclusive dating and chat mechanics.</p>
          </div>
        </header>

        {isLoading ? (
          <div className="text-center text-gray-500 py-10 animate-pulse">Loading auctions...</div>
        ) : auctions.length === 0 ? (
          <div className="glass p-12 rounded-2xl flex flex-col items-center justify-center text-gray-500 border border-dashed border-gray-700">
            <AlertCircle size={48} className="mb-4 opacity-50 text-pink-500" />
            <h2 className="text-xl font-bold mb-2">No Active Auctions</h2>
            <p>Wait for the admin to launch the next profile bidding event.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auctions.map((auction) => {
              const target = auction.targetUser;
              return (
                <div key={auction.id} className="glass p-6 rounded-3xl border border-white/10 hover:border-pink-500/30 transition-all duration-300 relative group overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500 rounded-full mix-blend-overlay filter blur-[50px] opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
                  
                  <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-bold text-2xl shadow-inner border border-white/20">
                      {target?.profilePicture ? (
                        <img src={target.profilePicture} alt="Profile" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        target?.stockSymbol || "UK"
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{target?.name || "Unknown"}</h2>
                      <p className={`flex items-center gap-1 text-sm bg-black/40 px-2 py-1 rounded-md mt-1 w-fit ${auction.status === 'RESOLVING' ? 'text-orange-400' : 'text-gray-400'}`}>
                        {auction.status === 'ACTIVE' ? (
                          <><Clock size={12} className="text-pink-400" /> Ends: {new Date(auction.endTime).toLocaleTimeString()}</>
                        ) : (
                          <><AlertCircle size={12} className="text-orange-400" /> Auction Over - Target Deciding...</>
                        )}
                      </p>
                    </div>
                  </div>

                  <Link href={`/profile-bidding/${auction.id}`}>
                    <button className="w-full py-3 rounded-xl bg-pink-600/20 hover:bg-pink-600 text-pink-400 hover:text-white border border-pink-500/50 hover:border-pink-500 font-bold transition-all flex items-center justify-center gap-2 relative z-10">
                      <Gavel size={18} /> {auction.status === 'ACTIVE' ? 'Enter Auction' : 'View Resolution'} <ArrowRight size={16} />
                    </button>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
