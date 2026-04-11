"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Search, Filter, TrendingUp, TrendingDown } from "lucide-react";

export default function Dashboard() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState("price"); // price, popularity, recent
  const [filterYear, setFilterYear] = useState("");
  const [filterTrait, setFilterTrait] = useState("");

  const mockChartData = [
    { time: "9:00", price: 10 },
    { time: "11:00", price: 12 },
    { time: "13:00", price: 11.5 },
    { time: "15:00", price: 14 },
    { time: "16:00", price: 18 },
  ];

  useEffect(() => {
    fetchLeaderboard();
  }, [sortBy, filterYear, filterTrait]);

  const fetchLeaderboard = async () => {
    try {
      const params = new URLSearchParams();
      params.append("sort", sortBy);
      if (filterYear) params.append("year", filterYear);
      if (filterTrait) params.append("trait", filterTrait);

      const res = await fetch(`http://localhost:8080/api/market/leaderboard?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setLeaderboard(data.leaderboard);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="fixed top-0 left-[-20%] w-[40%] h-[40%] bg-purple-900 rounded-full mix-blend-multiply blur-[128px] opacity-40" />
      <div className="fixed bottom-0 right-[-20%] w-[40%] h-[40%] bg-emerald-900 rounded-full mix-blend-multiply blur-[128px] opacity-40" />

      <div className="max-w-7xl mx-auto z-10 relative">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-emerald-400">
            Market Dashboard
          </h1>
          <div className="flex gap-4">
            <div className="glass p-3 rounded-xl flex items-center justify-between min-w-[150px]">
              <span className="text-gray-400 text-sm">Your AURA</span>
              <span className="font-bold text-emerald-400 text-lg">1,000.00</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Action Area / Leaderboard */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass p-6 rounded-2xl flex flex-wrap gap-4 items-center justify-between">
              <div className="flex bg-black/50 p-1 rounded-xl w-fit">
                <button 
                  onClick={() => setSortBy("price")}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${sortBy === "price" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}
                >
                  Top Price
                </button>
                <button 
                  onClick={() => setSortBy("popularity")}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${sortBy === "popularity" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}
                >
                  Popularity
                </button>
                <button 
                  onClick={() => setSortBy("recent")}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${sortBy === "recent" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}
                >
                  Recent IPOs
                </button>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1">
                  <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <input 
                    type="text" 
                    placeholder="Filter by Year (e.g. 2024)"
                    className="w-full pl-9 pr-4 py-2 bg-black/50 border border-gray-700 rounded-xl focus:border-purple-500 outline-none text-sm"
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                  />
                </div>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                  <input 
                    type="text" 
                    placeholder="Search trait..."
                    className="w-full pl-9 pr-4 py-2 bg-black/50 border border-gray-700 rounded-xl focus:border-purple-500 outline-none text-sm"
                    value={filterTrait}
                    onChange={(e) => setFilterTrait(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {leaderboard.length === 0 ? (
                <div className="glass p-12 rounded-2xl text-center text-gray-500">
                  No stocks found currently.
                </div>
              ) : (
                leaderboard.map((user, idx) => (
                  <div key={user.id} className="glass p-4 rounded-xl flex justify-between items-center hover:bg-white/5 transition cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-emerald-500 rounded-full flex items-center justify-center font-bold text-lg">
                        {user.stockSymbol}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{user.name}</h3>
                        <p className="text-sm text-gray-400">{user.email}</p>
                      </div>
                    </div>
                    
                    {/* Sparkline simulation */}
                    <div className="w-24 h-10 hidden md:block opacity-50 group-hover:opacity-100 transition-opacity">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={mockChartData}>
                          <Area type="monotone" dataKey="price" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-xl">${user.currentPrice?.toFixed(2) || "10.00"}</div>
                      <div className="text-sm text-emerald-400 flex items-center justify-end gap-1">
                        <TrendingUp size={14} /> +2.4%
                      </div>
                    </div>

                    <button className="hidden group-hover:block ml-4 px-4 py-2 bg-purple-600 rounded-lg font-bold hover:bg-purple-500">
                      Trade
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="glass p-6 rounded-2xl">
              <h2 className="text-xl font-bold mb-4">Your Portfolio</h2>
              <div className="text-center py-8 text-gray-500 border border-dashed border-gray-700 rounded-xl">
                No stocks owned yet.
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
