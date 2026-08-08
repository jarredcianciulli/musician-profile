"use client";

import { useEffect } from "react";
import { analytics } from "@/utils/analytics";

export function SubscribeCompleteBeacon() {
  useEffect(() => {
    analytics.subscribeComplete();
  }, []);
  return null;
}
