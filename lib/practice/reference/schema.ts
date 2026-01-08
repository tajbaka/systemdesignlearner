/**
 * Schema definitions for scenario reference JSON files.
 */

export type GuidanceLevel = "error" | "warning" | "info" | "core" | "bonus";

export type GuidanceRuleCheck =
  | {
      type: "hasKind";
      kind: string;
      minCount?: number;
    }
  | {
      type: "hasConnection";
      from: string;
      to: string;
    }
  | {
      type: "kindConnectedToFirstMissingSecond";
      kind: string;
      connectedTo: string;
      missingConnection: string;
    }
  | {
      type: "servicesHaveUniqueLabels";
      minServices: number;
    };

export type GuidanceRule = {
  id: string;
  level: GuidanceLevel;
  summary: string;
  question: string;
  hint: string;
  check: GuidanceRuleCheck;
};

export type ScenarioReference = {
  components?: Record<string, unknown>;
  design?: {
    guidance?: {
      rules?: GuidanceRule[];
    };
  };
};
