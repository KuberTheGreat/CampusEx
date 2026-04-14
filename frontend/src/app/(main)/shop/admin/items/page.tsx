"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function ShopAdmin() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    rarity: "Common",
    requiredScore: 0,
    effectType: "",
    imageUrl: "🔮",
  });
  const [loading, setLoading] = useState(false);
  const [adminEmail, setAdminEmail] = useState(""); // In a real app, this would come from auth context

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail) {
        toast.error("Please provide an Admin Email for verification.");
        return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/admin/shop/items", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "X-Admin-Email": adminEmail
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Perk added successfully to the shop!");
        router.push("/shop");
      } else {
        const err = await res.json();
        toast.error(`Error: ${err.error || "Failed to create item"}`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto">
        <div className="mb-12">
            <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 via-fuchsia-400 to-emerald-400 bg-clip-text text-transparent">
              Perk Architect 🛠️
            </h1>
            <p className="text-gray-400 mt-2 font-medium">Add new powers and perks to the CampusEx shop.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 glass p-8 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
          {/* Admin Identity */}
          <div className="space-y-2 pb-6 border-b border-white/5">
            <label className="text-xs font-bold uppercase tracking-widest text-purple-400">Admin Authentication</label>
            <input
              type="email"
              placeholder="Enter Admin Email"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 transition-all outline-none"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Perk Name</label>
              <input
                type="text"
                placeholder="e.g. Invisibility Cloak"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 transition-all outline-none"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Emoji icon</label>
              <input
                type="text"
                placeholder="e.g. 🛡️"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 transition-all outline-none"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Price (Aura Coins)</label>
              <input
                type="number"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 transition-all outline-none"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Rarity</label>
              <select
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 transition-all outline-none appearance-none"
                value={formData.rarity}
                onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
              >
                <option value="Common" className="bg-slate-900">Common</option>
                <option value="Rare" className="bg-slate-900">Rare</option>
                <option value="Epic" className="bg-slate-900">Epic</option>
                <option value="Legendary" className="bg-slate-900">Legendary</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Purpose / Description</label>
              <textarea
                placeholder="What does this perk do?"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 transition-all outline-none h-24"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Min. Credibility Required</label>
                <input
                    type="number"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 transition-all outline-none"
                    value={formData.requiredScore}
                    onChange={(e) => setFormData({ ...formData, requiredScore: Number(e.target.value) })}
                />
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Effect Keyword</label>
                <input
                    type="text"
                    placeholder="e.g. SHIELD"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 transition-all outline-none"
                    value={formData.effectType}
                    onChange={(e) => setFormData({ ...formData, effectType: e.target.value })}
                />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-emerald-500 text-white font-black py-4 rounded-xl hover:scale-[1.01] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-50"
          >
            {loading ? "Constructing..." : "Publish to Shop"}
          </button>
        </form>
      </div>
    </div>
  );
}
