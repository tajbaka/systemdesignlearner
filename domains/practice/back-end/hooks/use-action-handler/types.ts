import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type {
  FunctionalRequirements,
  NonFunctionalRequirements,
  ApiDesign,
  HighLevelDesign,
  Score,
  EndpointItem,
} from "../../store/store";
import type { PracticeDesignState } from "../../high-level-design/types";

// ============================================================================
// Shared Dependencies (Dependency Inversion)
// ============================================================================

export type ActionDeps = {
  slug: string;
  router: AppRouterInstance;
  isSignedIn: boolean;
  setModalOpen: (open: boolean) => void;
  setIsActionLoading: (loading: boolean) => void;
  setActionError: (error: string | null) => void;
  setStepCompletion: (stepType: string, completed: boolean) => void;
};

export type FunctionalDeps = ActionDeps & {
  functionalRequirements: FunctionalRequirements;
  setFunctionalRequirements: (data: Partial<FunctionalRequirements>) => void;
};

export type NonFunctionalDeps = ActionDeps & {
  nonFunctionalRequirements: NonFunctionalRequirements;
  setNonFunctionalRequirements: (data: Partial<NonFunctionalRequirements>) => void;
};

export type ApiDeps = ActionDeps & {
  searchParams: URLSearchParams;
  apiDesign: ApiDesign;
  setApiDesign: (data: Partial<ApiDesign>) => void;
};

export type HighLevelDesignDeps = ActionDeps & {
  openAuthModal: () => void;
  highLevelDesign: HighLevelDesign;
  setHighLevelDesign: (data: Partial<HighLevelDesign>) => void;
};

export type ScoreDeps = ActionDeps & {
  setScore: (data: Partial<Score>) => void;
};

// ============================================================================
// Handler Types
// ============================================================================

export type StepHandler = (action: string, ...args: unknown[]) => void | Promise<void>;

// Re-export types used by handlers
export type { EndpointItem, PracticeDesignState };
