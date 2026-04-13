"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Clock, Users, ArrowUpRight, ArrowDownRight, AlertCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { IconEvents, IconLightning } from "@/components/Icons";
import Avatar from "@/components/Avatar";
import toast from "react-hot-toast";

export default function EventsBidding() {
  const { user, refreshUser } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [biddingParticipant, setBiddingParticipant] = useState<any>(null);
  const [bidMode, setBidMode] = useState<"For" | "Against" | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(50);
  const [placingBid, setPlacingBid] = useState(false);
  const [userBids, setUserBids] = useState<Record<string, string>>({});

  useEffect(() => { fetchAllEvents(); }, []);
  useEffect(() => { if (user?.id) fetchUserBids(); }, [user?.id]);

  const fetchAllEvents = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/events/all");
      const data = await res.json();
      if (res.ok && data.events) setEvents(data.events);
    } catch (err) { console.error(err); }
  };

  const fetchUserBids = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`http://localhost:8080/api/events/user-bids/${user.id}`);
      const data = await res.json();
      if (res.ok && data.bids) {
        const map: Record<string, string> = {};
        for (const bid of data.bids) map[`${bid.eventId}-${bid.participantId}`] = bid.bidType;
        setUserBids(map);
      }
    } catch (err) { console.error(err); }
  };

  const hasUserBid = (eventId: number, participantId: number): string | null => {
    return userBids[`${eventId}-${participantId}`] || null;
  };

  const openBidModal = (event: any, participant: any, mode: "For" | "Against") => {
    setBiddingParticipant({ ...participant, eventId: event.id, eventTitle: event.title });
    setBidMode(mode);
    setBidAmount(50);
  };

  const executeBid = async () => {
    if (!user?.id || !biddingParticipant || !bidMode) return;
    setPlacingBid(true);
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
        toast.success(`Placed ${bidAmount} Au ${bidMode} ${biddingParticipant.user?.name || 'Participant'}!`);
        setBiddingParticipant(null);
        await refreshUser();
        await fetchUserBids();
      } else {
        const error = await res.json();
        toast.error(error.error || "Bid failed");
      }
    } catch { toast.error("Network error."); }
    finally { setPlacingBid(false); }
  };

  const activeEvents = events.filter(e => e.status === "Active");
  const resolvedEvents = events.filter(e => e.status === "Resolved");

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3" style={{ color: "var(--text)" }}>
              <IconEvents size={32} color="var(--accent)" />
              Live Events
            </h1>
            <p className="text-sm mt-1 ml-11" style={{ color: "var(--text-secondary)" }}>stake your aura on campus happenings</p>
          </div>
          <div className="card px-5 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-soft)" }}>
              <IconLightning size={18} color="var(--accent)" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Your AURA</div>
              <div className="text-lg font-extrabold" style={{ color: "var(--primary)" }}>{user?.auraCoins !== undefined ? Number(user.auraCoins).toFixed(2) : "0.00"}</div>
            </div>
          </div>
        </header>

        {/* Active Events */}
        <div className="space-y-6 mb-10">
          {activeEvents.length === 0 && resolvedEvents.length === 0 ? (
            <div className="card p-12 flex flex-col items-center justify-center text-center" style={{ border: "1px dashed var(--border-strong)" }}>
              <AlertCircle size={48} className="mb-4 opacity-50" style={{ color: "var(--primary)" }} />
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>No Events Available</h2>
              <p style={{ color: "var(--text-muted)" }}>Check back later when an admin creates a new event.</p>
            </div>
          ) : (
            <>
              {activeEvents.length === 0 && (
                <div className="card p-8 text-center" style={{ color: "var(--text-muted)", border: "1px dashed var(--border-strong)" }}>
                  No active events right now. Check back soon!
                </div>
              )}
              {activeEvents.map((evt) => (
                <div key={evt.id} className="card p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 pb-5" style={{ borderBottom: "1px solid var(--border)" }}>
                    <div>
                      <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>{evt.title}</h2>
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{evt.description}</p>
                    </div>
                    <div className="mt-3 md:mt-0 badge-green flex items-center gap-2">
                      <Clock size={14} /> In Progress
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                      <Users size={14} /> Participants
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {evt.participants?.map((participant: any) => {
                        const existingBid = hasUserBid(evt.id, participant.id);
                        return (
                          <div key={participant.id} className="card p-5">
                            <div className="flex items-center gap-3 mb-4">
                              <Avatar userId={participant.user?.id} name={participant.user?.name} size={44} />
                              <div>
                                <h4 className="font-bold" style={{ color: "var(--text)" }}>{participant.user?.name || "Unknown"}</h4>
                                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Au: {participant.user?.currentPrice?.toFixed(2) || "0.00"}</p>
                              </div>
                            </div>

                            {existingBid ? (
                              <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm" style={{
                                background: existingBid === "For" ? "rgba(52,199,89,0.12)" : "rgba(255,59,48,0.12)",
                                color: existingBid === "For" ? "var(--accent-green)" : "var(--accent-red)",
                                border: `1px solid ${existingBid === "For" ? "rgba(52,199,89,0.3)" : "rgba(255,59,48,0.3)"}`
                              }}>
                                <CheckCircle2 size={16} /> Bid Placed · {existingBid.toUpperCase()}
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button onClick={() => openBidModal(evt, participant, "For")}
                                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl font-bold text-sm transition-all"
                                  style={{ background: "rgba(52,199,89,0.12)", color: "var(--accent-green)", border: "1px solid rgba(52,199,89,0.3)" }}>
                                  <ArrowUpRight size={16} /> FOR
                                </button>
                                <button onClick={() => openBidModal(evt, participant, "Against")}
                                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl font-bold text-sm transition-all"
                                  style={{ background: "rgba(255,59,48,0.12)", color: "var(--accent-red)", border: "1px solid rgba(255,59,48,0.3)" }}>
                                  <ArrowDownRight size={16} /> AGAINST
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {(!evt.participants || evt.participants.length === 0) && (
                        <div className="col-span-full py-4 text-sm italic" style={{ color: "var(--text-muted)" }}>
                          No participants registered yet.
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
          <div className="mb-10">
            <h2 className="text-xl font-bold mb-5 flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
              <CheckCircle2 size={20} /> Completed Events
            </h2>
            <div className="space-y-4">
              {resolvedEvents.map((evt) => (
                <div key={evt.id} className="card p-6 opacity-80">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                    <div>
                      <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>{evt.title}</h3>
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>{evt.description}</p>
                    </div>
                    <div className="mt-3 md:mt-0 badge flex items-center gap-2">
                      <CheckCircle2 size={14} /> Ended
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                    <h4 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Results</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {evt.participants?.map((p: any) => (
                        <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl" style={{
                          background: p.outcome === "Won" ? "rgba(52,199,89,0.08)" : "rgba(255,59,48,0.08)",
                          border: `1px solid ${p.outcome === "Won" ? "rgba(52,199,89,0.2)" : "rgba(255,59,48,0.2)"}`
                        }}>
                          <Avatar userId={p.user?.id} name={p.user?.name} size={36} />
                          <div className="flex-1">
                            <div className="font-bold text-sm" style={{ color: "var(--text)" }}>{p.user?.name || "Unknown"}</div>
                          </div>
                          <span className="flex items-center gap-1 font-bold text-sm" style={{ color: p.outcome === "Won" ? "var(--accent-green)" : "var(--accent-red)" }}>
                            {p.outcome === "Won" ? <><CheckCircle2 size={16} /> WON</> : <><XCircle size={16} /> LOST</>}
                          </span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }} onClick={() => !placingBid && setBiddingParticipant(null)}>
          <div className="card p-8 max-w-md w-full relative animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => !placingBid && setBiddingParticipant(null)} className="absolute top-5 right-5" style={{ color: "var(--text-muted)" }}>✕</button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4" style={{
                background: bidMode === "For" ? "rgba(52,199,89,0.12)" : "rgba(255,59,48,0.12)",
                color: bidMode === "For" ? "var(--accent-green)" : "var(--accent-red)",
                border: `1px solid ${bidMode === "For" ? "rgba(52,199,89,0.3)" : "rgba(255,59,48,0.3)"}`
              }}>
                {bidMode === "For" ? <ArrowUpRight size={28} /> : <ArrowDownRight size={28} />}
              </div>
              <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>Place Bid {bidMode?.toUpperCase()}</h2>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{biddingParticipant.user?.name} in {biddingParticipant.eventTitle}</p>
            </div>

            <div className="p-5 rounded-xl mb-5" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <label className="block text-xs font-bold mb-2" style={{ color: "var(--text-secondary)" }}>Wager Amount (AURA)</label>
              <div className="relative">
                <input type="number" min="1" value={bidAmount} onChange={(e) => setBidAmount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="input w-full text-xl font-bold pr-10" disabled={placingBid} />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: "var(--text-muted)" }}>Au</div>
              </div>
              <div className="flex justify-between items-center mt-3">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Your Balance:</span>
                <span className="font-bold text-sm" style={{ color: user && user.auraCoins != null && user.auraCoins < bidAmount ? "var(--accent-red)" : "var(--accent-green)" }}>
                  {user?.auraCoins !== undefined ? Number(user.auraCoins).toFixed(2) : "0.00"} Au
                </span>
              </div>
            </div>

            <button onClick={executeBid}
              disabled={placingBid || Boolean(user && user.auraCoins != null && user.auraCoins < bidAmount)}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-40">
              {placingBid ? <><Loader2 size={18} className="animate-spin" /> Placing...</> : "Confirm Wager"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
