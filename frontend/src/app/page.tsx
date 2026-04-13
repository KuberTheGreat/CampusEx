"use client";

import { useState, useEffect } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { jwtDecode } from "jwt-decode";
import dynamic from "next/dynamic";
import DecorativeBackground from "@/components/DecorativeBackground";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export default function Home() {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [traits, setTraits] = useState("");
  const [stockSymbol, setStockSymbol] = useState("");
  const [ipoDate, setIpoDate] = useState("");
  const [lottieData, setLottieData] = useState<any>(null);
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    fetch("/lottie/stock-market.json")
      .then(r => r.json()).then(setLottieData).catch(() => {});
  }, []);

  const handleGoogleLoginSuccess = async (credentialResponse: any) => {
    if (credentialResponse.credential) {
      try {
        const res = await fetch("http://localhost:8080/api/auth/google", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: credentialResponse.credential }),
        });
        const data = await res.json();
        if (res.ok) {
          if (data.needs_profile === false && data.user) { login(data.user); router.push("/dashboard"); }
          else { setEmail(data.email || ""); setName(data.name || ""); setStep(2); }
        } else { alert("Login failed: " + data.error); }
      } catch (err) { console.error("Failed to verify token", err); }
    }
  };

  const handleGoogleLoginError = () => console.error("Google Login Failed");

  const handleDevBypass = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/market/leaderboard");
      const data = await res.json();
      if (res.ok && data.leaderboard?.length > 0) { login(data.leaderboard[0]); router.push("/dashboard"); }
      else { alert("No users in DB."); }
    } catch(e) { console.error(e); alert("Failed to bypass."); }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const traitList = traits.split(",").map(t => t.trim()).filter(t => t.length > 0);
      const res = await fetch("http://localhost:8080/api/user/profile", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, stockSymbol, traits: traitList }),
      });
      if (res.ok) setStep(3);
      else { const d = await res.json(); alert("Error: " + d.error); }
    } catch (err) { console.error(err); }
  };

  const handleScheduleIPO = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedDate = new Date(ipoDate).toISOString();
      const res = await fetch("http://localhost:8080/api/user/ipo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ipoDate: parsedDate }),
      });
      const data = await res.json();
      if (res.ok) { login(data.user); setStep(4); }
      else { alert("Error scheduling IPO: " + data.error); }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ background: "var(--bg)" }}>
      <DecorativeBackground />

      <main className="z-10 w-full max-w-5xl p-8 flex flex-col items-center">
        {step === 0 && (
          <div className="flex flex-col md:flex-row items-center gap-10 animate-fade-in">
            {/* Lottie */}
            <div className="w-72 h-72 md:w-80 md:h-80 flex-shrink-0">
              {lottieData ? (
                <Lottie animationData={lottieData} loop autoplay style={{ width: "100%", height: "100%" }} />
              ) : (
                <div className="w-full h-full rounded-3xl animate-shimmer" style={{ background: "var(--bg-card)" }} />
              )}
            </div>

            {/* Hero */}
            <div className="text-center md:text-left space-y-5">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black"
                style={{ background: "linear-gradient(135deg, var(--primary), var(--accent))" }}
              >
                Cx
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight" style={{ color: "var(--text)" }}>
                Welcome to <span style={{ color: "var(--primary)" }}>CampusEx</span>
              </h1>
              <p className="text-base max-w-md leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                your college. your market. trade people like stocks.<br />
                yes, we actually went there.
              </p>
              <button onClick={() => setStep(1)} className="btn-accent text-lg px-10 py-4 animate-pulse-glow">
                Enter The Market
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="card p-10 w-full max-w-md text-center space-y-6 animate-fade-in">
            <h2 className="text-2xl font-black" style={{ color: "var(--text)" }}>Secure Access</h2>
            <p style={{ color: "var(--text-secondary)" }}>Verify your college identity to continue.</p>
            <div className="flex flex-col items-center gap-4 pt-2">
              <GoogleLogin onSuccess={handleGoogleLoginSuccess} onError={handleGoogleLoginError} shape="rectangular" size="large" theme="outline" />
              <div className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>OR</div>
              <button onClick={handleDevBypass} className="btn-secondary w-full">Dev Bypass (Auto Login)</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <form className="card p-8 w-full max-w-lg space-y-5 animate-fade-in" onSubmit={handleCreateProfile}>
            <h2 className="text-2xl font-black text-center" style={{ color: "var(--text)" }}>List Your Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--text-secondary)" }}>Name</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input w-full" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--text-secondary)" }}>Stock Symbol</label>
                <input type="text" placeholder="e.g. KUB" value={stockSymbol} onChange={(e) => setStockSymbol(e.target.value.toUpperCase())} maxLength={4} className="input w-full" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--text-secondary)" }}>Traits & Quirks (comma separated)</label>
                <textarea placeholder="Coder, Gymbro, Overthinker..." value={traits} onChange={(e) => setTraits(e.target.value)} className="input w-full min-h-[100px] resize-none" />
                <p className="text-xs mt-1" style={{ color: "var(--accent)" }}>* 50% of these will be randomly hidden to create mystery.</p>
              </div>
            </div>
            <button type="submit" className="btn-accent w-full">Continue</button>
          </form>
        )}

        {step === 3 && (
          <form className="card p-8 w-full max-w-md space-y-5 animate-fade-in" onSubmit={handleScheduleIPO}>
            <h2 className="text-2xl font-black text-center" style={{ color: "var(--text)" }}>Schedule IPO</h2>
            <p className="text-center text-sm" style={{ color: "var(--text-secondary)" }}>Pick a date to officially launch on the market.</p>
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: "var(--text-secondary)" }}>Launch Date</label>
              <input type="date" required value={ipoDate} onChange={(e) => setIpoDate(e.target.value)} className="input w-full" />
            </div>
            <button type="submit" className="btn-accent w-full animate-pulse-glow">Confirm & Launch</button>
          </form>
        )}

        {step === 4 && (
          <div className="card p-10 w-full max-w-md text-center space-y-5 animate-fade-in">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: "var(--green)" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <polyline points="5 12 10 17 19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-2xl font-black" style={{ color: "var(--text)" }}>You are pre-listed!</h2>
            <p style={{ color: "var(--text-secondary)" }}>
              Welcome, <span className="font-bold" style={{ color: "var(--primary)" }}>{name}</span>.<br />
              Your stock <b>${stockSymbol || "KUB"}</b> is now accepting pre-orders.
            </p>
            <div className="p-4 rounded-xl flex justify-between items-center text-sm" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text-secondary)" }}>Initial Balance</span>
              <span className="font-black" style={{ color: "var(--green)" }}>1000 AURA</span>
            </div>
            <button onClick={() => router.push("/dashboard")} className="btn-accent w-full">Go To Dashboard</button>
          </div>
        )}
      </main>
    </div>
  );
}
