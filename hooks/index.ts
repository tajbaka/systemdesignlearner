/**
 * Custom Hooks
 *
 * Reusable React hooks for the application.
 */

// UI Utilities
export { useIsMobile } from "./useIsMobile";

// Practice Mode
export { usePracticeNavigation } from "@/domains/practice/hooks/usePracticeNavigation";
export { useStepEvaluation } from "@/domains/practice/hooks/useStepEvaluation";
export { useIterativeFeedback } from "@/domains/practice/hooks/useIterativeFeedback";

// Canvas / Design
export { useDesignHistory } from "@/domains/practice/hooks/useDesignHistory";
export { useTutorialManager } from "@/domains/practice/hooks/useTutorialManager";
export { useAdjacencyList } from "@/domains/practice/hooks/useAdjacencyList";
export { useHighLevelDesign } from "@/domains/practice/hooks/useHighLevelDesign";
export { useHighLevelDesignComponentList } from "@/domains/practice/hooks/useHighLevelDesignComponentList";

// Speech Recognition
export { useWhisperStt } from "../domains/practice/hooks/useWhisperStt";
export { useWebSpeechStt } from "../domains/practice/hooks/useWebSpeechStt";
