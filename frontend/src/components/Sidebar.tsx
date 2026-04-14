"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import Avatar from "@/components/Avatar";
import {
  IconMarket, IconPortfolio, IconGlobe, IconEvents,
  IconHeart, IconFire, IconNews, IconPen, IconLightning,
  IconMoon, IconSun
} from "@/components/Icons";

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const links = [
    { name: "Market", path: "/dashboard", Icon: IconMarket },
    { name: "Portfolio", path: "/portfolio", Icon: IconPortfolio },
    { name: "3D View", path: "/3d-market", Icon: IconGlobe },
    { name: "Events", path: "/events", Icon: IconEvents },
    { name: "Profile Bids", path: "/profile-bidding", Icon: IconHeart },
    { name: "My Matches", path: "/matches", Icon: IconFire },
    { name: "News", path: "/news", Icon: IconNews },
    { name: "Publish", path: "/news/create", Icon: IconPen },
    { name: "Shop", path: "/shop", Icon: IconLightning },
  ];

  return (
    <aside
      className="group/sidebar fixed top-0 left-0 h-full z-40 flex flex-col transition-all duration-300 ease-in-out"
      style={{
        width: "68px",
        backgroundColor: "var(--bg-card)",
        borderRight: "1px solid var(--border)",
        boxShadow: "2px 0 24px rgba(0,0,0,0.06)",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.width = "220px"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.width = "68px"; }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <div
          className="w-9 h-9 rounded-2xl flex items-center justify-center font-extrabold text-white text-sm flex-shrink-0"
          style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
        >
          Cx
        </div>
        <span
          className="font-extrabold text-lg whitespace-nowrap overflow-hidden opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300"
          style={{ color: "var(--text)" }}
        >
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
              className="group/link flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 relative"
              style={{
                background: isActive ? "var(--accent-soft)" : "transparent",
                color: isActive ? "var(--accent)" : "var(--text-secondary)",
                fontWeight: isActive ? 800 : 500,
              }}
              onMouseEnter={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <div className="flex-shrink-0 w-6 flex items-center justify-center transition-transform duration-300 group-hover/link:scale-110">
                <link.Icon size={20} color={isActive ? "var(--accent)" : "var(--text-secondary)"} />
              </div>
              <span className="whitespace-nowrap overflow-hidden opacity-0 group-hover/sidebar:opacity-100 transition-all duration-300 text-sm font-bold tracking-tight">
                {link.name}
              </span>
              {isActive && (
                <div className="absolute left-0 w-1 h-6 bg-accent rounded-r-full shadow-[2px_0_10px_var(--accent-glow)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom — Theme + Profile */}
      <div className="px-2 pb-4 space-y-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <div className="flex-shrink-0 w-6 flex items-center justify-center">
            {theme === "light" ? <IconMoon size={20} /> : <IconSun size={20} />}
          </div>
          <span className="whitespace-nowrap overflow-hidden opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 text-sm font-medium">
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </span>
        </button>

        {user && (
          <Link
            href={`/profile/${user.id}`}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <Avatar userId={user.id} name={user.name} size={28} />
            <div className="whitespace-nowrap overflow-hidden opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
              <div className="text-sm font-bold" style={{ color: "var(--text)" }}>{user.name}</div>
              <div className="text-[10px] font-semibold" style={{ color: "var(--accent)" }}>${user.stockSymbol}</div>
            </div>
          </Link>
        )}
      </div>
    </aside>
  );
}
