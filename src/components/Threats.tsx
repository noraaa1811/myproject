import React, { useState } from 'react';
import { Eye, HelpCircle, ShieldAlert, Award } from 'lucide-react';
import { PokemonState } from '../battle-core/types';

interface ThreatsProps {
  playerTeam: PokemonState[];
  opponentTeam: PokemonState[];
  threatsList: { species: string; threatScore: number; reason: string }[];
  matchupMatrix: Record<string, Record<string, number>>; // player -> opponent -> score
}

export const Threats: React.FC<ThreatsProps> = ({
  playerTeam,
  opponentTeam,
  threatsList,
  matchupMatrix
}) => {
  const [selectedCell, setSelectedCell] = useState<{ p: string; o: string } | null>(null);

  // Helper to color matrix cells based on score
  const getCellColor = (score: number) => {
    if (score > 15) return 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300';
    if (score < -15) return 'bg-rose-950/80 border-rose-500/30 text-rose-300';
    return 'bg-slate-900/60 border-slate-800 text-slate-400';
  };

  const getScoreLabel = (score: number) => {
    if (score > 15) return 'Advantage';
    if (score < -15) return 'Disadvantage';
    return 'Neutral';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Interactive Matchup Heatmap Grid (lg:col-span-8) */}
      <div className="lg:col-span-8 bg-[#0f111a] border border-slate-800 rounded-xl p-5 glow-purple esports-border-purple">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <h2 className="text-lg font-bold text-fuchsia-400 tracking-wider flex items-center gap-2">
            <Eye className="w-5 h-5" /> MATCHUP HEATMAP MATRIX
          </h2>
          <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 font-bold px-2 py-0.5 rounded font-mono">
            6 vs 6 COMBINATIONS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="p-3 text-slate-500 font-bold uppercase tracking-wider">Ally \ Target</th>
                {opponentTeam.map(o => (
                  <th key={o.species} className="p-3 text-rose-400 font-bold text-center uppercase tracking-wider">
                    {o.species.substring(0, 5)}..
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {playerTeam.map(p => (
                <tr key={p.species} className="border-b border-slate-900 hover:bg-slate-900/20">
                  <td className="p-3 text-emerald-400 font-bold uppercase">{p.species}</td>
                  {opponentTeam.map(o => {
                    const score = matchupMatrix[p.species]?.[o.species] ?? 0;
                    const isSelected = selectedCell?.p === p.species && selectedCell?.o === o.species;
                    
                    return (
                      <td
                        key={o.species}
                        onClick={() => setSelectedCell({ p: p.species, o: o.species })}
                        className={`p-3 text-center font-bold border transition cursor-pointer ${getCellColor(score)} ${isSelected ? 'ring-2 ring-fuchsia-500' : ''}`}
                      >
                        {score > 0 ? `+${score}` : score}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Dynamic Matchup Info Card (shown on click) */}
        <div className="mt-5 bg-slate-900/40 border border-slate-800 rounded-lg p-4 min-h-[85px] flex items-center justify-between">
          {selectedCell ? (
            <div className="w-full flex justify-between items-center">
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">SELECTED MATCHUP</div>
                <div className="text-sm font-bold text-slate-200">
                  <span className="text-emerald-400">{selectedCell.p}</span> vs <span className="text-rose-400">{selectedCell.o}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-2 font-mono">
                  Type Alignment: {selectedCell.p} is strong against Dragon/Steel setups.
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">EST. ADVANTAGE</div>
                <div className={`text-lg font-black font-mono ${matchupMatrix[selectedCell.p]?.[selectedCell.o] > 15 ? 'text-emerald-400' : matchupMatrix[selectedCell.p]?.[selectedCell.o] < -15 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {getScoreLabel(matchupMatrix[selectedCell.p]?.[selectedCell.o] ?? 0)}
                </div>
                <div className="text-[9px] text-slate-500 mt-1">
                  Matrix Score: {matchupMatrix[selectedCell.p]?.[selectedCell.o]}
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full text-center py-2 text-slate-500 text-xs flex items-center justify-center gap-1.5 font-mono">
              <HelpCircle className="w-4 h-4 opacity-50" />
              <span>Click a grid cell to see details of typing coverage.</span>
            </div>
          )}
        </div>
      </div>

      {/* Key Threats Leaderboard (lg:col-span-4) */}
      <div className="lg:col-span-4 bg-[#0f111a] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <h2 className="text-lg font-bold text-rose-400 tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> THREAT SPECTRUM
            </h2>
            <span className="text-xs text-slate-500 font-mono">RANKINGS</span>
          </div>

          <div className="space-y-4">
            {threatsList.map((threat, i) => (
              <div key={threat.species} className="bg-[#161925] border border-slate-800 rounded-lg p-3.5 relative overflow-hidden">
                {/* Visual threat meter background bar */}
                <div
                  className="absolute bottom-0 left-0 h-1 bg-rose-500 transition-all duration-500 opacity-60"
                  style={{ width: `${threat.threatScore * 10}%` }}
                ></div>

                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500 font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      #{i + 1}
                    </span>
                    {threat.species}
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black font-mono text-rose-400">SCORE {threat.threatScore}/10</div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {threat.reason}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-slate-800 pt-3 flex items-center gap-2 text-[10px] text-slate-500 font-mono leading-snug">
          <Award className="w-4 h-4 text-fuchsia-400 shrink-0" />
          <span>Threat levels are calculated recursively based on their active capability to sweep your team members.</span>
        </div>
      </div>

    </div>
  );
};
