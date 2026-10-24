"use client";

import { useEffect, useState } from "react";
import {
  FALLBACK_STUDIO_POLICY,
  formatPolicyEffectiveDate,
} from "@/content/studioPolicy";
import { fetchCurrentStudioPolicy } from "@/lib/bookingApi";
import type { StudioPolicyVersion } from "@/types/studio";

export type CurrentStudioPolicy = Pick<
  StudioPolicyVersion,
  "id" | "title" | "startDate" | "expiresAt" | "sections"
>;

export function useStudioPolicy() {
  const [policy, setPolicy] = useState<CurrentStudioPolicy>(
    FALLBACK_STUDIO_POLICY
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const remote = await fetchCurrentStudioPolicy();
        if (!cancelled && remote) setPolicy(remote);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    policy,
    loading,
    effectiveLabel: policy.startDate
      ? `Effective ${formatPolicyEffectiveDate(policy.startDate)}`
      : "",
  };
}
