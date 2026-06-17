import React from 'react';
import { Sword, Zap, Shield, HelpCircle } from 'lucide-react';
import { PokemonState } from '../battle-core/types';

interface TeamPreviewProps {
  playerTeam: PokemonState[];
  opponentTeam: PokemonState[];
  recommendation: {
    lead: { species: string; matchupScore: number; rationale: string };
    recommendedTeam3: string[];
    threats: { species: string; threatScore: number; reason: string }[];
  } | null;
}

export const TeamPreview: React.FC<TeamPreviewProps> = ({ playerTeam, opponentTeam, recommendation }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Player Team Card */}
      <div className="bg-[#0f111a] border border-slate-800 rounded-xl p-5 glow-green esports-border-green">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
          <h2 className="text-lg font-bold text-emerald-400 tracking-wider flex items-center gap-2">
            <Shield className="w-5 h-5" /> MY ROSTER
          </h2>
          <span className="text-xs text-slate-500 font-mono">6 POKEMON</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {playerTeam.map((poke) => (
            <div key={poke.species} className="bg-[#161925] border border-slate-800 hover:border-emerald-500/50 rounded-lg p-3 transition duration-200">
              <div className="flex justify-between items-start">
                <span className="font-bold text-slate-200">{poke.species}</span>
                <span className="text-xs text-slate-400 font-mono">Lvl {poke.level}</span>
              </div>
              <div className="flex gap-1.5 mt-2">
                {poke.types.map(t => (
                  <span key={t} className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full text-white bg-slate-700`}>
                    {t}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-400 mt-3 border-t border-slate-800 pt-2 font-mono">
                <div>HP: {poke.baseStats.hp}</div>
                <div>ATK: {poke.baseStats.atk}</div>
                <div>SPE: {poke.baseStats.spe}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Opponent Team Card */}
      <div className="bg-[#0f111a] border border-slate-800 rounded-xl p-5 glow-red esports-border-red">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
          <h2 className="text-lg font-bold text-rose-400 tracking-wider flex items-center gap-2">
            <Sword className="w-5 h-5" /> OPPONENT TEAM
          </h2>
          <span className="text-xs text-slate-500 font-mono">6 POKEMON</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {opponentTeam.map((poke) => (
            <div key={poke.species} className="bg-[#161925] border border-slate-800 hover:border-rose-500/50 rounded-lg p-3 transition duration-200">
              <div className="flex justify-between items-start">
                <span className="font-bold text-slate-200">{poke.species}</span>
                <span className="text-xs text-slate-400 font-mono">Lvl {poke.level}</span>
              </div>
              <div className="flex gap-1.5 mt-2">
                {poke.types.map(t => (
                  <span key={t} className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full text-white bg-slate-700`}>
                    {t}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-400 mt-3 border-t border-slate-800 pt-2 font-mono">
                <div>HP: {poke.baseStats.hp}</div>
                <div>ATK: {poke.baseStats.atk}</div>
                <div>SPE: {poke.baseStats.spe}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tactical Lead Recommendation Card */}
      <div className="bg-[#0f111a] border border-slate-800 rounded-xl p-5 glow-purple esports-border-purple flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
            <h2 className="text-lg font-bold text-fuchsia-400 tracking-wider flex items-center gap-2">
              <Zap className="w-5 h-5" /> MATCHUP PLAN
            </h2>
            <span className="text-[10px] bg-fuchsia-500/20 text-fuchsia-300 font-bold px-2 py-0.5 rounded font-mono">MINIMAX LEAD</span>
          </div>

          {recommendation ? (
            <div className="space-y-4">
              {/* Lead Recomendation */}
              <div className="bg-slate-900/60 border border-fuchsia-500/30 rounded-lg p-4">
                <div className="text-slate-400 text-xs font-mono mb-1">RECOMMENDED LEAD</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-fuchsia-400 tracking-wide">{recommendation.lead.species}</span>
                  <span className="text-xs font-mono text-emerald-400">Matchup: {recommendation.lead.matchupScore > 0 ? `+${recommendation.lead.matchupScore}` : recommendation.lead.matchupScore}</span>
                </div>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {recommendation.lead.rationale}
                </p>
              </div>

              {/* Bring 3 */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-4">
                <div className="text-slate-400 text-xs font-mono mb-2">RECOMMENDED BRING-3 TEAM</div>
                <div className="flex gap-2">
                  {recommendation.recommendedTeam3.map((species) => (
                    <span key={species} className="flex-1 text-center bg-[#161925] border border-slate-800 rounded py-1.5 text-xs font-bold text-slate-200">
                      {species}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-500 text-sm flex flex-col items-center gap-2">
              <HelpCircle className="w-8 h-8 opacity-40" />
              <span>Initialize teams to calculate leads.</span>
            </div>
          )}
        </div>

        <div className="border-t border-slate-800 pt-4 mt-4 text-[10px] text-slate-500 leading-relaxed font-mono">
          * Lead calculation runs exhaustive combinatorial checks mapping every member of the 6-man roster against the opponent's options to find optimal coverage.
        </div>
      </div>
    </div>
  );
};
