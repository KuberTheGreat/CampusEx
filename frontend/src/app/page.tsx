"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoundedBox, Sparkles, Billboard, Text } from "@react-three/drei";
import { GoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { jwtDecode } from "jwt-decode";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import DecorativeBackground from "@/components/DecorativeBackground";

// ═══════════════════════════════════════════
// PALETTES (matched to app design system)
// ═══════════════════════════════════════════
const LIGHT_PALETTE = {
  bg: "#F9F2E5",
  floor: "#EDE5D4",
  gridLine: "#D6CBAE",
  fog: "#F9F2E5",
  barColors: ["#C8B6FF", "#A8E6CF", "#A0C4FF", "#FFBEa0", "#FFD6A5", "#FDFFB6", "#E8D5FF", "#B8F0D8"],
  ambientIntensity: 0.75,
  textSecondary: "#6D6592",
};

const DARK_PALETTE = {
  bg: "#0E0E12",
  floor: "#16161D",
  gridLine: "#2A2A38",
  fog: "#0A0A14",
  barColors: ["#8B82B8", "#6BA3FF", "#FF8AB8", "#4ADE80", "#FFD06B", "#A78BFA", "#9B82D8", "#7BC4FF"],
  ambientIntensity: 0.5,
  textSecondary: "#8B82B8",
};

// ═══════════════════════════════════════════
// DEMO DATA (no API calls needed)
// ═══════════════════════════════════════════
const DEMO_BARS = [
  { id: 1, symbol: "XYZ", baseHeight: 5.5 },
  { id: 2, symbol: "ABC", baseHeight: 4.2 },
  { id: 3, symbol: "MKT", baseHeight: 3.8 },
  { id: 4, symbol: "TRD", baseHeight: 6.0 },
  { id: 5, symbol: "NXT", baseHeight: 2.5 },
  { id: 6, symbol: "GEN", baseHeight: 3.0 },
  { id: 7, symbol: "FLX", baseHeight: 4.5 },
  { id: 8, symbol: "ZAP", baseHeight: 3.5 },
];

function getRadialPosition(index: number): [number, number, number] {
  if (index === 0) return [0, 0, 0];
  const ring = 1;
  const maxInRing = Math.min(7, DEMO_BARS.length - 1);
  const angle = ((index - 1) / maxInRing) * Math.PI * 2;
  const radius = 2.0;
  return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
}

// ═══════════════════════════════════════════
// SCROLL HOOK
// ═══════════════════════════════════════════
function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(maxScroll > 0 ? Math.min(scrollY / maxScroll, 1) : 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return progress;
}

function getStage(progress: number): number {
  if (progress < 0.25) return 1;
  if (progress < 0.50) return 2;
  if (progress < 0.75) return 3;
  if (progress < 0.90) return 4;
  return 5;
}

// ═══════════════════════════════════════════
// ANIMATED BAR
// ═══════════════════════════════════════════
function LandingBar({
  bar, index, palette, isDark, stage, progress,
}: {
  bar: typeof DEMO_BARS[0]; index: number; palette: typeof LIGHT_PALETTE;
  isDark: boolean; stage: number; progress: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const pos = getRadialPosition(index);
  const currentHeight = useRef(0.01);
  const time = useRef(Math.random() * 100);
  const barColor = palette.barColors[index % palette.barColors.length];

  // Compute target height based on stage
  const targetHeight = useMemo(() => {
    if (stage <= 1) return bar.baseHeight * 0.6;
    if (stage === 2) return (index < 3) ? bar.baseHeight * 1.0 : bar.baseHeight * 0.4;
    if (stage === 3) return bar.baseHeight * (0.5 + Math.sin(progress * Math.PI * 4 + index) * 0.5);
    if (stage === 4) return (index === 0) ? bar.baseHeight * 1.2 : bar.baseHeight * 0.5;
    return bar.baseHeight * 0.8;
  }, [stage, progress, bar.baseHeight, index]);

  // Emissive intensity based on stage
  const emissiveIntensity = useMemo(() => {
    if (!isDark) return (stage === 2 && index < 3) ? 0.12 : 0.04;
    if (stage === 2 && index < 3) return 0.45;
    if (stage === 4 && index === 0) return 0.5;
    return 0.15;
  }, [isDark, stage, index]);

  // Track rendered label position
  const labelYRef = useRef(0.5);

  useFrame((_, delta) => {
    currentHeight.current += (targetHeight - currentHeight.current) * Math.min(delta * 2.0, 0.1);
    time.current += delta;

    if (groupRef.current) {
      const breathe = Math.sin(time.current * 0.6 + index * 0.7) * 0.02;
      groupRef.current.position.y = currentHeight.current / 2 + breathe;
    }
    if (meshRef.current) {
      meshRef.current.scale.y = Math.max(0.01, currentHeight.current);
    }
    // Label always above bar top: half the scale height + offset
    labelYRef.current = currentHeight.current * 0.5 + 0.45;
  });

  return (
    <group position={pos}>
      <group ref={groupRef}>
        <RoundedBox
          ref={meshRef}
          args={[0.65, 1, 0.65]}
          radius={0.1}
          smoothness={4}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={barColor}
            metalness={isDark ? 0.35 : 0.12}
            roughness={isDark ? 0.45 : 0.38}
            emissive={barColor}
            emissiveIntensity={emissiveIntensity}
            toneMapped={false}
          />
        </RoundedBox>

        {/* Label — positioned above bar top */}
        <Billboard position={[0, labelYRef.current, 0]}>
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[0.9, 0.35]} />
            <meshBasicMaterial color={isDark ? "#1A1A24" : "#FFFBF3"} transparent opacity={0.75} depthWrite={false} />
          </mesh>
          <Text fontSize={0.18} color={isDark ? "#EEEAE2" : "#1A1A1A"} anchorX="center" anchorY="middle" fontWeight={700}>
            {bar.symbol}
          </Text>
        </Billboard>

      </group>
    </group>
  );
}

// ═══════════════════════════════════════════
// FLOATING AVATAR (Stage 4)
// ═══════════════════════════════════════════
function FloatingAvatar({ position }: { position: [number, number, number] }) {
  const spriteRef = useRef<THREE.Sprite>(null);
  const timeRef = useRef(0);

  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load("https://api.dicebear.com/7.x/identicon/svg?seed=hero&size=128");
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useFrame((_, delta) => {
    if (!spriteRef.current) return;
    timeRef.current += delta;
    spriteRef.current.position.y = position[1] + Math.sin(timeRef.current * 1.5) * 0.1;
    spriteRef.current.material.rotation += delta * 0.4;

    // Scale in animation
    const s = spriteRef.current.scale.x;
    const target = 0.6;
    spriteRef.current.scale.set(
      s + (target - s) * Math.min(delta * 3, 0.15),
      s + (target - s) * Math.min(delta * 3, 0.15),
      1
    );
  });

  return (
    <sprite ref={spriteRef} position={position} scale={[0.01, 0.01, 1]}>
      <spriteMaterial map={texture} transparent opacity={0.9} depthWrite={false} />
    </sprite>
  );
}

// ═══════════════════════════════════════════
// FLOOR
// ═══════════════════════════════════════════
function Floor({ palette, isDark }: { palette: typeof LIGHT_PALETTE; isDark: boolean }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial
          color={isDark ? "#1A1A24" : "#EDE5D4"}
          roughness={0.85}
          metalness={isDark ? 0.08 : 0}
          transparent
          opacity={0.9}
        />
      </mesh>
      <gridHelper
        args={[16, 16, palette.gridLine, palette.gridLine]}
        position={[0, 0.001, 0]}
        material-transparent={true}
        material-opacity={isDark ? 0.1 : 0.15}
      />
    </group>
  );
}

// ═══════════════════════════════════════════
// CAMERA CONTROLLER (scroll + mouse parallax)
// ═══════════════════════════════════════════
function CameraController({ progress, mouseRef }: { progress: number; mouseRef: React.RefObject<{ x: number; y: number }> }) {
  const { camera } = useThree();
  const stage = getStage(progress);

  // Target camera positions per stage
  const targetPos = useMemo((): [number, number, number] => {
    switch (stage) {
      case 1: return [7, 8, 10];
      case 2: return [4, 7, 7];
      case 3: return [3.5, 5.5, 5.5];
      case 4: return [2.5, 5, 4.5];
      case 5: return [5, 7, 8];
      default: return [7, 8, 10];
    }
  }, [stage]);

  // Smooth auto-rotation for stage 1
  const autoRotAngle = useRef(0);

  useFrame((_, delta) => {
    const mouse = mouseRef.current || { x: 0, y: 0 };

    // Auto-rotate only in stage 1
    if (stage === 1) {
      autoRotAngle.current += delta * 0.15;
    }

    // Base position + auto-rotation
    let [tx, ty, tz] = targetPos;
    if (stage === 1) {
      const r = Math.sqrt(tx * tx + tz * tz);
      const baseAngle = Math.atan2(tz, tx);
      tx = Math.cos(baseAngle + autoRotAngle.current) * r;
      tz = Math.sin(baseAngle + autoRotAngle.current) * r;
    }

    // Mouse parallax offset (subtle)
    const mx = mouse.x * 0.6;
    const my = mouse.y * 0.3;

    // Lerp camera
    camera.position.x += (tx + mx - camera.position.x) * Math.min(delta * 1.5, 0.08);
    camera.position.y += (ty + my - camera.position.y) * Math.min(delta * 1.5, 0.08);
    camera.position.z += (tz - camera.position.z) * Math.min(delta * 1.5, 0.08);

    camera.lookAt(0, 1.5, 0);
  });

  return null;
}

// ═══════════════════════════════════════════
// 3D SCENE
// ═══════════════════════════════════════════
function LandingScene({ progress, isDark, palette, mouseRef }: {
  progress: number; isDark: boolean; palette: typeof LIGHT_PALETTE;
  mouseRef: React.RefObject<{ x: number; y: number }>;
}) {
  const stage = getStage(progress);

  return (
    <>
      <CameraController progress={progress} mouseRef={mouseRef} />
      <Floor palette={palette} isDark={isDark} />

      {/* Lighting */}
      {isDark ? (
        <>
          <ambientLight intensity={0.55} color="#9090BB" />
          <pointLight position={[0, 16, 0]} intensity={1.8} color="#8B82B8" distance={60} decay={1.5} />
          <pointLight position={[10, 8, -10]} intensity={0.8} color="#6BA3FF" distance={40} decay={1.8} />
          <pointLight position={[-10, 8, 10]} intensity={0.6} color="#FF8AB8" distance={40} decay={1.8} />
          <directionalLight position={[5, 12, 8]} intensity={0.5} color="#B0A8D0" castShadow />
        </>
      ) : (
        <>
          <ambientLight intensity={0.75} color="#FFF8ED" />
          <directionalLight position={[8, 14, 6]} intensity={1.0} color="#FFFAF0" castShadow />
          <pointLight position={[0, 10, 0]} intensity={0.35} color="#C8B6FF" distance={25} decay={2} />
          <hemisphereLight args={["#FFF8ED", "#EDE5D4", 0.4]} />
        </>
      )}

      {/* Particles */}
      <Sparkles count={40} scale={14} size={isDark ? 2.2 : 1.2} speed={0.2} opacity={isDark ? 0.35 : 0.15} color={isDark ? "#8B82B8" : "#C8B6FF"} />
      {isDark && <Sparkles count={20} scale={10} size={1.5} speed={0.15} opacity={0.2} color="#6BA3FF" />}

      {/* Bars */}
      {DEMO_BARS.map((bar, i) => (
        <LandingBar key={bar.id} bar={bar} index={i} palette={palette} isDark={isDark} stage={stage} progress={progress} />
      ))}
    </>
  );
}

// ═══════════════════════════════════════════
// TEXT OVERLAY COMPONENT
// ═══════════════════════════════════════════
function StageText({ children, visible, className = "" }: { children: React.ReactNode; visible: boolean; className?: string }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`absolute z-20 pointer-events-none ${className}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════
export default function Home() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const palette = isDark ? DARK_PALETTE : LIGHT_PALETTE;
  const progress = useScrollProgress();
  const stage = getStage(progress);
  const mouseRef = useRef({ x: 0, y: 0 });

  // ── Auth state (preserved from original) ──
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [traits, setTraits] = useState("");
  const [stockSymbol, setStockSymbol] = useState("");
  const [ipoDate, setIpoDate] = useState("");
  const router = useRouter();
  const { login } = useAuth();

  // ── Mouse tracking ──
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    mouseRef.current = { x, y };
  }, []);

  // ── Skip intro ──
  const skipIntro = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  };

  // ── Auth handlers (unchanged) ──
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

  // ── If user clicked CTA or is on auth steps, show auth overlay ──
  const showAuthOverlay = step > 0;

  return (
    <div className="relative" style={{ background: palette.bg }}>
      {/* Decorative background — always behind */}
      <DecorativeBackground />

      {/* ═══ SCROLL CONTAINER ═══ */}
      <div style={{ minHeight: showAuthOverlay ? "100vh" : "500vh" }}>

        {/* ═══ STICKY 3D CANVAS ═══ */}
        <div
          className="sticky top-0 w-full h-screen z-10"
          onMouseMove={handleMouseMove}
        >
          <Canvas
            shadows
            camera={{ position: [7, 8, 10], fov: 50 }}
            gl={{
              antialias: true,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: isDark ? 1.3 : 1.0,
            }}
          >
            <color attach="background" args={[palette.bg]} />
            <fog attach="fog" args={[palette.fog, isDark ? 14 : 20, isDark ? 40 : 55]} />
            <LandingScene
              progress={progress}
              isDark={isDark}
              palette={palette}
              mouseRef={mouseRef}
            />
          </Canvas>

          {/* ═══ TEXT OVERLAYS ═══ */}
          {!showAuthOverlay && (
            <>
              {/* Stage 1 */}
              <StageText visible={stage === 1} className="top-[15%] left-1/2 -translate-x-1/2 text-center w-full px-8">
                <h1 className="text-5xl md:text-7xl font-black leading-tight" style={{ color: "var(--text)" }}>
                  This is <span className="italic" style={{ color: "var(--accent)" }}>not</span><br />a stock market.
                </h1>
              </StageText>

              {/* Stage 2 */}
              <StageText visible={stage === 2} className="top-[12%] left-1/2 -translate-x-1/2 text-center w-full px-8">
                <h1 className="text-5xl md:text-7xl font-black leading-tight" style={{ color: "var(--text)" }}>
                  You trade<br /><span style={{ color: "var(--primary)" }}>people.</span>
                </h1>
                <p className="mt-4 text-lg max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
                  Buy into your friends. Sell the fakes. Your campus, your market.
                </p>
              </StageText>

              {/* Stage 3 */}
              <StageText visible={stage === 3} className="top-[10%] right-[5%] md:right-[10%] text-right max-w-md">
                <h1 className="text-4xl md:text-6xl font-black leading-tight" style={{ color: "var(--text)" }}>
                  Your value<br /><span style={{ color: "var(--green, #2DD4A0)" }}>changes.</span>
                </h1>
                <p className="mt-3 text-base" style={{ color: "var(--text-secondary)" }}>
                  News, drama, achievements — everything moves the market.
                </p>
              </StageText>

              {/* Stage 4 */}
              <StageText visible={stage === 4} className="top-[12%] left-[5%] md:left-[10%] text-left max-w-md">
                <h1 className="text-4xl md:text-6xl font-black leading-tight" style={{ color: "var(--text)" }}>
                  This could<br />be <span style={{ color: "var(--primary)" }}>you.</span>
                </h1>
                <p className="mt-3 text-base" style={{ color: "var(--text-secondary)" }}>
                  Get listed. Build your stock. Become the blue chip of campus.
                </p>
              </StageText>

              {/* Stage 5 — CTA */}
              <StageText visible={stage === 5} className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full px-8 pointer-events-auto">
                <h1 className="text-5xl md:text-7xl font-black mb-6" style={{ color: "var(--text)" }}>
                  Enter the Market.
                </h1>
                <p className="text-lg mb-8 max-w-md mx-auto" style={{ color: "var(--text-secondary)" }}>
                  Your campus economy awaits.
                </p>
                <button
                  onClick={() => setStep(1)}
                  className="px-12 py-5 text-xl font-bold rounded-2xl transition-all transform hover:scale-105 active:scale-95 pointer-events-auto"
                  style={{
                    background: "var(--primary)",
                    color: "#fff",
                    boxShadow: isDark
                      ? "0 0 30px rgba(255,140,85,0.3), 0 8px 30px rgba(0,0,0,0.4)"
                      : "0 8px 30px rgba(255,107,44,0.35)",
                  }}
                >
                  Enter The Market →
                </button>
              </StageText>

              {/* Skip button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: stage < 5 ? 0.7 : 0 }}
                transition={{ duration: 0.3 }}
                onClick={skipIntro}
                className="fixed top-6 right-6 z-50 text-sm font-bold px-4 py-2 rounded-full transition-all hover:opacity-100 pointer-events-auto"
                style={{
                  background: "var(--bg-card)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                  display: stage >= 5 ? "none" : "block",
                }}
              >
                Skip ↓
              </motion.button>

              {/* Scroll indicator */}
              {stage === 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  transition={{ delay: 2, duration: 1 }}
                  className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
                >
                  <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--text-secondary)" }}>Scroll</span>
                  <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-5 h-8 rounded-full border-2 flex items-start justify-center pt-1"
                    style={{ borderColor: "var(--text-secondary)" }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--text-secondary)" }} />
                  </motion.div>
                </motion.div>
              )}
            </>
          )}

          {/* ═══ AUTH OVERLAY (steps 1–4) ═══ */}
          <AnimatePresence>
            {showAuthOverlay && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 z-30 flex items-center justify-center"
                style={{ background: isDark ? "rgba(14,14,18,0.7)" : "rgba(249,242,229,0.7)", backdropFilter: "blur(8px)" }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="relative"
                >
                  {/* Back button */}
                  {step > 0 && step < 4 && (
                    <button
                      onClick={() => setStep(step === 1 ? 0 : step - 1)}
                      className="absolute -top-12 left-0 text-sm font-semibold transition-colors"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      ← Back
                    </button>
                  )}

                  {step === 1 && (
                    <div className="card p-10 w-full max-w-md text-center space-y-6">
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
                    <form className="card p-8 w-full max-w-lg space-y-5" onSubmit={handleCreateProfile}>
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
                    <form className="card p-8 w-full max-w-md space-y-5" onSubmit={handleScheduleIPO}>
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
                    <div className="card p-10 w-full max-w-md text-center space-y-5">
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
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
