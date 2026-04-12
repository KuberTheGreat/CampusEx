"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { name: "Market Hub", path: "/dashboard", icon: "📈" },
    { name: "Portfolio", path: "/portfolio", icon: "💼" },
    { name: "Global 3D Feed", path: "/3d-market", icon: "🌐" },
    { name: "Event Bids", path: "/events", icon: "🏆" },
    { name: "News Feed", path: "/news", icon: "📰" },
    { name: "Publish Scoop", path: "/news/create", icon: "✍️" },
    { name: "Power Shop", path: "/shop", icon: "⚡" },
  ];

  return (
    <>
      <div className="md:hidden p-4 fixed top-0 left-0 z-50">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="glass p-2 px-3 rounded-lg text-white font-bold border border-white/20 hover:bg-white/10 transition"
        >
          {isOpen ? "✕" : "☰"}
        </button>
      </div>

      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-64 glass z-40 transition-transform duration-300 md:translate-x-0 border-r border-white/10 bg-black/40 backdrop-blur-lg
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="p-6 h-full flex flex-col relative z-10">
          <div className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 to-emerald-400 bg-clip-text text-transparent mb-12">
            CampusEx
          </div>

          <nav className="flex-1 space-y-3">
            {links.map((link) => {
              const isActive = pathname === link.path;
              return (
                <Link 
                  key={link.path}
                  href={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                    isActive 
                    ? "bg-gradient-to-r from-purple-500/20 to-emerald-500/20 text-white border border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.2)]" 
                    : "text-gray-400 hover:bg-white/5 hover:text-white border border-transparent"
                  }`}
                >
                  <span className="text-xl">{link.icon}</span>
                  <span className="font-semibold">{link.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-white/10">
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tl from-purple-500 to-emerald-500 flex items-center justify-center text-white font-bold shadow-inner">
                U
              </div>
              <div>
                <p className="font-medium text-white text-base">Your Portfolio</p>
                <p className="text-xs text-emerald-400">Active Investor</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
