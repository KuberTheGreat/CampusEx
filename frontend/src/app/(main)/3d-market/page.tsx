"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { Text, OrbitControls, Billboard, RoundedBox, Sparkles } from "@react-three/drei";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import * as THREE from "three";
import toast from "react-hot-toast";

// ─── PALETTE ───
const LIGHT_PALETTE = {
  bg: "#F9F2E5",
  floor: "#EDE5D4",
  gridLine: "#D6CBAE",
  fog: "#F9F2E5",
  barColors: [
    "#C8B6FF", // lavender
    "#A8E6CF", // mint
    "#A0C4FF", // soft blue
    "#FFBEa0", // peach
    "#FFD6A5", // soft orange
    "#FDFFB6", // soft yellow
  ],
  ambientIntensity: 0.7,
  textColor: "#1A1A1A",
  textSecondary: "#6D6592",
  labelBg: "rgba(255,251,243,0.85)",
  labelBorder: "rgba(109,101,146,0.2)",
};

const DARK_PALETTE = {
  bg: "#0E0E12",
  floor: "#16161D",
  gridLine: "#2A2A38",
  fog: "#0A0A14",
  barColors: [
    "#8B82B8", // purple
    "#6BA3FF", // blue glow
    "#FF8AB8", // pink glow
    "#4ADE80", // green glow
    "#FFD06B", // amber glow
    "#A78BFA", // violet
  ],
  ambientIntensity: 0.5,
  textColor: "#EEEAE2",
  textSecondary: "#8B82B8",
  labelBg: "rgba(14,14,18,0.85)",
  labelBorder: "rgba(139,130,184,0.3)",
};

// ─── RADIAL LAYOUT ───
function getRadialPosition(index: number) {
  if (index === 0) return [0, 0, 0];
  let ring = 1;
  let maxItemsInRing = 6;
  let itemsPassed = 1;

  while (index >= itemsPassed + maxItemsInRing) {
    itemsPassed += maxItemsInRing;
    ring++;
    maxItemsInRing = ring * 6;
  }

  const indexInRing = index - itemsPassed;
  const angle = (indexInRing / maxItemsInRing) * Math.PI * 2;
  const radius = ring * 1.5;

  return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
}

// ─── DICEBEAR AVATAR SPRITE ───
function AvatarSprite({ userId, position, isHovered }: { userId: number; position: [number, number, number]; isHovered: boolean }) {
  const spriteRef = useRef<THREE.Sprite>(null);
  const timeRef = useRef(Math.random() * 100);

  // Load DiceBear avatar as texture
  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load(
      `https://api.dicebear.com/7.x/identicon/svg?seed=${userId}&backgroundColor=transparent&size=128`
    );
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [userId]);

  useFrame((_, delta) => {
    if (!spriteRef.current) return;
    timeRef.current += delta;

    // Floating Y oscillation
    const floatY = Math.sin(timeRef.current * 1.2) * 0.08;
    spriteRef.current.position.y = position[1] + floatY;

    // Slow rotation
    spriteRef.current.material.rotation += delta * 0.3;

    // Hover scale
    const targetScale = isHovered ? 0.75 : 0.55;
    const s = spriteRef.current.scale.x;
    const newS = s + (targetScale - s) * Math.min(delta * 6, 0.2);
    spriteRef.current.scale.set(newS, newS, 1);
  });

  return (
    <sprite
      ref={spriteRef}
      position={position}
    >
      <spriteMaterial
        map={texture}
        transparent
        opacity={isHovered ? 1.0 : 0.85}
        depthWrite={false}
      />
    </sprite>
  );
}

// ─── LABEL WITH BACKGROUND PILL ───
function BarLabel({ text, isDark, isHovered, palette, position }: any) {
  const labelWidth = Math.max(text.length * 0.22, 0.8);
  
  return (
    <Billboard position={position} follow lockX={false} lockY={false} lockZ={false}>
      {/* Background pill */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[labelWidth + 0.3, 0.45]} />
        <meshBasicMaterial
          color={isDark ? "#1A1A24" : "#FFFBF3"}
          transparent
          opacity={isHovered ? 0.95 : 0.8}
          depthWrite={false}
        />
      </mesh>
      {/* Border outline */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[labelWidth + 0.36, 0.51]} />
        <meshBasicMaterial
          color={isDark ? "#8B82B8" : "#6D6592"}
          transparent
          opacity={isHovered ? 0.5 : 0.2}
          depthWrite={false}
        />
      </mesh>
      {/* Text */}
      <Text
        fontSize={isHovered ? 0.28 : 0.22}
        color={isHovered ? (isDark ? "#ffffff" : "#1A1A1A") : palette.textSecondary}
        anchorX="center"
        anchorY="middle"
        fontWeight={700}
      >
        {text}
      </Text>
    </Billboard>
  );
}

// ─── ANIMATED BAR ───
function AnimatedBar({
  user,
  index,
  maxPrice,
  maxHeight,
  palette,
  isDark,
  isHovered,
  onSelect,
  onHover,
  onUnhover,
}: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [x, , z] = getRadialPosition(index);
  const targetHeight = Math.max(0.4, ((user.currentPrice || 1) / maxPrice) * maxHeight);
  const currentHeight = useRef(0.01);
  const time = useRef(Math.random() * 100);

  const barColor = palette.barColors[index % palette.barColors.length];

  useFrame((_, delta) => {
    // Smooth height animation (spring-like lerp)
    currentHeight.current += (targetHeight - currentHeight.current) * Math.min(delta * 2.5, 0.15);

    if (groupRef.current) {
      groupRef.current.position.y = currentHeight.current / 2;
    }
    if (meshRef.current) {
      meshRef.current.scale.y = Math.max(0.01, currentHeight.current);

      // Idle breathing effect
      time.current += delta;
      const breathe = Math.sin(time.current * 0.8 + index * 0.5) * 0.015;
      groupRef.current!.position.y = currentHeight.current / 2 + breathe;
    }

    // Hover scale
    if (groupRef.current) {
      const targetScale = isHovered ? 1.1 : 1.0;
      const s = groupRef.current.scale.x;
      const newScale = s + (targetScale - s) * Math.min(delta * 8, 0.3);
      groupRef.current.scale.set(newScale, 1, newScale);
    }
  });

  const labelY = targetHeight * 0.55 + 0.6;
  const avatarY = targetHeight * 0.55 + 1.1;

  return (
    <group position={[x, 0, z]}>
      <group ref={groupRef}>
        <RoundedBox
          ref={meshRef}
          args={[0.85, 1, 0.85]}
          radius={0.12}
          smoothness={4}
          castShadow
          receiveShadow
          onClick={(e) => {
            e.stopPropagation();
            onSelect(user);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover(user.id);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            onUnhover();
            document.body.style.cursor = "auto";
          }}
        >
          <meshStandardMaterial
            color={barColor}
            metalness={isDark ? 0.35 : 0.12}
            roughness={isDark ? 0.45 : 0.38}
            emissive={barColor}
            emissiveIntensity={isDark ? (isHovered ? 0.5 : 0.2) : (isHovered ? 0.15 : 0.06)}
            toneMapped={false}
          />
        </RoundedBox>

        {/* Label with background pill */}
        <BarLabel
          text={user.stockSymbol || "UKN"}
          isDark={isDark}
          isHovered={isHovered}
          palette={palette}
          position={[0, labelY, 0]}
        />

        {/* DiceBear avatar floating above */}
        <AvatarSprite
          userId={user.id}
          position={[0, avatarY, 0] as [number, number, number]}
          isHovered={isHovered}
        />
      </group>
    </group>
  );
}

// ─── FLOOR ───
function StyledFloor({ palette, isDark }: { palette: typeof LIGHT_PALETTE; isDark: boolean }) {
  return (
    <group>
      {/* Main floor plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial
          color={isDark ? "#1A1A24" : "#EDE5D4"}
          roughness={0.85}
          metalness={isDark ? 0.08 : 0.0}
          transparent
          opacity={1.0}
        />
      </mesh>

      {/* Inner grid — subtle, thin lines */}
      <gridHelper
        args={[24, 24, palette.gridLine, palette.gridLine]}
        position={[0, 0.002, 0]}
        material-transparent={true}
        material-opacity={isDark ? 0.12 : 0.2}
      />

      {/* Outer grid — very faint */}
      <gridHelper
        args={[80, 40, palette.gridLine, palette.gridLine]}
        position={[0, 0.001, 0]}
        material-transparent={true}
        material-opacity={isDark ? 0.05 : 0.08}
      />
    </group>
  );
}

// ─── FLOATING PARTICLES ───
function FloatingParticles({ isDark }: { isDark: boolean }) {
  return (
    <>
      <Sparkles
        count={60}
        scale={20}
        size={isDark ? 2.5 : 1.5}
        speed={0.3}
        opacity={isDark ? 0.4 : 0.2}
        color={isDark ? "#8B82B8" : "#C8B6FF"}
      />
      {isDark && (
        <Sparkles
          count={30}
          scale={15}
          size={1.8}
          speed={0.2}
          opacity={0.25}
          color="#6BA3FF"
        />
      )}
    </>
  );
}

// ─── MARKET SCENE ───
function MarketScene({ users, maxPrice, onSelect, hoveredId, setHoveredId, palette, isDark }: any) {
  const MAX_HEIGHT = 7;

  return (
    <>
      <OrbitControls
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI / 2.3}
        enableZoom={false}
        enablePan={false}
        enableDamping={true}
        dampingFactor={0.06}
        autoRotate
        autoRotateSpeed={0.3}
      />

      <StyledFloor palette={palette} isDark={isDark} />
      <FloatingParticles isDark={isDark} />

      {/* ── LIGHTING ── */}
      {isDark ? (
        <>
          {/* Ambient — enough to see everything */}
          <ambientLight intensity={0.6} color="#9090BB" />
          {/* Main overhead glow */}
          <pointLight position={[0, 18, 0]} intensity={2.0} color="#8B82B8" distance={80} decay={1.5} />
          {/* Blue accent from one side */}
          <pointLight position={[12, 10, -12]} intensity={1.0} color="#6BA3FF" distance={50} decay={1.8} />
          {/* Pink accent from other side */}
          <pointLight position={[-12, 10, 12]} intensity={0.7} color="#FF8AB8" distance={50} decay={1.8} />
          {/* Teal fill from front */}
          <pointLight position={[0, 6, 15]} intensity={0.5} color="#4ADE80" distance={40} decay={2} />
          {/* Soft directional for shadows */}
          <directionalLight
            position={[5, 15, 8]}
            intensity={0.6}
            color="#B0A8D0"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
        </>
      ) : (
        <>
          <ambientLight intensity={0.75} color="#FFF8ED" />
          <directionalLight
            position={[8, 14, 6]}
            intensity={1.1}
            color="#FFFAF0"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <pointLight position={[0, 10, 0]} intensity={0.4} color="#C8B6FF" distance={30} decay={2} />
          <pointLight position={[-8, 6, 8]} intensity={0.25} color="#FFBEa0" distance={25} decay={2} />
          <hemisphereLight args={["#FFF8ED", "#EDE5D4", 0.45]} />
        </>
      )}

      {/* Bars */}
      {users.map((user: any, i: number) => (
        <AnimatedBar
          key={user.id}
          user={user}
          index={i}
          maxPrice={maxPrice}
          maxHeight={MAX_HEIGHT}
          palette={palette}
          isDark={isDark}
          isHovered={hoveredId === user.id}
          onSelect={onSelect}
          onHover={setHoveredId}
          onUnhover={() => setHoveredId(null)}
        />
      ))}
    </>
  );
}

// ─── PAGE ───
export default function ThreeMarket() {
  const { user: authUser } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const palette = isDark ? DARK_PALETTE : LIGHT_PALETTE;

  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // Trade States
  const [tradeShares, setTradeShares] = useState(1);
  const [tradeMode, setTradeMode] = useState<"BUY" | "SELL" | null>(null);
  const [chartData, setChartData] = useState<number[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (res.ok && data.users) {
        const sorted = data.users.sort((a: any, b: any) => b.currentPrice - a.currentPrice);
        setUsers(sorted);
      }
    } catch (err) {
      console.error("Failed to fetch market data", err);
    }
  };

  useEffect(() => {
    if (selectedUser?.id) {
      fetch(`/api/market/stocks/${selectedUser.id}/history?range=7d`)
        .then((res) => res.json())
        .then((data) => {
          if (data.history && data.history.length > 0) {
            setChartData(data.history.map((h: any) => h.price));
          } else {
            setChartData([]);
          }
        })
        .catch(() => setChartData([]));
    }
  }, [selectedUser?.id]);

  const executeTrade = async () => {
    if (!authUser?.id || !selectedUser || !tradeMode) return;
    const totalCost = tradeShares * selectedUser.currentPrice;

    if (tradeMode === "BUY" && totalCost > (authUser.auraCoins || 0)) {
      return toast.error("Insufficient AURA balance!");
    }

    try {
      const res = await fetch("/api/market/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerId: authUser.id,
          targetUserId: selectedUser.id,
          shares: tradeShares,
          type: tradeMode,
        }),
      });
      if (res.ok) {
        toast.success(`Successfully executed ${tradeMode} of ${tradeShares} shares!`);
        window.location.reload();
      } else {
        const error = await res.json();
        toast.error(`Trade Failed: ${error.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className="w-full h-screen relative overflow-hidden flex"
      style={{ backgroundColor: palette.bg }}
    >
      {/* The 3D Canvas Layer */}
      <div className="flex-1 h-screen relative cursor-crosshair">
        <Canvas
          shadows={{ type: THREE.PCFShadowMap }}
          camera={{ position: [10, 12, 13], fov: 48 }}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: isDark ? 1.4 : 1.0,
          }}
        >
          <color attach="background" args={[palette.bg]} />
          <fog attach="fog" args={[palette.fog, isDark ? 18 : 25, isDark ? 55 : 70]} />
          <MarketScene
            users={users}
            maxPrice={Math.max(...users.map((u: any) => u.currentPrice || 1), 10)}
            onSelect={setSelectedUser}
            hoveredId={hoveredId}
            setHoveredId={setHoveredId}
            palette={palette}
            isDark={isDark}
          />
        </Canvas>

        {/* Floating Header */}
        <div className="absolute top-6 left-6 pointer-events-none">
          <h1
            className="text-4xl font-extrabold drop-shadow-sm"
            style={{ color: isDark ? palette.textSecondary : "var(--accent)" }}
          >
            Market Topology
          </h1>
          <p
            className="tracking-widest text-sm mt-1 font-semibold"
            style={{ color: isDark ? "#5A5A6A" : "#8A8078", letterSpacing: "0.15em" }}
          >
            3D ASSET OVERVIEW
          </p>
        </div>
      </div>

      {/* Right Drawer Panel */}
      <div
        className={`w-96 h-full p-6 transition-all duration-500 transform overflow-y-auto ${
          selectedUser ? "translate-x-0" : "translate-x-full absolute right-0"
        }`}
        style={{
          backgroundColor: "var(--bg-card)",
          borderLeft: "1px solid var(--border)",
          boxShadow: selectedUser ? "var(--shadow-lg)" : "none",
        }}
      >
        {selectedUser && (
          <div className="relative">
            <button
              onClick={() => {
                setSelectedUser(null);
                setTradeMode(null);
              }}
              className="absolute -top-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center transition-colors text-sm font-bold"
              style={{
                color: "var(--text-secondary)",
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
              }}
            >
              ✕
            </button>

            {/* Profile header */}
            <div className="text-center mb-8 pt-4">
              {/* DiceBear avatar in panel */}
              <div
                className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4 overflow-hidden"
                style={{
                  background: "var(--accent-soft)",
                  border: "2px solid var(--accent)",
                  boxShadow: "var(--shadow-glow)",
                }}
              >
                <img
                  src={`https://api.dicebear.com/7.x/identicon/svg?seed=${selectedUser.id}&size=80`}
                  alt={selectedUser.stockSymbol}
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                {selectedUser.name}
              </h2>
              <p
                className="text-xs font-semibold mt-1 tracking-wider"
                style={{ color: "var(--accent)" }}
              >
                ${selectedUser.stockSymbol || "UNK"}
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                {selectedUser.email}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div
                className="p-4 rounded-2xl text-center"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Valuation
                </div>
                <div className="text-xl font-bold mt-1" style={{ color: "var(--primary)" }}>
                  {selectedUser.currentPrice?.toFixed(2)} Au
                </div>
              </div>
              <div
                className="p-4 rounded-2xl text-center"
                style={{
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  Credibility
                </div>
                <div className="text-xl font-bold mt-1" style={{ color: "var(--accent)" }}>
                  {selectedUser.credibilityScore}
                </div>
              </div>
            </div>

            {/* Live Price Chart */}
            <div
              className="p-4 rounded-2xl mb-6 h-32 flex items-end gap-1 overflow-hidden relative"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="absolute top-2 right-3 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-secondary)" }}
              >
                7D Trend
              </div>
              {chartData.length >= 2 ? (
                chartData.map((price, idx) => {
                  const maxP = Math.max(...chartData);
                  const minP = Math.min(...chartData);
                  const range = maxP - minP || 1;
                  const h = ((price - minP) / range) * 80 + 10;
                  return (
                    <div
                      key={idx}
                      className="flex-1 rounded-t-md transition-all duration-500"
                      style={{
                        height: `${h}%`,
                        background: `linear-gradient(to top, var(--accent-soft), var(--accent))`,
                      }}
                    />
                  );
                })
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px]" style={{ color: "var(--text-muted)" }}>
                  No history yet
                </div>
              )}
            </div>

            {/* Trade Terminal */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border)",
              }}
            >
              <h3
                className="font-bold text-sm mb-4 tracking-wider text-center uppercase"
                style={{ color: "var(--text-secondary)" }}
              >
                Trade
              </h3>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setTradeMode("BUY")}
                  className="flex-1 py-2.5 font-bold text-sm rounded-xl transition-all"
                  style={{
                    background: tradeMode === "BUY" ? "var(--green)" : "var(--bg-card)",
                    color: tradeMode === "BUY" ? "#fff" : "var(--green)",
                    border: `1px solid ${tradeMode === "BUY" ? "var(--green)" : "var(--border)"}`,
                    boxShadow: tradeMode === "BUY" ? "0 4px 15px rgba(45,212,160,0.3)" : "none",
                  }}
                >
                  BUY
                </button>
                <button
                  onClick={() => setTradeMode("SELL")}
                  className="flex-1 py-2.5 font-bold text-sm rounded-xl transition-all"
                  style={{
                    background: tradeMode === "SELL" ? "var(--red)" : "var(--bg-card)",
                    color: tradeMode === "SELL" ? "#fff" : "var(--red)",
                    border: `1px solid ${tradeMode === "SELL" ? "var(--red)" : "var(--border)"}`,
                    boxShadow: tradeMode === "SELL" ? "0 4px 15px rgba(255,77,106,0.3)" : "none",
                  }}
                >
                  SELL
                </button>
              </div>

              {tradeMode && (
                <div className="animate-fade-in">
                  <div className="mb-4">
                    <label
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Shares
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={tradeShares}
                      onChange={(e) => setTradeShares(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full text-center text-xl font-bold py-2 mt-1 focus:outline-none rounded-xl"
                      style={{
                        background: "var(--bg-card)",
                        color: "var(--text)",
                        border: "1px solid var(--border)",
                      }}
                    />
                  </div>

                  <div className="flex justify-between items-center mb-5">
                    <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Net Cost:
                    </span>
                    <span className="font-bold text-lg" style={{ color: "var(--text)" }}>
                      {(tradeShares * selectedUser.currentPrice).toFixed(2)} Au
                    </span>
                  </div>

                  <button
                    onClick={executeTrade}
                    disabled={
                      tradeMode === "BUY" &&
                      tradeShares * selectedUser.currentPrice > (authUser?.auraCoins || 0)
                    }
                    className="btn-primary w-full py-4 text-sm tracking-wider disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Confirm {tradeMode}
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => (window.location.href = `/profile/${selectedUser.id}`)}
              className="btn-secondary mt-4 w-full py-3 text-sm tracking-wider"
            >
              Visit Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
