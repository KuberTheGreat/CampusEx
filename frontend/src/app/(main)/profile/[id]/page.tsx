"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, ArrowLeft } from "lucide-react";

export default function ProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Mock data for the chart since we haven't implemented real price histories yet
  const mockChartData = [
    { time: "Day 1", price: 10 },
    { time: "Day 2", price: 12 },
    { time: "Day 3", price: 11.5 },
    { time: "Day 4", price: 14 },
    { time: "Day 5", price: 18 },
  ];

  useEffect(() => {
    if (id) {
      fetchProfile();
    }
  }, [id]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/user/profile/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data.user);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen text-white flex items-center justify-center">Loading User Data...</div>;
  }

  if (!profile) {
    return <div className="min-h-screen text-white flex items-center justify-center">User not found</div>;
  }

  return (
    <div className="min-h-screen flex flex-col p-6 max-w-5xl mx-auto">
      <button 
        onClick={() => router.back()} 
        className="text-gray-400 hover:text-white flex items-center gap-2 w-fit mb-8 transition"
      >
        <ArrowLeft size={20} /> Back to Dashboard
      </button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Col: Core Identity */}
        <div className="glass p-8 rounded-3xl md:col-span-1 space-y-6 text-center">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-purple-500 to-emerald-500 rounded-full flex items-center justify-center font-bold text-4xl shadow-lg shadow-purple-500/20">
            {profile.stockSymbol}
          </div>
          
          <div>
            <h1 className="text-3xl font-bold">{profile.name}</h1>
            <p className="text-gray-400 text-sm mt-1">{profile.email}</p>
          </div>

          <div className="bg-black/50 p-4 rounded-2xl border border-gray-800">
            <span className="text-gray-400 text-sm block mb-1">Current Valuation</span>
            <span className="font-extrabold text-3xl text-emerald-400">{profile.currentPrice?.toFixed(2) || "10.00"} Au</span>
          </div>

          {String(authUser?.id) !== String(profile.id) && (
            <button className="w-full bg-purple-600 p-4 rounded-xl font-bold hover:bg-purple-500 transition shadow-lg shadow-purple-600/20">
              Trade {profile.stockSymbol}
            </button>
          )}
        </div>

        {/* Right Col: Stats & Graph */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass p-8 rounded-3xl h-80">
            <h2 className="text-xl font-bold mb-6 flex items-center justify-between">
              Price History
              <span className="text-emerald-400 text-sm flex items-center gap-1"><TrendingUp size={16} /> +4.2% today</span>
            </h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockChartData}>
                  <XAxis dataKey="time" stroke="#4b5563" fontSize={12} />
                  <YAxis stroke="#4b5563" fontSize={12} domain={['dataMin - 2', 'dataMax + 2']} hide />
                  <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #374151', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="price" stroke="#10b981" fill="url(#colorPrice)" strokeWidth={3} />
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass p-8 rounded-3xl">
            <h2 className="text-xl font-bold mb-4">Traits & Quirks</h2>
            <p className="text-sm text-gray-400 mb-6 border-b border-gray-800 pb-4">
              Traits represent this student's core competencies.
            </p>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Public File</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {profile.traits?.filter((t: any) => !t.isHidden).length > 0 ? (
                    profile.traits.filter((t: any) => !t.isHidden).map((t: any) => (
                      <div key={t.id} className="bg-purple-900/20 border border-purple-500/50 p-4 rounded-xl flex items-center justify-center text-center shadow-inner shadow-purple-500/10">
                        <span className="font-bold text-purple-300">{t.name}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 italic col-span-full">No public traits available.</div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider flex justify-between items-center">
                  <span>Classified File</span>
                  <span className="text-xs bg-red-900/30 text-red-400 px-2 py-1 rounded-md">Market Mystery</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {profile.traits?.filter((t: any) => t.isHidden).length > 0 ? (
                    profile.traits.filter((t: any) => t.isHidden).map((t: any) => (
                      <div key={t.id} className="bg-[#111] border border-gray-800 p-4 rounded-xl flex flex-col items-center justify-center gap-2 animate-pulse cursor-help" title="This trait is hidden from public markets to sustain volatility">
                        <div className="h-4 w-16 bg-gray-800 rounded"></div>
                        <div className="h-3 w-10 bg-gray-800 rounded"></div>
                        <span className="sr-only">Hidden Trait</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 italic col-span-full">No classified traits.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
