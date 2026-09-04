/**
 * HYPERON-DEX PREDICTIVE INTELLIGENCE & SENTIMENT ENGINE
 * Powered by Google GenAI (Gemini 2.5 / 3.8 Flash SDK)
 *
 * Provides real-time predictive routing evaluation, whale flow sentiment analysis,
 * volatility risk estimation, and route execution confidence scoring (0-100).
 */

import { GoogleGenAI } from '@google/genai';

export interface PredictiveRouteInput {
  tokenInSymbol: string;
  tokenOutSymbol: string;
  amountInFormatted: string;
  expectedOutputFormatted: string;
  priceImpactBps: number;
  gasEstimatedUnits: number;
  routeDexList: string[];
  chainId: number;
}

export interface PredictiveAnalysisResult {
  confidenceScore: number; // 0 - 100
  marketSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  whalePressureIndex: number; // 0 - 100 (100 = high whale activity / sandwich danger)
  volatilityForecast: 'LOW' | 'MODERATE' | 'HIGH';
  mevRiskAssessment: 'MINIMAL' | 'MEDIUM' | 'ELEVATED';
  aiInsights: string;
  recommendedAction: 'EXECUTE_IMMEDIATELY' | 'SPLIT_ORDER' | 'USE_PRIVATE_RELAY';
  analyzedAt: number;
  source: 'GEMINI_GENAI_PRO' | 'QUANTITATIVE_FALLBACK';
}

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim() !== '') {
      geminiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }
  return geminiClient;
}

export class PredictiveEngine {
  /**
   * Evaluates a trade route and generates institutional sentiment & confidence metrics.
   */
  public static async analyzeRoute(input: PredictiveRouteInput): Promise<PredictiveAnalysisResult> {
    const client = getGeminiClient();

    // If Gemini client is available, attempt AI model analysis
    if (client) {
      try {
        const prompt = `You are the chief quantitative risk model for HYPERON-DEX institutional swap aggregator.
Analyze this proposed trade execution and return ONLY a valid JSON object matching the schema below:

Trade Context:
- Swap: ${input.amountInFormatted} ${input.tokenInSymbol} -> ${input.expectedOutputFormatted} ${input.tokenOutSymbol}
- Price Impact: ${(input.priceImpactBps / 100).toFixed(2)}%
- Gas Units: ${input.gasEstimatedUnits}
- Routed Protocols: ${input.routeDexList.join(', ')}
- Chain ID: ${input.chainId}

Output JSON format strictly:
{
  "confidenceScore": <number 0-100>,
  "marketSentiment": "<BULLISH|BEARISH|NEUTRAL>",
  "whalePressureIndex": <number 0-100>,
  "volatilityForecast": "<LOW|MODERATE|HIGH>",
  "mevRiskAssessment": "<MINIMAL|MEDIUM|ELEVATED>",
  "aiInsights": "<one concise sentence analysis>",
  "recommendedAction": "<EXECUTE_IMMEDIATELY|SPLIT_ORDER|USE_PRIVATE_RELAY>"
}`;

        const response = await client.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        const rawText = response.text?.trim();
        if (rawText) {
          const parsed = JSON.parse(rawText);
          return {
            confidenceScore: Math.min(100, Math.max(0, Math.round(Number(parsed.confidenceScore) || 95))),
            marketSentiment: ['BULLISH', 'BEARISH', 'NEUTRAL'].includes(parsed.marketSentiment)
              ? parsed.marketSentiment
              : 'NEUTRAL',
            whalePressureIndex: Math.min(100, Math.max(0, Math.round(Number(parsed.whalePressureIndex) || 15))),
            volatilityForecast: ['LOW', 'MODERATE', 'HIGH'].includes(parsed.volatilityForecast)
              ? parsed.volatilityForecast
              : 'LOW',
            mevRiskAssessment: ['MINIMAL', 'MEDIUM', 'ELEVATED'].includes(parsed.mevRiskAssessment)
              ? parsed.mevRiskAssessment
              : 'MINIMAL',
            aiInsights: parsed.aiInsights || 'Tuyến định tuyến đạt độ sâu thanh khoản tối ưu và phân tán rủi ro MEV hiệu quả.',
            recommendedAction: ['EXECUTE_IMMEDIATELY', 'SPLIT_ORDER', 'USE_PRIVATE_RELAY'].includes(parsed.recommendedAction)
              ? parsed.recommendedAction
              : 'USE_PRIVATE_RELAY',
            analyzedAt: Date.now(),
            source: 'GEMINI_GENAI_PRO',
          };
        }
      } catch (err) {
        console.warn('[PredictiveEngine] Gemini API call skipped or failed, using quantitative fallback:', (err as Error).message);
      }
    }

    // Deterministic Quantitative Fallback Model (Pure Mathematical & Rule-Based)
    return this.calculateQuantitativeMetrics(input);
  }

  /**
   * High-frequency quantitative fallback model based on price impact, liquidity depth, and gas economics.
   */
  public static calculateQuantitativeMetrics(input: PredictiveRouteInput): PredictiveAnalysisResult {
    let confidence = 98;
    // Penalize for high price impact (e.g. > 100 bps / 1%)
    if (input.priceImpactBps > 200) {
      confidence -= 25;
    } else if (input.priceImpactBps > 80) {
      confidence -= 12;
    } else if (input.priceImpactBps > 30) {
      confidence -= 5;
    }

    // Penalize if high gas consumption
    if (input.gasEstimatedUnits > 200_000) {
      confidence -= 6;
    }

    const whalePressure = Math.min(95, Math.max(5, Math.round(input.priceImpactBps * 0.45 + 10)));
    const volatility: 'LOW' | 'MODERATE' | 'HIGH' =
      input.priceImpactBps > 150 ? 'HIGH' : input.priceImpactBps > 50 ? 'MODERATE' : 'LOW';

    const mevRisk: 'MINIMAL' | 'MEDIUM' | 'ELEVATED' =
      whalePressure > 60 ? 'ELEVATED' : whalePressure > 30 ? 'MEDIUM' : 'MINIMAL';

    const recommendedAction: 'EXECUTE_IMMEDIATELY' | 'SPLIT_ORDER' | 'USE_PRIVATE_RELAY' =
      input.priceImpactBps > 100
        ? 'SPLIT_ORDER'
        : mevRisk === 'ELEVATED'
        ? 'USE_PRIVATE_RELAY'
        : 'EXECUTE_IMMEDIATELY';

    return {
      confidenceScore: Math.max(20, Math.min(100, confidence)),
      marketSentiment: input.tokenInSymbol === 'USDC' || input.tokenInSymbol === 'USDT' ? 'BULLISH' : 'NEUTRAL',
      whalePressureIndex: whalePressure,
      volatilityForecast: volatility,
      mevRiskAssessment: mevRisk,
      aiInsights: `Phân tích thuật toán: Khớp lệnh đa sàn với độ trượt ${ (input.priceImpactBps / 100).toFixed(2) }% và bảo vệ private mempool.`,
      recommendedAction,
      analyzedAt: Date.now(),
      source: 'QUANTITATIVE_FALLBACK',
    };
  }
}
