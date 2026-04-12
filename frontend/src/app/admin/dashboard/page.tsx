"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  // Edit States
  const [editAura, setEditAura] = useState(0);
  const [editCredibility, setEditCredibility] = useState(0);
  const [editPrice, setEditPrice] = useState(0);

  // Price Engine States
  const [engineInterval, setEngineInterval] = useState(60);
  const [newInterval, setNewInterval] = useState(60);

  const router = useRouter();

  useEffect(() => {
    const admin = localStorage.getItem("campusex_admin");
    if (!admin) {
      router.push("/admin");
      return;
    }
    fetchUsers();
    fetchEngineStatus();
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
    try {
      const res = await fetch("http://localhost:8080/api/admin/price-engine/interval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seconds: Number(newInterval) })
      });
      if (res.ok) {
        alert(`Price engine interval updated to ${newInterval}s`);
        setEngineInterval(newInterval);
      } else {
        alert("Failed to update interval");
      }
    } catch(err) {
      console.error(err);
    }
  };

  const handeBanUser = async (id: number, name: string) => {
    if (!confirm(`Are you absolutely sure you want to BAN ${name}? This will soft-delete their account completely.`)) return;

    try {
      const res = await fetch(`http://localhost:8080/api/admin/user/${id}/ban`, { method: "DELETE" });
      if (res.ok) {
        alert("Target successfully banned.");
        fetchUsers();
      } else {
        alert("Ban Failed");
      }
    } catch(err) {
      console.error(err);
    }
  };

  const openEditor = (u: any) => {
    setSelectedUser(u);
    setEditAura(u.auraCoins);
    setEditCredibility(u.credibilityScore);
    setEditPrice(u.currentPrice);
  };

  const saveEdits = async () => {
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
        alert("Overwritten successfully!");
        setSelectedUser(null);
        fetchUsers();
      } else {
        const d = await res.json();
        alert("Update failed: " + d.error);
      }
    } catch(e) {
      console.error(e);
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
              disabled={newInterval === engineInterval}
              className="px-4 py-2 bg-amber-900/30 border border-amber-500/50 text-amber-400 hover:bg-amber-900/50 rounded font-bold text-xs tracking-widest transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              APPLY
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
              <button onClick={() => setSelectedUser(null)} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm font-bold">CANCEL</button>
              <button onClick={saveEdits} className="flex-1 py-2 bg-red-900/80 hover:bg-red-800 text-white rounded text-sm tracking-widest font-bold">INJECT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

