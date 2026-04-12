"use client";

import Sidebar from "@/components/Sidebar";
import PageTransition from "@/components/PageTransition";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>
      <Sidebar />
      <main className="flex-1 ml-[68px] relative min-h-screen overflow-x-hidden transition-all duration-300">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
    </div>
  );
}
