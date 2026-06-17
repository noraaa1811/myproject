import React from 'react';
import { History as HistoryIcon, TrendingUp, Target, List } from 'lucide-react';

export interface HistoryRecord {
  turn: number;
  playerActive: string;
  opponentActive: string;
  playerHP: number;
  opponentHP: number;
  recommendedAction: string;
  winProbability: number;
  weather: string;
  timestamp: string;
}

interface HistoryProps {
  records: HistoryRecord[];
}

export const History: React.FC<HistoryProps> = ({ records }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Win Probability Progression Chart (lg:col-span-8) */}
      <div className="lg:col-span-8 bg-[#0f111a] border border-slate-800 rounded-xl p-5 glow-purple esports-border-purple">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <h2 className="text-lg font-bold text-fuchsia-400 tracking-wider flex items-center gap-2">
            <TrendingUp className="w-5 h-5" /> WIN PROBABILITY TREND
          </h2>
          <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 font-bold px-2 py-0.5 rounded font-mono">
            LIVE GRAPH
          </span>
        </div>

        {/* Graphical win rate bars mapping */}
        {records.length > 0 ? (
          <div className="space-y-6 py-4">
            <div className="flex items-end justify-between gap-2 h-48 border-b border-l border-slate-800/80 px-2 pb-1">
              {records.map((r, i) => {
                const pct = Math.round(r.winProbability * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-2 bg-[#161925] border border-slate-800 rounded px-2 py-1 text-[9px] font-mono text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                      <div>Turn {r.turn}: {pct}%</div>
                      <div className="text-[8px] text-slate-500">{r.playerActive} vs {r.opponentActive}</div>
                    </div>
                    {/* Bar fill */}
                    <div 
                      className="w-8 sm:w-12 bg-gradient-to-t from-fuchsia-600/30 to-fuchsia-400 rounded-t hover:from-fuchsia-500 hover:to-fuchsia-300 transition-all duration-300 relative"
                      style={{ height: `${pct}%` }}
                    >
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold text-fuchsia-300">
                        {pct}%
                      </span>
                    </div>
                    {/* X-axis labels */}
                    <span className="text-[10px] text-slate-500 font-mono mt-2 block">T{r.turn}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono px-2">
              <span>Start of Battle (Turn 1)</span>
              <span>Active State (Turn {records[records.length - 1]?.turn || 1})</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-slate-500 text-sm font-mono flex flex-col items-center gap-2">
            <HistoryIcon className="w-8 h-8 opacity-45" />
            <span>No turn logs recorded yet. Simulate turns to view progression charts.</span>
          </div>
        )}
      </div>

      {/* Accuracy Audits (lg:col-span-4) */}
      <div className="lg:col-span-4 bg-[#0f111a] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <h2 className="text-lg font-bold text-emerald-400 tracking-wider flex items-center gap-2">
              <Target className="w-5 h-5" /> PREDICTION LOGS
            </h2>
            <span className="text-xs text-slate-500 font-mono">CHRONOLOGY</span>
          </div>

          <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1">
            {records.length > 0 ? (
              records.map((r, i) => (
                <div key={i} className="bg-[#161925] border border-slate-800 rounded-lg p-3 text-xs font-mono">
                  <div className="flex justify-between pb-1.5 border-b border-slate-800/80 mb-2">
                    <span className="font-bold text-fuchsia-400">TURN {r.turn}</span>
                    <span className="text-slate-500">{r.timestamp}</span>
                  </div>
                  <div className="space-y-1 text-slate-300">
                    <div>Matchup: <span className="text-slate-100">{r.playerActive} vs {r.opponentActive}</span></div>
                    <div>Ally HP: <span className="text-emerald-400">{r.playerHP}%</span> | Opp HP: <span className="text-rose-400">{r.opponentHP}%</span></div>
                    <div className="text-[10px] text-slate-400 mt-2 border-t border-slate-800/50 pt-1">
                      Action Rec: <span className="text-fuchsia-300 font-bold">{r.recommendedAction}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 text-slate-600 text-xs font-mono flex flex-col items-center gap-2">
                <List className="w-6 h-6 opacity-45" />
                <span>No logged actions yet.</span>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-800 pt-3 mt-4 text-[10px] text-slate-500 font-mono leading-tight">
          * Each log entry captures the engine state snapshot at the timestamp the action recommendation was solved.
        </div>
      </div>

    </div>
  );
};
