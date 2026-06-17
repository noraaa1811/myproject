import { HiddenInfoEngine } from './hidden-info-engine';

const species = 'Dragonite';
const revealedMoves = ['Dragon Dance'];

const result = HiddenInfoEngine.predict({ species, revealedMoves });

console.log("=== HIDDEN INFORMATION ENGINE TEST SUCCESS ===");
console.log(`Observed for ${result.species}:`);
console.log(`  Moves: ${result.observedMoves.join(', ')}`);
console.log("");
console.log("Prediction (Unrevealed Moves):");
result.predictedMoves.forEach((move) => {
  console.log(`  ${move.name} ${move.probability}%`);
});

console.log("");
console.log("Prediction (Unrevealed Items):");
result.predictedItems.forEach((item) => {
  console.log(`  ${item.name} ${item.probability}%`);
});

console.log("");
console.log("Prediction (Unrevealed Abilities):");
result.predictedAbilities.forEach((ability) => {
  console.log(`  ${ability.name} ${ability.probability}%`);
});
