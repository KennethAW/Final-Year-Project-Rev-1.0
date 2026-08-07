import { useLocation } from "react-router-dom";

/**
 * Advanced mode shows defensive Q&A panels (significance tests, training convergence,
 * cost sensitivity, methodology). Toggled via ?advanced=true query param.
 *
 * Keeps the base dashboard clean for the main demo; advanced panels available on-demand
 * when an examiner probes.
 */
export function useAdvancedMode(): boolean {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  return params.get("advanced") === "true";
}

/**
 * Toggle helper: returns a URL that flips the advanced flag on the current path.
 */
export function buildAdvancedUrl(currentPathname: string, currentSearch: string, target: boolean): string {
  const params = new URLSearchParams(currentSearch);
  if (target) {
    params.set("advanced", "true");
  } else {
    params.delete("advanced");
  }
  const search = params.toString();
  return search ? `${currentPathname}?${search}` : currentPathname;
}
