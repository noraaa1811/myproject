import { PokemonState, PokemonMove, BattleState, MoveDamageCalculation } from './types';

// Complete 18x18 Type Effectiveness Chart
export const TYPE_CHART: Record<string, Record<string, number>> = {
  Normal: { Rock: 0.5, Ghost: 0, Steel: 0.5 },
  Fire: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
  Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
  Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
  Grass: { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Dragon: 0.5, Steel: 0.5 },
  Ice: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 },
  Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Steel: 2, Dark: 2, Fairy: 0.5 },
  Poison: { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0, Fairy: 2 },
  Ground: { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 },
  Flying: { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
  Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Steel: 0.5, Dark: 0 },
  Bug: { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Steel: 0.5, Dark: 2, Fairy: 0.5 },
  Rock: { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
  Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5 },
  Dragon: { Dragon: 2, Steel: 0.5, Fairy: 0 },
  Steel: { Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5, Fire: 0.5, Fairy: 2 },
  Dark: { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Fairy: 0.5 },
  Fairy: { Fire: 0.5, Fighting: 2, Poison: 0.5, Dragon: 2, Steel: 0.5, Dark: 2 },
};

/**
 * Calculates the effectiveness multiplier of an attacking type against a defending type list.
 */
export function getTypeEffectiveness(attackType: string, defenderTypes: string[]): number {
  let multiplier = 1;
  const attack = attackType.charAt(0).toUpperCase() + attackType.slice(1).toLowerCase();
  
  for (const type of defenderTypes) {
    const def = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
    if (TYPE_CHART[attack] && TYPE_CHART[attack][def] !== undefined) {
      multiplier *= TYPE_CHART[attack][def];
    }
  }
  return multiplier;
}

/**
 * Scales a stat based on its modifier stage (-6 to +6).
 */
export function applyStatModifier(statVal: number, stage: number, isAccuracyOrEvasion = false): number {
  if (stage === 0) return statVal;
  
  if (isAccuracyOrEvasion) {
    // Accuracy/Evasion scale by 3/3, 4/3, etc.
    const numerator = stage > 0 ? 3 + stage : 3;
    const denominator = stage > 0 ? 3 : 3 - stage;
    return Math.floor(statVal * (numerator / denominator));
  } else {
    // Normal stats scale by 2/2, 3/2, 4/2...
    const numerator = stage > 0 ? 2 + stage : 2;
    const denominator = stage > 0 ? 2 : 2 - stage;
    return Math.floor(statVal * (numerator / denominator));
  }
}

/**
 * Estimates actual in-battle stats from base stats.
 * Uses standard competitive default configurations (31 IVs, 252 EVs or 0 EVs based on context).
 */
export function calculateActualStat(base: number, statName: 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe', level: number, ev = 0, natureMultiplier = 1.0): number {
  const iv = 31;
  if (statName === 'hp') {
    // Shedinja exception
    if (base === 1) return 1;
    return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
  } else {
    const val = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
    return Math.floor(val * natureMultiplier);
  }
}

/**
 * Returns speed stat adjusted for modifiers, weather (e.g. Chlorophyll), and tailwind.
 */
export function getModifiedSpeed(pokemon: PokemonState, battleState: BattleState, isPlayer: boolean): number {
  const baseSpe = pokemon.baseStats.spe;
  // Standard competitive speed calculation assuming Jolly/Timid or standard investment if active
  const ev = 252; // default competitive assumption
  const natureVal = 1.1; // positive nature Spe
  const rawSpe = calculateActualStat(baseSpe, 'spe', pokemon.level, ev, natureVal);
  
  let modifiedSpe = applyStatModifier(rawSpe, pokemon.statModifiers.spe);
  
  // Tailwind
  const side = isPlayer ? battleState.player : battleState.opponent;
  if (side.tailwind > 0) {
    modifiedSpe *= 2;
  }
  
  // Weather Abilities (e.g., Chlorophyll in Sun, Swift Swim in Rain, Slush Rush in Snow)
  const sunAbilities = ['chlorophyll'];
  const rainAbilities = ['swift swim', 'swiftswim'];
  const snowAbilities = ['slush rush', 'slushrush'];
  const sandAbilities = ['sand rush', 'sandrush'];
  
  const abilityLower = pokemon.ability.toLowerCase();
  if (battleState.weather === 'SUN' && sunAbilities.includes(abilityLower)) modifiedSpe *= 2;
  if (battleState.weather === 'RAIN' && rainAbilities.includes(abilityLower)) modifiedSpe *= 2;
  if (battleState.weather === 'SNOW' && snowAbilities.includes(abilityLower)) modifiedSpe *= 2;
  if (battleState.weather === 'SAND' && sandAbilities.includes(abilityLower)) modifiedSpe *= 2;
  
  // Status condition (Paralysis reduces speed by 50% in Gen 7+)
  if (pokemon.status === 'PARALYZED' && pokemon.ability.toLowerCase() !== 'quick feet') {
    modifiedSpe = Math.floor(modifiedSpe * 0.5);
  }
  
  // Items (Choice Scarf)
  if (pokemon.item.toLowerCase() === 'choice scarf' || pokemon.item.toLowerCase() === 'choicescarf') {
    modifiedSpe = Math.floor(modifiedSpe * 1.5);
  }
  
  return modifiedSpe;
}

/**
 * Performs standard Generation 9 damage calculation between attacker and defender.
 */
export function calculateDamage(
  attacker: PokemonState,
  defender: PokemonState,
  move: PokemonMove,
  battleState: BattleState,
  isAttackerPlayer: boolean
): MoveDamageCalculation {
  // If move has no base power, it's a status move (0 damage)
  if (move.category === 'Status' || move.basePower <= 0) {
    return {
      moveName: move.name,
      damagePercentMin: 0,
      damagePercentMax: 0,
      rolls: [0],
      koChance: 'N/A',
    };
  }

  // 1. Calculate stats
  const level = attacker.level;
  const isPhysical = move.category === 'Physical';
  
  // Attacking stat
  const baseAtk = isPhysical ? attacker.baseStats.atk : attacker.baseStats.spa;
  const atkEv = 252; // Default full investment
  const atkNature = 1.1; // Default positive nature
  let atkVal = calculateActualStat(baseAtk, isPhysical ? 'atk' : 'spa', level, atkEv, atkNature);
  atkVal = applyStatModifier(atkVal, isPhysical ? attacker.statModifiers.atk : attacker.statModifiers.spa);
  
  // Defending stat
  const baseDef = isPhysical ? defender.baseStats.def : defender.baseStats.spd;
  const defEv = 252; // Default tanky investment
  const defNature = 1.0; // Default neutral nature
  let defVal = calculateActualStat(baseDef, isPhysical ? 'def' : 'spd', defender.level, defEv, defNature);
  defVal = applyStatModifier(defVal, isPhysical ? defender.statModifiers.def : defender.statModifiers.spd);

  // Sandstorm boost for Rock types
  if (battleState.weather === 'SAND' && !isPhysical && defender.types.includes('Rock')) {
    defVal = Math.floor(defVal * 1.5);
  }

  // Snow boost for Ice types
  if (battleState.weather === 'SNOW' && isPhysical && defender.types.includes('Ice')) {
    defVal = Math.floor(defVal * 1.5);
  }

  // 2. Base Power modifiers
  let basePower = move.basePower;

  // Weather boosts
  if (battleState.weather === 'SUN') {
    if (move.type === 'Fire') basePower = Math.floor(basePower * 1.5);
    if (move.type === 'Water') basePower = Math.floor(basePower * 0.5);
  } else if (battleState.weather === 'RAIN') {
    if (move.type === 'Water') basePower = Math.floor(basePower * 1.5);
    if (move.type === 'Fire') basePower = Math.floor(basePower * 0.5);
  }

  // Terrain boosts
  if (battleState.terrain === 'ELECTRIC' && move.type === 'Electric') {
    basePower = Math.floor(basePower * 1.3);
  } else if (battleState.terrain === 'GRASSY' && move.type === 'Grass') {
    basePower = Math.floor(basePower * 1.3);
  } else if (battleState.terrain === 'PSYCHIC' && move.type === 'Psychic') {
    basePower = Math.floor(basePower * 1.3);
  } else if (battleState.terrain === 'MISTY' && move.type === 'Dragon') {
    basePower = Math.floor(basePower * 0.5); // Misty terrain halves dragon move power
  }

  // 3. Core Damage Formula
  const levelPart = (2 * level) / 5 + 2;
  const baseDamage = Math.floor(Math.floor((levelPart * basePower * atkVal) / defVal) / 50) + 2;

  // 4. Modifiers
  // Screens (Reflect / Light Screen / Aurora Veil)
  let screenMultiplier = 1.0;
  const defenderSide = isAttackerPlayer ? battleState.opponent : battleState.player;
  
  if (isPhysical && (defenderSide.screens.reflect > 0 || defenderSide.screens.auroraVeil > 0)) {
    screenMultiplier = 0.5; // Single battle screen halves damage
  } else if (!isPhysical && (defenderSide.screens.lightScreen > 0 || defenderSide.screens.auroraVeil > 0)) {
    screenMultiplier = 0.5;
  }

  // Burn status halves physical damage (unless Guts ability)
  let burnMultiplier = 1.0;
  if (isPhysical && attacker.status === 'BURNED' && attacker.ability.toLowerCase() !== 'guts') {
    burnMultiplier = 0.5;
  }

  // STAB (Same Type Attack Bonus)
  let stabMultiplier = 1.0;
  const attackerTypes = attacker.isTerastallized && attacker.teraType ? [attacker.teraType] : attacker.types;
  if (attackerTypes.includes(move.type)) {
    stabMultiplier = attacker.isTerastallized && attacker.types.includes(move.type) ? 2.0 : 1.5;
  }

  // Type effectiveness
  const defenderTypes = defender.isTerastallized && defender.teraType ? [defender.teraType] : defender.types;
  const typeMultiplier = getTypeEffectiveness(move.type, defenderTypes);

  // 5. Generate Rolls (16 possible random roll multipliers from 0.85 to 1.00)
  const rolls: number[] = [];
  const defenderMaxHp = defender.maxHp > 0 ? defender.maxHp : 100;
  
  for (let i = 85; i <= 100; i++) {
    const rollPercent = i / 100;
    let finalDamage = Math.floor(baseDamage * rollPercent);
    finalDamage = Math.floor(finalDamage * screenMultiplier);
    finalDamage = Math.floor(finalDamage * burnMultiplier);
    finalDamage = Math.floor(finalDamage * stabMultiplier);
    finalDamage = Math.floor(finalDamage * typeMultiplier);
    
    // Minimum 1 damage if type effectiveness is not zero
    if (typeMultiplier > 0 && finalDamage <= 0) {
      finalDamage = 1;
    }
    
    rolls.push(finalDamage);
  }

  // Express in terms of % of target's current maximum HP
  const minDamage = rolls[0];
  const maxDamage = rolls[rolls.length - 1];

  const damagePercentMin = Math.round((minDamage / defenderMaxHp) * 1000) / 10;
  const damagePercentMax = Math.round((maxDamage / defenderMaxHp) * 1000) / 10;

  // Determine KO chance
  let koChance = 'Does not KO';
  if (minDamage >= defender.currentHp) {
    koChance = 'Guaranteed OHKO';
  } else if (maxDamage >= defender.currentHp) {
    const koRollsCount = rolls.filter(dmg => dmg >= defender.currentHp).length;
    const koChancePct = Math.round((koRollsCount / rolls.length) * 1000) / 10;
    koChance = `${koChancePct}% chance to OHKO`;
  } else {
    // Estimate 2HKO / 3HKO
    const min2Hits = minDamage * 2;
    const max2Hits = maxDamage * 2;
    if (min2Hits >= defender.currentHp) {
      koChance = 'Guaranteed 2HKO';
    } else if (max2Hits >= defender.currentHp) {
      koChance = 'Likely 2HKO';
    } else {
      const min3Hits = minDamage * 3;
      const max3Hits = maxDamage * 3;
      if (min3Hits >= defender.currentHp) {
        koChance = 'Guaranteed 3HKO';
      } else if (max3Hits >= defender.currentHp) {
        koChance = 'Likely 3HKO';
      }
    }
  }

  return {
    moveName: move.name,
    damagePercentMin,
    damagePercentMax,
    rolls,
    koChance,
  };
}
