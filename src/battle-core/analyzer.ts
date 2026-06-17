import { 
  BattleState, PokemonState, PokemonMove, 
  SelectionRecommendation, LeadRecommendation, 
  OpponentPrediction, PredictedBuild, ThreatAnalysis,
  MoveDamageCalculation
} from './types';
import { getTypeEffectiveness, getModifiedSpeed, calculateDamage } from './calculator';

// A seed database of common Gen 9 competitive meta builds for fallback
export const METAGAME_SETS_DB: Record<string, PredictedBuild[]> = {
  'Great Tusk': [
    {
      setName: 'Rapid Spin Utility',
      ability: 'Protosynthesis',
      item: 'Leftovers',
      moves: ['Rapid Spin', 'Earthquake', 'Ice Spinner', 'Stealth Rock'],
      probability: 0.60
    },
    {
      setName: 'Offensive Booster',
      ability: 'Protosynthesis',
      item: 'Booster Energy',
      moves: ['Earthquake', 'Close Combat', 'Headlong Rush', 'Ice Spinner'],
      probability: 0.40
    }
  ],
  'Gholdengo': [
    {
      setName: 'Choice Specs Special Attacker',
      ability: 'Good as Gold',
      item: 'Choice Specs',
      moves: ['Make It Rain', 'Shadow Ball', 'Focus Blast', 'Trick'],
      probability: 0.55
    },
    {
      setName: 'Nasty Plot Bulky Sweeper',
      ability: 'Good as Gold',
      item: 'Air Balloon',
      moves: ['Nasty Plot', 'Make It Rain', 'Shadow Ball', 'Recover'],
      probability: 0.45
    }
  ],
  'Kingambit': [
    {
      setName: 'Kowtow Cleave Sweeper',
      ability: 'Supreme Overlord',
      item: 'Black Glasses',
      moves: ['Kowtow Cleave', 'Sucker Punch', 'Iron Head', 'Swords Dance'],
      probability: 0.70
    },
    {
      setName: 'Assault Vest Pivot',
      ability: 'Supreme Overlord',
      item: 'Assault Vest',
      moves: ['Kowtow Cleave', 'Sucker Punch', 'Iron Head', 'Low Kick'],
      probability: 0.30
    }
  ],
  'Dragapult': [
    {
      setName: 'Mixed Choice Specs',
      ability: 'Infiltrator',
      item: 'Choice Specs',
      moves: ['Draco Meteor', 'Shadow Ball', 'Flamethrower', 'U-turn'],
      probability: 0.50
    },
    {
      setName: 'Dragon Dance Physical',
      ability: 'Clear Body',
      item: 'Life Orb',
      moves: ['Dragon Dance', 'Dragon Dart', 'Phantom Force', 'Sucker Punch'],
      probability: 0.30
    },
    {
      setName: 'Will-O-Wisp Hex Utility',
      ability: 'Infiltrator',
      item: 'Leftovers',
      moves: ['Will-O-Wisp', 'Hex', 'Draco Meteor', 'U-turn'],
      probability: 0.20
    }
  ],
  'Gyarados': [
    {
      setName: 'Dragon Dance Attacker',
      ability: 'Intimidate',
      item: 'Heavy-Duty Boots',
      moves: ['Dragon Dance', 'Waterfall', 'Bounce', 'Earthquake'],
      probability: 0.75
    },
    {
      setName: 'Bulky Rest-Talk Pivot',
      ability: 'Intimidate',
      item: 'Leftovers',
      moves: ['Waterfall', 'Thunder Wave', 'Rest', 'Sleep Talk'],
      probability: 0.25
    }
  ],
  'Garchomp': [
    {
      setName: 'Rough Skin Lead Hazards',
      ability: 'Rough Skin',
      item: 'Rocky Helmet',
      moves: ['Stealth Rock', 'Spikes', 'Earthquake', 'Dragon Tail'],
      probability: 0.60
    },
    {
      setName: 'Swords Dance Sweeper',
      ability: 'Rough Skin',
      item: 'Life Orb',
      moves: ['Swords Dance', 'Earthquake', 'Outrage', 'Stone Edge'],
      probability: 0.40
    }
  ],
  'Dragonite': [
    {
      setName: 'Dragon Dance Sweeper',
      ability: 'Multiscale',
      item: 'Heavy-Duty Boots',
      moves: ['Dragon Dance', 'Extreme Speed', 'Earthquake', 'Roost'],
      probability: 0.70
    },
    {
      setName: 'Choice Band Attacker',
      ability: 'Multiscale',
      item: 'Choice Band',
      moves: ['Extreme Speed', 'Earthquake', 'Outrage', 'Fire Punch'],
      probability: 0.30
    }
  ]
};


/**
 * Standard fallbacks for pokemon type definitions if not loaded from a database.
 */
export const POKEMON_TYPING_DB: Record<string, string[]> = {
  'Great Tusk': ['Ground', 'Fighting'],
  'Gholdengo': ['Steel', 'Ghost'],
  'Kingambit': ['Dark', 'Steel'],
  'Dragapult': ['Dragon', 'Ghost'],
  'Gyarados': ['Water', 'Flying'],
  'Garchomp': ['Ground', 'Dragon'],
  'Charizard': ['Fire', 'Flying'],
  'Venusaur': ['Grass', 'Poison'],
  'Blastoise': ['Water'],
  'Dragonite': ['Dragon', 'Flying'],
  'Steelix': ['Steel', 'Ground'],
  'Landorus-T': ['Ground', 'Flying'],
  'Ting-Lu': ['Dark', 'Ground'],
  'Roaring Moon': ['Dragon', 'Dark'],
  'Rillaboom': ['Grass'],
  'Urshifu': ['Fighting', 'Water'],
  'Iron Valiant': ['Fairy', 'Fighting'],
  'Flutter Mane': ['Ghost', 'Fairy']
};

/**
 * Default base stats fallback mapping.
 */
export const BASE_STATS_DB: Record<string, {hp: number, atk: number, def: number, spa: number, spd: number, spe: number}> = {
  'Great Tusk': { hp: 90, atk: 131, def: 131, spa: 53, spd: 53, spe: 87 },
  'Gholdengo': { hp: 87, atk: 60, def: 95, spa: 133, spd: 91, spe: 84 },
  'Kingambit': { hp: 100, atk: 135, def: 120, spa: 60, spd: 85, spe: 50 },
  'Dragapult': { hp: 88, atk: 120, def: 75, spa: 100, spd: 75, spe: 142 },
  'Gyarados': { hp: 95, atk: 125, def: 79, spa: 60, spd: 100, spe: 81 },
  'Garchomp': { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
  'Charizard': { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 },
  'Venusaur': { hp: 80, atk: 82, def: 83, spa: 100, spd: 100, spe: 80 },
  'Blastoise': { hp: 79, atk: 83, def: 100, spa: 85, spd: 105, spe: 78 },
  'Dragonite': { hp: 91, atk: 134, def: 95, spa: 100, spd: 100, spe: 80 },
  'Steelix': { hp: 75, atk: 85, def: 200, spa: 55, spd: 65, spe: 30 },
  'Landorus-T': { hp: 89, atk: 145, def: 90, spa: 105, spd: 80, spe: 91 },
  'Ting-Lu': { hp: 155, atk: 110, def: 125, spa: 55, spd: 80, spe: 45 },
  'Roaring Moon': { hp: 105, atk: 139, def: 71, spa: 55, spd: 101, spe: 119 },
  'Rillaboom': { hp: 100, atk: 125, def: 90, spa: 60, spd: 70, spe: 85 },
  'Urshifu': { hp: 100, atk: 130, def: 100, spa: 63, spd: 60, spe: 97 },
  'Iron Valiant': { hp: 74, atk: 130, def: 90, spa: 120, spd: 60, spe: 116 },
  'Flutter Mane': { hp: 55, atk: 55, def: 55, spa: 135, spd: 135, spe: 135 }
};

/**
 * Ensures a PokemonState is fully populated with stats, types, and defaults.
 */
export function normalizePokemonState(poke: Partial<PokemonState> & { species: string }): PokemonState {
  const species = poke.species;
  const types = poke.types || POKEMON_TYPING_DB[species] || ['Normal'];
  const baseStats = poke.baseStats || BASE_STATS_DB[species] || { hp: 80, atk: 80, def: 80, spa: 80, spd: 80, spe: 80 };
  
  return {
    species,
    level: poke.level || 100,
    types,
    currentHp: poke.currentHp !== undefined ? poke.currentHp : 100,
    maxHp: poke.maxHp || 100,
    status: poke.status || 'NONE',
    ability: poke.ability || '',
    item: poke.item || '',
    moves: poke.moves || [],
    statModifiers: poke.statModifiers || { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 },
    baseStats,
    isTerastallized: poke.isTerastallized || false,
    teraType: poke.teraType || types[0],
    isActive: poke.isActive || false,
    isFainted: poke.isFainted || false
  };
}

/**
 * Predicts the opponent's build sets, adjusting probability dynamically as information is revealed.
 */
export function predictOpponentBuilds(opponentPoke: PokemonState): PredictedBuild[] {
  const metaSets = METAGAME_SETS_DB[opponentPoke.species];
  if (!metaSets) {
    // Generate a default generic set
    return [{
      setName: 'Standard Meta Build',
      ability: opponentPoke.ability || 'Standard Ability',
      item: opponentPoke.item || 'Leftovers',
      moves: opponentPoke.moves.length > 0 ? opponentPoke.moves : ['Earthquake', 'Substitute', 'Toxic', 'Protect'],
      probability: 1.0
    }];
  }

  // Filter and weight based on actual revealed parameters
  const matches = metaSets.map(set => {
    let score = 1.0;
    
    // Ability mismatch
    if (opponentPoke.ability && set.ability.toLowerCase() !== opponentPoke.ability.toLowerCase()) {
      score *= 0.05;
    }
    
    // Item mismatch
    if (opponentPoke.item && set.item.toLowerCase() !== opponentPoke.item.toLowerCase()) {
      score *= 0.05;
    }
    
    // Move mismatches: if opponent has revealed moves, does this set support them?
    for (const revealedMove of opponentPoke.moves) {
      if (!set.moves.some(m => m.toLowerCase() === revealedMove.toLowerCase())) {
        score *= 0.1; // unlikely set
      }
    }
    
    return {
      ...set,
      score: set.probability * score
    };
  });

  const totalScore = matches.reduce((sum, item) => sum + item.score, 0);
  if (totalScore === 0) {
    return metaSets; // Fallback to raw probabilities if conflict occurs
  }

  return matches.map(m => ({
    setName: m.setName,
    ability: m.ability,
    item: m.item,
    moves: m.moves,
    probability: Math.round((m.score / totalScore) * 100) / 100
  })).sort((a, b) => b.probability - a.probability);
}

/**
 * Calculates a head-to-head matchup score.
 * Positive = Player advantage, Negative = Opponent advantage.
 */
export function evaluateMatchup(
  player: PokemonState,
  opponent: PokemonState,
  battleState: BattleState
): { score: number; playerDamage: MoveDamageCalculation[]; opponentDamage: MoveDamageCalculation[] } {
  
  // Normalize types & base stats if missing
  const playerNorm = normalizePokemonState(player);
  const oppNorm = normalizePokemonState(opponent);

  // If fainted, mismatch is trivial
  if (playerNorm.isFainted) return { score: -100, playerDamage: [], opponentDamage: [] };
  if (oppNorm.isFainted) return { score: 100, playerDamage: [], opponentDamage: [] };

  // Speed check
  const playerSpeed = getModifiedSpeed(playerNorm, battleState, true);
  const oppSpeed = getModifiedSpeed(oppNorm, battleState, false);
  const playerOutspeeds = playerSpeed > oppSpeed;

  // Compile moves (including predicted moves if not fully revealed)
  const playerMoves: PokemonMove[] = playerNorm.moves.map(mName => ({
    name: mName,
    type: 'Normal', // fallback type
    category: 'Physical',
    basePower: 80,
    accuracy: 100
  }));
  
  // Ensure player has at least one basic attack for calculation if none configured
  if (playerMoves.length === 0) {
    playerMoves.push({ name: 'Tackle', type: playerNorm.types[0], category: 'Physical', basePower: 50, accuracy: 100 });
  }

  // Generate predicted moves for opponent using highest probability build
  const predictedSets = predictOpponentBuilds(oppNorm);
  const bestSet = predictedSets[0];
  const oppMovesList = oppNorm.moves.length > 0 ? oppNorm.moves : bestSet.moves;
  
  const oppMoves: PokemonMove[] = oppMovesList.map(mName => {
    // Basic heuristics to determine move properties for standard meta moves
    let moveType = oppNorm.types[0];
    let cat: 'Physical' | 'Special' | 'Status' = 'Physical';
    let bp = 80;

    const lower = mName.toLowerCase();
    if (lower.includes('make it rain')) { moveType = 'Steel'; cat = 'Special'; bp = 120; }
    else if (lower.includes('shadow ball')) { moveType = 'Ghost'; cat = 'Special'; bp = 80; }
    else if (lower.includes('draco meteor')) { moveType = 'Dragon'; cat = 'Special'; bp = 130; }
    else if (lower.includes('earthquake')) { moveType = 'Ground'; cat = 'Physical'; bp = 100; }
    else if (lower.includes('close combat')) { moveType = 'Fighting'; cat = 'Physical'; bp = 120; }
    else if (lower.includes('waterfall')) { moveType = 'Water'; cat = 'Physical'; bp = 80; }
    else if (lower.includes('kowtow cleave')) { moveType = 'Dark'; cat = 'Physical'; bp = 85; }
    else if (lower.includes('sucker punch')) { moveType = 'Dark'; cat = 'Physical'; bp = 70; }
    else if (lower.includes('ice spinner')) { moveType = 'Ice'; cat = 'Physical'; bp = 80; }
    
    return { name: mName, type: moveType, category: cat, basePower: bp, accuracy: 100 };
  });

  // Calculate damage ranges
  const playerDmg = playerMoves.map(move => calculateDamage(playerNorm, oppNorm, move, battleState, true));
  const oppDmg = oppMoves.map(move => calculateDamage(oppNorm, playerNorm, move, battleState, false));

  // Determine highest damage rolls (max potential damage output)
  const bestPlayerDmg = playerDmg.reduce((max, d) => d.damagePercentMax > max ? d.damagePercentMax : max, 0);
  const bestOppDmg = oppDmg.reduce((max, d) => d.damagePercentMax > max ? d.damagePercentMax : max, 0);

  // Heuristic Scoring
  let score = 0;
  
  // Difference in offensive output
  score += (bestPlayerDmg - bestOppDmg) * 0.5;

  // Speed advantage weighting
  if (playerOutspeeds) {
    score += 15;
    // If we outspeed and can OHKO
    if (bestPlayerDmg >= 100) score += 50;
  } else {
    score -= 15;
    // If they outspeed and can OHKO
    if (bestOppDmg >= 100) score -= 50;
  }

  // Type matchups multiplier influence
  const typeAdv = getTypeEffectiveness(playerNorm.types[0], oppNorm.types) - getTypeEffectiveness(oppNorm.types[0], playerNorm.types);
  score += typeAdv * 10;

  return {
    score: Math.round(score),
    playerDamage: playerDmg,
    opponentDamage: oppDmg
  };
}

/**
 * Builds standard 6x6 matchup score matrix.
 */
export function buildMatchupMatrix(playerTeam: PokemonState[], oppTeam: PokemonState[], battleState: BattleState) {
  const matrix: Record<string, Record<string, number>> = {};
  
  for (const p of playerTeam) {
    matrix[p.species] = {};
    for (const o of oppTeam) {
      const match = evaluateMatchup(p, o, battleState);
      matrix[p.species][o.species] = match.score;
    }
  }
  return matrix;
}

/**
 * Computes threat analysis based on matchup scores.
 */
export function analyzeThreats(
  playerTeam: PokemonState[],
  oppTeam: PokemonState[],
  battleState: BattleState
): ThreatAnalysis {
  const normalizedPlayer = playerTeam.map(p => normalizePokemonState(p));
  const normalizedOpp = oppTeam.map(o => normalizePokemonState(o));
  
  const keyThreats: Array<{ species: string; reason: string; threatScore: number }> = [];

  for (const o of normalizedOpp) {
    if (o.isFainted) continue;

    let totalMatchupScore = 0;
    let beatsCount = 0;
    const beatenPokes: string[] = [];

    for (const p of normalizedPlayer) {
      if (p.isFainted) continue;
      const match = evaluateMatchup(p, o, battleState);
      totalMatchupScore += match.score;
      if (match.score < -15) {
        beatsCount++;
        beatenPokes.push(p.species);
      }
    }

    // Average matchup score negative represents threat level
    const threatScore = Math.min(10, Math.max(0, Math.round((-totalMatchupScore / normalizedPlayer.length + 30) / 6)));
    
    let reason = 'Balanced matchup.';
    if (beatsCount >= 3) {
      reason = `Highly dangerous! Outclasses or OHKOs ${beatenPokes.slice(0, 2).join(' & ')}.`;
    } else if (beatsCount > 0) {
      reason = `Threatens ${beatenPokes.join(', ')}.`;
    }

    keyThreats.push({
      species: o.species,
      reason,
      threatScore
    });
  }

  // Active opponent Pokemon threat level
  const activeOpp = normalizedOpp.find(o => o.isActive);
  let activeThreatLevel = 5;
  if (activeOpp) {
    const activeThreatObj = keyThreats.find(t => t.species === activeOpp.species);
    if (activeThreatObj) activeThreatLevel = activeThreatObj.threatScore;
  }

  return {
    activeThreatLevel,
    keyThreats: keyThreats.sort((a, b) => b.threatScore - a.threatScore)
  };
}

/**
 * Recommends starting leads using minimax strategy.
 */
export function recommendLead(
  playerTeam: PokemonState[],
  oppTeam: PokemonState[],
  battleState: BattleState
): LeadRecommendation {
  const matrix = buildMatchupMatrix(playerTeam, oppTeam, battleState);
  let bestLead = '';
  let bestLeadScore = -Infinity;
  let rationale = '';

  for (const p of playerTeam) {
    if (p.isFainted) continue;
    
    // Evaluate minimum score against opponent (minimax: avoid worst-case scenarios)
    const opponentScores = Object.values(matrix[p.species]);
    const minScore = Math.min(...opponentScores);
    const avgScore = opponentScores.reduce((sum, s) => sum + s, 0) / opponentScores.length;
    
    // Weighted score bias (giving weight to average and worst matchups)
    const leadScore = minScore * 0.4 + avgScore * 0.6;

    if (leadScore > bestLeadScore) {
      bestLeadScore = leadScore;
      bestLead = p.species;
      
      const bestMatchups = Object.entries(matrix[p.species])
        .filter(([_, score]) => score > 15)
        .map(([name]) => name);
      
      if (bestMatchups.length > 0) {
        rationale = `Excellent lead matchup against ${bestMatchups.slice(0, 2).join(' & ')}. Secure speed tiers and type alignment.`;
      } else {
        rationale = `Safest defensive pivot lead. Minimizes risk against opponent hazard setters.`;
      }
    }
  }

  return {
    species: bestLead,
    matchupScore: Math.round(bestLeadScore),
    rationale
  };
}

/**
 * Recommends optimal 3 Pokemon combination (Bring 6 Pick 3 format).
 */
export function recommendTeamSelection(
  playerTeam: PokemonState[],
  oppTeam: PokemonState[],
  battleState: BattleState
): SelectionRecommendation {
  const matrix = buildMatchupMatrix(playerTeam, oppTeam, battleState);
  
  // Combinatorial combinations generator of size 3 from playerTeam (length <= 6)
  const getCombinations = (array: PokemonState[], size: number): PokemonState[][] => {
    const result: PokemonState[][] = [];
    const helper = (start: number, combo: PokemonState[]) => {
      if (combo.length === size) {
        result.push([...combo]);
        return;
      }
      for (let i = start; i < array.length; i++) {
        combo.push(array[i]);
        helper(i + 1, combo);
        combo.pop();
      }
    };
    helper(0, []);
    return result;
  };

  const activePokes = playerTeam.filter(p => !p.isFainted);
  const combos = getCombinations(activePokes, Math.min(3, activePokes.length));
  
  let bestCombo: string[] = [];
  let maxComboScore = -Infinity;

  for (const combo of combos) {
    // Calculate coverage score of combo against all opponents
    // For each opponent, we take the MAX score achieved by ANY of our 3 selected Pokemon
    let totalCoverageScore = 0;
    for (const o of oppTeam) {
      if (o.isFainted) continue;
      const bestMatchForOpp = Math.max(...combo.map(p => matrix[p.species][o.species]));
      totalCoverageScore += bestMatchForOpp;
    }
    
    if (totalCoverageScore > maxComboScore) {
      maxComboScore = totalCoverageScore;
      bestCombo = combo.map(p => p.species);
    }
  }

  // Get lead recommendation from selected combo
  const selectedPokes = playerTeam.filter(p => bestCombo.includes(p.species));
  const leadRec = recommendLead(selectedPokes, oppTeam, battleState);
  const bench = bestCombo.filter(name => name !== leadRec.species);

  return {
    recommendedTeam3: bestCombo,
    lead: leadRec,
    bench
  };
}
