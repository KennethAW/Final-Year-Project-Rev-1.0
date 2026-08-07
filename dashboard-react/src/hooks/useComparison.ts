import { useFetchJson } from "./useFetchJson";
import type { ModelComparison } from "@/lib/types";

export function useComparison() {
  return useFetchJson<ModelComparison[]>(
    "/data/comparison/model_comparison.json"
  );
}
