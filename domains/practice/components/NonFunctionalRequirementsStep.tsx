"use client";

import { usePracticeSession } from "./PracticeSessionProvider";
import { RequirementsTextareaStep } from "./RequirementsTextareaStep";
import { useNonFunctionalRequirements } from "@/domains/practice/hooks/useNonFunctionalRequirements";

export function NonFunctionalRequirementsStep() {
  const { isReadOnly } = usePracticeSession();
  const {
    value,
    trimmedLength,
    hasMinContent,
    shouldShowError,
    showHint,
    handleChange,
    handleBlur,
  } = useNonFunctionalRequirements();

  return (
    <RequirementsTextareaStep
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="Example: Low latency responses (sub-second). High availability (99.9%+). Scale to handle millions of requests per day and traffic spikes."
      mobilePlaceholder="NON-FUNCTIONAL REQUIREMENTS&#10;Describe performance goals like latency, throughput, and availability"
      title="Define performance and scale constraints"
      description="Think about latency, throughput, availability, and scale."
      // hintText="Tip: Focus on measurable qualities and constraints"
      showHint={showHint}
      stepId="nonFunctional"
      isReadOnly={isReadOnly}
      hasMinContent={hasMinContent}
      trimmedLength={trimmedLength}
      showError={shouldShowError}
    />
  );
}

export default NonFunctionalRequirementsStep;
