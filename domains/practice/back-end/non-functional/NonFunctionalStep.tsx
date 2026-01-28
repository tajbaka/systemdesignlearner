"use client";

import { useCallback } from "react";
import type { StepComponentProps } from "../types";
import { TextAreaCard } from "../components/TextAreaCard";
import { CommonLayout } from "../layouts/CommonLayout";
import useStepStore from "../store/useStore";
import { STEPS } from "../constants";
import { useIncompleteRequirement } from "../hooks/useIncompleteRequirement";
import { VoiceInput } from "@/domains/practice/components/voice";

type NonFunctionalStepProps = StepComponentProps;

export default function NonFunctionalStep({
  config,
  handlers,
  stepType,
  slug,
}: NonFunctionalStepProps) {
  const { nonFunctionalRequirements } = useStepStore(slug as string);
  const incompleteRequirement = useIncompleteRequirement(stepType, slug as string);
  const textValue = nonFunctionalRequirements.textField.value || "";
  const textFieldId = nonFunctionalRequirements.textField.id;

  // Handle textarea changes
  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    handlers[STEPS.NON_FUNCTIONAL]("changeTextBox", value);
  };

  // Handle voice input changes
  const handleVoiceChange = useCallback(
    (value: string) => {
      handlers[STEPS.NON_FUNCTIONAL]("changeTextBox", value);
    },
    [handlers]
  );

  // Calculate remaining characters
  const minLength = 50;
  const currentLength = textValue.trim().length;
  const remaining = Math.max(0, minLength - currentLength);
  const bottomText = remaining > 0 ? `Remaining characters needed: ${remaining}` : undefined;
  const isNextDisabled = remaining > 0;

  // Check if this text field should be highlighted
  const shouldHighlight = incompleteRequirement?.itemId === textFieldId;

  return (
    <CommonLayout
      config={config}
      handlers={handlers}
      stepType={stepType}
      slug={slug as string}
      nextDisabled={isNextDisabled}
      leftAction="back"
      rightAction="next"
      showTooltip={true}
    >
      <TextAreaCard
        title="Define performance and scale constraints"
        description="Think about latency, throughput, availability, and scale."
        placeholder="Example: Low latency responses (sub-second). High availability (99.9%+). Scale to handle millions of requests per day and traffic spikes."
        bottomText={bottomText}
        value={textValue}
        onChange={handleTextChange}
        shouldHighlight={shouldHighlight}
        bottomRightSlot={<VoiceInput value={textValue} onChange={handleVoiceChange} />}
      />
    </CommonLayout>
  );
}
