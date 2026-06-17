import { ChampionBattleAI } from './champion-ai';

// Mock the BattleState JSON input from the CV detector or client
const mockStateInput = {
  myPokemon: "Azumarill",
  enemyPokemon: "Dragonite",
  myHP: 84,
  enemyHP: 100,
  status: [],
  turn: 4
};

// Execute solver
const result = ChampionBattleAI.solve(mockStateInput);

// Print the JSON result to verify it conforms exactly to output specifications
console.log(JSON.stringify(result, null, 2));
