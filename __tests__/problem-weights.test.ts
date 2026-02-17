import { describe, it, expect } from "vitest";

// Dynamically import all problem files — new problems are picked up automatically
const problemModules = import.meta.glob("../packages/problems/*.ts", { eager: true });

const SKIP_FILES = ["article-links"];

const ALL_PROBLEMS = Object.entries(problemModules)
  .filter(([path]) => !SKIP_FILES.some((skip) => path.includes(skip)))
  .flatMap(([, mod]) =>
    Object.values(mod as Record<string, unknown>).filter(
      (
        exp
      ): exp is {
        slug: string;
        steps: { stepType: string; data: { scoreWeight: number; requirements: unknown[] } }[];
      } => typeof exp === "object" && exp !== null && "slug" in exp && "steps" in exp
    )
  );

it("at least one problem is loaded", () => {
  expect(ALL_PROBLEMS.length).toBeGreaterThan(0);
});

describe("Problem score weights", () => {
  for (const problem of ALL_PROBLEMS) {
    describe(problem.slug, () => {
      it("step scoreWeights sum to 100", () => {
        const total = problem.steps.reduce((sum, step) => sum + step.data.scoreWeight, 0);
        expect(total).toBe(100);
      });

      for (const step of problem.steps) {
        if (step.stepType === "highLevelDesign") {
          it(`HLD edge weights sum to scoreWeight (${step.data.scoreWeight})`, () => {
            const req = step.data.requirements[0] as {
              edges: { weight: number }[];
            };
            const edgeSum = req.edges.reduce((sum, edge) => sum + edge.weight, 0);
            expect(edgeSum).toBe(step.data.scoreWeight);
          });
        } else {
          it(`${step.stepType} requirement weights sum to scoreWeight (${step.data.scoreWeight})`, () => {
            const reqs = step.data.requirements as { weight: number }[];
            const reqSum = reqs.reduce((sum, r) => sum + r.weight, 0);
            expect(reqSum).toBe(step.data.scoreWeight);
          });
        }
      }
    });
  }
});
