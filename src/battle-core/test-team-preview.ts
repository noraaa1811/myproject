import { TeamPreviewAI } from './team-preview-ai';

const myTeam = ['Azumarill', 'Charizard', 'Venusaur', 'Blastoise', 'Dragonite', 'Great Tusk'];
const opponentTeam = ['Dragonite', 'Kingambit', 'Gyarados', 'Gholdengo', 'Iron Valiant', 'Cinderace'];

const result = TeamPreviewAI.analyze({ myTeam, opponentTeam });

console.log("=== TEAM PREVIEW AI TEST SUCCESS ===");
console.log(JSON.stringify(result, null, 2));
