import { BattleAnalysisEngine } from './engine';

console.log('--- Initializing Battle Analysis Engine Test ---');

// 1. Create instance of the engine
const engine = new BattleAnalysisEngine('test-battle-123', 'gen9ou');

// 2. Setup Player and Opponent Teams
console.log('\nSetting up teams...');
engine.setTeam('player', [
  { species: 'Charizard', level: 100, types: ['Fire', 'Flying'], baseStats: { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 } },
  { species: 'Venusaur', level: 100, types: ['Grass', 'Poison'], baseStats: { hp: 80, atk: 82, def: 83, spa: 100, spd: 100, spe: 80 } },
  { species: 'Blastoise', level: 100, types: ['Water'], baseStats: { hp: 79, atk: 83, def: 100, spa: 85, spd: 105, spe: 78 } }
]);

engine.setTeam('opponent', [
  { species: 'Great Tusk', level: 100, types: ['Ground', 'Fighting'], baseStats: { hp: 90, atk: 131, def: 131, spa: 53, spd: 53, spe: 87 } },
  { species: 'Gyarados', level: 100, types: ['Water', 'Flying'], baseStats: { hp: 95, atk: 125, def: 79, spa: 60, spd: 100, spe: 81 } },
  { species: 'Kingambit', level: 100, types: ['Dark', 'Steel'], baseStats: { hp: 100, atk: 135, def: 120, spa: 60, spd: 85, spe: 50 } }
]);

// 3. Initial Lead Recommendation Analysis
console.log('\n--- Run Turn 1 Pre-Battle Analysis ---');
let analysis = engine.analyze();
console.log(`Estimated Win Probability: ${analysis.winProbability * 100}%`);
if (analysis.selection) {
  console.log(`Recommended Lead: ${analysis.selection.lead.species} (Matchup Score: ${analysis.selection.lead.matchupScore})`);
  console.log(`Rationale: ${analysis.selection.lead.rationale}`);
  console.log(`Recommended Bring-3 Team: ${analysis.selection.recommendedTeam3.join(', ')}`);
}

// 4. Set Leads and Simulate Turn 1 Start
console.log('\n--- Simulating Turn 1 (Charizard vs Great Tusk) ---');
engine.setActivePokemon('player', 'Charizard');
engine.setActivePokemon('opponent', 'Great Tusk');

analysis = engine.analyze();
console.log(`Active Matchup: Player ${analysis.activeMatchup?.playerSpecies} vs Opponent ${analysis.activeMatchup?.opponentSpecies}`);
console.log(`Player has Speed Advantage: ${analysis.activeMatchup?.playerSpeedAdvantage}`);

console.log('\nPlayer Move Recommendations:');
analysis.recommendedActions.moves.forEach(m => {
  console.log(` - Move: ${m.moveName} | Win Impact: ${m.winRateImpact} | Confidence: ${m.confidence} | Rationale: ${m.rationale}`);
});

console.log('\nPlayer Switch Recommendations:');
analysis.recommendedActions.switches.forEach(s => {
  console.log(` - Switch to: ${s.species} | Exp Damage Taken: ${s.expectedDamageTakenPercent}% | Win Impact: ${s.winRateImpact}`);
});

// 5. Simulate Turn 2 (Sun weather set, Great Tusk takes damage)
console.log('\n--- Simulating Turn 2 (Sunny Weather set, Great Tusk damaged to 20% HP) ---');
engine.setWeather('SUN', 5);
engine.updatePokemonStatus('opponent', 'Great Tusk', 20); // Great Tusk HP drops to 20%
engine.revealMove('opponent', 'Great Tusk', 'Earthquake');

analysis = engine.analyze();
console.log(`Estimated Win Probability: ${analysis.winProbability * 100}%`);

console.log('\nThreat Analysis:');
console.log(`Active Threat Level: ${analysis.threats.activeThreatLevel}/10`);
analysis.threats.keyThreats.forEach(t => {
  console.log(` - ${t.species}: Score ${t.threatScore} | Reason: ${t.reason}`);
});

console.log('\nOpponent Set Predictions for Great Tusk:');
analysis.opponentPredictions
  .find(p => p.species === 'Great Tusk')
  ?.predictedBuilds.forEach(build => {
    console.log(` - Set: ${build.setName} | Prob: ${build.probability * 100}% | Moves: ${build.moves.join(', ')}`);
  });

console.log('\nUpdated Player Move Recommendations under Sun:');
analysis.recommendedActions.moves.forEach(m => {
  console.log(` - Move: ${m.moveName} | Expected Damage: ${m.expectedDamagePercent}% | Win Impact: ${m.winRateImpact} | Rationale: ${m.rationale}`);
});

console.log('\n--- Engine Validation Complete ---');
