import { 
  BattleState, SideState, PokemonState, 
  MoveRecommendation, SwitchRecommendation 
} from './types';
import { calculateDamage, getModifiedSpeed, getTypeEffectiveness } from './calculator';
import { normalizePokemonState, predictOpponentBuilds } from './analyzer';

/**
 * Heuristic state evaluator for a single side.
 * Returns a score representing the strength of the side's current position.
 */
export function evaluateSideWeight(side: SideState, isPlayer: boolean, battleState: BattleState): number {
  let score = 0;

  // 1. HP & Presence of team members
  for (const p of side.team) {
    const norm = normalizePokemonState(p);
    if (norm.isFainted || norm.currentHp <= 0) continue;

    // Remaining HP weight
    const hpPct = norm.currentHp / (norm.maxHp || 100);
    let pokeWeight = hpPct * 100; // 0 to 100 base points

    // Active Pokemon holds additional field value
    if (norm.isActive) {
      pokeWeight *= 1.4; // 40% active presence bonus

      // Stat stages influence
      const mods = norm.statModifiers;
      const positiveStages = (mods.atk > 0 ? mods.atk : 0) + 
                             (mods.def > 0 ? mods.def : 0) + 
                             (mods.spa > 0 ? mods.spa : 0) + 
                             (mods.spd > 0 ? mods.spd : 0) + 
                             (mods.spe > 0 ? mods.spe : 0);
      const negativeStages = (mods.atk < 0 ? mods.atk : 0) + 
                             (mods.def < 0 ? mods.def : 0) + 
                             (mods.spa < 0 ? mods.spa : 0) + 
                             (mods.spd < 0 ? mods.spd : 0) + 
                             (mods.spe < 0 ? mods.spe : 0);
      
      pokeWeight += positiveStages * 10;
      pokeWeight += negativeStages * 8; // penalty for lowered stats
    }

    // Status conditions penalties
    if (norm.status === 'ASLEEP' || norm.status === 'FROZEN') {
      pokeWeight -= 30;
    } else if (norm.status === 'BURNED' || norm.status === 'PARALYZED' || norm.status === 'POISONED' || norm.status === 'TOXIC') {
      pokeWeight -= 15;
    }

    score += pokeWeight;
  }

  // 2. Entry Hazards penalties
  const haz = side.hazards;
  if (haz.stealthRock) score -= 15;
  score -= haz.spikes * 10;
  score -= haz.toxicSpikes * 8;
  if (haz.stickyWeb) score -= 12;

  // 3. Screen buffs
  const scr = side.screens;
  if (scr.reflect > 0) score += 10;
  if (scr.lightScreen > 0) score += 10;
  if (scr.auroraVeil > 0) score += 15;

  // 4. Tailwind
  if (side.tailwind > 0) score += 15;

  return score;
}

/**
 * Calculates the current win probability (P(Win)) using a sigmoid function.
 * P(Win) = 1 / (1 + exp(-delta / k))
 */
export function estimateWinProbability(battleState: BattleState): number {
  const playerScore = evaluateSideWeight(battleState.player, true, battleState);
  const opponentScore = evaluateSideWeight(battleState.opponent, false, battleState);
  
  const delta = playerScore - opponentScore;
  const k = 50; // Scaling sensitivity factor
  
  const probability = 1 / (1 + Math.exp(-delta / k));
  // Round to 2 decimal places
  return Math.round(probability * 100) / 100;
}

/**
 * Predicts the state transition for a specific move and evaluates its recommendation strength.
 */
export function recommendMoves(battleState: BattleState): MoveRecommendation[] {
  const playerActive = battleState.player.active;
  const oppActive = battleState.opponent.active;

  if (!playerActive || !oppActive || playerActive.isFainted || oppActive.isFainted) {
    return [];
  }

  const normPlayer = normalizePokemonState(playerActive);
  const normOpp = normalizePokemonState(oppActive);

  // Fallback moves if none are set
  const movesToEvaluate = normPlayer.moves.length > 0 ? normPlayer.moves : ['Tackle'];

  const currentWinProb = estimateWinProbability(battleState);
  const recommendations: MoveRecommendation[] = [];

  for (const mName of movesToEvaluate) {
    // Basic dynamic move object representation
    let moveType = normPlayer.types[0];
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
    else if (lower.includes('roost') || lower.includes('recover') || lower.includes('slack off')) { cat = 'Status'; bp = 0; }
    else if (lower.includes('swords dance') || lower.includes('nasty plot') || lower.includes('dragon dance')) { cat = 'Status'; bp = 0; }

    const moveObj = { name: mName, type: moveType, category: cat, basePower: bp, accuracy: 100 };
    
    // 1. Run damage calculation
    const calc = calculateDamage(normPlayer, normOpp, moveObj, battleState, true);
    const expectedDmgPct = Math.round((calc.damagePercentMin + calc.damagePercentMax) / 2);

    // 2. State transition projection
    let winRateImpact = 0;
    let confidence = 0.5;
    let rationale = '';

    if (cat === 'Status') {
      if (lower.includes('roost') || lower.includes('recover') || lower.includes('slack off')) {
        // Project healing
        const nextHp = Math.min(normPlayer.maxHp, normPlayer.currentHp + Math.floor(normPlayer.maxHp * 0.5));
        const projectedPlayer = { ...normPlayer, currentHp: nextHp };
        const projectedState: BattleState = {
          ...battleState,
          player: {
            ...battleState.player,
            active: projectedPlayer,
            team: battleState.player.team.map(p => p.species === normPlayer.species ? projectedPlayer : p)
          }
        };
        const nextWinProb = estimateWinProbability(projectedState);
        winRateImpact = nextWinProb - currentWinProb;
        confidence = 0.65;
        rationale = `Heal active Pokemon (+50% HP). Restores defensive integrity.`;
      } else {
        // Boost setup (Swords Dance, etc.)
        const projectedPlayer = { 
          ...normPlayer, 
          statModifiers: { ...normPlayer.statModifiers, atk: Math.min(6, normPlayer.statModifiers.atk + 2) } 
        };
        const projectedState: BattleState = {
          ...battleState,
          player: {
            ...battleState.player,
            active: projectedPlayer,
            team: battleState.player.team.map(p => p.species === normPlayer.species ? projectedPlayer : p)
          }
        };
        const nextWinProb = estimateWinProbability(projectedState);
        winRateImpact = nextWinProb - currentWinProb + 0.05; // setup bias
        confidence = 0.70;
        rationale = `Setup Attack boost (+2 stages). Prepares sweep conditions.`;
      }
    } else {
      // Offensive move transition (subtract health from opponent)
      const nextOppHp = Math.max(0, normOpp.currentHp - Math.round((calc.damagePercentMin + calc.damagePercentMax) / 200 * normOpp.maxHp));
      const isFainted = nextOppHp <= 0;
      
      const projectedOpp = { ...normOpp, currentHp: nextOppHp, isFainted };
      const projectedState: BattleState = {
        ...battleState,
        opponent: {
          ...battleState.opponent,
          active: projectedOpp,
          team: battleState.opponent.team.map(p => p.species === normOpp.species ? projectedOpp : p)
        }
      };

      const nextWinProb = estimateWinProbability(projectedState);
      winRateImpact = nextWinProb - currentWinProb;

      // Build recommendations confidence & description
      const typeEff = getTypeEffectiveness(moveObj.type, normOpp.types);
      if (isFainted) {
        confidence = 0.95;
        winRateImpact += 0.2; // heavy KO bonus
        rationale = `Secures a clean KO on opponent's active ${normOpp.species} this turn.`;
      } else if (typeEff > 1) {
        confidence = 0.80;
        rationale = `Super-effective STAB choice hitting for ${calc.damagePercentMin}%-${calc.damagePercentMax}% damage.`;
      } else {
        confidence = 0.60;
        rationale = `Neutral offensive damage option (${calc.damagePercentMin}%-${calc.damagePercentMax}%).`;
      }
    }

    recommendations.push({
      moveName: mName,
      expectedDamagePercent: expectedDmgPct,
      winRateImpact: Math.round(winRateImpact * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      rationale
    });
  }

  return recommendations.sort((a, b) => b.winRateImpact - a.winRateImpact);
}

/**
 * Predicts the state transition for a pokemon switch and recommends options.
 */
export function recommendSwitches(battleState: BattleState): SwitchRecommendation[] {
  const currentActive = battleState.player.active;
  const oppActive = battleState.opponent.active;

  if (!oppActive) return [];

  const normOpp = normalizePokemonState(oppActive);
  const currentWinProb = estimateWinProbability(battleState);
  const recommendations: SwitchRecommendation[] = [];

  // Find opponent's strongest attack moveset
  const oppSets = predictOpponentBuilds(normOpp);
  const oppExpectedMovesList = normOpp.moves.length > 0 ? normOpp.moves : oppSets[0].moves;

  const oppMoves: PokemonMove[] = oppExpectedMovesList.map(mName => {
    let moveType = normOpp.types[0];
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

    return { name: mName, type: moveType, category: cat, basePower: bp, accuracy: 100 };
  });

  for (const bMember of battleState.player.team) {
    // Skip if active or fainted
    if (bMember.isFainted || bMember.currentHp <= 0 || (currentActive && bMember.species === currentActive.species)) {
      continue;
    }

    const normBench = normalizePokemonState(bMember);

    // Calculate hazard entry damage (Stealth Rock, Spikes)
    let hazardDmgRatio = 0;
    const haz = battleState.player.hazards;
    
    // Stealth rock damage based on type weakness
    if (haz.stealthRock) {
      const srMultiplier = getTypeEffectiveness('Rock', normBench.types);
      hazardDmgRatio = 0.125 * srMultiplier; // standard 1/8th adjusted by typing
    }

    // Spikes damage
    if (haz.spikes > 0) {
      const spikesFrac = [0, 0.125, 0.166, 0.25]; // 1/8, 1/6, 1/4
      // Spikes do not hit flying or levitating targets
      const isGrounded = !normBench.types.includes('Flying') && normBench.ability.toLowerCase() !== 'levitate';
      if (isGrounded) {
        hazardDmgRatio += spikesFrac[Math.min(3, haz.spikes)];
      }
    }

    const entryHazardDmg = Math.floor(normBench.maxHp * hazardDmgRatio);

    // Calculate maximum expected damage taken on switch-in from opponent active Pokemon
    let maxExpectedDmgPct = 0;
    for (const oMove of oppMoves) {
      const calc = calculateDamage(normOpp, normBench, oMove, battleState, false);
      if (calc.damagePercentMax > maxExpectedDmgPct) {
        maxExpectedDmgPct = calc.damagePercentMax;
      }
    }

    // Projected HP after switch hazards and incoming attack
    const hpAfterHazards = Math.max(0, normBench.currentHp - entryHazardDmg);
    const hpAfterAttack = Math.max(0, hpAfterHazards - Math.round(maxExpectedDmgPct / 100 * normBench.maxHp));
    const isFainted = hpAfterAttack <= 0;

    // Build projected state
    const projectedBench = { ...normBench, currentHp: hpAfterAttack, isActive: true, isFainted };
    
    // Old active goes back to bench
    const projectedBenchList = battleState.player.team.map(p => {
      if (p.species === normBench.species) {
        return projectedBench;
      }
      if (currentActive && p.species === currentActive.species) {
        return { ...currentActive, isActive: false };
      }
      return p;
    });

    const projectedState: BattleState = {
      ...battleState,
      player: {
        ...battleState.player,
        active: projectedBench,
        team: projectedBenchList
      }
    };

    const nextWinProb = estimateWinProbability(projectedState);
    const winRateImpact = nextWinProb - currentWinProb;

    // Define confidence levels and rationale descriptions
    let confidence = 0.5;
    let rationale = '';

    if (isFainted) {
      confidence = 0.1;
      rationale = `Dangerous! Switching-in results in fainted Pokemon due to hazard/attack damage.`;
    } else if (maxExpectedDmgPct < 25) {
      confidence = 0.85;
      rationale = `Safe switch-in. Resists opponent's active typing and takes negligible damage (<25%).`;
    } else if (maxExpectedDmgPct < 50) {
      confidence = 0.65;
      rationale = `Viable pivot. Handily survives switch-in attack but takes moderate chip damage.`;
    } else {
      confidence = 0.35;
      rationale = `High risk. Takes heavy damage (${maxExpectedDmgPct}%) during switch-in phase.`;
    }

    recommendations.push({
      species: normBench.species,
      expectedDamageTakenPercent: Math.round(maxExpectedDmgPct),
      winRateImpact: Math.round(winRateImpact * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      rationale
    });
  }

  return recommendations.sort((a, b) => b.winRateImpact - a.winRateImpact);
}
