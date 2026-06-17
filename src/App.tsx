import React, { useState, useEffect } from 'react';
import { Shield, Sword, Eye, History as HistoryIcon, Award, Activity } from 'lucide-react';

// Core engine imports
import { BattleAnalysisEngine } from './battle-core/engine';
import { ChampionBattleAI } from './battle-core/champion-ai';
import { BattleAnalysis, PokemonState } from './battle-core/types';

// Component imports
import { TeamPreview } from './components/TeamPreview';
import { LiveBattle } from './components/LiveBattle';
import { Threats } from './components/Threats';
import { History, HistoryRecord } from './components/History';
import { Overlay } from './components/Overlay';

export default function App() {
  if (window.location.search.includes('overlay=true')) {
    return <Overlay />;
  }

  const [activeTab, setActiveTab] = useState<'preview' | 'live' | 'threats' | 'history'>('live');
  const [engine, setEngine] = useState<BattleAnalysisEngine | null>(null);
  const [analysis, setAnalysis] = useState<BattleAnalysis | null>(null);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);

  // Simulation parameters
  const [playerTeam, setPlayerTeam] = useState<PokemonState[]>([]);
  const [opponentTeam, setOpponentTeam] = useState<PokemonState[]>([]);
  const [playerActive, setPlayerActive] = useState<PokemonState | null>(null);
  const [opponentActive, setOpponentActive] = useState<PokemonState | null>(null);

  // Initialize engine and rosters
  const initEngine = () => {
    const newEngine = new BattleAnalysisEngine('battle-esports-hud', 'gen9ou');

    // Seed Teams
    const playerSeed = [
      { species: 'Azumarill', level: 100, types: ['Water', 'Fairy'], baseStats: { hp: 100, atk: 50, def: 80, spa: 60, spd: 80, spe: 50 }, currentHp: 84, isActive: true, moves: ['Play Rough', 'Liquidation', 'Aqua Jet', 'Belly Drum'] },
      { species: 'Charizard', level: 100, types: ['Fire', 'Flying'], baseStats: { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 } },
      { species: 'Venusaur', level: 100, types: ['Grass', 'Poison'], baseStats: { hp: 80, atk: 82, def: 83, spa: 100, spd: 100, spe: 80 } },
      { species: 'Blastoise', level: 100, types: ['Water'], baseStats: { hp: 79, atk: 83, def: 100, spa: 85, spd: 105, spe: 78 } },
      { species: 'Dragonite', level: 100, types: ['Dragon', 'Flying'], baseStats: { hp: 91, atk: 134, def: 95, spa: 100, spd: 100, spe: 80 } },
      { species: 'Great Tusk', level: 100, types: ['Ground', 'Fighting'], baseStats: { hp: 90, atk: 131, def: 131, spa: 53, spd: 53, spe: 87 } }
    ];

    const opponentSeed = [
      { species: 'Dragonite', level: 100, types: ['Dragon', 'Flying'], baseStats: { hp: 91, atk: 134, def: 95, spa: 100, spd: 100, spe: 80 }, currentHp: 100, isActive: true },
      { species: 'Kingambit', level: 100, types: ['Dark', 'Steel'], baseStats: { hp: 100, atk: 135, def: 120, spa: 60, spd: 85, spe: 50 } },
      { species: 'Gyarados', level: 100, types: ['Water', 'Flying'], baseStats: { hp: 95, atk: 125, def: 79, spa: 60, spd: 100, spe: 81 } },
      { species: 'Gholdengo', level: 100, types: ['Steel', 'Ghost'], baseStats: { hp: 87, atk: 60, def: 95, spa: 133, spd: 91, spe: 84 } },
      { species: 'Iron Valiant', level: 100, types: ['Fairy', 'Fighting'], baseStats: { hp: 74, atk: 130, def: 90, spa: 120, spd: 60, spe: 116 } },
      { species: 'Cinderace', level: 100, types: ['Fire'], baseStats: { hp: 80, atk: 116, def: 75, spa: 65, spd: 75, spe: 119 } }
    ];

    newEngine.setTeam('player', playerSeed);
    newEngine.setTeam('opponent', opponentSeed);
    newEngine.setActivePokemon('player', 'Azumarill');
    newEngine.setActivePokemon('opponent', 'Dragonite');

    const analysisReport = newEngine.analyze();

    // Call our Champion solver to match initial action
    const aiSolution = ChampionBattleAI.solve({
      myPokemon: 'Azumarill',
      enemyPokemon: 'Dragonite',
      myHP: 84,
      enemyHP: 100,
      status: [],
      turn: 1
    });

    // Patch initial move prediction to use the high-fidelity Champion AI details
    analysisReport.recommendedActions.moves = [{
      moveName: aiSolution.recommendedAction,
      confidence: aiSolution.confidence / 100,
      winRateImpact: 0.41,
      rationale: aiSolution.reason
    }];

    setEngine(newEngine);
    setAnalysis(analysisReport);
    setPlayerTeam(newEngine.getState().player.team);
    setOpponentTeam(newEngine.getState().opponent.team);
    setPlayerActive(newEngine.getState().player.active);
    setOpponentActive(newEngine.getState().opponent.active);

    // Initial log
    setHistoryRecords([{
      turn: 1,
      playerActive: 'Azumarill',
      opponentActive: 'Dragonite',
      playerHP: 84,
      opponentHP: 100,
      recommendedAction: aiSolution.recommendedAction,
      winProbability: analysisReport.winProbability,
      weather: 'NONE',
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  useEffect(() => {
    initEngine();
  }, []);

  // Simulates a turn of combat to show interactive transitions
  const handleSimulateTurn = () => {
    if (!engine || !analysis) return;

    const currentTurn = analysis.turn;
    const nextTurn = currentTurn + 1;

    // Apply incremental updates depending on turn progress
    if (currentTurn === 1) {
      // Turn 1 resolves: Player plays Play Rough, Opponent does Dragon Dance (damage roll simulation)
      engine.setTurn(nextTurn);
      engine.updatePokemonStatus('opponent', 'Dragonite', 48); // Opponent takes damage
      engine.updatePokemonStatus('player', 'Azumarill', 72); // Player takes minor chip
      engine.revealMove('opponent', 'Dragonite', 'Dragon Dance');
    } else if (currentTurn === 2) {
      // Turn 2 resolves: Dragonite HP drops further, opponent swaps to Gyarados
      engine.setTurn(nextTurn);
      engine.setActivePokemon('opponent', 'Gyarados');
      engine.updatePokemonStatus('player', 'Azumarill', 60);
    } else if (currentTurn === 3) {
      // Turn 3 resolves: Weather Sunny is set, Gyarados takes damage
      engine.setTurn(nextTurn);
      engine.setWeather('SUN', 5);
      engine.updatePokemonStatus('opponent', 'Gyarados', 70);
    } else {
      // Default looping tick
      engine.setTurn(nextTurn);
      const randomDmg = Math.floor(Math.random() * 15) + 5;
      const currentOppActive = engine.getState().opponent.active;
      if (currentOppActive) {
        const nextOppHp = Math.max(0, currentOppActive.currentHp - randomDmg);
        engine.updatePokemonStatus('opponent', currentOppActive.species, nextOppHp);
      }
    }

    // Recalculate analysis
    const updatedAnalysis = engine.analyze();

    // Call Champion Solver dynamically
    const state = engine.getState();
    const pActive = state.player.active;
    const oActive = state.opponent.active;

    if (pActive && oActive) {
      const aiSolution = ChampionBattleAI.solve({
        myPokemon: pActive.species,
        enemyPokemon: oActive.species,
        myHP: pActive.currentHp,
        enemyHP: oActive.currentHp,
        status: pActive.status ? [pActive.status] : [],
        turn: nextTurn
      });

      // Override analysis recommendation with the champion minimax details
      updatedAnalysis.recommendedActions.moves = [{
        moveName: aiSolution.recommendedAction,
        confidence: aiSolution.confidence / 100,
        winRateImpact: updatedAnalysis.winProbability - analysis.winProbability + 0.15,
        rationale: aiSolution.reason
      }];
    }

    setAnalysis(updatedAnalysis);
    setPlayerTeam(state.player.team);
    setOpponentTeam(state.opponent.team);
    setPlayerActive(state.player.active);
    setOpponentActive(state.opponent.active);

    // Add turn log
    const lastRecMove = updatedAnalysis.recommendedActions.moves[0]?.moveName || 'Play Rough';
    setHistoryRecords(prev => [
      ...prev,
      {
        turn: nextTurn,
        playerActive: pActive?.species || 'Azumarill',
        opponentActive: oActive?.species || 'Dragonite',
        playerHP: pActive?.currentHp || 100,
        opponentHP: oActive?.currentHp || 100,
        recommendedAction: lastRecMove,
        winProbability: updatedAnalysis.winProbability,
        weather: state.weather,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  };

  const handleReset = () => {
    initEngine();
  };

  // Build 6x6 matchup grid matrix dynamically for Threat page
  const generateMatchupMatrix = () => {
    const matrix: Record<string, Record<string, number>> = {};
    playerTeam.forEach(p => {
      matrix[p.species] = {};
      opponentTeam.forEach(o => {
        // Calculate typing advantage
        let score = 0;
        // Check offensive strengths
        p.types.forEach(pType => {
          o.types.forEach(oType => {
            const eff = getTypeEffectiveness(pType, oType);
            if (eff > 1) score += 20;
            if (eff < 1) score -= 15;
          });
        });
        // Check defensive strengths
        o.types.forEach(oType => {
          p.types.forEach(pType => {
            const eff = getTypeEffectiveness(oType, pType);
            if (eff > 1) score -= 20;
            if (eff < 1) score += 15;
          });
        });
        matrix[p.species][o.species] = score;
      });
    });
    return matrix;
  };

  const threatListMock = [
    { species: 'Dragonite', threatScore: 8, reason: 'High offensive Dragon/Flying STAB threat. Sets up via Dragon Dance.' },
    { species: 'Gyarados', threatScore: 9, reason: 'Highly dangerous. Threatens fire and ground builds. Outclasses or KOs Venusaur.' },
    { species: 'Kingambit', threatScore: 7, reason: 'Late-game cleaner with Supreme Overlord ability. Resists normal/dark.' }
  ];

  return (
    <div className="min-h-screen bg-[#08090d] text-slate-100 flex flex-col">
      {/* Header bar */}
      <header className="border-b border-slate-900 bg-[#0c0d12]/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-fuchsia-600 to-purple-500 p-2 rounded-lg shadow-lg shadow-purple-950/30">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-wider text-white m-0 leading-tight">POKEMON AI COACH</h1>
              <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">ESPORTS DECISION ENGINE</p>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <nav className="flex bg-[#12141c] border border-slate-900 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold tracking-wider uppercase transition cursor-pointer ${activeTab === 'preview' ? 'bg-fuchsia-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Shield className="w-3.5 h-3.5" /> Team Preview
            </button>
            <button
              onClick={() => setActiveTab('live')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold tracking-wider uppercase transition cursor-pointer ${activeTab === 'live' ? 'bg-fuchsia-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Sword className="w-3.5 h-3.5" /> Live HUD
            </button>
            <button
              onClick={() => setActiveTab('threats')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold tracking-wider uppercase transition cursor-pointer ${activeTab === 'threats' ? 'bg-fuchsia-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Eye className="w-3.5 h-3.5" /> Threat matrix
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold tracking-wider uppercase transition cursor-pointer ${activeTab === 'history' ? 'bg-fuchsia-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <HistoryIcon className="w-3.5 h-3.5" /> History logs
            </button>
          </nav>
        </div>
      </header>

      {/* Main Contents */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-6">
        {activeTab === 'preview' && (
          <TeamPreview
            playerTeam={playerTeam}
            opponentTeam={opponentTeam}
            recommendation={analysis ? {
              lead: analysis.selection?.lead || { species: 'Azumarill', matchupScore: 10, rationale: 'Standard lead' },
              recommendedTeam3: analysis.selection?.recommendedTeam3 || ['Azumarill', 'Venusaur', 'Dragonite'],
              threats: analysis.threats.keyThreats
            } : null}
          />
        )}

        {activeTab === 'live' && (
          <LiveBattle
            analysis={analysis}
            playerActive={playerActive}
            opponentActive={opponentActive}
            onSimulateTurn={handleSimulateTurn}
            onReset={handleReset}
          />
        )}

        {activeTab === 'threats' && (
          <Threats
            playerTeam={playerTeam}
            opponentTeam={opponentTeam}
            threatsList={analysis?.threats.keyThreats || threatListMock}
            matchupMatrix={generateMatchupMatrix()}
          />
        )}

        {activeTab === 'history' && (
          <History records={historyRecords} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#0c0d12]/40 py-4 text-center text-[10px] text-slate-500 font-mono">
        <div>POKEMON AI COACH V1.0.0 © 2026 | REAL-TIME ANALYTICAL ORCHESTRATION</div>
      </footer>
    </div>
  );
}
