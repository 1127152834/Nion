import { useMutation } from "@tanstack/react-query";

import { runAutoDream } from "./api";
import type { AutoDreamRunInput } from "./types";

export function useAutoDreamRun() {
  return useMutation({
    mutationFn: async (input: AutoDreamRunInput) => runAutoDream(input),
  });
}
