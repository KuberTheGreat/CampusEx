"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        const data = await res.json();
        // Set token/flag in storage to indicate admin mode
        localStorage.setItem("campusex_admin", JSON.stringify(data.admin));
        router.push("/admin/dashboard");
      } else {
        const err = await res.json();
        toast.error("Access Denied: " + err.error);
      }
    } catch(err) {
      console.error(err);
      toast.error("Failed to connect to backend");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 mix-blend-overlay"></div>
      
      <form onSubmit={handleLogin} className="glass p-12 rounded-3xl w-full max-w-md space-y-8 z-10 border border-red-900/30 shadow-2xl shadow-red-900/20">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-red-900/50 rounded-2xl mx-auto flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-red-500">System Overlord</h1>
          <p className="text-gray-400 text-sm">Restricted administrative access only.</p>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-red-500/80 mb-2 font-bold">Authorized Identity (Email)</label>
          <input 
            type="email" 
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-black/50 border border-red-900/50 rounded-xl p-4 text-white focus:outline-none focus:border-red-500 transition placeholder:text-gray-700"
            placeholder="admin@iiitl.ac.in"
          />
        </div>

        <button type="submit" className="w-full bg-red-900/80 hover:bg-red-800 text-white p-4 rounded-xl font-bold tracking-widest transition flex items-center justify-center gap-2">
          OVERRIDE INITIATE
        </button>
      </form>
    </div>
  );
}
