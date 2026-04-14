"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Clock, ArrowRight, AlertCircle } from "lucide-react";
import { IconGavel, IconHeart } from "@/components/Icons";
import Link from "next/link";
import Avatar from "@/components/Avatar";

function Countdown({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Ended"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [endTime]);

  return <span>{timeLeft}</span>;
}

export default function ProfileBiddingDashboard() {
  const [auctions, setAuctions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    try {
      const res = await fetch("/api/profile-bids/active");
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
    <div className="min-h-screen p-4 md:p-6 relative overflow-hidden" style={{ color: "var(--text)" }}>
      <div className="max-w-6xl mx-auto z-10 relative">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-black mb-2 flex items-center gap-3" style={{ color: "var(--text)" }}>
              <IconHeart size={36} color="var(--accent)" />
              Profile Bidding
            </h1>
            <p className="ml-12" style={{ color: "var(--text-secondary)" }}>bid on profiles. unlock connections. shoot your shot.</p>
          </div>
        </header>

        {isLoading ? (
          <div className="text-center py-10 animate-pulse text-[var(--text-muted)]">SYNCHRONIZING AUCTIONS...</div>
        ) : auctions.length === 0 ? (
          <div className="card p-24 flex flex-col items-center justify-center text-center bg-dot-pattern">
            <AlertCircle size={64} className="mb-6 opacity-30 text-accent" />
            <h2 className="text-3xl font-black text-poster mb-2">No Active Auctions</h2>
            <p className="text-sm font-bold uppercase tracking-widest text-[var(--text-secondary)]">Wait for the next high-stakes connection window</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {auctions.map((auction) => {
              const target = auction.targetUser;
              return (
                <div key={auction.id} className="card p-8 overflow-hidden relative transition-all duration-300 group hover:-translate-y-2">
                  <div className="absolute top-0 right-0 p-3">
                    <div className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-accent-soft text-accent rounded-bl-xl border-l border-b" style={{ borderColor: 'var(--border)' }}>
                      LIVE AUCTION
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-5 mb-8 relative z-10">
                    <Avatar userId={target?.id} name={target?.name} size={72} className="group-hover:border-accent" />
                    <div>
                      <h2 className="text-2xl font-black text-poster" style={{ color: "var(--text)" }}>{target?.name || "Unknown"}</h2>
                      <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter mt-1 px-2 py-0.5 rounded-full w-fit" 
                           style={{ background: auction.status === 'RESOLVING' ? "var(--red-soft)" : "var(--accent-soft)", 
                                   color: auction.status === 'RESOLVING' ? "var(--red)" : "var(--accent)" }}>
                        {auction.status === 'ACTIVE' ? (
                          <><Clock size={10} /> ENDS IN: <Countdown endTime={auction.endTime} /></>
                        ) : (
                          <><AlertCircle size={10} /> DECIDING...</>
                        )}
                      </div>
                    </div>
                  </div>

                  <Link href={`/profile-bidding/${auction.id}`}>
                    <button className="btn-primary w-full py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 group-hover:shadow-xl transition-all">
                      <IconGavel size={18} /> {auction.status === 'ACTIVE' ? 'ENTER THE ARENA' : 'VIEW OUTCOME'} <ArrowRight size={16} />
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
