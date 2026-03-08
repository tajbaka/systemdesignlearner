"use client";

import { useCallback } from "react";
import type { StepComponentProps } from "../types";
import { TextAreaCard } from "../components/TextAreaCard";
import useStepStore from "../hooks/useStore";
import { STEPS } from "../constants";
import { useIncompleteRequirement } from "../hooks/useIncompleteRequirement";
import { VoiceInput } from "@/domains/practice/components/voice";
import { useStepConfig } from "../hooks/useStepConfig";

type NonFunctionalStepProps = StepComponentProps;

export default function NonFunctionalStep({
  config: _config,
  handlers,
  stepType,
  slug,
}: NonFunctionalStepProps) {
  useStepConfig({ leftAction: "back", rightAction: "next" });

  const { nonFunctionalRequirements } = useStepStore(slug as string);
  const incompleteRequirement = useIncompleteRequirement(stepType, slug as string);
  const textValue = nonFunctionalRequirements.textField.value || "";
  const textFieldId = nonFunctionalRequirements.textField.id;

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    handlers[STEPS.NON_FUNCTIONAL]("changeTextBox", value);
  };

  const handleVoiceChange = useCallback(
    (value: string) => {
      handlers[STEPS.NON_FUNCTIONAL]("changeTextBox", value);
    },
    [handlers]
  );

  const shouldHighlight = incompleteRequirement?.itemId === textFieldId;

  return (
    <TextAreaCard
      title="Define performance and scale constraints"
      description="Think about latency, throughput, availability, and scale."
      placeholder="Example: Low latency responses (sub-second). High availability (99.9%+). Scale to handle millions of requests per day and traffic spikes."
      value={textValue}
      onChange={handleTextChange}
      shouldHighlight={shouldHighlight}
      bottomRightSlot={<VoiceInput value={textValue} onChange={handleVoiceChange} />}
    />
  );
}
