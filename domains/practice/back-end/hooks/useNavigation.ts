import { useRouter, usePathname } from "next/navigation";
import { PRACTICE_STEPS } from "../constants";
import type { StepHandlers, AllStepActions } from "../types";

type UseNavigationProps = {
  stepType: string | null;
  handlers: StepHandlers;
  maxVisitedStep: number;
  leftAction?: AllStepActions;
  rightAction?: AllStepActions;
};

export function useNavigation({
  stepType,
  handlers,
  maxVisitedStep,
  leftAction,
  rightAction,
}: UseNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleStepClick = (stepIndex: number) => {
    // Get ordered practice steps to find the route by index
    const orderedSteps = Object.entries(PRACTICE_STEPS)
      .sort(([, a], [, b]) => a.order - b.order)
      .map(([_, step]) => step);
    const stepRoute = orderedSteps[stepIndex]?.route;
    if (stepRoute && pathname) {
      // Remove the last part of the path and append the new stepRoute
      const pathParts = pathname.split("/").filter(Boolean);
      // Remove the last segment (current step)
      pathParts.pop();
      // Build the new path
      const basePath = "/" + pathParts.join("/");
      router.push(`${basePath}/${stepRoute}`);
    }
  };

  const handleBack = () => {
    if (!stepType || !leftAction || !(stepType in handlers)) return;
    const handler = handlers[stepType as keyof StepHandlers];
    handler(leftAction as Parameters<typeof handler>[0]);
  };

  const handleNext = () => {
    if (!stepType || !rightAction || !(stepType in handlers)) return;
    const handler = handlers[stepType as keyof StepHandlers];
    handler(rightAction as Parameters<typeof handler>[0]);
  };

  return { maxVisitedStep, handleStepClick, handleBack, handleNext };
}
