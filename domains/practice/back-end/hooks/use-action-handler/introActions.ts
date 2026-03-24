import { track } from "@/lib/analytics";
import type { ActionDeps, StepHandler } from "./types";

export function createIntroHandler(deps: ActionDeps): StepHandler {
  const { slug, router } = deps;

  return (action, hasStarted) => {
    if (action === "start") {
      track("practice_intro_start", { slug, hasStarted });

      if (hasStarted) {
        router.push(`/practice/${slug}?continue=true`);
      } else {
        router.push(`/practice/${slug}/functional`);
      }
    }
  };
}
