"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { Clock, ShieldCheck, XCircle, MessagesSquare, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

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
      const res = await fetch(`http://localhost:8080/api/profile-bids/auction/${id}`);
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

  const placeBid = async () => {
    if (!user) return alert("Log in first");
    if (bidAmount <= highestBid) return alert(`Bid must be higher than current highest (${highestBid})`);
    if (bidAmount > (user.auraCoins || 0)) return alert("Insufficient AURA balance");

    try {
      const res = await fetch(`http://localhost:8080/api/profile-bids/auction/${id}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bidderId: Number(user.id),
          amount: parseFloat(bidAmount.toString()),
          message: bidMessage
        })
      });

      if (res.ok) {
        alert("Bid placed successfully!");
        setBidAmount(Math.max((bidAmount + 50), 100));
        setBidMessage("");
        fetchAuctionDetails();
      } else {
        const error = await res.json();
        alert(`Failed: ${error.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resolveAuction = async (bidId: number, action: "ACCEPT" | "REJECT") => {
    try {
      const res = await fetch(`http://localhost:8080/api/profile-bids/auction/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: Number(user?.id),
          bidId,
          action
        })
      });

      if (res.ok) {
        alert(`Bid ${action}ED successfully.`);
        fetchAuctionDetails();
      } else {
        const error = await res.json();
        alert(`Failed: ${error.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-black text-white p-10">Loading...</div>;
  if (!auction) return <div className="min-h-screen bg-black text-white p-10">Auction not found</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12">
      <Link href="/profile-bidding" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors">
        <ArrowLeft size={20} /> Back to Auctions
      </Link>

      <div className="max-w-4xl mx-auto glass p-8 rounded-3xl border border-white/10">
        <div className="flex flex-col md:flex-row items-center gap-6 mb-8 border-b border-gray-800 pb-8">
           <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-bold text-4xl shadow-inner border border-white/20">
              {auction.targetUser?.profilePicture ? (
                <img src={auction.targetUser.profilePicture} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                auction.targetUser?.stockSymbol || "UK"
              )}
           </div>
           <div className="text-center md:text-left flex-1">
             <h1 className="text-3xl font-bold mb-2">Auction for {auction.targetUser?.name}</h1>
             <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-400">
               <span className="flex items-center gap-1 bg-black/40 px-3 py-1 rounded-full"><Clock size={14} className="text-pink-400"/> Status: {auction.status}</span>
               {auction.status === "ACTIVE" && (
                 <span className="flex items-center gap-1 bg-black/40 px-3 py-1 rounded-full">Ends: {new Date(auction.endTime).toLocaleTimeString()}</span>
               )}
             </div>
           </div>
        </div>

        {/* Bidding Area (Only if active and not the target) */}
        {auction.status === "ACTIVE" && !isTargetUser && (
          <div className="bg-black/50 p-6 rounded-2xl border border-gray-800 mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><ShieldCheck className="text-emerald-400" /> Place Your Bid</h2>
            <div className="flex justify-between items-center mb-6">
              <span className="text-gray-400">Current Highest Bid:</span>
              <span className="text-2xl font-bold text-pink-400">{highestBid} Au</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-2">Your Bid (AURA)</label>
                <input 
                  type="number" 
                  min={highestBid + 1}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(Number(e.target.value))}
                  className="w-full bg-black border border-gray-700 rounded-xl p-3 focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-2">Secret Message (sent to target)</label>
                <textarea 
                  rows={2}
                  value={bidMessage}
                  onChange={(e) => setBidMessage(e.target.value)}
                  placeholder="Why should they pick you?"
                  className="w-full bg-black border border-gray-700 rounded-xl p-3 focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>
              <button 
                onClick={placeBid}
                className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-xl transition-all"
              >
                Submit Bid
              </button>
            </div>
          </div>
        )}

        {/* Resolution Area (Only for target user when not COMPLETE) */}
        {isTargetUser && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6 text-pink-400">Bidder Rankings</h2>
            {auction.status === "ACTIVE" && (
               <div className="bg-blue-900/20 text-blue-400 border border-blue-500/30 p-4 rounded-xl mb-6">
                 Auction is still active. Come back when it ends to accept or reject bidders!
               </div>
            )}
            
            <div className="space-y-4">
              {bids.map((bid, index) => (
                <div key={bid.id} className={`p-5 rounded-2xl border ${bid.status === "PENDING" && auction.status === "RESOLVING" ? "border-pink-500/50 bg-black/60" : "border-gray-800 bg-black/40"}`}>
                   <div className="flex justify-between items-start mb-3">
                     <span className="font-bold text-lg">#{index + 1} - {bid.bidder?.name}</span>
                     <span className="font-bold text-xl text-emerald-400">{bid.amount} Au</span>
                   </div>
                   {bid.message && (
                     <div className="bg-gray-900 p-3 rounded-lg text-sm text-gray-300 italic flex gap-2 items-start mb-4">
                       <MessagesSquare size={16} className="mt-0.5 text-gray-500 shrink-0" />
                       "{bid.message}"
                     </div>
                   )}
                   
                   {/* Actions for resolving */}
                   {auction.status === "RESOLVING" && bid.status === "PENDING" && index === 0 && (
                     <div className="flex gap-3 mt-4">
                       <button onClick={() => resolveAuction(bid.id, "ACCEPT")} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2">
                          <CheckCircle size={18} /> Accept Bidder
                       </button>
                       {auction.rejectionsLeft > 0 ? (
                         <button onClick={() => resolveAuction(bid.id, "REJECT")} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2">
                            <XCircle size={18} /> Reject ({auction.rejectionsLeft} left)
                         </button>
                       ) : (
                         <div className="text-red-500 text-sm mt-2 text-center w-full">Final bidder! No rejections left.</div>
                       )}
                     </div>
                   )}

                   {bid.status !== "PENDING" && (
                     <div className={`mt-2 text-sm font-bold ${bid.status === "ACCEPTED" ? "text-emerald-500" : "text-gray-500"}`}>
                       Status: {bid.status}
                     </div>
                   )}
                </div>
              ))}
              {bids.length === 0 && (
                <div className="text-gray-500 italic">No bids yet.</div>
              )}
            </div>
          </div>
        )}
        
        {/* Active Viewer (Not target) - View only bids */}
        {!isTargetUser && (
           <div>
             <h2 className="font-bold text-gray-400 mb-4">Recent Bids</h2>
             <div className="space-y-2">
               {bids.map((bid) => (
                 <div key={bid.id} className="bg-black/40 border border-gray-800 p-3 rounded-xl flex justify-between items-center">
                   <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs">{bid.bidder?.stockSymbol}</div>
                     <span>{bid.bidder?.name}</span>
                   </div>
                   <span className="font-bold text-emerald-400">{bid.amount} Au</span>
                 </div>
               ))}
               {bids.length === 0 && <span className="text-sm text-gray-500">No bids placed.</span>}
             </div>
           </div>
        )}

      </div>
    </div>
  );
}
