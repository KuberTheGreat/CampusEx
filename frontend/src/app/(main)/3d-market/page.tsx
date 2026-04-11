"use client";

import { useEffect, useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Instances, Instance, Text, OrbitControls, Sparkles, SpotLight } from "@react-three/drei";
import { useAuth } from "@/context/AuthContext";

// Math Algorithm for placing items in radial rings outwards
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
  const radius = ring * 1.3; 
  
  return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
}

function MarketScene({ users, maxPrice, onSelect, hoveredId, setHoveredId }: any) {
  const MAX_HEIGHT = 8; // Native hard ceiling

  return (
    <>
      <OrbitControls 
        minPolarAngle={Math.PI / 2.5} 
        maxPolarAngle={Math.PI / 2.5} 
        enableZoom={false} 
        minDistance={2} maxDistance={100} 
      />
      
      {/* Restored uncolored wireframe base grids */}
      <gridHelper args={[150, 150, "#333333", "#1a1a1a"]} position={[0, -0.01, 0]} />
      <gridHelper args={[30, 30, "#444444", "#222222"]} position={[0, 0, 0]} />

      {/* Atmospheric Lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 20, 0]} intensity={2} color="#00ffff" distance={100} />
      <directionalLight position={[10, 10, 5]} intensity={1} color="#00aaaa" />

      {/* Center ambient energy */}
      <Sparkles count={100} scale={5} size={3} speed={0.4} color="#00ffff" />

      {/* LAYER 1: Core Solid Black Bodies */}
      <Instances limit={1000} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#020813" metalness={0.9} roughness={0.1} />
        
        {users.map((user: any, i: number) => {
          const [x, y, z] = getRadialPosition(i);
          const height = Math.max(0.5, ((user.currentPrice || 1) / maxPrice) * MAX_HEIGHT);
          const isHovered = hoveredId === user.id;

          return (
            <group key={user.id} position={[x, height / 2, z]}>
              <Instance
                scale={isHovered ? [1.1, height, 1.1] : [1, height, 1]}
                onClick={(e) => { e.stopPropagation(); onSelect(user); }}
                onPointerOver={(e) => { e.stopPropagation(); setHoveredId(user.id); document.body.style.cursor = 'pointer'; }}
                onPointerOut={(e) => { e.stopPropagation(); setHoveredId(null); document.body.style.cursor = 'auto'; }}
              />
            </group>
          );
        })}
      </Instances>

      {/* LAYER 2: Wireframe Neon Edges Overlaying the Bodies */}
      <Instances limit={1000}>
        <boxGeometry args={[1.001, 1.001, 1.001]} />
        <meshBasicMaterial wireframe={true} transparent opacity={0.6} />
        
        {users.map((user: any, i: number) => {
          const [x, y, z] = getRadialPosition(i);
          const height = Math.max(0.5, ((user.currentPrice || 1) / maxPrice) * MAX_HEIGHT);
          const isHovered = hoveredId === user.id;

          return (
            <group key={`wire_${user.id}`} position={[x, height / 2, z]} pointerEvents="none">
              <Instance
                scale={isHovered ? [1.1, height, 1.1] : [1, height, 1]}
                color={isHovered ? "#00ffff" : "#005555"}
              />
              <Text 
                position={[0, height / 2 + 0.8, 0]} 
                fontSize={isHovered ? 0.6 : 0.4} 
                color={isHovered ? "#ffffff" : "#00ffff"} 
                anchorX="center" 
                anchorY="middle"
                outlineWidth={0.03}
                outlineColor="#000"
                material-toneMapped={false}
              >
                {user.stockSymbol || 'UKN'}
              </Text>
            </group>
          );
        })}
      </Instances>
    </>
  );
}

export default function ThreeMarket() {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // Trade States
  const [tradeShares, setTradeShares] = useState(1);
  const [tradeMode, setTradeMode] = useState<"BUY"|"SELL"|null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/admin/users");
      const data = await res.json();
      if (res.ok && data.users) {
        // Sort effectively to make the tallest building exact center
        const sorted = data.users.sort((a: any, b: any) => b.currentPrice - a.currentPrice);
        setUsers(sorted);
      }
    } catch(err) {
      console.error("Failed to fetch market data", err);
    }
  };

  const executeTrade = async () => {
    if (!authUser?.id || !selectedUser || !tradeMode) return;
    const totalCost = tradeShares * selectedUser.currentPrice;
    
    if (tradeMode === "BUY" && totalCost > (authUser.auraCoins || 0)) {
       return alert("Insufficient AURA balance!");
    }

    try {
      const res = await fetch("http://localhost:8080/api/market/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerId: authUser.id, targetUserId: selectedUser.id, shares: tradeShares, type: tradeMode })
      });
      if (res.ok) {
        alert(`Successfully executed ${tradeMode} of ${tradeShares} shares!`);
        window.location.reload(); 
      } else {
        const error = await res.json();
        alert(`Trade Failed: ${error.error}`);
      }
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full h-screen bg-[#020813] relative overflow-hidden flex">
      {/* The 3D Canvas Layer */}
      <div className="flex-1 h-screen relative cursor-crosshair">
        <Canvas shadows camera={{ position: [15, 20, 20], fov: 45 }}>
          <color attach="background" args={['#020813']} />
          <fog attach="fog" args={['#020813', 20, 100]} />
          <MarketScene 
            users={users} 
            maxPrice={Math.max(...users.map((u: any) => u.currentPrice || 1), 10)}
            onSelect={setSelectedUser} 
            hoveredId={hoveredId} 
            setHoveredId={setHoveredId} 
          />
        </Canvas>

        {/* Global UI Headers hovering over the absolute canvas */}
        <div className="absolute top-6 left-6 pointer-events-none">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#00ffff] to-[#00aaee] drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
            AESTHETIC TERMINAL
          </h1>
          <p className="text-[#00aaaa] font-mono tracking-widest text-sm mt-1">GLOBAL ASSET TOPOLOGY</p>
        </div>
      </div>

      {/* Right Drawer Panel (Slides in when user selected) */}
      <div className={`w-96 bg-[#040d1a] border-l border-[#00aaaa]/30 h-full p-6 transition-transform duration-500 transform overflow-y-auto ${selectedUser ? 'translate-x-0 shadow-[-10px_0_30px_rgba(0,170,170,0.1)]' : 'translate-x-full absolute right-0'}`}>
        {selectedUser && (
          <div className="relative font-mono">
            <button onClick={() => { setSelectedUser(null); setTradeMode(null); }} className="absolute -top-2 -right-2 text-[#00aaaa] hover:text-white p-2">✕</button>
            
            <div className="text-center mb-8 pt-4">
              <div className="w-20 h-20 bg-[#00aaaa]/10 rounded-full mx-auto flex items-center justify-center border-2 border-[#00aaaa] shadow-[0_0_20px_rgba(0,170,170,0.4)] mb-4">
                <span className="text-2xl font-bold text-[#00ffff]">{selectedUser.stockSymbol || 'UNK'}</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">{selectedUser.name}</h2>
              <p className="text-[#00aaaa] text-sm">{selectedUser.email}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-black/40 border border-[#00aaaa]/30 p-4 rounded-xl text-center">
                <div className="text-xs text-[#00aaaa]">LIVE VALUATION</div>
                <div className="text-xl font-bold text-[#00ffff] mt-1">{selectedUser.currentPrice?.toFixed(2)} Au</div>
              </div>
              <div className="bg-black/40 border border-[#00aaaa]/30 p-4 rounded-xl text-center">
                <div className="text-xs text-[#00aaaa]">CREDIBILITY</div>
                <div className="text-xl font-bold text-purple-400 mt-1">{selectedUser.credibilityScore}</div>
              </div>
            </div>

            {/* Dummy Mock Chart */}
            <div className="bg-black/40 border border-[#00aaaa]/30 p-4 rounded-xl mb-8 h-32 flex items-end gap-1 overflow-hidden relative">
              <div className="absolute top-2 right-2 text-[10px] text-[#00aaaa]">7D TREND</div>
              {[10, 14, 18, 12, 24, 28, 22].map((h, idx) => (
                <div key={idx} className="flex-1 bg-gradient-to-t from-[#00aaaa]/20 to-[#00ffff] rounded-t-sm" style={{ height: `${h * 3}px` }} />
              ))}
            </div>

            {/* Trade Terminal */}
            <div className="border border-[#00aaaa]/30 rounded-xl p-4 bg-black/40">
              <h3 className="text-[#00aaaa] font-bold text-sm mb-4 tracking-widest text-center">EXECUTE BLOCK</h3>
              
              <div className="flex gap-2 mb-4">
                <button onClick={() => setTradeMode("BUY")} className={`flex-1 py-2 font-bold text-sm transition ${tradeMode === 'BUY' ? 'bg-[#00ffff] text-black shadow-[0_0_10px_rgba(0,255,255,0.5)]' : 'bg-[#040d1a] text-[#00aaaa] border border-[#00aaaa]/50 hover:bg-[#00ffff]/10'}`}>BUY</button>
                <button onClick={() => setTradeMode("SELL")} className={`flex-1 py-2 font-bold text-sm transition ${tradeMode === 'SELL' ? 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-[#040d1a] text-red-500/50 border border-red-500/50 hover:bg-red-500/10'}`}>SELL</button>
              </div>

              {tradeMode && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <div className="mb-4">
                    <label className="text-[10px] text-[#00aaaa] tracking-widest">SHARES ALLOCATION</label>
                    <input type="number" min="1" value={tradeShares} onChange={(e) => setTradeShares(Math.max(1, parseInt(e.target.value) || 1))} className="w-full bg-black/50 border-b border-[#00aaaa] text-center text-xl font-bold py-2 mt-1 focus:outline-none text-white" />
                  </div>
                  
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-[#00aaaa] text-xs tracking-widest">NET COST:</span>
                    <span className="text-white font-bold">{(tradeShares * selectedUser.currentPrice).toFixed(2)} Au</span>
                  </div>

                  <button onClick={executeTrade} disabled={tradeMode === "BUY" && (tradeShares * selectedUser.currentPrice) > (authUser?.auraCoins || 0)} className="w-full py-4 bg-[#00aaaa]/20 hover:bg-[#00aaaa]/40 border border-[#00ffff] text-[#00ffff] font-bold tracking-widest transition disabled:opacity-30 disabled:cursor-not-allowed">
                    CONFIRM BLOCK {(tradeMode)}
                  </button>
                </div>
              )}
            </div>

            <button onClick={() => window.location.href = `/profile/${selectedUser.id}`} className="mt-4 w-full py-3 border border-purple-500/50 hover:bg-purple-500/10 text-purple-400 font-bold tracking-widest transition rounded-xl text-sm">
              VISIT PROFILE TERMINAL
            </button>

          </div>
        )}
      </div>
    </div>
  );
}
