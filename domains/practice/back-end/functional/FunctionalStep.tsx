"use client";

import { useCallback } from "react";
import type { StepComponentProps } from "../types";
import { TextAreaCard } from "../components/TextAreaCard";
import useStepStore from "../store/useStore";
import { STEPS } from "../constants";
import { useIncompleteRequirement } from "../hooks/useIncompleteRequirement";
import { VoiceInput } from "@/domains/practice/components/voice";
import { useStepConfig } from "../hooks/useStepConfig";

type FunctionalStepProps = StepComponentProps;

export default function FunctionalStep({ handlers, stepType, slug }: FunctionalStepProps) {
  useStepConfig({ leftAction: "back", rightAction: "next" });

  const { functionalRequirements } = useStepStore(slug as string);
  const incompleteRequirement = useIncompleteRequirement(stepType, slug as string);
  const textValue = functionalRequirements.textField.value || "";
  const textFieldId = functionalRequirements.textField.id;

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    handlers[STEPS.FUNCTIONAL]("changeTextBox", value);
  };

  const handleVoiceChange = useCallback(
    (value: string) => {
      handlers[STEPS.FUNCTIONAL]("changeTextBox", value);
    },
    [handlers]
  );

  const shouldHighlight = incompleteRequirement?.itemId === textFieldId;

  return (
    <TextAreaCard
      title="Define key features and user actions"
      description="Describe what users can do and the core capabilities the system must provide."
      placeholder="Example: Users create and manage content, search across the platform, and receive real-time notifications about relevant activity."
      value={textValue}
      onChange={handleTextChange}
      shouldHighlight={shouldHighlight}
      bottomRightSlot={<VoiceInput value={textValue} onChange={handleVoiceChange} />}
    />
  );
}
