"use client";

import Sidebar from "@/components/Sidebar";
import PageTransition from "@/components/PageTransition";
import DecorativeBackground from "@/components/DecorativeBackground";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("campusex_token");
    const userStr = localStorage.getItem("campusex_user");
    if (!token || !userStr) {
      router.replace("/");
    } else {
      setAuthorized(true);
    }
  }, [router]);

  if (!authorized) return null; // Prevent flash of unauthorized content

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
