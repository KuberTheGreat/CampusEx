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

    <div className="p-8 min-h-screen animate-fade-in" style={{ background: "var(--bg)" }}>
      <div className="max-w-3xl mx-auto">
        <header className="mb-12 text-center md:text-left">
          <h1 className="text-4xl font-black flex items-center justify-center md:justify-start gap-4 text-poster" style={{ color: "var(--text)" }}>
             <span className="text-sticker rotate-[-3deg] inline-block">Perk</span>
             <span className="text-stroke">Architect</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-widest mt-3" style={{ color: "var(--text-secondary)" }}>engineering new power-ups and campus perks</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8 card p-10 relative overflow-hidden bg-dot-pattern">
          {/* Admin Identity */}
          <div className="space-y-3 pb-8 border-b" style={{ borderColor: "var(--border)" }}>
            <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>Admin Authentication</label>
            <input
              type="email"
              placeholder="verified_admin@campusex.edu"
              className="input w-full"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>Perk Name</label>
              <input
                type="text"
                placeholder="e.g. Invisibility Cloak"
                className="input w-full"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>Visual Icon</label>
              <input
                type="text"
                placeholder="e.g. 🛡️"
                className="input w-full"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>Price (AURA)</label>
              <input
                type="number"
                className="input w-full"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>Rarity Tier</label>
              <select
                className="input w-full appearance-none"
                value={formData.rarity}
                onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
              >
                <option value="Common">Common</option>
                <option value="Rare">Rare</option>
                <option value="Epic">Epic</option>
                <option value="Legendary">Legendary</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>Purpose / Description</label>
            <textarea
              placeholder="Define the specific effects and behavioral modifiers of this perk..."
              className="input w-full h-24"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>Min. Credibility Required</label>
              <input
                type="number"
                className="input w-full"
                value={formData.requiredScore}
                onChange={(e) => setFormData({ ...formData, requiredScore: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>Effect Keyword</label>
              <input
                type="text"
                placeholder="e.g. SHIELD"
                className="input w-full"
                value={formData.effectType}
                onChange={(e) => setFormData({ ...formData, effectType: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-5 text-sm font-black uppercase tracking-widest"
          >
            {loading ? "CONSTRUCTING..." : "PUBLISH TO THE ARSENAL"}
          </button>
        </form>
      </div>
    </div>
  );
}
