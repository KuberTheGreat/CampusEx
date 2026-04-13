"use client";

/**
 * Filled, vibrant decorative background — organic blobs with gradients,
 * floating shapes, scattered particles. High opacity, bright Gen-Z palette.
 */
export default function DecorativeBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {/* ── Large filled blobs with gradients ── */}
      <div className="deco-blob animate-blob" style={{ width: 420, height: 420, top: "-6%", right: "-8%", background: "linear-gradient(135deg, #FFD84D, #FF8C42)", opacity: 0.45 }} />
      <div className="deco-blob animate-blob" style={{ width: 350, height: 350, bottom: "-4%", left: "-6%", background: "linear-gradient(135deg, #6D6592, #9B8EC4)", opacity: 0.4, animationDelay: "4s" }} />
      <div className="deco-blob animate-blob" style={{ width: 280, height: 320, top: "35%", right: "3%", background: "linear-gradient(135deg, #FF4D4D, #FF6EC7)", opacity: 0.3, animationDelay: "8s" }} />
      <div className="deco-blob animate-blob" style={{ width: 220, height: 220, top: "10%", left: "8%", background: "linear-gradient(135deg, #4D7CFF, #6EC7FF)", opacity: 0.35, animationDelay: "12s" }} />
      <div className="deco-blob animate-blob" style={{ width: 180, height: 180, bottom: "18%", right: "25%", background: "linear-gradient(135deg, #FF6EC7, #FFD84D)", opacity: 0.25, animationDelay: "16s" }} />
      <div className="deco-blob animate-blob" style={{ width: 150, height: 150, top: "60%", left: "30%", background: "linear-gradient(135deg, #FFD84D, #4D7CFF)", opacity: 0.2, animationDelay: "20s" }} />

      {/* ── Filled floating pills ── */}
      <div className="deco-pill animate-float" style={{ width: 100, height: 32, top: "20%", left: "4%", background: "linear-gradient(90deg, #FFD84D, #FF8C42)", opacity: 0.6, transform: "rotate(-12deg)", animationDelay: "2s" }} />
      <div className="deco-pill animate-float" style={{ width: 70, height: 24, top: "68%", right: "6%", background: "linear-gradient(90deg, #FF4D4D, #FF6EC7)", opacity: 0.5, transform: "rotate(20deg)", animationDelay: "6s" }} />
      <div className="deco-pill animate-float" style={{ width: 120, height: 36, bottom: "28%", left: "12%", background: "linear-gradient(90deg, #4D7CFF, #6D6592)", opacity: 0.4, transform: "rotate(-6deg)", animationDelay: "10s" }} />
      <div className="deco-pill animate-float" style={{ width: 55, height: 20, top: "45%", right: "15%", background: "linear-gradient(90deg, #6D6592, #FF6EC7)", opacity: 0.5, transform: "rotate(35deg)", animationDelay: "14s" }} />

      {/* ── Filled rings with color ── */}
      <div className="deco-ring animate-float" style={{ width: 80, height: 80, top: "12%", left: "65%", borderColor: "#FFD84D", borderWidth: 3, opacity: 0.5, animationDelay: "1s" }} />
      <div className="deco-ring animate-float" style={{ width: 50, height: 50, top: "52%", left: "6%", borderColor: "#FF4D4D", borderWidth: 3, opacity: 0.45, animationDelay: "3s" }} />
      <div className="deco-ring animate-float" style={{ width: 110, height: 110, bottom: "8%", right: "12%", borderColor: "#4D7CFF", borderWidth: 3, opacity: 0.35, animationDelay: "5s" }} />
      <div className="deco-ring animate-spin-slow" style={{ width: 65, height: 65, top: "28%", left: "82%", borderColor: "#6D6592", borderWidth: 2, opacity: 0.4 }} />

      {/* ── Scattered particles/dots — bright & visible ── */}
      {[
        { t: "6%", l: "22%", s: 8, c: "#FFD84D", o: 0.7, d: "0s" },
        { t: "15%", l: "50%", s: 6, c: "#FF4D4D", o: 0.6, d: "1s" },
        { t: "32%", l: "90%", s: 10, c: "#4D7CFF", o: 0.5, d: "2s" },
        { t: "48%", l: "2%", s: 7, c: "#FF6EC7", o: 0.6, d: "3s" },
        { t: "62%", l: "40%", s: 9, c: "#6D6592", o: 0.5, d: "4s" },
        { t: "72%", l: "75%", s: 6, c: "#FFD84D", o: 0.65, d: "5s" },
        { t: "80%", l: "15%", s: 8, c: "#FF4D4D", o: 0.55, d: "6s" },
        { t: "88%", l: "55%", s: 7, c: "#4D7CFF", o: 0.5, d: "7s" },
        { t: "4%", l: "78%", s: 5, c: "#FF6EC7", o: 0.6, d: "8s" },
        { t: "42%", l: "32%", s: 6, c: "#FFD84D", o: 0.5, d: "9s" },
        { t: "25%", l: "65%", s: 7, c: "#FF4D4D", o: 0.55, d: "10s" },
        { t: "58%", l: "85%", s: 5, c: "#4D7CFF", o: 0.6, d: "11s" },
        { t: "38%", l: "12%", s: 4, c: "#6D6592", o: 0.7, d: "12s" },
        { t: "78%", l: "48%", s: 6, c: "#FF6EC7", o: 0.5, d: "13s" },
        { t: "16%", l: "38%", s: 5, c: "#FFD84D", o: 0.6, d: "14s" },
      ].map((dot, i) => (
        <div
          key={i}
          className="deco-dot animate-float"
          style={{
            width: dot.s,
            height: dot.s,
            top: dot.t,
            left: dot.l,
            background: dot.c,
            opacity: dot.o,
            animationDelay: dot.d,
          }}
        />
      ))}

      {/* ── SVG squiggles ── */}
      <svg className="deco-shape animate-float" style={{ top: "14%", right: "18%", opacity: 0.25 }} width="120" height="60" viewBox="0 0 120 60" fill="none">
        <path d="M5 30C20 10 40 50 60 30C80 10 100 50 115 30" stroke="#FFD84D" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
      <svg className="deco-shape animate-float" style={{ bottom: "22%", left: "4%", opacity: 0.2, animationDelay: "4s" }} width="100" height="50" viewBox="0 0 100 50" fill="none">
        <path d="M5 25C15 5 35 45 50 25C65 5 85 45 95 25" stroke="#FF6EC7" strokeWidth="3" strokeLinecap="round" />
      </svg>

      {/* ── Cross accents ── */}
      <svg className="deco-shape animate-spin-slow" style={{ top: "40%", left: "76%", opacity: 0.3 }} width="24" height="24" viewBox="0 0 24 24" fill="none">
        <line x1="12" y1="2" x2="12" y2="22" stroke="#FF4D4D" strokeWidth="3" strokeLinecap="round" />
        <line x1="2" y1="12" x2="22" y2="12" stroke="#FF4D4D" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <svg className="deco-shape animate-spin-slow" style={{ bottom: "12%", left: "50%", opacity: 0.25, animationDelay: "15s" }} width="20" height="20" viewBox="0 0 24 24" fill="none">
        <line x1="12" y1="2" x2="12" y2="22" stroke="#FFD84D" strokeWidth="3" strokeLinecap="round" />
        <line x1="2" y1="12" x2="22" y2="12" stroke="#FFD84D" strokeWidth="3" strokeLinecap="round" />
      </svg>

      {/* ── Star bursts ── */}
      <svg className="deco-shape animate-float" style={{ top: "5%", left: "38%", opacity: 0.35, animationDelay: "7s" }} width="36" height="36" viewBox="0 0 32 32" fill="none">
        <path d="M16 2L19.5 12.5L30 16L19.5 19.5L16 30L12.5 19.5L2 16L12.5 12.5Z" fill="#FFD84D" />
      </svg>
      <svg className="deco-shape animate-float" style={{ bottom: "35%", right: "8%", opacity: 0.3, animationDelay: "11s" }} width="28" height="28" viewBox="0 0 32 32" fill="none">
        <path d="M16 2L19.5 12.5L30 16L19.5 19.5L16 30L12.5 19.5L2 16L12.5 12.5Z" fill="#FF6EC7" />
      </svg>
      <svg className="deco-shape animate-float" style={{ top: "55%", left: "20%", opacity: 0.25, animationDelay: "9s" }} width="22" height="22" viewBox="0 0 32 32" fill="none">
        <path d="M16 2L19.5 12.5L30 16L19.5 19.5L16 30L12.5 19.5L2 16L12.5 12.5Z" fill="#4D7CFF" />
      </svg>
    </div>
  );
}
