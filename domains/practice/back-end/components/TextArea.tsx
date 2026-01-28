"use client";

import { forwardRef } from "react";

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  placeholder?: string;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  className?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ placeholder, value, onChange, disabled = false, className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full resize-none rounded-2xl border-none bg-transparent px-6 pb-5 pt-5 text-base leading-7 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus-visible:ring-0 ${className}`}
        {...props}
      />
    );
  }
);

TextArea.displayName = "TextArea";
