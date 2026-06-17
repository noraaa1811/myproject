import React, { useState, useEffect } from 'react';
import { Shield, Target, Activity, Move } from 'lucide-react';

interface OverlayData {
  myPokemon: string;
  enemyPokemon: string;
  bestMove: string;
  confidence: number;
  winRate: number;
  turn: number;
}

export const Overlay: React.FC = () => {
  const [data, setData] = useState<OverlayData>({
    myPokemon: 'Azumarill',
    enemyPokemon: 'Dragonite',
    bestMove: 'Play Rough',
    confidence: 91,
    winRate: 81,
    turn: 4
  });

  const [connected, setConnected] = useState(false);

  // Connect to the local CV Python client WebSocket for real-time updates
  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      socket = new WebSocket('ws://localhost:4000/ai');

      socket.onopen = () => {
        setConnected(true);
        console.log('[HUD Overlay] Connected to CV Engine stream.');
      };

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          // If update frame packet comes in
          if (parsed.type === 'FRAME_UPDATE' && parsed.payload) {
            const payload = parsed.payload;
            setData({
              myPokemon: payload.myPokemon || 'Azumarill',
              enemyPokemon: payload.enemyPokemon || 'Dragonite',
              bestMove: payload.revealedMoves?.[0] || 'Play Rough',
              confidence: payload.myHP || 91, // map HP/heuristic stats for test visual update
              winRate: payload.enemyHP ? 100 - payload.enemyHP + 50 : 81,
              turn: payload.turn || 4
            });
          }
        } catch (e) {
          console.error('[HUD Overlay] Error parsing WebSocket frame:', e);
        }
      };

      socket.onclose = () => {
        setConnected(false);
        console.log('[HUD Overlay] Connection closed. Retrying...');
        reconnectTimeout = setTimeout(connect, 3000);
      };

      socket.onerror = (err) => {
        console.error('[HUD Overlay] WebSocket error:', err);
      };
    };

    connect();

    return () => {
      if (socket) socket.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  // Electron click-through IPC handling
  const setIgnoreMouse = (ignore: boolean) => {
    // Check if running in Electron renderer process
    if (window && (window as any).process && (window as any).process.type === 'renderer') {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        ipcRenderer.send('set-ignore-mouse-events', ignore, ignore ? { forward: true } : undefined);
      } catch (e) {
        console.warn('[Overlay] IPC communication failed:', e);
      }
    }
  };

  return (
    <div 
      className="w-[300px] h-[160px] bg-[#0c0d12]/90 backdrop-blur-md rounded-xl border-l-4 border-fuchsia-500 esports-border-purple p-3 select-none flex flex-col justify-between overflow-hidden shadow-2xl relative"
      onMouseEnter={() => setIgnoreMouse(false)}  // Interactive when hover over panel
      onMouseLeave={() => setIgnoreMouse(true)}   // Click-through when mouse leaves
    >
      {/* Header dragging handle styling */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 drag-area">
        <span className="text-[9px] font-black text-fuchsia-400 font-mono tracking-widest flex items-center gap-1.5">
          <Shield className="w-3 h-3 text-fuchsia-400" /> AI COACH HUD
        </span>
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
          <span className="text-[8px] text-slate-500 font-mono font-bold">T{data.turn}</span>
          <Move className="w-3.5 h-3.5 text-slate-600 opacity-60 cursor-move" title="Drag overlay window" />
        </div>
      </div>

      {/* Main Grid: Recommended Move and Metrics */}
      <div className="grid grid-cols-2 gap-2 my-1.5">
        
        {/* Recommended Move Card */}
        <div className="bg-[#12141c]/80 border border-slate-800/80 rounded-lg p-2 flex flex-col justify-between">
          <div>
            <span className="text-slate-500 text-[8px] font-mono tracking-wider block">BEST MOVE</span>
            <span className="text-sm font-black text-slate-100 uppercase tracking-wide truncate block mt-0.5">
              {data.bestMove}
            </span>
          </div>
          <div className="text-[8px] text-slate-400 font-mono mt-1 truncate">
            {data.myPokemon} vs {data.enemyPokemon}
          </div>
        </div>

        {/* Metrics Card */}
        <div className="bg-[#12141c]/80 border border-slate-800/80 rounded-lg p-2 flex flex-col justify-around">
          {/* Confidence */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[8px] font-mono flex items-center gap-0.5">
              <Target className="w-2.5 h-2.5" /> CONF
            </span>
            <span className="font-extrabold text-fuchsia-400 font-mono text-[11px]">
              {data.confidence}%
            </span>
          </div>
          
          {/* Win Rate */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[8px] font-mono flex items-center gap-0.5">
              <Activity className="w-2.5 h-2.5" /> WIN RATE
            </span>
            <span className="font-extrabold text-emerald-400 font-mono text-[11px]">
              {data.winRate}%
            </span>
          </div>
        </div>

      </div>

      {/* HUD footer message */}
      <div className="text-[7.5px] text-slate-600 font-mono text-center pt-1 border-t border-slate-900 leading-none">
        OVERLAY MODE ACTIVE • MOUSE CLICK-THROUGH
      </div>
    </div>
  );
};
