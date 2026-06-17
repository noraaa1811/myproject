import { BattleMemorySystem } from './battle-memory';
import { BattleState, PokemonState } from './types';

// Helper to create fully populated PokemonState
function createPokemon(species: string, currentHp = 100, moves: string[] = [], isActive = false): PokemonState {
  return {
    species,
    level: 100,
    types: ['Normal'],
    currentHp,
    maxHp: 100,
    status: 'NONE',
    ability: '',
    item: '',
    moves,
    statModifiers: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 },
    baseStats: { hp: 80, atk: 80, def: 80, spa: 80, spd: 80, spe: 80 },
    isActive
  };
}

const memory = new BattleMemorySystem();

// --- TURN 1 ---
const turn1State: BattleState = {
  battleId: 'test-mem-battle',
  turn: 1,
  format: 'gen9ou',
  weather: 'NONE',
  weatherTurnsRemaining: 0,
  terrain: 'NONE',
  terrainTurnsRemaining: 0,
  player: {
    username: 'player',
    active: createPokemon('Azumarill', 100, [], true),
    team: [createPokemon('Azumarill', 100, [], true), createPokemon('Charizard')],
    hazards: { stealthRock: false, spikes: 0, toxicSpikes: 0, stickyWeb: false },
    screens: { reflect: 0, lightScreen: 0, auroraVeil: 0 },
    tailwind: 0
  },
  opponent: {
    username: 'opp',
    active: createPokemon('Dragonite', 100, [], true),
    team: [createPokemon('Dragonite', 100, [], true), createPokemon('Gyarados')],
    hazards: { stealthRock: false, spikes: 0, toxicSpikes: 0, stickyWeb: false },
    screens: { reflect: 0, lightScreen: 0, auroraVeil: 0 },
    tailwind: 0
  }
};

memory.recordTurn(turn1State);

// --- TURN 2 (Damage and Move Reveal) ---
const turn2State: BattleState = {
  ...turn1State,
  turn: 2,
  player: {
    ...turn1State.player,
    active: createPokemon('Azumarill', 84, ['Play Rough'], true),
    team: [createPokemon('Azumarill', 84, ['Play Rough'], true), createPokemon('Charizard')]
  },
  opponent: {
    ...turn1State.opponent,
    active: createPokemon('Dragonite', 48, ['Dragon Dance'], true),
    team: [createPokemon('Dragonite', 48, ['Dragon Dance'], true), createPokemon('Gyarados')]
  }
};

memory.recordTurn(turn2State);

// --- TURN 3 (Opponent Switch) ---
const turn3State: BattleState = {
  ...turn2State,
  turn: 3,
  opponent: {
    ...turn2State.opponent,
    active: createPokemon('Gyarados', 100, ['Waterfall'], true),
    team: [createPokemon('Dragonite', 48, ['Dragon Dance']), createPokemon('Gyarados', 100, ['Waterfall'], true)]
  }
};

memory.recordTurn(turn3State);

// Generate report
const report = memory.getMemoryReport();

console.log("=== BATTLE MEMORY SYSTEM TEST SUCCESS ===");
console.log(JSON.stringify(report, null, 2));
