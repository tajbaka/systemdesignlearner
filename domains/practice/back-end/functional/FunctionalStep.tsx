"use client";

import { useCallback } from "react";
import type { StepComponentProps } from "../types";
import { TextAreaCard } from "../components/TextAreaCard";
import { CommonLayout } from "../layouts/CommonLayout";
import useStepStore from "../store/useStore";
import { STEPS } from "../constants";
import { useIncompleteRequirement } from "../hooks/useIncompleteRequirement";
import { VoiceInput } from "@/domains/practice/components/voice";

type FunctionalStepProps = StepComponentProps;

export default function FunctionalStep({ config, handlers, stepType, slug }: FunctionalStepProps) {
  const { functionalRequirements } = useStepStore(slug as string);
  const incompleteRequirement = useIncompleteRequirement(stepType, slug as string);
  const textValue = functionalRequirements.textField.value || "";
  const textFieldId = functionalRequirements.textField.id;

  // Handle textarea changes
  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    handlers[STEPS.FUNCTIONAL]("changeTextBox", value);
  };

  // Handle voice input changes
  const handleVoiceChange = useCallback(
    (value: string) => {
      handlers[STEPS.FUNCTIONAL]("changeTextBox", value);
    },
    [handlers]
  );

  // Check if this text field should be highlighted
  const shouldHighlight = incompleteRequirement?.itemId === textFieldId;

  return (
    <CommonLayout
      config={config}
      handlers={handlers}
      stepType={stepType}
      slug={slug as string}
      nextDisabled={false}
      leftAction="back"
      rightAction="next"
      showTooltip={true}
    >
      <TextAreaCard
        title="Define key features and user actions"
        description="Describe what users can do and the core capabilities the system must provide."
        placeholder="Example: Users create and manage content, search across the platform, and receive real-time notifications about relevant activity."
        value={textValue}
        onChange={handleTextChange}
        shouldHighlight={shouldHighlight}
        bottomRightSlot={<VoiceInput value={textValue} onChange={handleVoiceChange} />}
      />
    </CommonLayout>
  );
}
