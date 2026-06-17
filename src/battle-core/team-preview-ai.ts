import { PokemonState, BattleState } from './types';
import { 
  normalizePokemonState, 
  buildMatchupMatrix, 
  analyzeThreats, 
  recommendTeamSelection 
} from './analyzer';

export interface TeamPreviewInput {
  myTeam: (string | Partial<PokemonState>)[];
  opponentTeam: (string | Partial<PokemonState>)[];
}

export interface ThreatRankingItem {
  species: string;
  score: number;
  reason: string;
}

export interface TeamPreviewOutput {
  recommendedTeam3: string[];
  recommendedLead: string;
  threatRanking: ThreatRankingItem[];
  predictedOpponentTeam3: string[];
  predictedOpponentLead: string;
  confidence: number;
}

export class TeamPreviewAI {
  /**
   * Evaluates the team preview phase and recommends optimal strategies.
   */
  public static analyze(input: TeamPreviewInput): TeamPreviewOutput {
    // 1. Normalize both teams to full PokemonState structures
    const playerTeam: PokemonState[] = input.myTeam.map((poke) => {
      if (typeof poke === 'string') {
        return normalizePokemonState({ species: poke });
      }
      return normalizePokemonState(poke as any);
    });

    const opponentTeam: PokemonState[] = input.opponentTeam.map((poke) => {
      if (typeof poke === 'string') {
        return normalizePokemonState({ species: poke });
      }
      return normalizePokemonState(poke as any);
    });

    // Create helper to construct full SideState instances
    const createMockSide = (team: PokemonState[]) => ({
      username: 'trainer',
      active: team[0] || null,
      team,
      hazards: { stealthRock: false, spikes: 0, toxicSpikes: 0, stickyWeb: false },
      screens: { reflect: 0, lightScreen: 0, auroraVeil: 0 },
      tailwind: 0
    });

    // Create a default empty battle state for the calculations
    const mockBattleState: BattleState = {
      battleId: 'preview-sim',
      turn: 0,
      format: 'gen9ou',
      weather: 'NONE',
      weatherTurnsRemaining: 0,
      terrain: 'NONE',
      terrainTurnsRemaining: 0,
      player: createMockSide(playerTeam),
      opponent: createMockSide(opponentTeam)
    };

    // 2. Run selections for the player side using the minimax matrix
    const myRec = recommendTeamSelection(playerTeam, opponentTeam, mockBattleState);
    const recommendedTeam3 = myRec.recommendedTeam3;
    const recommendedLead = myRec.lead.species;

    // 3. Run threat rankings based on typing coverage metrics
    const threatAnalysis = analyzeThreats(playerTeam, opponentTeam, mockBattleState);
    const threatRanking: ThreatRankingItem[] = threatAnalysis.keyThreats.map((t) => ({
      species: t.species,
      score: t.threatScore,
      reason: t.reason
    }));

    // 4. Predict the Opponent's Selection (Reciprocal evaluation)
    // We reverse the player and opponent arguments to see what team selection is game-theoretically optimal for them
    const opponentRec = recommendTeamSelection(opponentTeam, playerTeam, mockBattleState);
    const predictedOpponentTeam3 = opponentRec.recommendedTeam3;
    const predictedOpponentLead = opponentRec.lead.species;

    // 5. Calculate Confidence Score
    // Confidence is derived from the lead matchup score and the coverage margin.
    // If our lead has a solid advantage, confidence scales up. If we have deep holes, confidence decreases.
    const leadScore = myRec.lead.matchupScore;
    
    // Calculate typing team advantage margin
    const matrix = buildMatchupMatrix(playerTeam, opponentTeam, mockBattleState);
    let totalAdvantageSum = 0;
    let comparisons = 0;
    
    playerTeam.forEach(p => {
      opponentTeam.forEach(o => {
        totalAdvantageSum += matrix[p.species][o.species];
        comparisons++;
      });
    });

    const avgTeamAdvantage = comparisons > 0 ? totalAdvantageSum / comparisons : 0;
    
    // Scale confidence between 60% and 98%
    let confidence = 75 + Math.round(leadScore * 0.4) + Math.round(avgTeamAdvantage * 0.2);
    confidence = Math.min(98, Math.max(60, confidence));

    return {
      recommendedTeam3,
      recommendedLead,
      threatRanking,
      predictedOpponentTeam3,
      predictedOpponentLead,
      confidence
    };
  }
}
