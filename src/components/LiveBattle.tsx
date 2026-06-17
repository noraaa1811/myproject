import React from 'react';
import { Shield, Sword, Heart, Activity, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { BattleAnalysis, PokemonState } from '../battle-core/types';

interface LiveBattleProps {
  analysis: BattleAnalysis | null;
  playerActive: PokemonState | null;
  opponentActive: PokemonState | null;
  onSimulateTurn: () => void;
  onReset: () => void;
}

export const LiveBattle: React.FC<LiveBattleProps> = ({
  analysis,
  playerActive,
  opponentActive,
  onSimulateTurn,
  onReset
}) => {
  // Helper to color HP bars based on percentage
  const getHpColor = (pct: number) => {
    if (pct > 50) return 'bg-emerald-500';
    if (pct > 20) return 'bg-amber-500';
    return 'bg-rose-600';
  };

  // Helper to get text color of HP
  const getHpTextColor = (pct: number) => {
    if (pct > 50) return 'text-emerald-400';
    if (pct > 20) return 'text-amber-400';
    return 'text-rose-500';
  };

  const winProb = analysis ? Math.round(analysis.winProbability * 100) : 50;

  return (
    <div className="space-y-6">
      {/* Top Controller Panel */}
      <div className="bg-[#0f111a] border border-slate-800 rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-sm font-bold tracking-wider text-slate-300 font-mono">LIVE FEED ACTIVE</span>
          {analysis && (
            <span className="text-xs text-slate-500 font-mono bg-slate-900 border border-slate-800 px-2.5 py-1 rounded">
              TURN {analysis.turn}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSimulateTurn}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-wider uppercase px-4 py-2 rounded-lg transition duration-150 cursor-pointer shadow-lg shadow-emerald-950/20"
          >
            <RefreshCw className="w-4 h-4 animate-spin-slow" /> Simulate Turn Action
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 font-bold text-xs tracking-wider uppercase px-4 py-2 rounded-lg transition duration-150 cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Main Grid: Active Pokemon & Win Probability Dial */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Active Player Pokemon Card (Llg-cols-4) */}
        <div className="lg:col-span-4 bg-[#0f111a] border border-slate-800 rounded-xl p-5 glow-green esports-border-green flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                <Shield className="w-4 h-4" /> ACTIVE ALLY
              </span>
              <span className="text-xs text-slate-500 font-mono">PLAYER SIDE</span>
            </div>

            {playerActive ? (
              <div className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <h3 className="text-2xl font-black text-slate-100 tracking-wide">{playerActive.species}</h3>
                  <span className="text-xs font-mono text-slate-400">Lvl {playerActive.level}</span>
                </div>

                <div className="flex gap-1.5">
                  {playerActive.types.map(t => (
                    <span key={t} className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded text-white bg-slate-800">
                      {t}
                    </span>
                  ))}
                </div>

                {/* HP Tracker */}
                <div className="space-y-1.5 mt-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400 flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> HP</span>
                    <span className={`font-bold ${getHpTextColor(playerActive.currentHp)}`}>{playerActive.currentHp}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-3.5 border border-slate-800 p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getHpColor(playerActive.currentHp)}`}
                      style={{ width: `${playerActive.currentHp}%` }}
                    ></div>
                  </div>
                </div>

                {/* Move Registry list */}
                <div className="bg-[#161925] border border-slate-800 rounded-lg p-3.5 mt-4">
                  <div className="text-[10px] text-slate-500 font-bold tracking-wider font-mono mb-2 uppercase">REVEALED MOVES</div>
                  <div className="grid grid-cols-2 gap-2">
                    {playerActive.moves.map(m => (
                      <span key={m} className="bg-slate-900/60 border border-slate-800 text-xs py-1.5 px-2 rounded font-medium text-slate-300 text-center">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">No active Pokemon.</div>
            )}
          </div>

          {playerActive && (
            <div className="mt-6 border-t border-slate-800 pt-3 flex gap-4 text-xs font-mono text-slate-400">
              <div>Ability: <span className="text-slate-200">{playerActive.ability || 'Huge Power'}</span></div>
              <div>Item: <span className="text-slate-200">{playerActive.item || 'Sitrus Berry'}</span></div>
            </div>
          )}
        </div>

        {/* Win Rate % Esports Center Ring (lg:col-span-4) */}
        <div className="lg:col-span-4 bg-[#0f111a] border border-slate-800 rounded-xl p-5 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
          {/* Cyber Ring Background design */}
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-4 border-dashed border-fuchsia-500 rounded-full animate-spin-slow"></div>
          </div>

          <div className="text-xs font-bold tracking-widest text-slate-500 font-mono mb-4 uppercase flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-fuchsia-400" /> WIN PROBABILITY
          </div>

          {/* Glowing Radial Meter */}
          <div className="relative w-44 h-44 flex items-center justify-center">
            {/* SVG circle meter */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="88"
                cy="88"
                r="74"
                className="stroke-slate-900 fill-none"
                strokeWidth="10"
              />
              <circle
                cx="88"
                cy="88"
                r="74"
                className="stroke-fuchsia-500 fill-none transition-all duration-700"
                strokeWidth="10"
                strokeDasharray={465}
                strokeDashoffset={465 - (465 * winProb) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute text-center">
              <div className="text-5xl font-black text-white tracking-tighter font-mono">{winProb}%</div>
              <div className="text-[10px] text-fuchsia-400 font-bold uppercase tracking-wider mt-0.5">ADVANTAGE</div>
            </div>
          </div>

          <div className="text-xs text-slate-400 text-center font-mono mt-4 leading-relaxed bg-[#161925] border border-slate-800 px-3 py-1.5 rounded-lg w-full max-w-[240px]">
            {winProb > 50 ? (
              <span className="text-emerald-400 font-bold">FAVORABLE ALLY OUTCOME</span>
            ) : winProb < 50 ? (
              <span className="text-rose-500 font-bold">OPPONENT ADVANTAGE</span>
            ) : (
              <span className="text-slate-400 font-bold">EVEN MATCHUP STATE</span>
            )}
          </div>
        </div>

        {/* Active Opponent Pokemon Card (lg:col-span-4) */}
        <div className="lg:col-span-4 bg-[#0f111a] border border-slate-800 rounded-xl p-5 glow-red esports-border-red flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-xs font-bold text-rose-400 font-mono flex items-center gap-1.5">
                <Sword className="w-4 h-4" /> OPPONENT TARGET
              </span>
              <span className="text-xs text-slate-500 font-mono">OPPONENT SIDE</span>
            </div>

            {opponentActive ? (
              <div className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <h3 className="text-2xl font-black text-slate-100 tracking-wide">{opponentActive.species}</h3>
                  <span className="text-xs font-mono text-slate-400">Lvl {opponentActive.level}</span>
                </div>

                <div className="flex gap-1.5">
                  {opponentActive.types.map(t => (
                    <span key={t} className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded text-white bg-slate-800">
                      {t}
                    </span>
                  ))}
                </div>

                {/* HP Tracker */}
                <div className="space-y-1.5 mt-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400 flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> HP</span>
                    <span className={`font-bold ${getHpTextColor(opponentActive.currentHp)}`}>{opponentActive.currentHp}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-3.5 border border-slate-800 p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getHpColor(opponentActive.currentHp)}`}
                      style={{ width: `${opponentActive.currentHp}%` }}
                    ></div>
                  </div>
                </div>

                {/* Predicted Opponent Moveset Panel */}
                <div className="bg-[#161925] border border-slate-800 rounded-lg p-3.5 mt-4">
                  <div className="text-[10px] text-slate-500 font-bold tracking-wider font-mono mb-2 uppercase">PREDICTED MOVESET & META BUILDS</div>
                  <div className="space-y-1.5 font-mono text-xs">
                    {analysis?.opponentPredictions
                      .find(p => p.species === opponentActive.species)
                      ?.predictedBuilds.slice(0, 2)
                      .map((build, i) => (
                        <div key={i} className="bg-slate-900/40 border border-slate-800 rounded p-2 text-slate-300">
                          <div className="flex justify-between text-[10px] text-fuchsia-400 font-bold pb-1 border-b border-slate-800/50 mb-1">
                            <span>{build.setName}</span>
                            <span>{Math.round(build.probability * 100)}% Usage</span>
                          </div>
                          <div className="flex flex-wrap gap-1 text-[9px] text-slate-400">
                            {build.moves.map(m => (
                              <span key={m} className="bg-slate-950 px-1 rounded">{m}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">No active opponent.</div>
            )}
          </div>

          {opponentActive && (
            <div className="mt-6 border-t border-slate-800 pt-3 flex gap-4 text-xs font-mono text-slate-400">
              <div>Est. Ability: <span className="text-slate-200">{opponentActive.ability || 'Multiscale'}</span></div>
              <div>Est. Item: <span className="text-slate-200">{opponentActive.item || 'Heavy-Duty Boots'}</span></div>
            </div>
          )}
        </div>

      </div>

      {/* Bottom Grid: Tactical Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Recommended Action Card (lg:col-span-8) */}
        <div className="lg:col-span-8 bg-[#0f111a] border border-slate-800 rounded-xl p-5 glow-purple esports-border-purple flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-xs font-bold text-fuchsia-400 font-mono flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> TACTICAL REACTION RECOMMENDATION
              </span>
              {analysis?.recommendedActions.moves[0] && (
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900 px-2 py-0.5 rounded">
                  CONFIDENCE: {Math.round(analysis.recommendedActions.moves[0].confidence * 100)}%
                </span>
              )}
            </div>

            {analysis?.recommendedActions.moves[0] ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4 items-baseline justify-between">
                  <div>
                    <span className="text-slate-500 text-[10px] font-mono uppercase block mb-1">CHAMPION RECOMMENDATION</span>
                    <span className="text-3xl font-black text-fuchsia-400 tracking-wide uppercase">
                      {analysis.recommendedActions.moves[0].moveName}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[10px] font-mono uppercase block mb-1">EXPECTED VALUE IMPACT</span>
                    <span className="text-lg font-bold text-emerald-400 font-mono">
                      +{Math.round(analysis.recommendedActions.moves[0].winRateImpact * 100)}% Win Prob
                    </span>
                  </div>
                </div>

                <div className="bg-[#161925] border border-slate-800 rounded-lg p-4">
                  <span className="text-[10px] text-slate-500 font-bold font-mono uppercase block mb-1.5">DECISION TREE RATIONALE</span>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {analysis.recommendedActions.moves[0].rationale}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500">Initialize turn to fetch action matrices.</div>
            )}
          </div>

          <div className="mt-6 border-t border-slate-800 pt-3 text-[10px] text-slate-500 leading-relaxed font-mono">
            * Minimax calculation projects player and opponent moves simultaneously. Softmax modeling weights the opponent's moveset options to find the play that maximizes state expected value.
          </div>
        </div>

        {/* Switches Panel (lg:col-span-4) */}
        <div className="lg:col-span-4 bg-[#0f111a] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-xs font-bold text-slate-400 font-mono flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4" /> SWITCH STRATEGIES
              </span>
              <span className="text-xs text-slate-500 font-mono">2ND OPTION</span>
            </div>

            <div className="space-y-3">
              {analysis?.recommendedActions.switches && analysis.recommendedActions.switches.length > 0 ? (
                analysis.recommendedActions.switches.map((sw, i) => (
                  <div key={i} className="bg-[#161925] border border-slate-800 hover:border-slate-700 rounded-lg p-3 transition duration-150 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-200 text-sm">{sw.species}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-1">
                        Exp Damage: <span className="text-rose-400 font-bold">{sw.expectedDamageTakenPercent}%</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-bold font-mono ${sw.winRateImpact > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {sw.winRateImpact > 0 ? `+${Math.round(sw.winRateImpact * 100)}%` : `${Math.round(sw.winRateImpact * 100)}%`}
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono mt-0.5">Win Change</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-600 text-xs">No beneficial switches. Staying active is strongly advised.</div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-800 pt-3 mt-4 flex items-start gap-2 text-[10px] text-slate-500 font-mono leading-tight">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Switch options detail the expected damage incoming on the swap-in turn.</span>
          </div>
        </div>

      </div>
    </div>
  );
};
