import { FEATURE_FLAGS, type FeatureKey } from "./enums";

// Per-agency feature flags. Stored as a JSON string on Agency.featureFlags.
// Default: every feature enabled unless explicitly turned off.
export type FlagMap = Record<FeatureKey, boolean>;

export function parseFlags(json: string | null | undefined): FlagMap {
  const defaults = Object.fromEntries(Object.keys(FEATURE_FLAGS).map((k) => [k, true])) as FlagMap;
  if (!json) return defaults;
  try {
    const parsed = JSON.parse(json) as Partial<FlagMap>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

export function featureEnabled(flags: FlagMap, key: FeatureKey): boolean {
  return flags[key] !== false;
}

// Map nav hrefs to the feature flag that gates them (if any).
export const NAV_FEATURE: Record<string, FeatureKey> = {
  "/dashboard/ai-insights": "aiScheduling",
  "/dashboard/analytics": "advancedAnalytics",
  "/dashboard/mileage": "mileageTracking",
  "/dashboard/compliance": "complianceTracking",
};
