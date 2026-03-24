import { track } from "@/lib/analytics";
import { shouldIgnoreClientError } from "@/lib/client-errors";

type ReportActionErrorParams = {
  slug: string;
  step: string;
  error: unknown;
  message: string;
  setActionError: (error: string | null) => void;
};

export function reportActionError({
  slug,
  step,
  error,
  message,
  setActionError,
}: ReportActionErrorParams) {
  if (shouldIgnoreClientError(error)) {
    setActionError(null);
    return;
  }

  console.error(message, error);
  track("practice_evaluation_error", {
    slug,
    step,
    error: error instanceof Error ? error.message : "Unknown error",
  });
  setActionError(
    error instanceof Error ? error.message : "Something went wrong. Please try again."
  );
}
