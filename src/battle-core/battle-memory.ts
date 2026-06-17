import { BattleState, PokemonState, StatModifiers, StatusCondition } from './types';
import { predictOpponentBuilds, evaluateMatchup } from './analyzer';
import { estimateWinProbability } from './win-rate';

export interface SwitchEvent {
  turn: number;
  from: string;
  to: string;
}

export interface MemoryReport {
  revealedMoves: Record<string, string[]>;
  revealedItems: Record<string, string>;
  revealedAbilities: Record<string, string>;
  statBoosts: Record<string, StatModifiers>;
  statusConditions: Record<string, StatusCondition>;
  hpHistory: Record<string, number[]>;
  switchingPatterns: {
    playerSwitches: SwitchEvent[];
    opponentSwitches: SwitchEvent[];
    playerSwitchCount: number;
    opponentSwitchCount: number;
  };
  predictions: Record<string, {
    predictedMoves: string[];
    predictedItems: string[];
    usageProbability: number;
  }>;
  winProbability: number;
}

export class BattleMemorySystem {
  // Persistent memory store
  private revealedMoves: Record<string, Set<string>> = {};
  private revealedItems: Record<string, string> = {};
  private revealedAbilities: Record<string, string> = {};
  private hpHistory: Record<string, number[]> = {};
  
  // Switch event logging
  private playerSwitches: SwitchEvent[] = [];
  private opponentSwitches: SwitchEvent[] = [];
  private prevPlayerActive: string | null = null;
  private prevOpponentActive: string | null = null;

  // Active status and modifiers
  private statBoosts: Record<string, StatModifiers> = {};
  private statusConditions: Record<string, StatusCondition> = {};

  // Probability cache
  private winProbability = 0.5;
  private predictions: Record<string, { predictedMoves: string[]; predictedItems: string[]; usageProbability: number }> = {};

  constructor() {}

  /**
   * Records a turn snapshot, updates tracked metrics, logs switches, and runs updates.
   */
  public recordTurn(state: BattleState) {
    const turn = state.turn;

    // 1. Process Player Team Stats
    state.player.team.forEach((poke) => {
      this.updatePokemonMemory(poke);
    });

    // 2. Process Opponent Team Stats
    state.opponent.team.forEach((poke) => {
      this.updatePokemonMemory(poke);
    });

    // 3. Track Switch Patterns
    const currentPlayActive = state.player.active?.species || null;
    if (currentPlayActive && this.prevPlayerActive && currentPlayActive !== this.prevPlayerActive) {
      this.playerSwitches.push({
        turn,
        from: this.prevPlayerActive,
        to: currentPlayActive
      });
    }
    if (currentPlayActive) {
      this.prevPlayerActive = currentPlayActive;
    }

    const currentOppActive = state.opponent.active?.species || null;
    if (currentOppActive && this.prevOpponentActive && currentOppActive !== this.prevOpponentActive) {
      this.opponentSwitches.push({
        turn,
        from: this.prevOpponentActive,
        to: currentOppActive
      });
    }
    if (currentOppActive) {
      this.prevOpponentActive = currentOppActive;
    }

    // 4. Recalculate Win Probability & Predictions
    this.recalculateProbabilities(state);
  }

  /**
   * Helper to merge new details into the persistent memory.
   */
  private updatePokemonMemory(poke: PokemonState) {
    const name = poke.species;

    // Initialize structures
    if (!this.revealedMoves[name]) this.revealedMoves[name] = new Set<string>();
    if (!this.hpHistory[name]) this.hpHistory[name] = [];

    // Append HP history
    this.hpHistory[name].push(poke.currentHp);

    // Merge moves
    poke.moves.forEach((move) => {
      this.revealedMoves[name].add(move);
    });

    // Store item
    if (poke.item) {
      this.revealedItems[name] = poke.item;
    }

    // Store ability
    if (poke.ability) {
      this.revealedAbilities[name] = poke.ability;
    }

    // Store temporary stats / statuses
    this.statBoosts[name] = { ...poke.statModifiers };
    this.statusConditions[name] = poke.status;
  }

  /**
   * Recalculates win rate percentages and metagame probability weights.
   */
  private recalculateProbabilities(state: BattleState) {
    // Call our core evaluator to compute win rate
    this.winProbability = estimateWinProbability(state);

    // Predict opponent builds based on all accumulated revealed details
    state.opponent.team.forEach((poke) => {
      const builds = predictOpponentBuilds(poke);
      const topBuild = builds[0];
      
      if (topBuild) {
        this.predictions[poke.species] = {
          predictedMoves: topBuild.moves,
          predictedItems: [topBuild.item],
          usageProbability: topBuild.probability
        };
      }
    });
  }

  /**
   * Generates a clean consolidated memory report.
   */
  public getMemoryReport(): MemoryReport {
    // Convert sets to arrays
    const formattedMoves: Record<string, string[]> = {};
    Object.entries(this.revealedMoves).forEach(([species, set]) => {
      formattedMoves[species] = Array.from(set);
    });

    return {
      revealedMoves: formattedMoves,
      revealedItems: { ...this.revealedItems },
      revealedAbilities: { ...this.revealedAbilities },
      statBoosts: { ...this.statBoosts },
      statusConditions: { ...this.statusConditions },
      hpHistory: { ...this.hpHistory },
      switchingPatterns: {
        playerSwitches: [...this.playerSwitches],
        opponentSwitches: [...this.opponentSwitches],
        playerSwitchCount: this.playerSwitches.length,
        opponentSwitchCount: this.opponentSwitches.length
      },
      predictions: { ...this.predictions },
      winProbability: this.winProbability
    };
  }
}
