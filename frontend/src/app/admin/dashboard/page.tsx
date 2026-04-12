"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  // Edit States
  const [editAura, setEditAura] = useState(0);
  const [editCredibility, setEditCredibility] = useState(0);
  const [editPrice, setEditPrice] = useState(0);
  
  // Shop Management States
  const [shopItems, setShopItems] = useState<any[]>([]);
  const [selectedPerk, setSelectedPerk] = useState<any>(null);
  const [newPerk, setNewPerk] = useState({
    name: "", description: "", price: 0, rarity: "Common", requiredScore: 0, effectType: "", imageUrl: "🔮"
  });

  // Auction States
  const [selectedAuctionUser, setSelectedAuctionUser] = useState<any>(null);
  const [auctionDuration, setAuctionDuration] = useState(24);

  // Price Engine States
  const [engineInterval, setEngineInterval] = useState(60);
  const [newInterval, setNewInterval] = useState(60);

  // Event Management States
  const [events, setEvents] = useState<any[]>([]);
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);
  const [eventBids, setEventBids] = useState<any[]>([]);
  const [outcomeSelections, setOutcomeSelections] = useState<Record<number, string>>({});
  const [resolvingEvent, setResolvingEvent] = useState<number | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [savingPerk, setSavingPerk] = useState(false);
  const [updatingEngine, setUpdatingEngine] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const admin = localStorage.getItem("campusex_admin");
    if (!admin) {
      router.push("/admin");
      return;
    }
    fetchUsers();
    fetchEngineStatus();
    fetchShopItems();
    fetchAllEvents();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/admin/users");
      const data = await res.json();
      if (res.ok) setUsers(data.users || []);
    } catch(err) {
      console.error(err);
    }
  };

  const fetchEngineStatus = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/admin/price-engine/status");
      const data = await res.json();
      if (res.ok) {
        setEngineInterval(data.intervalSeconds);
        setNewInterval(data.intervalSeconds);
      }
    } catch(err) {
      console.error(err);
    }
  };

  const updateEngineInterval = async () => {
    setUpdatingEngine(true);
    try {
      const res = await fetch("http://localhost:8080/api/admin/price-engine/interval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seconds: Number(newInterval) })
      });
      if (res.ok) {
        toast.success(`Price engine interval updated to ${newInterval}s`);
        setEngineInterval(newInterval);
      } else {
        toast.error("Failed to update interval");
      }
    } catch(err) {
      console.error(err);
      toast.error("Network error");
    } finally {
      setUpdatingEngine(false);
    }
  };

  const handeBanUser = async (id: number, name: string) => {
    if (!confirm(`Are you absolutely sure you want to BAN ${name}? This will soft-delete their account completely.`)) return;

    try {
      const res = await fetch(`http://localhost:8080/api/admin/user/${id}/ban`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Target successfully banned.");
        fetchUsers();
      } else {
        toast.error("Ban Failed");
      }
    } catch(err) {
      console.error(err);
      toast.error("Network error");
    }
  };

  const openEditor = (u: any) => {
    setSelectedUser(u);
    setEditAura(u.auraCoins);
    setEditCredibility(u.credibilityScore);
    setEditPrice(u.currentPrice);
  };

  const saveEdits = async () => {
    setSavingUser(true);
    try {
      const res = await fetch(`http://localhost:8080/api/admin/user/${selectedUser.id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          auraCoins: Number(editAura), 
          credibilityScore: Number(editCredibility), 
          currentPrice: Number(editPrice) 
        })
      });
      if (res.ok) {
        toast.success("Overwritten successfully!");
        setSelectedUser(null);
        fetchUsers();
      } else {
        const d = await res.json();
        toast.error("Update failed: " + d.error);
      }
    } catch(e) {
      console.error(e);
      toast.error("Network error");
    } finally {
      setSavingUser(false);
    }
  };

  const fetchShopItems = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/shop/items");
      const data = await res.json();
      if (res.ok) setShopItems(data || []);
    } catch(err) { console.error(err); }
  };

  const createPerk = async () => {
    const adminData = localStorage.getItem("campusex_admin");
    if (!adminData) {
        toast.error("Session Expired: Please log in again at /admin");
        return;
    }
    const admin = JSON.parse(adminData);
    
    setSavingPerk(true);
    try {
      const res = await fetch("http://localhost:8080/api/admin/shop/items", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json", 
            "X-Admin-Email": admin.email || "" 
        },
        body: JSON.stringify(newPerk)
      });

      if (res.ok) {
        toast.success("Perk materialised!");
        setNewPerk({ name: "", description: "", price: 0, rarity: "Common", requiredScore: 0, effectType: "", imageUrl: "🔮" });
        fetchShopItems();
      }
    } catch(e) { console.error(e); } finally {
      setSavingPerk(false);
    }
  };

  const deletePerk = async (id: number) => {
    if (!confirm("Terminate this perk permanently?")) return;
    const adminData = localStorage.getItem("campusex_admin");
    if (!adminData) return toast.error("Unauthorized: Please login at /admin");
    const admin = JSON.parse(adminData);

    try {
      await fetch(`http://localhost:8080/api/admin/shop/item/${id}`, { 
          method: "DELETE",
          headers: { "X-Admin-Email": admin.email || "" }
      });
      toast.success("Perk terminated.");
      fetchShopItems();
    } catch(e) { console.error(e); toast.error("Network error"); }
  };

  const savePerkEdits = async () => {
    const adminData = localStorage.getItem("campusex_admin");
    if (!adminData) return toast.error("Unauthorized: Please login at /admin");
    const admin = JSON.parse(adminData);

    setSavingPerk(true);
    try {
        const res = await fetch(`http://localhost:8080/api/admin/shop/item/${selectedPerk.id}`, {
            method: "PUT",
            headers: { 
                "Content-Type": "application/json", 
                "X-Admin-Email": admin.email || "" 
            },
            body: JSON.stringify(selectedPerk)
        });

        if (res.ok) {
            toast.success("Perk updated.");
            setSelectedPerk(null);
            fetchShopItems();
        }
    } catch(e) { console.error(e); toast.error("Network error"); } finally {
      setSavingPerk(false);
    }
  }

  // ===== Event Management =====
  const fetchAllEvents = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/admin/events/all");
      const data = await res.json();
      if (res.ok) setEvents(data.events || []);
    } catch(err) { console.error(err); }
  };

  const fetchEventBids = async (eventId: number) => {
    try {
      const res = await fetch(`http://localhost:8080/api/admin/events/${eventId}/bids`);
      const data = await res.json();
      if (res.ok) setEventBids(data.bids || []);
    } catch(err) { console.error(err); }
  };

  const toggleExpandEvent = async (eventId: number) => {
    if (expandedEvent === eventId) {
      setExpandedEvent(null);
      setEventBids([]);
      return;
    }
    setExpandedEvent(eventId);
    await fetchEventBids(eventId);
  };

  const setParticipantOutcome = (participantId: number, outcome: string) => {
    setOutcomeSelections(prev => ({ ...prev, [participantId]: outcome }));
  };

  const resolveEvent = async (eventId: number, participants: any[]) => {
    // Validate all participants have an outcome
    const allSet = participants.every((p: any) => outcomeSelections[p.id] === "Won" || outcomeSelections[p.id] === "Lost");
    if (!allSet) {
      return toast.error("Please set the outcome (Won/Lost) for ALL participants before resolving.");
    }

    if (!confirm("Are you sure you want to resolve this event? This will distribute prizes and cannot be undone.")) return;

    setResolvingEvent(eventId);
    try {
      const outcomes = participants.map((p: any) => ({
        participantId: p.id,
        outcome: outcomeSelections[p.id]
      }));

      const res = await fetch(`http://localhost:8080/api/admin/events/${eventId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcomes })
      });

      if (res.ok) {
        toast.success("Event resolved! Prizes distributed successfully.", { duration: 5000 });
        setOutcomeSelections({});
        setExpandedEvent(null);
        fetchAllEvents();
        fetchUsers();
      } else {
        const err = await res.json();
        toast.error("Resolution failed: " + err.error);
      }
    } catch(e) {
      console.error(e);
      toast.error("Network error");
    } finally {
      setResolvingEvent(null);
    }
  };

  const launchAuction = async () => {
    if (!selectedAuctionUser) return;
    try {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + auctionDuration * 3600 * 1000);

      const res = await fetch("http://localhost:8080/api/profile-bids/admin/auction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: selectedAuctionUser.id,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        })
      });

      if (res.ok) {
        alert("Profile Auction Launched Successfully!");
        setSelectedAuctionUser(null);
      } else {
        const d = await res.json();
        alert("Launch failed: " + d.error);
      }
    } catch (e) {
      console.error(e);
      alert("Error reaching server");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 p-8 font-mono">
      <header className="flex justify-between items-center mb-12 border-b border-red-900/30 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-red-500">SYSTEM.OVERLORD()</h1>
          <p className="text-xs text-gray-500 mt-1">Authorized access active. All actions are absolute.</p>
        </div>
        <button onClick={() => { localStorage.removeItem("campusex_admin"); router.push("/admin"); }} className="px-4 py-2 border border-red-900 text-red-500 hover:bg-red-900/20 transition rounded">
          DEACTIVATE
        </button>
      </header>

      {/* Price Engine Control Panel */}
      <div className="bg-[#111] border border-amber-900/40 rounded-xl p-6 mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-amber-500 tracking-widest">PRICE_ENGINE.CONFIG</h2>
            <p className="text-xs text-gray-500 mt-1">Controls the cron interval for volume-based price recalculation. Current: <span className="text-amber-400 font-bold">{engineInterval}s</span></p>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="number" 
              min="10" 
              value={newInterval} 
              onChange={(e) => setNewInterval(Math.max(10, Number(e.target.value)))} 
              className="w-24 bg-black border border-gray-800 p-2 rounded text-center text-amber-500 font-bold focus:outline-none focus:border-amber-500"
            />
            <span className="text-xs text-gray-500">seconds</span>
            <button 
              onClick={updateEngineInterval} 
              disabled={newInterval === engineInterval || updatingEngine}
              className="px-4 py-2 bg-amber-900/30 border border-amber-500/50 text-amber-400 hover:bg-amber-900/50 rounded font-bold text-xs tracking-widest transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {updatingEngine ? <><Loader2 size={14} className="animate-spin" /> APPLYING...</> : "APPLY"}
            </button>
          </div>
        </div>
        {/* Quick presets */}
        <div className="flex gap-2 mt-4">
          {[
            { label: "10s (Debug)", val: 10 },
            { label: "30s", val: 30 },
            { label: "1 min", val: 60 },
            { label: "5 min", val: 300 },
            { label: "15 min", val: 900 },
            { label: "1 hour", val: 3600 },
          ].map((preset) => (
            <button 
              key={preset.val} 
              onClick={() => setNewInterval(preset.val)} 
              className={`px-3 py-1 rounded text-xs font-bold transition ${newInterval === preset.val ? 'bg-amber-500 text-black' : 'bg-black border border-gray-800 text-gray-500 hover:text-amber-400 hover:border-amber-800'}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black/50 border-b border-gray-800 text-xs uppercase tracking-widest text-gray-500">
              <th className="p-4 font-normal">ID</th>
              <th className="p-4 font-normal">Symbol</th>
              <th className="p-4 font-normal">Target Email</th>
              <th className="p-4 font-normal text-right">Aura Balance</th>
              <th className="p-4 font-normal text-right">Live Price</th>
              <th className="p-4 font-normal text-right">Credibility</th>
              <th className="p-4 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-gray-900 hover:bg-white/5 transition">
                <td className="p-4 text-gray-600">#{u.id}</td>
                <td className="p-4 font-bold text-gray-200">{u.stockSymbol || "N/A"}</td>
                <td className="p-4 text-sm">{u.email}</td>
                <td className="p-4 text-right font-bold text-amber-500">{u.auraCoins?.toFixed(2)}</td>
                <td className="p-4 text-right text-emerald-500 font-bold">{u.currentPrice?.toFixed(2)}</td>
                <td className="p-4 text-right text-purple-400">{u.credibilityScore}</td>
                <td className="p-4 text-right space-x-3">
                  <button onClick={() => setSelectedAuctionUser(u)} className="text-xs text-pink-500 hover:text-pink-400 font-bold bg-pink-500/10 px-2 py-1 rounded">AUCTION</button>
                  <button onClick={() => openEditor(u)} className="text-xs text-blue-500 hover:text-blue-400 underline">EDIT</button>
                  <button onClick={() => handeBanUser(u.id, u.name)} className="text-xs text-red-600 hover:text-red-400 font-bold tracking-widest">BAN</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center p-8 text-gray-600">No users found in database.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===== EVENT MANAGEMENT SECTION ===== */}
      <div className="mt-12 mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-cyan-500 tracking-tighter">EVENT_ARENA.CONTROL</h2>
          <div className="text-[10px] text-gray-600 font-mono">RESOLVE_OUTCOMES() · DISTRIBUTE_PRIZES()</div>
        </div>

        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="bg-[#111] border border-gray-800 rounded-xl p-8 text-center text-gray-600">
              No events found in the system.
            </div>
          ) : (
            events.map((evt) => {
              const isActive = evt.status === "Active";
              const isResolved = evt.status === "Resolved";
              const isExpanded = expandedEvent === evt.id;

              return (
                <div key={evt.id} className={`bg-[#111] border rounded-xl overflow-hidden transition-all ${
                  isResolved ? "border-gray-800/50 opacity-70" : "border-cyan-900/40 hover:border-cyan-500/40"
                }`}>
                  {/* Event Header */}
                  <div 
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition"
                    onClick={() => isActive && toggleExpandEvent(evt.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-gray-600"}`} />
                      <div>
                        <h3 className="font-bold text-gray-200">{evt.title}</h3>
                        <p className="text-[10px] text-gray-500">{evt.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Participants</div>
                        <div className="font-bold text-gray-300">{evt.participants?.length || 0}</div>
                      </div>
                      <span className={`px-3 py-1 rounded text-[10px] font-bold tracking-widest uppercase ${
                        isActive ? "bg-emerald-900/40 text-emerald-400 border border-emerald-500/30" : 
                        "bg-gray-900 text-gray-500 border border-gray-800"
                      }`}>
                        {evt.status}
                      </span>
                      {isActive && (
                        <span className="text-gray-500 text-xs">{isExpanded ? "▲" : "▼"}</span>
                      )}
                    </div>
                  </div>

                  {/* Expanded Panel — only for Active events */}
                  {isExpanded && isActive && (
                    <div className="border-t border-gray-800 bg-black/40 p-6 space-y-6">
                      {/* Participants & Outcome Selection */}
                      <div>
                        <h4 className="text-[10px] text-cyan-400 tracking-widest uppercase mb-4 font-bold">Set Participant Outcomes</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {evt.participants?.map((p: any) => (
                            <div key={p.id} className="bg-[#111] border border-gray-800 rounded-xl p-4">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center font-bold text-sm">
                                  {p.user?.stockSymbol || "??"}
                                </div>
                                <div>
                                  <div className="font-bold text-sm text-gray-200">{p.user?.name || "Unknown"}</div>
                                  <div className="text-[10px] text-gray-600">{p.user?.email}</div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => setParticipantOutcome(p.id, "Won")}
                                  className={`flex-1 py-2 rounded-lg text-xs font-bold tracking-widest transition ${
                                    outcomeSelections[p.id] === "Won" 
                                      ? "bg-emerald-600 text-white border border-emerald-500" 
                                      : "bg-black border border-gray-800 text-gray-500 hover:text-emerald-400 hover:border-emerald-800"
                                  }`}
                                >
                                  ✓ WON
                                </button>
                                <button 
                                  onClick={() => setParticipantOutcome(p.id, "Lost")}
                                  className={`flex-1 py-2 rounded-lg text-xs font-bold tracking-widest transition ${
                                    outcomeSelections[p.id] === "Lost" 
                                      ? "bg-red-600 text-white border border-red-500" 
                                      : "bg-black border border-gray-800 text-gray-500 hover:text-red-400 hover:border-red-800"
                                  }`}
                                >
                                  ✕ LOST
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bids Table */}
                      {eventBids.length > 0 && (
                        <div>
                          <h4 className="text-[10px] text-cyan-400 tracking-widest uppercase mb-3 font-bold">Active Bids ({eventBids.length})</h4>
                          <div className="bg-[#0a0a0a] border border-gray-900 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                              <thead className="text-[10px] uppercase tracking-widest text-gray-600 bg-black">
                                <tr>
                                  <th className="p-3">Bidder</th>
                                  <th className="p-3">On</th>
                                  <th className="p-3">Type</th>
                                  <th className="p-3 text-right">Amount</th>
                                  <th className="p-3 text-right">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {eventBids.map((bid: any) => (
                                  <tr key={bid.id} className="border-t border-gray-900">
                                    <td className="p-3 text-gray-300">{bid.bidder?.name || bid.bidderId}</td>
                                    <td className="p-3 text-gray-500">{bid.participant?.user?.name || bid.participantId}</td>
                                    <td className={`p-3 font-bold ${bid.bidType === "For" ? "text-emerald-400" : "text-red-400"}`}>
                                      {bid.bidType}
                                    </td>
                                    <td className="p-3 text-right font-bold text-amber-500">{bid.amount?.toFixed(2)} Au</td>
                                    <td className="p-3 text-right">
                                      <span className="text-[10px] text-gray-500 font-bold tracking-widest">{bid.status}</span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Resolve Button */}
                      <button
                        onClick={() => resolveEvent(evt.id, evt.participants || [])}
                        disabled={resolvingEvent === evt.id}
                        className="w-full py-4 bg-cyan-900/40 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-900/60 hover:text-cyan-300 rounded-xl font-bold text-xs tracking-[0.2em] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {resolvingEvent === evt.id ? <><Loader2 size={16} className="animate-spin" /> RESOLVING...</> : "⚡ RESOLVE_EVENT & DISTRIBUTE_PRIZES"}
                      </button>
                    </div>
                  )}

                  {/* Resolved summary */}
                  {isResolved && (
                    <div className="border-t border-gray-800 bg-black/20 px-5 py-3 flex items-center gap-4">
                      <span className="text-[10px] text-gray-600 tracking-widest">OUTCOMES:</span>
                      {evt.participants?.map((p: any) => (
                        <span key={p.id} className={`text-xs font-bold px-2 py-1 rounded ${
                          p.outcome === "Won" ? "bg-emerald-900/40 text-emerald-400" : 
                          p.outcome === "Lost" ? "bg-red-900/40 text-red-400" : "bg-gray-900 text-gray-500"
                        }`}>
                          {p.user?.stockSymbol || "??"}: {p.outcome}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Shop Management Section */}
      <div className="mt-12 mb-20">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-purple-500 tracking-tighter">POWER_SHOP.INVENTORY</h2>
            <div className="text-[10px] text-gray-600 font-mono">ENFORCE_MARKET_PERKS()</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Create New Perk */}
            <div className="lg:col-span-1 bg-black border border-purple-900/30 p-6 rounded-xl space-y-4">
                <h3 className="text-xs font-bold text-purple-400 tracking-widest uppercase">Forge New Perk</h3>
                <input type="text" placeholder="Name" value={newPerk.name} onChange={e => setNewPerk({...newPerk, name: e.target.value})} className="w-full bg-black border border-gray-800 p-2 text-sm rounded focus:border-purple-500 outline-none" />
                <textarea placeholder="Description" value={newPerk.description} onChange={e => setNewPerk({...newPerk, description: e.target.value})} className="w-full bg-black border border-gray-800 p-2 text-sm rounded focus:border-purple-500 outline-none h-20" />
                <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Price" value={newPerk.price} onChange={e => setNewPerk({...newPerk, price: Number(e.target.value)})} className="bg-black border border-gray-800 p-2 text-sm rounded focus:border-purple-500 outline-none" />
                    <input type="text" placeholder="Effect (SHIELD...)" value={newPerk.effectType} onChange={e => setNewPerk({...newPerk, effectType: e.target.value})} className="bg-black border border-gray-800 p-2 text-sm rounded focus:border-purple-500 outline-none" />
                </div>
                <button onClick={createPerk} disabled={savingPerk} className="w-full py-3 bg-purple-900/40 border border-purple-500 text-purple-400 font-bold text-xs tracking-widest hover:bg-purple-900/60 transition rounded flex items-center justify-center gap-2 disabled:opacity-50">
                  {savingPerk ? <><Loader2 size={14} className="animate-spin" /> CONSTRUCTING...</> : "CONSTRUCT_PERK"}
                </button>
            </div>

            {/* List Existing Perks */}
            <div className="lg:col-span-2 bg-[#111] border border-gray-800 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-black text-[10px] uppercase tracking-widest text-gray-500">
                        <tr>
                            <th className="p-4">Item</th>
                            <th className="p-4">Price</th>
                            <th className="p-4">Effect</th>
                            <th className="p-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {shopItems.map(item => (
                            <tr key={item.id} className="border-b border-gray-900">
                                <td className="p-4">
                                    <div className="font-bold text-gray-200">{item.imageUrl} {item.name}</div>
                                    <div className="text-[10px] text-gray-500">{item.rarity}</div>
                                </td>
                                <td className="p-4 text-amber-500 font-bold">{item.price}</td>
                                <td className="p-4 text-xs text-gray-500">{item.effectType}</td>
                                <td className="p-4 text-right space-x-3">
                                    <button onClick={() => setSelectedPerk(item)} className="text-blue-500 hover:underline">MOD</button>
                                    <button onClick={() => deletePerk(item.id)} className="text-red-500 font-bold">DEL</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111] border border-red-900/50 p-8 rounded-xl max-w-sm w-full shadow-2xl shadow-red-900/20">
            <h2 className="text-xl font-bold mb-4 text-red-500">FORGE_IDENTITY</h2>
            <p className="text-xs text-gray-500 mb-6">Target: {selectedUser.email}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1 tracking-widest">Aura Coins Override</label>
                <input type="number" value={editAura} onChange={e => setEditAura(Number(e.target.value))} className="w-full bg-black border border-gray-800 p-3 rounded focus:outline-none focus:border-red-500 text-amber-500 font-bold" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 tracking-widest">Current Price Override</label>
                <input type="number" value={editPrice} onChange={e => setEditPrice(Number(e.target.value))} className="w-full bg-black border border-gray-800 p-3 rounded focus:outline-none focus:border-red-500 text-emerald-500 font-bold" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 tracking-widest">Credibility Score</label>
                <input type="number" value={editCredibility} onChange={e => setEditCredibility(Number(e.target.value))} className="w-full bg-black border border-gray-800 p-3 rounded focus:outline-none focus:border-red-500 text-purple-400" />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setSelectedUser(null)} disabled={savingUser} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm font-bold disabled:opacity-50">CANCEL</button>
              <button onClick={saveEdits} disabled={savingUser} className="flex-1 py-2 bg-red-900/80 hover:bg-red-800 text-white rounded text-sm tracking-widest font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                {savingUser ? <><Loader2 size={14} className="animate-spin" /> INJECTING...</> : "INJECT"}
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedPerk && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] border border-purple-900/50 p-8 rounded-2xl max-w-md w-full shadow-2xl shadow-purple-900/40">
            <h2 className="text-xl font-black mb-1 text-purple-500 tracking-tighter uppercase">Modify_Perk.EXE</h2>
            <p className="text-[10px] text-gray-600 mb-6 font-mono">RECALIBRATING_PERK_PARAMETERS...</p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 tracking-widest uppercase">Perk Name</label>
                <input type="text" value={selectedPerk.name} onChange={e => setSelectedPerk({...selectedPerk, name: e.target.value})} className="w-full bg-black border border-gray-900 p-3 rounded focus:outline-none focus:border-purple-500 text-gray-100 font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] text-gray-500 mb-1 tracking-widest uppercase">Price (Aura)</label>
                    <input type="number" value={selectedPerk.price} onChange={e => setSelectedPerk({...selectedPerk, price: Number(e.target.value)})} className="w-full bg-black border border-gray-900 p-3 rounded focus:outline-none focus:border-amber-500 text-amber-500 font-bold" />
                </div>
                <div>
                    <label className="block text-[10px] text-gray-500 mb-1 tracking-widest uppercase">Rarity</label>
                    <select value={selectedPerk.rarity} onChange={e => setSelectedPerk({...selectedPerk, rarity: e.target.value})} className="w-full bg-black border border-gray-900 p-3 rounded focus:outline-none focus:border-purple-500 text-purple-400 font-bold appearance-none">
                        <option value="Common">Common</option>
                        <option value="Rare">Rare</option>
                        <option value="Epic">Epic</option>
                        <option value="Legendary">Legendary</option>
                    </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1 tracking-widest uppercase">Description</label>
                <textarea value={selectedPerk.description} onChange={e => setSelectedPerk({...selectedPerk, description: e.target.value})} className="w-full bg-black border border-gray-900 p-3 rounded focus:outline-none focus:border-purple-500 text-gray-400 text-xs h-20" />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setSelectedPerk(null)} disabled={savingPerk} className="flex-1 py-3 bg-gray-900 hover:bg-gray-800 rounded text-[10px] font-bold tracking-widest disabled:opacity-50">ABORT</button>
              <button onClick={savePerkEdits} disabled={savingPerk} className="flex-1 py-3 bg-purple-900/80 hover:bg-purple-800 text-white rounded text-[10px] tracking-[0.2em] font-black underline decoration-purple-400 underline-offset-4 flex items-center justify-center gap-2 disabled:opacity-50">
                {savingPerk ? <><Loader2 size={12} className="animate-spin" /> PATCHING...</> : "EXECUTE_PATCH"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedAuctionUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#111] border border-pink-900/50 p-8 rounded-xl max-w-sm w-full shadow-2xl shadow-pink-900/20">
            <h2 className="text-xl font-bold mb-4 text-pink-500">INITIATE_AUCTION</h2>
            <p className="text-xs text-gray-500 mb-6">Target Platform: #{selectedAuctionUser.id} - {selectedAuctionUser.name}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1 tracking-widest">Duration (Hours)</label>
                <input 
                  type="number" 
                  min="1"
                  value={auctionDuration} 
                  onChange={e => setAuctionDuration(Number(e.target.value))} 
                  className="w-full bg-black border border-gray-800 p-3 rounded focus:outline-none focus:border-pink-500 text-pink-500 font-bold" 
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setSelectedAuctionUser(null)} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm font-bold">CANCEL</button>
              <button onClick={launchAuction} className="flex-1 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded text-sm tracking-widest font-bold">LAUNCH</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
