"use client";

/**
 * Legacy synthetic pointerdown bootstrap intentionally disabled.
 * Dispatching a synthetic user action is not affirmative tracking consent.
 * Optional pixel loading now listens to the centralized consent authority.
 */
export function TrackingPixelBootstrap() {
  return null;
}
