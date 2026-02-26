"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { StepComponentProps } from "../types";
import { TextAreaInputCard } from "./components/TextAreaInputCard";
import { ItemCard } from "./components/ItemCard";
import { AddItemButton } from "./components/AddItemButton";
import { MethodPathInput } from "./components/MethodPathInput";
import { TextAreaCard } from "../components/TextAreaCard";
import { CommonLayout } from "../layouts/CommonLayout";
import useStepStore from "../store/useStore";
import { EndpointItem } from "../store/store";
import { STEPS } from "../constants";
import type { HttpMethod } from "./components/MethodSelect";
import { useIncompleteRequirement } from "../hooks/useIncompleteRequirement";
import { VoiceInput } from "@/domains/practice/components/voice";

type ApiStepProps = StepComponentProps;

const createEndpoint = (): EndpointItem => {
  const baseId = crypto.randomUUID();
  return {
    id: `endpoint-${baseId}`,
    value: "",
    method: {
      id: `method-${baseId}`,
      value: "GET",
    },
    path: {
      id: `path-${baseId}`,
      value: "",
    },
    description: {
      id: `description-${baseId}`,
      value: "",
    },
  };
};

export default function ApiStep({ config, handlers, stepType, slug }: ApiStepProps) {
  const { apiDesign } = useStepStore(slug as string);
  const router = useRouter();
  const searchParams = useSearchParams();
  const incompleteRequirement = useIncompleteRequirement(stepType, slug as string);

  // Get endpoints from apiDesign
  const endpoints = apiDesign.endpoints || [];

  // Get endpoint ID from query params (for mobile editor)
  const mobileEditingId = searchParams.get("endpoint");
  const mobileEditingEndpoint = mobileEditingId
    ? endpoints.find((ep) => ep.id === mobileEditingId)
    : null;

  const handleMethodChange = (endpointId: string, method: HttpMethod) => {
    handlers[STEPS.API]("changeInput", endpointId, "method", method);
  };

  const handlePathChange = (endpointId: string, path: string) => {
    handlers[STEPS.API]("changeInput", endpointId, "path", path);
  };

  const handleDescriptionChange = (
    endpointId: string,
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    handlers[STEPS.API]("changeTextBox", endpointId, "description", event.target.value);
  };

  // Handle voice input for endpoint descriptions
  const handleVoiceDescriptionChange = useCallback(
    (endpointId: string, value: string) => {
      handlers[STEPS.API]("changeTextBox", endpointId, "description", value);
    },
    [handlers]
  );

  const handleAddEndpoint = () => {
    const next = createEndpoint();
    handlers[STEPS.API]("addEndpoint", next);
  };

  const handleDeleteEndpoint = (endpointId: string) => {
    handlers[STEPS.API]("deleteEndpoint", endpointId);
  };

  const handleMobileEditorOpen = (endpointId: string) => {
    router.push(`/practice/${slug}/api?endpoint=${endpointId}`);
  };

  const isNextDisabled = endpoints.length === 0;

  return (
    <CommonLayout
      config={config}
      handlers={handlers}
      stepType={stepType}
      slug={slug as string}
      nextDisabled={isNextDisabled}
      leftAction="back"
      rightAction="next"
    >
      <div className="relative h-full sm:h-auto">
        {/* Desktop layout */}
        <div className="hidden sm:block space-y-6">
          {endpoints.map((endpoint, index) => {
            const bottomText: string[] = [`Endpoint ${index + 1} of ${endpoints.length}`];

            return (
              <TextAreaInputCard
                key={endpoint.id}
                showCloseButton={index > 0}
                onClose={() => handleDeleteEndpoint(endpoint.id)}
                method={endpoint.method.value}
                shouldHighlightSelectBox={incompleteRequirement?.itemId === endpoint.method.id}
                shouldHighlightInput={incompleteRequirement?.itemId === endpoint.path.id}
                shouldHighlightTextArea={incompleteRequirement?.itemId === endpoint.description.id}
                path={endpoint.path.value}
                notes={endpoint.description.value}
                onMethodChange={(method) => handleMethodChange(endpoint.id, method)}
                onPathChange={(path) => handlePathChange(endpoint.id, path)}
                onNotesChange={(event) => handleDescriptionChange(endpoint.id, event)}
                placeholder="Describe the request body, response format, status codes, and error handling. (The method and path are already captured above.)"
                bottomText={bottomText}
                bottomRightSlot={
                  <VoiceInput
                    value={endpoint.description.value}
                    onChange={(value) => handleVoiceDescriptionChange(endpoint.id, value)}
                  />
                }
              />
            );
          })}
          <AddItemButton onAddItem={handleAddEndpoint} />
        </div>

        {/* Mobile layout - list view or editor */}
        <div className="sm:hidden h-full flex flex-col">
          {mobileEditingEndpoint ? (
            /* Mobile Editor */
            <div className="h-full flex flex-col">
              {/* Header with Method and Path */}
              <div className="flex items-center gap-2 p-4 border-b border-zinc-800">
                <MethodPathInput
                  method={mobileEditingEndpoint.method.value}
                  path={mobileEditingEndpoint.path.value}
                  onMethodChange={(method) => handleMethodChange(mobileEditingEndpoint.id, method)}
                  onPathChange={(path) => handlePathChange(mobileEditingEndpoint.id, path)}
                  className="flex-1"
                />
              </div>

              {/* Editor using TextAreaCard */}
              {(() => {
                return (
                  <TextAreaCard
                    title=""
                    description=""
                    value={mobileEditingEndpoint.description.value}
                    onChange={(event) => handleDescriptionChange(mobileEditingEndpoint.id, event)}
                    placeholder="Describe the request body, response format, status codes, and error handling. (The method and path are already captured above.)"
                    bottomRightSlot={
                      <VoiceInput
                        value={mobileEditingEndpoint.description.value}
                        onChange={(value) =>
                          handleVoiceDescriptionChange(mobileEditingEndpoint.id, value)
                        }
                      />
                    }
                  />
                );
              })()}
            </div>
          ) : (
            /* Mobile List View */
            <div className="flex-1 overflow-y-auto pb-20">
              <div className="space-y-3 p-4">
                {endpoints.map((endpoint) => (
                  <ItemCard
                    key={endpoint.id}
                    method={endpoint.method.value}
                    path={endpoint.path.value}
                    notes={endpoint.description.value}
                    onClick={() => handleMobileEditorOpen(endpoint.id)}
                    onDelete={() => handleDeleteEndpoint(endpoint.id)}
                  />
                ))}
                <AddItemButton onAddItem={handleAddEndpoint} />
              </div>
            </div>
          )}
        </div>
      </div>
    </CommonLayout>
  );
}
