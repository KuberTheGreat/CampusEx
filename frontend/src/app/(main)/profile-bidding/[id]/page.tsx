"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { Clock, ShieldCheck, XCircle, MessagesSquare, CheckCircle, ArrowLeft } from "lucide-react";
import Avatar from "@/components/Avatar";
import Link from "next/link";
import toast from "react-hot-toast";

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

export default function ProfileAuctionDetails() {
  const { user } = useAuth();
  const { id } = useParams();
  const router = useRouter();

  const [auction, setAuction] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Bidding states
  const [bidAmount, setBidAmount] = useState<number>(100);
  const [bidMessage, setBidMessage] = useState<string>("");

  useEffect(() => {
    fetchAuctionDetails();
  }, [id]);

  const fetchAuctionDetails = async () => {
    try {
      const res = await fetch(`/api/profile-bids/auction/${id}`);
      const data = await res.json();
      if (res.ok) {
        setAuction(data.auction);
        setBids(data.bids || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const highestBid = bids.length > 0 ? bids[0].amount : 0;
  const isTargetUser = user?.id && auction?.targetUserId === user.id;
  const userExistingBid = bids.find(b => b.bidder?.id === user?.id && b.status === "PENDING");
  
  const topBids = bids.slice(0, 4);
  const activePendingBidIndex = topBids.findIndex(b => b.status === "PENDING");

  const placeBid = async () => {
    if (!user) return toast.error("Log in first");
    if (bidAmount <= highestBid) return toast.error(`Bid must be higher than current highest (${highestBid})`);
    if (bidAmount > (user.auraCoins || 0)) return toast.error("Insufficient AURA balance");

    try {
      const res = await fetch(`/api/profile-bids/auction/${id}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bidderId: Number(user.id),
          amount: parseFloat(bidAmount.toString()),
          message: bidMessage
        })
      });

      if (res.ok) {
        toast.success("Bid placed successfully!");
        setBidAmount(Math.max((bidAmount + 50), 100));
        setBidMessage("");
        fetchAuctionDetails();
      } else {
        const error = await res.json();
        toast.error(`Failed: ${error.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resolveAuction = async (bidId: number, action: "ACCEPT" | "REJECT") => {
    try {
      const res = await fetch(`/api/profile-bids/auction/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: Number(user?.id),
          bidId,
          action
        })
      });

      if (res.ok) {
        toast.success(`Bid ${action}ED successfully.`);
        fetchAuctionDetails();
      } else {
        const error = await res.json();
        toast.error(`Failed: ${error.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-10 flex items-center justify-center animate-pulse">Establishing Connection...</div>;
  if (!auction) return <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-10 text-center">Auction not found</div>;

  return (
    <div className="min-h-screen text-[var(--text)] p-6 md:p-12">
      <Link href="/profile-bidding" className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--primary)] mb-8 transition-colors">
        <ArrowLeft size={20} /> Back to Auctions
      </Link>

      <div className="max-w-4xl mx-auto card p-8 border-[var(--border)] shadow-xl">
        <div className="flex flex-col md:flex-row items-center gap-6 mb-8 border-b border-[var(--border-strong)] pb-8">
           <Avatar userId={auction.targetUser?.id} name={auction.targetUser?.name} size={96} />
           <div className="text-center md:text-left flex-1">
             <h1 className="text-3xl font-bold mb-2 text-[var(--text)]">Auction for {auction.targetUser?.name}</h1>
             <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-[var(--text-secondary)]">
               <span className="flex items-center gap-1 bg-[var(--bg-input)] px-3 py-1 rounded-full"><Clock size={14} className="text-[var(--primary)]"/> Status: {auction.status}</span>
               {auction.status === "ACTIVE" && (
                 <span className="flex items-center gap-1 bg-[var(--bg-input)] px-3 py-1 rounded-full">Ends in: <Countdown endTime={auction.endTime} /></span>
               )}
             </div>
           </div>
        </div>

        {/* Bidding Area (Only if active and not the target) */}
        {auction.status === "ACTIVE" && !isTargetUser && (
          <div className="bg-[var(--bg-input)] p-6 rounded-2xl border border-[var(--border)] mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><ShieldCheck style={{ color: "var(--accent-green)" }} /> Place Your Bid</h2>
            <div className="flex justify-between items-center mb-6">
              <span className="text-[var(--text-secondary)]">Current Highest Bid:</span>
              <span className="text-2xl font-bold text-[var(--primary)]">{highestBid} Au</span>
            </div>
            
            {userExistingBid ? (
              <div className="border p-4 rounded-xl text-center" style={{ background: "rgba(52, 199, 89, 0.1)", borderColor: "rgba(52, 199, 89, 0.3)", color: "var(--accent-green)" }}>
                <CheckCircle className="mx-auto mb-2" size={32} />
                <h3 className="font-bold text-lg mb-1">Bid Logged Successfully!</h3>
                <p className="text-sm opacity-80">You have a pending bid of {userExistingBid.amount} Au. Wait for the auction to end!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-[var(--text-secondary)] block mb-2">Your Bid (AURA)</label>
                  <input 
                    type="number" 
                    min={highestBid + 1}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(Number(e.target.value))}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="text-sm text-[var(--text-secondary)] block mb-2">Secret Message (sent to target)</label>
                  <textarea 
                    rows={2}
                    value={bidMessage}
                    onChange={(e) => setBidMessage(e.target.value)}
                    placeholder="Why should they pick you?"
                    className="input w-full"
                  />
                </div>
                <button 
                  onClick={placeBid}
                  className="btn-primary w-full"
                >
                  Submit Bid
                </button>
              </div>
            )}
          </div>
        )}

        {/* Resolution Area (Only for target user when not COMPLETE) */}
        {isTargetUser && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6 text-[var(--primary)]">Bidder Rankings</h2>
            {auction.status === "ACTIVE" && (
               <div className="badge badge-green w-full py-3 justify-center mb-6 text-sm">
                 Auction is still active. Come back when it ends to accept or reject bidders!
               </div>
            )}
            
            <div className="space-y-4">
              {auction.status === "ACTIVE" ? (
                <div className="opacity-70 text-center py-10 border border-dashed border-[var(--border-strong)] rounded-2xl bg-[var(--bg-input)]">
                  Profiles and secret messages are kept completely hidden from you until the timer runs out.
                </div>
              ) : (
                topBids.map((bid, index) => (
                  <div key={bid.id} className={`p-5 rounded-2xl border ${bid.status === "PENDING" && auction.status === "RESOLVING" ? "shadow-lg bg-[var(--bg-card)]" : "bg-[var(--bg-input)]"}`} style={{ borderColor: bid.status === "PENDING" && auction.status === "RESOLVING" ? "var(--primary)" : "var(--border-strong)" }}>
                     <div className="flex justify-between items-start mb-3">
                       <span className="font-bold text-lg">#{index + 1} - {bid.bidder?.name}</span>
                       <span className="font-bold text-xl" style={{ color: "var(--accent-green)" }}>{bid.amount} Au</span>
                     </div>
                     {bid.message && (
                       <div className="p-3 rounded-lg text-sm italic flex gap-2 items-start mb-4 bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)]">
                         <MessagesSquare size={16} className="mt-0.5 text-[var(--text-muted)] shrink-0" />
                         "{bid.message}"
                       </div>
                     )}
                     
                     {/* Actions for resolving */}
                     {auction.status === "RESOLVING" && bid.status === "PENDING" && index === activePendingBidIndex && (
                       <div className="flex gap-3 mt-4">
                         <button onClick={() => resolveAuction(bid.id, "ACCEPT")} className="flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition" style={{ background: "var(--accent-green)", color: "white" }}>
                            <CheckCircle size={18} /> Accept Match
                         </button>
                         {auction.rejectionsLeft > 0 && index < topBids.length - 1 ? (
                           <button onClick={() => resolveAuction(bid.id, "REJECT")} className="flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition" style={{ background: "var(--accent-red)", color: "white" }}>
                              <XCircle size={18} /> Reject ({auction.rejectionsLeft} left)
                           </button>
                         ) : (
                           <div className="text-sm mt-2 font-bold px-3 py-2 rounded text-center w-full" style={{ background: "rgba(255, 59, 48, 0.1)", color: "var(--accent-red)" }}>Final eligible bidder. You cannot reject!</div>
                         )}
                       </div>
                     )}
  
                     {bid.status !== "PENDING" && (
                       <div className="mt-2 text-sm font-bold" style={{ color: bid.status === "ACCEPTED" ? "var(--accent-green)" : "var(--text-muted)" }}>
                         Status: {bid.status}
                       </div>
                     )}
                  </div>
                ))
              )}
              {auction.status !== "ACTIVE" && topBids.length === 0 && (
                <div className="text-[var(--text-muted)] italic">No bids were placed on you.</div>
              )}
            </div>
          </div>
        )}
        
        {/* Active Viewer (Not target) - View only bids */}
        {!isTargetUser && (
           <div>
             <h2 className="font-bold text-[var(--text-secondary)] mb-4">Recent Bids</h2>
             <div className="space-y-2">
               {bids.map((bid) => (
                 <div key={bid.id} className="bg-[var(--bg-input)] border border-[var(--border)] p-3 rounded-xl flex justify-between items-center">
                   <div className="flex items-center gap-2">
                     <Avatar userId={bid.bidder?.id} name={bid.bidder?.name} size={32} />
                     <span className="text-[var(--text)]">{bid.bidder?.name}</span>
                   </div>
                   <span className="font-bold" style={{ color: "var(--accent-green)" }}>{bid.amount} Au</span>
                 </div>
               ))}
               {bids.length === 0 && <span className="text-sm text-[var(--text-muted)]">No bids placed.</span>}
             </div>
           </div>
        )}

      </div>
    </div>
  );
}
