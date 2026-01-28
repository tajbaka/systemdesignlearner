"use client";

import { TextAreaInputCard } from "./TextAreaInputCard";
import type { HttpMethod } from "./MethodSelect";

export type Endpoint = {
  id: string;
  method: HttpMethod;
  path: string;
  description: string;
  items: Array<{ id: string; value: string }>;
};

interface TextAreaListProps {
  endpoints: Endpoint[];
  minLength?: number;
  onMethodChange: (endpointId: string, method: HttpMethod) => void;
  onPathChange: (endpointId: string, path: string) => void;
  onDescriptionChange: (endpointId: string, event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onDeleteEndpoint: (endpointId: string) => void;
  placeholder?: string;
}

export function TextAreaList({
  endpoints,
  minLength = 10,
  onMethodChange,
  onPathChange,
  onDescriptionChange,
  onDeleteEndpoint,
  placeholder = "What does this endpoint do? Describe the request and response.",
}: TextAreaListProps) {
  return (
    <>
      {endpoints.map((endpoint, index) => {
        const currentLength = endpoint.description.trim().length;
        const remaining = Math.max(0, minLength - currentLength);

        const bottomText: string[] = [
          ...(remaining > 0 ? [`Remaining characters needed: ${remaining}`] : []),
          `Endpoint ${index + 1} of ${endpoints.length}`,
        ];

        return (
          <div key={endpoint.id} className="space-y-6">
            <TextAreaInputCard
              method={endpoint.method}
              path={endpoint.path}
              notes={endpoint.description}
              onMethodChange={(method) => onMethodChange(endpoint.id, method)}
              onPathChange={(path) => onPathChange(endpoint.id, path)}
              onNotesChange={(event) => onDescriptionChange(endpoint.id, event)}
              onClose={() => onDeleteEndpoint(endpoint.id)}
              placeholder={placeholder}
              bottomText={bottomText}
            />
          </div>
        );
      })}
    </>
  );
}
