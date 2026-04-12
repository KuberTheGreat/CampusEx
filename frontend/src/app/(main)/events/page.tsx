"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Clock, Users, ArrowUpRight, ArrowDownRight, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

export default function EventsBidding() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [biddingParticipant, setBiddingParticipant] = useState<any>(null);
  const [bidMode, setBidMode] = useState<"For" | "Against" | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(50);

  useEffect(() => {
    fetchAllEvents();
  }, []);

  const fetchAllEvents = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/events/all");
      const data = await res.json();
      if (res.ok && data.events) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openBidModal = (event: any, participant: any, mode: "For" | "Against") => {
    if (!user?.id) return alert("Please log in to place bids on events!");
    setBiddingParticipant({ ...participant, eventId: event.id, eventTitle: event.title });
    setBidMode(mode);
    setBidAmount(50);
  };

  const executeBid = async () => {
    if (!user?.id || !biddingParticipant || !bidMode) return;
    
    if (bidAmount <= 0) return alert("Bid amount must be greater than 0");
    if (bidAmount > (user.auraCoins || 0)) {
       return alert("Insufficient AURA balance!");
    }

    try {
      const res = await fetch("http://localhost:8080/api/events/bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          eventId: Number(biddingParticipant.eventId), 
          participantId: Number(biddingParticipant.id), 
          bidderId: Number(user.id), 
          bidType: bidMode, 
          amount: parseFloat(bidAmount.toString()) 
        })
      });
      if (res.ok) {
        alert(`Successfully placed ${bidAmount} AURA bid ${bidMode} ${biddingParticipant.user?.name || 'Participant'}!`);
        window.location.reload(); 
      } else {
        const error = await res.json();
        alert(`Bid Failed: ${error.error}`);
      }
    } catch(err) {
      console.error(err);
    }
  };

  // Separate active and resolved events
  const activeEvents = events.filter(e => e.status === "Active");
  const resolvedEvents = events.filter(e => e.status === "Resolved");

  return (
    <div className="min-h-screen bg-black text-white p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="fixed top-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-900 rounded-full mix-blend-multiply blur-[128px] opacity-30" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-900 rounded-full mix-blend-multiply blur-[128px] opacity-30" />

      <div className="max-w-6xl mx-auto z-10 relative">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-emerald-400 mb-2">
              Live Event Bidding
            </h1>
            <p className="text-gray-400">Place your stakes on ongoing campus events and grow your portfolio.</p>
          </div>
          <div className="glass p-3 rounded-xl flex items-center justify-between min-w-[150px]">
             <span className="text-gray-400 text-sm mr-3">Your AURA</span>
             <span className="font-bold text-emerald-400 text-lg">{user?.auraCoins !== undefined ? Number(user.auraCoins).toFixed(2) : "0.00"}</span>
          </div>
        </header>

        {/* Active Events */}
        <div className="space-y-8 mb-12">
          {activeEvents.length === 0 && resolvedEvents.length === 0 ? (
            <div className="glass p-12 rounded-2xl flex flex-col items-center justify-center text-gray-500 border border-dashed border-gray-700">
              <AlertCircle size={48} className="mb-4 opacity-50 text-emerald-500" />
              <h2 className="text-xl font-bold mb-2">No Events Available</h2>
              <p>Check back later when an admin creates a new tournament or event.</p>
            </div>
          ) : (
            <>
              {activeEvents.length === 0 && (
                <div className="glass p-8 rounded-2xl text-center text-gray-500 border border-dashed border-gray-700">
                  <p className="text-lg">No active events right now. Check back soon!</p>
                </div>
              )}
              {activeEvents.map((evt) => (
                <div key={evt.id} className="glass p-6 md:p-8 rounded-3xl border border-white/10 hover:border-purple-500/30 transition-all duration-500 relative overflow-hidden group">
                  {/* Decoration highlight */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500 rounded-full mix-blend-overlay filter blur-[50px] opacity-0 group-hover:opacity-40 transition-opacity duration-500" />

                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-white/10 pb-6 relative z-10">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">{evt.title}</h2>
                      <p className="text-gray-400 text-sm">{evt.description}</p>
                    </div>
                    <div className="mt-4 md:mt-0 glass px-4 py-2 rounded-xl flex items-center gap-2 text-emerald-400 border border-emerald-500/30">
                      <Clock size={16} />
                      <span className="text-sm font-bold">In Progress</span>
                    </div>
                  </div>

                  <div className="relative z-10">
                    <h3 className="text-gray-400 font-semibold mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                      <Users size={16} /> Participants on the line
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {evt.participants?.map((participant: any) => (
                        <div key={participant.id} className="bg-black/60 border border-gray-800 rounded-2xl p-5 hover:border-gray-600 transition">
                          <div className="flex items-center gap-4 mb-5">
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-purple-500 rounded-full flex items-center justify-center font-bold text-lg shadow-inner">
                              {participant.user?.stockSymbol || "UK"}
                            </div>
                            <div>
                              <h4 className="font-bold text-lg">{participant.user?.name || "Unknown"}</h4>
                              <p className="text-xs text-gray-500">Current Au: {participant.user?.currentPrice?.toFixed(2) || "0.00"}</p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button 
                              onClick={() => openBidModal(evt, participant, "For")}
                              className="flex-1 flex items-center justify-center gap-1 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/50 hover:border-emerald-500 text-emerald-400 hover:text-white py-2 rounded-xl font-bold text-sm transition-all"
                            >
                              <ArrowUpRight size={16} /> FOR
                            </button>
                            <button 
                              onClick={() => openBidModal(evt, participant, "Against")}
                              className="flex-1 flex items-center justify-center gap-1 bg-red-600/20 hover:bg-red-600 border border-red-500/50 hover:border-red-500 text-red-400 hover:text-white py-2 rounded-xl font-bold text-sm transition-all"
                            >
                              <ArrowDownRight size={16} /> AGAINST
                            </button>
                          </div>
                        </div>
                      ))}
                      {(!evt.participants || evt.participants.length === 0) && (
                        <div className="col-span-full py-4 text-gray-500 text-sm italic">
                          No participants are registered for this event yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Resolved Events */}
        {resolvedEvents.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-400 mb-6 flex items-center gap-3">
              <CheckCircle2 size={24} className="text-gray-500" />
              Completed Events
            </h2>
            <div className="space-y-4">
              {resolvedEvents.map((evt) => (
                <div key={evt.id} className="glass p-6 rounded-2xl border border-gray-800/50 opacity-80">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-300">{evt.title}</h3>
                      <p className="text-gray-500 text-sm">{evt.description}</p>
                    </div>
                    <div className="mt-3 md:mt-0 px-4 py-2 rounded-xl flex items-center gap-2 text-gray-500 border border-gray-700 bg-gray-900/50">
                      <CheckCircle2 size={16} />
                      <span className="text-sm font-bold">Ended</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-800 pt-4">
                    <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-semibold">Results</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {evt.participants?.map((p: any) => (
                        <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                          p.outcome === "Won" 
                            ? "bg-emerald-900/20 border-emerald-500/30" 
                            : "bg-red-900/20 border-red-500/30"
                        }`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                            p.outcome === "Won" 
                              ? "bg-emerald-500/30 text-emerald-400" 
                              : "bg-red-500/30 text-red-400"
                          }`}>
                            {p.user?.stockSymbol || "??"}
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-sm">{p.user?.name || "Unknown"}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            {p.outcome === "Won" ? (
                              <span className="flex items-center gap-1 text-emerald-400 font-bold text-sm">
                                <CheckCircle2 size={16} /> WON
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-400 font-bold text-sm">
                                <XCircle size={16} /> LOST
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bidding Modal */}
      {biddingParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setBiddingParticipant(null)}>
          <div className="bg-[#111] border border-gray-800 p-8 rounded-3xl max-w-md w-full relative animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setBiddingParticipant(null)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition">
              ✕
            </button>
            
            <div className="text-center mb-6">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center font-bold text-2xl mb-4 ${bidMode === "For" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}>
                {bidMode === "For" ? <ArrowUpRight size={32} /> : <ArrowDownRight size={32} />}
              </div>
              <h2 className="text-2xl font-bold mb-1">Place Bid {bidMode?.toUpperCase()}</h2>
              <p className="text-gray-400">{biddingParticipant.user?.name} in <span className="text-white">{biddingParticipant.eventTitle}</span></p>
            </div>

            <div className="bg-black/50 rounded-2xl p-6 mb-6 border border-gray-800">
              <label className="block text-gray-400 text-sm mb-3">Wager Amount (AURA)</label>
              <div className="relative">
                <input 
                  type="number" 
                  min="1" 
                  value={bidAmount} 
                  onChange={(e) => setBidAmount(Math.max(1, parseInt(e.target.value) || 1))} 
                  className="w-full bg-black border border-gray-700 focus:border-purple-500 rounded-xl p-4 text-2xl font-bold outline-none transition"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">Au</div>
              </div>
              <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-gray-500">Your Balance:</span>
                <span className={`font-bold ${user && user.auraCoins != null && user.auraCoins < bidAmount ? "text-red-500" : "text-emerald-400"}`}>
                  {user?.auraCoins !== undefined ? Number(user.auraCoins).toFixed(2) : "0.00"} Au
                </span>
              </div>
            </div>

            <button 
              onClick={executeBid} 
              disabled={Boolean(user && user.auraCoins != null && user.auraCoins < bidAmount)} 
              className={`w-full p-4 rounded-xl font-bold transition flex items-center justify-center gap-2
                ${(user && user.auraCoins != null && user.auraCoins < bidAmount) ? "bg-gray-800 text-gray-500 cursor-not-allowed" : 
                bidMode === "For" ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse-glow" : 
                "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]"
              }`}
            >
              Confirm Wager
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
