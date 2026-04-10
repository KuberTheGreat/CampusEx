"use client";

import { useState } from "react";

export default function Home() {
  const [step, setStep] = useState(0); // 0: Landing, 1: Auth, 2: Profile, 3: IPO, 4: Done
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [traits, setTraits] = useState("");
  const [stockSymbol, setStockSymbol] = useState("");
  const [ipoDate, setIpoDate] = useState("");

  const handleGoogleLogin = async () => {
    // Mock login step
    setEmail("kuber2024@iiitl.ac.in"); // simulated college email
    setName("Kuber");
    setStep(2);
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate API call to backend
    setStep(3);
  };

  const handleScheduleIPO = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep(4);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated gradient background mesh */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900 rounded-full mix-blend-multiply filter blur-[128px] opacity-60 animate-float" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-900 rounded-full mix-blend-multiply filter blur-[128px] opacity-60 animate-float" style={{ animationDelay: '2s' }} />

      <main className="z-10 w-full max-w-4xl p-8 flex flex-col items-center">
        {step === 0 && (
          <div className="text-center space-y-8 animate-in fade-in zoom-in duration-700">
            <h1 className="text-6xl font-extrabold tracking-tight mb-4">
              Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-emerald-400">CampusEx</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Transform everyday college life into a dynamic virtual economy.
              You aren't just a student—you are a tradable asset.
            </p>
            <button
              onClick={() => setStep(1)}
              className="mt-8 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full font-bold text-lg hover:scale-105 transition-transform animate-pulse-glow"
            >
              Enter The Market
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="glass p-12 rounded-3xl w-full max-w-md text-center space-y-6">
            <h2 className="text-3xl font-bold">Secure Access</h2>
            <p className="text-gray-400">Verify your college identity to continue.</p>
            <button
              onClick={handleGoogleLogin}
              className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>
          </div>
        )}

        {step === 2 && (
          <form className="glass p-8 w-full max-w-lg rounded-3xl space-y-6" onSubmit={handleCreateProfile}>
            <h2 className="text-3xl font-bold text-center">List Your Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Stock Symbol (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. KUB"
                  value={stockSymbol}
                  onChange={(e) => setStockSymbol(e.target.value.toUpperCase())}
                  maxLength={4}
                  className="w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Traits & Quirks (comma separated)</label>
                <textarea
                  placeholder="Coder, Gymbro, Overthinker..."
                  value={traits}
                  onChange={(e) => setTraits(e.target.value)}
                  className="w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500 min-h-[100px]"
                ></textarea>
                <p className="text-xs text-emerald-400 mt-1">* 50% of these will be randomly hidden to create mystery.</p>
              </div>
            </div>
            <button type="submit" className="w-full bg-purple-600 p-3 rounded-lg font-bold hover:bg-purple-500 transition-colors">
              Continue
            </button>
          </form>
        )}

        {step === 3 && (
          <form className="glass p-8 w-full max-w-md rounded-3xl space-y-6" onSubmit={handleScheduleIPO}>
            <h2 className="text-3xl font-bold text-center">Schedule IPO</h2>
            <p className="text-center text-gray-400">Pick a date to officially launch on the market. Users can pre-order your stock until this date.</p>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Launch Date</label>
              <input
                type="date"
                required
                value={ipoDate}
                onChange={(e) => setIpoDate(e.target.value)}
                className="w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <button type="submit" className="w-full bg-emerald-600 p-3 rounded-lg font-bold hover:bg-emerald-500 transition-colors animate-pulse-glow">
              Confirm & Launch
            </button>
          </form>
        )}

        {step === 4 && (
          <div className="glass p-12 w-full max-w-md rounded-3xl text-center space-y-6 animate-in slide-in-from-bottom-5">
            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold">You are pre-listed!</h2>
            <p className="text-gray-300">
              Welcome to the market, <span className="font-bold text-purple-400">{name}</span>.<br />
              Your stock <b>${stockSymbol || "KUB"}</b> is now accepting pre-orders.
            </p>
            <div className="bg-black/40 p-4 rounded-xl border border-gray-800 flex justify-between items-center text-sm">
              <span className="text-gray-400">Initial Balance</span>
              <span className="font-bold text-emerald-400">1000 AURA</span>
            </div>
            <button className="w-full bg-gray-800 p-3 rounded-lg text-white hover:bg-gray-700 transition">
              Go To Dashboard
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
