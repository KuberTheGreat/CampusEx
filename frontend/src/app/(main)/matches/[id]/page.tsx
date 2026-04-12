"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { Send, Star, Gift, ShieldAlert, ArrowLeft, MessageCircle } from "lucide-react";
import Link from "next/link";

export default function MatchDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [match, setMatch] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [giftAmount, setGiftAmount] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.id && id) {
      fetchMatchDetails();
      fetchChat();
      
      // Simple polling for new messages every 3 seconds
      const interval = setInterval(fetchChat, 3000);
      return () => clearInterval(interval);
    }
  }, [user, id]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMatchDetails = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/dating/matches/${id}?userId=${user?.id}`);
      if (!res.ok) {
        if (res.status === 403) router.push('/matches');
        return;
      }
      const data = await res.json();
      setMatch(data.match);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChat = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/dating/matches/${id}/chat`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      const res = await fetch(`http://localhost:8080/api/dating/matches/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: user.id, text: newMessage.trim() })
      });
      if (res.ok) {
        setNewMessage("");
        fetchChat();
      }
    } catch (err) {
      console.error("Failed to send", err);
    }
  };

  const submitRating = async (score: number) => {
    if (!user || score < 1 || score > 5) return;
    try {
      const res = await fetch(`http://localhost:8080/api/dating/matches/${id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUserId: user.id, score })
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage("Rating submitted successfully!");
        setRating(score);
        fetchMatchDetails(); // Refresh to ensure ENDED status is checked
      } else {
        setActionMessage(data.error || "Failed to submit rating.");
      }
      setTimeout(() => setActionMessage(""), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const sendGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !giftAmount || isNaN(Number(giftAmount))) return;
    
    try {
      const res = await fetch(`http://localhost:8080/api/dating/matches/${id}/gift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUserId: user.id, amount: Number(giftAmount) })
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Successfully sent ${giftAmount} Aura Coins!`);
        setGiftAmount("");
      } else {
        setActionMessage(data.error || "Failed to send gift.");
      }
      setTimeout(() => setActionMessage(""), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  if (!user || isLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-pink-500 animate-pulse font-bold text-2xl">Decrypting Connection...</div>;
  }

  if (!match) return <div className="p-10 text-white text-center">Match not found.</div>;

  const partner = match.user1.id === user.id ? match.user2 : match.user1;
  const partnerTraits = partner.traits || [];
  const iRated = match.user1.id === user.id ? match.user1Rated : match.user2Rated;
  const isEnded = match.status === 'ENDED';

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row overflow-hidden absolute inset-0">
      
      {/* Left Panel: Profile Reveal & Actions */}
      <div className="w-full md:w-1/3 xl:w-1/4 border-r border-white/10 bg-black/80 backdrop-blur-3xl flex flex-col z-20 overflow-y-auto">
        <div className="p-6 pb-0 flex items-center gap-3">
          <Link href="/matches" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <span className="font-bold tracking-widest text-xs text-pink-500 uppercase">Classified Intel</span>
        </div>

        <div className="p-8 flex flex-col items-center">
          <div className="relative mb-6">
            <div className="w-32 h-32 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-4xl shadow-[0_0_40px_rgba(236,72,153,0.3)]">
              {partner.profilePicture ? (
                <img src={partner.profilePicture} alt="Profile" className="w-full h-full rounded-full object-cover border-4 border-black" />
              ) : (
                partner.stockSymbol || "?"
              )}
            </div>
            {isEnded && (
              <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-black rotate-12">
                CLOSED
              </div>
            )}
          </div>

          <h1 className="text-3xl font-extrabold text-white mb-1">{partner.name || partner.email}</h1>
          <div className="flex gap-4 text-sm font-semibold mb-8">
            <span className="text-emerald-400">Stock: ${partner.currentPrice?.toFixed(2)}</span>
            <span className="text-purple-400">Credibility: {partner.credibilityScore}</span>
          </div>

          <div className="w-full bg-white/5 rounded-2xl p-5 border border-white/10 shadow-inner mb-6">
            <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldAlert size={16} className="text-pink-500" /> Unredacted Traits
            </h3>
            {partnerTraits.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {partnerTraits.map((t: any) => (
                  <span key={t.id} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    t.isHidden 
                    ? "bg-pink-500/20 text-pink-300 border border-pink-500/30" 
                    : "bg-white/10 text-gray-300 border border-white/5"
                  }`}>
                    {t.name} {t.isHidden && <span className="ml-1 opacity-50 text-xs">(Hidden)</span>}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic text-sm">No traits defined.</p>
            )}
          </div>

          {!isEnded && (
            <div className="w-full space-y-6">
              {/* Gift Section */}
              <div className="glass p-5 rounded-2xl border border-white/5">
                <h4 className="font-bold flex items-center gap-2 mb-3 text-sm text-yellow-500">
                  <Gift size={16} /> Gift Aura Coins
                </h4>
                <form onSubmit={sendGift} className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="Amount..."
                    value={giftAmount}
                    onChange={(e) => setGiftAmount(e.target.value)}
                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-yellow-500/50"
                  />
                  <button type="submit" className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 rounded-xl transition-colors">
                    Send
                  </button>
                </form>
              </div>

              {/* Rate Section */}
              {!iRated ? (
                <div className="glass p-5 rounded-2xl border border-white/5 text-center">
                  <h4 className="font-bold mb-3 text-sm text-gray-300">Rate Experience</h4>
                  <p className="text-xs text-gray-500 mb-4 px-2">Submit a rating to close this match. 4+ stars heavily boosts their value. 2- stars damages it.</p>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => submitRating(star)}
                        onMouseEnter={() => setRating(star)}
                        onMouseLeave={() => setRating(0)}
                        className={`transition-colors ${
                          rating >= star ? "text-yellow-400" : "text-gray-600 hover:text-yellow-600"
                        }`}
                      >
                        <Star className="fill-current" size={32} />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-pink-500 font-bold bg-pink-500/10 py-3 rounded-xl border border-pink-500/30">
                  Rating Submitted
                </div>
              )}
            </div>
          )}

          {actionMessage && (
            <div className="mt-4 text-sm font-medium text-center text-green-400 bg-green-400/10 px-4 py-2 rounded-lg w-full transition-opacity">
              {actionMessage}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Chat Interface */}
      <div className="flex-1 flex flex-col relative z-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
        <div className="absolute inset-0 bg-black/90 pointer-events-none" />
        
        {/* Chat Header */}
        <div className="h-20 border-b border-white/10 flex items-center px-8 relative z-10 bg-black/50 backdrop-blur-md">
          <div>
            <h2 className="text-xl font-bold">Encrypted Channel</h2>
            <p className="text-xs text-pink-500 font-mono">End-to-End Secure // Session {match.id}</p>
          </div>
        </div>

        {/* Messages */}
        <div 
          ref={chatRef}
          className="flex-1 p-8 overflow-y-auto space-y-6 relative z-10 scroll-smooth"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
              <MessageCircle size={64} className="mb-4" />
              <p className="text-xl font-medium">Say hello.</p>
              <p className="text-sm">Initiate the conversation safely.</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMine = msg.senderId === user.id;
              return (
                <div key={i} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`
                    max-w-[70%] rounded-3xl px-6 py-4 shadow-xl
                    ${isMine 
                      ? "bg-gradient-to-br from-pink-600 to-purple-600 rounded-tr-sm text-white" 
                      : "glass border border-white/10 rounded-tl-sm text-gray-200"
                    }
                  `}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <div className={`text-[10px] mt-2 opacity-50 font-mono text-right`}>
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 bg-black/60 backdrop-blur-xl border-t border-white/10 relative z-10">
          {isEnded ? (
            <div className="text-center text-gray-500 py-4 font-bold border border-dashed border-gray-700 rounded-2xl bg-white/5">
              CONNECTION TERMINATED
            </div>
          ) : (
            <form onSubmit={sendMessage} className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full bg-white/10 border border-white/20 focus:border-pink-500 outline-none rounded-full pl-6 pr-6 py-4 text-white placeholder-gray-500 transition-all shadow-inner"
                />
              </div>
              <button 
                type="submit"
                disabled={!newMessage.trim()}
                className="w-14 h-14 rounded-full bg-pink-600 hover:bg-pink-500 flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-all transform hover:scale-105 active:scale-95"
              >
                <Send size={20} className="ml-1" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
