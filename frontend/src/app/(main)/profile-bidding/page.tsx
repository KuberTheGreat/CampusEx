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
    <div className="min-h-screen p-6 relative overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <div className="fixed top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full mix-blend-multiply blur-[128px] opacity-20" style={{ background: "var(--primary)" }} />
      <div className="fixed bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full mix-blend-multiply blur-[128px] opacity-20" style={{ background: "var(--primary-soft)" }} />

      <div className="max-w-6xl mx-auto z-10 relative">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold mb-2 text-[var(--text)]">
              Profile Bidding
            </h1>
            <p className="text-[var(--text-secondary)]">Bid on top profiles to unlock exclusive dating and chat mechanics.</p>
          </div>
        </header>

        {isLoading ? (
          <div className="text-center py-10 animate-pulse text-[var(--text-muted)]">Loading auctions...</div>
        ) : auctions.length === 0 ? (
          <div className="card p-12 flex flex-col items-center justify-center text-center">
            <AlertCircle size={48} className="mb-4 opacity-50 text-[var(--primary)]" />
            <h2 className="text-xl font-bold mb-2">No Active Auctions</h2>
            <p className="text-[var(--text-secondary)]">Wait for the admin to launch the next profile bidding event.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auctions.map((auction) => {
              const target = auction.targetUser;
              return (
                <div key={auction.id} className="card p-6 overflow-hidden relative transition-all duration-300">
                  
                  <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl border" style={{ background: "var(--primary-soft)", color: "var(--primary)", borderColor: "var(--border)" }}>
                      {target?.profilePicture ? (
                        <img src={target.profilePicture} alt="Profile" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        target?.stockSymbol || "UK"
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[var(--text)]">{target?.name || "Unknown"}</h2>
                      <p className="flex items-center gap-1 text-sm px-2 py-1 rounded-md mt-1 w-fit" style={{ background: "var(--bg-input)", color: auction.status === 'RESOLVING' ? "var(--accent-red)" : "var(--text-secondary)" }}>
                        {auction.status === 'ACTIVE' ? (
                          <><Clock size={12} className="text-[var(--primary)]" /> Ends: {new Date(auction.endTime).toLocaleTimeString()}</>
                        ) : (
                          <><AlertCircle size={12} style={{ color: "var(--accent-red)" }} /> Auction Over - Target Deciding...</>
                        )}
                      </p>
                    </div>
                  </div>

                  <Link href={`/profile-bidding/${auction.id}`}>
                    <button className="btn-primary w-full py-3 flex items-center justify-center gap-2">
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
