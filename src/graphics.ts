// Visual budgets follow the engine's saved Graphics choice and live Auto changes.
import type { QualityTier } from 'starhermit:engine';
export const budgets = {
 low: { gravel: 600, bubbles: 12, shadow: 0, aoSamples: 0, aoResolution: .25, bloom: 0 },
 balanced: { gravel: 1500, bubbles: 24, shadow: 1024, aoSamples: 0, aoResolution: .5, bloom: 0 },
 high: { gravel: 3000, bubbles: 36, shadow: 2048, aoSamples: 8, aoResolution: .5, bloom: .5 },
 ultra: { gravel: 3000, bubbles: 48, shadow: 4096, aoSamples: 16, aoResolution: .75, bloom: 1 },
} satisfies Record<QualityTier, object>;
