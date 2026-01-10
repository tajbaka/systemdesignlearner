"use client";

import { usePracticeSession } from "./PracticeSessionProvider";
import { RequirementsTextareaStep } from "./RequirementsTextareaStep";
import { useFunctionalRequirements } from "@/domains/practice/hooks/useFunctionalRequirements";

export function FunctionalRequirementsStep() {
  const { isReadOnly } = usePracticeSession();
  const {
    value,
    trimmedLength,
    hasMinContent,
    shouldShowError,
    showHint,
    handleChange,
    handleBlur,
  } = useFunctionalRequirements();

  return (
    <RequirementsTextareaStep
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="Example: Users create and manage content, search across the platform, and receive real-time notifications about relevant activity."
      mobilePlaceholder="FUNCTIONAL REQUIREMENTS&#10;List key features: user actions, core workflows, and business capabilities"
      title="Define key features and user actions"
      description="Describe what users can do and the core capabilities the system must provide."
      // hintText="You can write in plain language"
      showHint={showHint}
      stepId="functional"
      isReadOnly={isReadOnly}
      hasMinContent={hasMinContent}
      trimmedLength={trimmedLength}
      showError={shouldShowError}
    />
  );
}

export default FunctionalRequirementsStep;
