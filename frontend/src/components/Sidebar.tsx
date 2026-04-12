"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const links = [
    { name: "Market", path: "/dashboard", icon: "📈" },
    { name: "Portfolio", path: "/portfolio", icon: "💼" },
    { name: "3D View", path: "/3d-market", icon: "🌐" },
    { name: "Events", path: "/events", icon: "🏆" },
    { name: "Profile Bids", path: "/profile-bidding", icon: "💝" },
    { name: "News", path: "/news", icon: "📰" },
    { name: "Publish", path: "/news/create", icon: "✍️" },
    { name: "Shop", path: "/shop", icon: "⚡" },
  ];

  return (
    <aside 
      className="group/sidebar fixed top-0 left-0 h-full z-40 flex flex-col transition-all duration-300 ease-in-out"
      style={{
        width: "68px",
        backgroundColor: "var(--bg-card)",
        borderRight: "1px solid var(--border)",
        boxShadow: "2px 0 20px var(--shadow)",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.width = "220px"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.width = "68px"; }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-white text-sm flex-shrink-0" style={{ background: "var(--primary)" }}>
          Cx
        </div>
        <span className="font-extrabold text-lg whitespace-nowrap overflow-hidden opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300" style={{ color: "var(--text)" }}>
          CampusEx
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-hidden">
        {links.map((link) => {
          const isActive = pathname === link.path;
          return (
            <Link
              key={link.path}
              href={link.path}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
              style={{
                background: isActive ? "var(--primary-soft)" : "transparent",
                color: isActive ? "var(--primary)" : "var(--text-secondary)",
                fontWeight: isActive ? 700 : 500,
              }}
              onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
              onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <span className="text-xl flex-shrink-0 w-7 text-center">{link.icon}</span>
              <span className="whitespace-nowrap overflow-hidden opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 text-sm">
                {link.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section — Theme toggle + Profile */}
      <div className="px-2 pb-4 space-y-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <span className="text-xl flex-shrink-0 w-7 text-center">
            {theme === "light" ? "🌙" : "☀️"}
          </span>
          <span className="whitespace-nowrap overflow-hidden opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 text-sm font-medium">
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </span>
        </button>

        {/* Profile */}
        {user && (
          <Link
            href={`/profile/${user.id}`}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs flex-shrink-0" style={{ background: "var(--primary)" }}>
              {user.stockSymbol || user.name?.[0] || "U"}
            </div>
            <div className="whitespace-nowrap overflow-hidden opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
              <div className="text-sm font-bold" style={{ color: "var(--text)" }}>{user.name}</div>
              <div className="text-[10px] font-semibold" style={{ color: "var(--primary)" }}>{user.stockSymbol}</div>
            </div>
          </Link>
        )}
      </div>
    </aside>
  );
}
