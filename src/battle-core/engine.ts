import { 
  BattleState, SideState, PokemonState, 
  BattleAnalysis, StatusCondition, WeatherCondition, 
  TerrainCondition, HazardState, MoveDamageCalculation
} from './types';
import { normalizePokemonState, predictOpponentBuilds, analyzeThreats, recommendLead, recommendTeamSelection } from './analyzer';
import { evaluateMatchup } from './analyzer';
import { estimateWinProbability, recommendMoves, recommendSwitches } from './win-rate';
import { getModifiedSpeed } from './calculator';

/**
 * Orchestrator class managing the live Pokemon battle state
 * and running analytical computations for the AI Coach.
 */
export class BattleAnalysisEngine {
  private state: BattleState;

  constructor(battleId: string, format = 'gen9ou') {
    this.state = {
      battleId,
      turn: 1,
      format,
      weather: 'NONE',
      weatherTurnsRemaining: 0,
      terrain: 'NONE',
      terrainTurnsRemaining: 0,
      player: this.createEmptySide('Player'),
      opponent: this.createEmptySide('Opponent')
    };
  }

  private createEmptySide(username: string): SideState {
    return {
      username,
      active: null,
      team: [],
      hazards: {
        stealthRock: false,
        spikes: 0,
        toxicSpikes: 0,
        stickyWeb: false
      },
      screens: {
        reflect: 0,
        lightScreen: 0,
        auroraVeil: 0
      },
      tailwind: 0
    };
  }

  /**
   * Returns a copy of the current internal BattleState.
   */
  public getState(): BattleState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Initializes or updates a side's team members.
   */
  public setTeam(side: 'player' | 'opponent', teamInput: Array<Partial<PokemonState> & { species: string }>) {
    const sideObj = side === 'player' ? this.state.player : this.state.opponent;
    
    sideObj.team = teamInput.map(input => normalizePokemonState(input));
    
    // Auto-assign active Pokemon if specified in input or defaults to first in line
    const activeInput = sideObj.team.find(p => p.isActive && !p.isFainted);
    if (activeInput) {
      sideObj.active = activeInput;
    } else if (sideObj.team.length > 0 && !sideObj.active) {
      // Set first member active
      sideObj.team[0].isActive = true;
      sideObj.active = sideObj.team[0];
    }
  }

  /**
   * Sets the active Pokemon on the field for either player.
   */
  public setActivePokemon(side: 'player' | 'opponent', species: string) {
    const sideObj = side === 'player' ? this.state.player : this.state.opponent;
    
    // Find in team or add dynamically
    let poke = sideObj.team.find(p => p.species.toLowerCase() === species.toLowerCase());
    
    if (!poke) {
      poke = normalizePokemonState({ species });
      sideObj.team.push(poke);
    }

    // Deactivate previous active
    sideObj.team.forEach(p => { p.isActive = false; });
    
    poke.isActive = true;
    poke.isFainted = false;
    sideObj.active = poke;
  }

  /**
   * Updates current HP, statuses, and coordinates fainted state changes.
   */
  public updatePokemonStatus(
    side: 'player' | 'opponent', 
    species: string, 
    currentHp: number, 
    status: StatusCondition = 'NONE'
  ) {
    const sideObj = side === 'player' ? this.state.player : this.state.opponent;
    let poke = sideObj.team.find(p => p.species.toLowerCase() === species.toLowerCase());

    if (!poke) {
      poke = normalizePokemonState({ species });
      sideObj.team.push(poke);
    }

    poke.currentHp = currentHp;
    poke.status = status;
    poke.isFainted = currentHp <= 0;

    // Synchronize side active reference
    if (sideObj.active && sideObj.active.species.toLowerCase() === species.toLowerCase()) {
      sideObj.active.currentHp = currentHp;
      sideObj.active.status = status;
      sideObj.active.isFainted = poke.isFainted;
      
      if (poke.isFainted) {
        sideObj.active.isActive = false;
        sideObj.active = null;
      }
    }
  }

  /**
   * Adds a revealed move to a Pokemon's moveset registry.
   */
  public revealMove(side: 'player' | 'opponent', species: string, moveName: string) {
    const sideObj = side === 'player' ? this.state.player : this.state.opponent;
    const poke = sideObj.team.find(p => p.species.toLowerCase() === species.toLowerCase());
    
    if (poke) {
      const exists = poke.moves.some(m => m.toLowerCase() === moveName.toLowerCase());
      if (!exists) {
        poke.moves.push(moveName);
        
        // Synch active reference
        if (sideObj.active && sideObj.active.species.toLowerCase() === species.toLowerCase()) {
          sideObj.active.moves = [...poke.moves];
        }
      }
    }
  }

  /**
   * Updates properties like items, abilities, or tera setups.
   */
  public updatePokemonDetails(
    side: 'player' | 'opponent',
    species: string,
    details: Partial<{ item: string; ability: string; isTerastallized: boolean; teraType: string }>
  ) {
    const sideObj = side === 'player' ? this.state.player : this.state.opponent;
    const poke = sideObj.team.find(p => p.species.toLowerCase() === species.toLowerCase());
    
    if (poke) {
      if (details.item !== undefined) poke.item = details.item;
      if (details.ability !== undefined) poke.ability = details.ability;
      if (details.isTerastallized !== undefined) poke.isTerastallized = details.isTerastallized;
      if (details.teraType !== undefined) poke.teraType = details.teraType;

      // Sync active
      if (sideObj.active && sideObj.active.species.toLowerCase() === species.toLowerCase()) {
        Object.assign(sideObj.active, details);
      }
    }
  }

  /**
   * Updates global turn counts and field effects.
   */
  public setTurn(turnNumber: number) {
    this.state.turn = turnNumber;
    
    // Decrement field turns organically
    if (this.state.weatherTurnsRemaining > 0) this.state.weatherTurnsRemaining--;
    if (this.state.weatherTurnsRemaining === 0) this.state.weather = 'NONE';
    
    if (this.state.terrainTurnsRemaining > 0) this.state.terrainTurnsRemaining--;
    if (this.state.terrainTurnsRemaining === 0) this.state.terrain = 'NONE';

    // Decrement side screen turns
    const sides = [this.state.player, this.state.opponent];
    for (const side of sides) {
      if (side.tailwind > 0) side.tailwind--;
      if (side.screens.reflect > 0) side.screens.reflect--;
      if (side.screens.lightScreen > 0) side.screens.lightScreen--;
      if (side.screens.auroraVeil > 0) side.screens.auroraVeil--;
    }
  }

  public setWeather(weather: WeatherCondition, turns = 5) {
    this.state.weather = weather;
    this.state.weatherTurnsRemaining = turns;
  }

  public setTerrain(terrain: TerrainCondition, turns = 5) {
    this.state.terrain = terrain;
    this.state.terrainTurnsRemaining = turns;
  }

  public updateHazards(side: 'player' | 'opponent', updates: Partial<HazardState>) {
    const sideObj = side === 'player' ? this.state.player : this.state.opponent;
    Object.assign(sideObj.hazards, updates);
  }

  public updateScreens(side: 'player' | 'opponent', updates: Partial<{ reflect: number; lightScreen: number; auroraVeil: number }>) {
    const sideObj = side === 'player' ? this.state.player : this.state.opponent;
    Object.assign(sideObj.screens, updates);
  }

  public updateTailwind(side: 'player' | 'opponent', turns = 4) {
    const sideObj = side === 'player' ? this.state.player : this.state.opponent;
    sideObj.tailwind = turns;
  }

  /**
   * Performs complete analytical calculations based on current state.
   */
  public analyze(): BattleAnalysis {
    const winProbability = estimateWinProbability(this.state);
    
    // Active matchup damage calculations
    let activeMatchup = null;
    if (this.state.player.active && this.state.opponent.active) {
      const pActive = this.state.player.active;
      const oActive = this.state.opponent.active;
      
      const speedAdv = getModifiedSpeed(pActive, this.state, true) > getModifiedSpeed(oActive, this.state, false);
      const evalResults = evaluateMatchup(pActive, oActive, this.state);

      activeMatchup = {
        playerSpecies: pActive.species,
        opponentSpecies: oActive.species,
        playerSpeedAdvantage: speedAdv,
        playerDamageDone: evalResults.playerDamage,
        opponentDamageDone: evalResults.opponentDamage
      };
    }

    // Opponent predictions list
    const opponentPredictions: OpponentPrediction[] = this.state.opponent.team.map(oPoke => {
      const predictedBuilds = predictOpponentBuilds(oPoke);
      
      // Map strengths & weaknesses matchups against player's team
      const winMatchups: string[] = [];
      const loseMatchups: string[] = [];

      for (const pPoke of this.state.player.team) {
        const match = evaluateMatchup(pPoke, oPoke, this.state);
        if (match.score < -15) {
          winMatchups.push(pPoke.species); // opponent beats player
        } else if (match.score > 15) {
          loseMatchups.push(pPoke.species); // opponent loses to player
        }
      }

      // Threat score calculation
      let totalScore = 0;
      for (const pPoke of this.state.player.team) {
        const match = evaluateMatchup(pPoke, oPoke, this.state);
        totalScore += match.score;
      }
      const threatLevel = Math.min(10, Math.max(0, Math.round((-totalScore / Math.max(1, this.state.player.team.length) + 30) / 6)));

      return {
        species: oPoke.species,
        predictedBuilds,
        threatLevel,
        winMatchups,
        loseMatchups
      };
    });

    // Threat analysis
    const threats = analyzeThreats(this.state.player.team, this.state.opponent.team, this.state);

    // Recommended Actions (Moves & Switches)
    const moves = recommendMoves(this.state);
    const switches = recommendSwitches(this.state);

    // Lead & Selection recommendations (Only computed if turn === 1 and not yet fully selected)
    let selection = null;
    if (this.state.player.team.length > 0 && this.state.opponent.team.length > 0) {
      selection = recommendTeamSelection(this.state.player.team, this.state.opponent.team, this.state);
    }

    return {
      battleId: this.state.battleId,
      turn: this.state.turn,
      winProbability,
      activeMatchup,
      opponentPredictions,
      threats,
      recommendedActions: {
        moves,
        switches
      },
      selection
    };
  }
}
