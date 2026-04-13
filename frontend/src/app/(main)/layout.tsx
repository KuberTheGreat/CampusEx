"use client";

import Sidebar from "@/components/Sidebar";
import PageTransition from "@/components/PageTransition";
import DecorativeBackground from "@/components/DecorativeBackground";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen relative" style={{ background: "var(--bg)" }}>
      <DecorativeBackground />
      <Sidebar />
      <main className="flex-1 ml-[68px] relative z-10 min-h-screen overflow-x-hidden transition-all duration-300">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
    </div>
  );
}
