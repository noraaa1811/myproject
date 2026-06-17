export type StatusCondition = 'NONE' | 'PARALYZED' | 'POISONED' | 'TOXIC' | 'BURNED' | 'FROZEN' | 'ASLEEP';

export type WeatherCondition = 'NONE' | 'RAIN' | 'SUN' | 'SAND' | 'SNOW';

export type TerrainCondition = 'NONE' | 'ELECTRIC' | 'GRASSY' | 'MISTY' | 'PSYCHIC';

export interface PokemonStats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export type StatStageKey = 'atk' | 'def' | 'spa' | 'spd' | 'spe' | 'accuracy' | 'evasion';

export interface StatModifiers {
  atk: number; // -6 to +6
  def: number;
  spa: number;
  spd: number;
  spe: number;
  accuracy: number;
  evasion: number;
}

export interface PokemonMove {
  name: string;
  type: string;
  category: 'Physical' | 'Special' | 'Status';
  basePower: number;
  accuracy: number;
  pp?: number;
  maxPp?: number;
}

export interface PokemonState {
  species: string;
  level: number;
  types: string[];
  currentHp: number;        // Current HP value (or percentage from 0-100)
  maxHp: number;            // Max HP value (or 100 if representing percentage)
  status: StatusCondition;
  ability: string;
  item: string;
  moves: string[];          // List of moves revealed so far
  statModifiers: StatModifiers;
  baseStats: PokemonStats;
  gender?: 'M' | 'F' | 'N';
  isTerastallized?: boolean;
  teraType?: string;
  isActive?: boolean;
  isFainted?: boolean;
}

export interface HazardState {
  stealthRock: boolean;
  spikes: number;          // 0 to 3 layers
  toxicSpikes: number;     // 0 to 2 layers
  stickyWeb: boolean;
}

export interface SideState {
  username: string;
  active: PokemonState | null;
  team: PokemonState[];     // Team of 6 (or up to 6)
  hazards: HazardState;
  screens: {
    reflect: number;         // Turns remaining (0 if inactive)
    lightScreen: number;     // Turns remaining
    auroraVeil: number;      // Turns remaining
  };
  tailwind: number;          // Turns remaining
}

export interface BattleState {
  battleId: string;
  turn: number;
  format: string;            // e.g., 'gen9ou', 'gen9vgc'
  weather: WeatherCondition;
  weatherTurnsRemaining: number;
  terrain: TerrainCondition;
  terrainTurnsRemaining: number;
  player: SideState;
  opponent: SideState;
}

// Outputs from the Prediction and Recommendation modules

export interface MoveDamageCalculation {
  moveName: string;
  damagePercentMin: number;
  damagePercentMax: number;
  rolls: number[];
  koChance: string;          // e.g., "Guaranteed 2HKO", "18.8% chance to OHKO"
}

export interface PredictedBuild {
  setName: string;
  ability: string;
  item: string;
  moves: string[];
  probability: number;      // Confidence percentage (0.0 to 1.0)
}

export interface OpponentPrediction {
  species: string;
  predictedBuilds: PredictedBuild[];
  threatLevel: number;      // 0 to 10 scale representing danger to current player team
  winMatchups: string[];    // Names of player's Pokemon this opponent beats
  loseMatchups: string[];   // Names of player's Pokemon this opponent loses to
}

export interface ThreatAnalysis {
  activeThreatLevel: number; // 0 to 10 threat score of the active opponent Pokemon
  keyThreats: Array<{
    species: string;
    reason: string;
    threatScore: number;
  }>;
}

export interface MoveRecommendation {
  moveName: string;
  expectedDamagePercent: number;
  winRateImpact: number;
  confidence: number;
  rationale: string;
}

export interface SwitchRecommendation {
  species: string;
  expectedDamageTakenPercent: number;
  winRateImpact: number;
  confidence: number;
  rationale: string;
}

export interface LeadRecommendation {
  species: string;
  matchupScore: number;     // Higher score = better lead
  rationale: string;
}

export interface SelectionRecommendation {
  recommendedTeam3: string[]; // Optimal 3 Pokemon to bring to the battle
  lead: LeadRecommendation;
  bench: string[];            // The other 2 selected Pokemon
}

export interface BattleAnalysis {
  battleId: string;
  turn: number;
  winProbability: number;     // Estimated win rate (0.0 to 1.0)
  activeMatchup: {
    playerSpecies: string;
    opponentSpecies: string;
    playerSpeedAdvantage: boolean;
    playerDamageDone: MoveDamageCalculation[];
    opponentDamageDone: MoveDamageCalculation[];
  } | null;
  opponentPredictions: OpponentPrediction[];
  threats: ThreatAnalysis;
  recommendedActions: {
    moves: MoveRecommendation[];
    switches: SwitchRecommendation[];
  };
  selection: SelectionRecommendation | null;
}
