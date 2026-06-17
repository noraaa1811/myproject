import { METAGAME_SETS_DB } from './analyzer';

export interface ObservationInput {
  species: string;
  revealedMoves: string[];
  revealedItem?: string | null;
  revealedAbility?: string | null;
}

export interface PredictionItem {
  name: string;
  probability: number; // e.g. 83 for 83%
}

export interface HiddenPredictionReport {
  species: string;
  observedMoves: string[];
  observedItem: string | null;
  observedAbility: string | null;
  predictedMoves: PredictionItem[];
  predictedItems: PredictionItem[];
  predictedAbilities: PredictionItem[];
}

export class HiddenInfoEngine {
  /**
   * Predicts hidden movesets, items, and abilities based on partial battle telemetry.
   */
  public static predict(input: ObservationInput): HiddenPredictionReport {
    const species = input.species;
    const observedMoves = input.revealedMoves.map(m => m.toLowerCase());
    const observedItem = input.revealedItem ? input.revealedItem.toLowerCase() : null;
    const observedAbility = input.revealedAbility ? input.revealedAbility.toLowerCase() : null;

    // 1. Fetch meta builds from database
    const builds = METAGAME_SETS_DB[species];
    if (!builds || builds.length === 0) {
      // Return empty predictions if metagame database does not have data for this species
      return {
        species,
        observedMoves: input.revealedMoves,
        observedItem: input.revealedItem || null,
        observedAbility: input.revealedAbility || null,
        predictedMoves: [],
        predictedItems: [],
        predictedAbilities: []
      };
    }

    // 2. Score each competitive set based on observations
    const scoredBuilds = builds.map((build) => {
      let score = build.probability; // start with baseline meta usage rate

      // Check moves
      observedMoves.forEach((obsMove) => {
        const hasMove = build.moves.some(m => m.toLowerCase() === obsMove);
        if (hasMove) {
          score *= 1.5; // match boost
        } else {
          score *= 0.02; // heavy penalty for mismatch
        }
      });

      // Check item
      if (observedItem) {
        const isMatch = build.item.toLowerCase() === observedItem;
        if (isMatch) {
          score *= 2.0;
        } else {
          score *= 0.01;
        }
      }

      // Check ability
      if (observedAbility) {
        const isMatch = build.ability.toLowerCase() === observedAbility;
        if (isMatch) {
          score *= 2.0;
        } else {
          score *= 0.01;
        }
      }

      return {
        build,
        score
      };
    });

    // 3. Normalize scores to sum to 1.0 (probabilities)
    const totalScore = scoredBuilds.reduce((sum, item) => sum + item.score, 0);
    const normalizedBuilds = scoredBuilds.map((item) => ({
      build: item.build,
      probability: totalScore > 0 ? item.score / totalScore : 1 / builds.length
    }));

    // 4. Aggregate probability weights for moves, items, and abilities
    const moveWeights: Record<string, number> = {};
    const itemWeights: Record<string, number> = {};
    const abilityWeights: Record<string, number> = {};

    normalizedBuilds.forEach(({ build, probability }) => {
      // Accumulate moves
      build.moves.forEach((move) => {
        // Format name consistently
        const mKey = move;
        const mLower = mKey.toLowerCase();
        
        // Skip already observed moves
        if (observedMoves.includes(mLower)) return;

        moveWeights[mKey] = (moveWeights[mKey] || 0) + probability;
      });

      // Accumulate item
      const itemKey = build.item;
      const itemLower = itemKey.toLowerCase();
      if (!observedItem || itemLower !== observedItem) {
        itemWeights[itemKey] = (itemWeights[itemKey] || 0) + probability;
      }

      // Accumulate ability
      const abilityKey = build.ability;
      const abilityLower = abilityKey.toLowerCase();
      if (!observedAbility || abilityLower !== observedAbility) {
        abilityWeights[abilityKey] = (abilityWeights[abilityKey] || 0) + probability;
      }
    });

    // 5. Convert to sorted array lists (scale to 0-100 percentage values)
    const predictedMoves = Object.entries(moveWeights)
      .map(([name, weight]) => ({
        name,
        probability: Math.round(weight * 100)
      }))
      .sort((a, b) => b.probability - a.probability || a.name.localeCompare(b.name));

    const predictedItems = Object.entries(itemWeights)
      .map(([name, weight]) => ({
        name,
        probability: Math.round(weight * 100)
      }))
      .sort((a, b) => b.probability - a.probability || a.name.localeCompare(b.name));

    const predictedAbilities = Object.entries(abilityWeights)
      .map(([name, weight]) => ({
        name,
        probability: Math.round(weight * 100)
      }))
      .sort((a, b) => b.probability - a.probability || a.name.localeCompare(b.name));

    return {
      species,
      observedMoves: input.revealedMoves,
      observedItem: input.revealedItem || null,
      observedAbility: input.revealedAbility || null,
      predictedMoves,
      predictedItems,
      predictedAbilities
    };
  }
}
