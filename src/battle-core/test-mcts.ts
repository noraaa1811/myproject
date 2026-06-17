import { ChampionBattleAI } from './champion-ai';

const myPokemon = 'Azumarill';
const enemyPokemon = 'Gholdengo';
const myHP = 80;
const enemyHP = 100;
const status = ['NONE'];
const turn = 1;

const result = ChampionBattleAI.solve({
  myPokemon,
  enemyPokemon,
  myHP,
  enemyHP,
  status,
  turn
});

console.log("=== MONTE CARLO TREE SEARCH (MCTS) TEST SUCCESS ===");
console.log(`Recommended Move : ${result.recommendedAction}`);
console.log(`Expected Value   : ${result.expectedValue}`);
console.log(`Win Probability  : ${result.winProbability}`);
console.log(`Confidence       : ${result.confidence}%`);
console.log(`Reasoning        : ${result.reason}`);
