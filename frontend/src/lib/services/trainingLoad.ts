// src/lib/services/trainingLoad.ts
// Service layer for Phase 2 Training Load APIs — aligned to docs/05-api-design.md
//   GET /training-load/pmc?from=&to=
//   GET /training-load/power-curve?days=90
//   GET /training-load/zones?from=&to=&sport=

import { api } from "@/lib/api";
import type { PmcResponse, PowerCurveResponse, ZoneDistributionResponse } from "@/lib/types/analytics";

export const trainingLoadService = {
  /**
   * GET /training-load/pmc?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Returns daily CTL/ATL/TSB points. Requires Pro tier.
   */
  getPmc: (from: string, to: string): Promise<PmcResponse> =>
    api.get<PmcResponse>(`/training-load/pmc?from=${from}&to=${to}`),

  /**
   * GET /training-load/power-curve?days=30|90|365
   * Returns mean maximal power curve. Requires Pro tier.
   */
  getPowerCurve: (days: number): Promise<PowerCurveResponse> =>
    api.get<PowerCurveResponse>(`/training-load/power-curve?days=${days}`),

  /**
   * GET /training-load/zones?from=YYYY-MM-DD&to=YYYY-MM-DD&sport=cycling
   * Returns zone time distribution. Requires Pro tier.
   */
  getZones: (from: string, to: string, sport?: string): Promise<ZoneDistributionResponse> => {
    const params = new URLSearchParams({ from, to });
    if (sport && sport !== "all") params.set("sport", sport);
    return api.get<ZoneDistributionResponse>(`/training-load/zones?${params.toString()}`);
  },
};
