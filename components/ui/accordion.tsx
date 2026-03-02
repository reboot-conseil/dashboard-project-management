"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Context ──────────────────────────────────────────────────────────
interface AccordionContextValue {
  type: "single" | "multiple";
  value: string | string[];
  onValueChange: (value: string) => void;
  collapsible?: boolean;
}
const AccordionContext = React.createContext<AccordionContextValue>({
  type: "single",
  value: "",
  onValueChange: () => {},
  collapsible: false,
});

// ── Accordion ────────────────────────────────────────────────────────
interface AccordionProps {
  type?: "single" | "multiple";
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  collapsible?: boolean;
  children: React.ReactNode;
  className?: string;
}

function Accordion({
  type = "single",
  value: controlledValue,
  defaultValue,
  onValueChange,
  collapsible = false,
  children,
  className,
}: AccordionProps) {
  const [internalValue, setInternalValue] = React.useState<string | string[]>(
    defaultValue ?? (type === "multiple" ? [] : "")
  );
  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const handleValueChange = React.useCallback(
    (itemValue: string) => {
      let next: string | string[];
      if (type === "multiple") {
        const arr = Array.isArray(value) ? value : [value].filter(Boolean);
        next = arr.includes(itemValue)
          ? arr.filter((v) => v !== itemValue)
          : [...arr, itemValue];
      } else {
        const current = typeof value === "string" ? value : "";
        next = collapsible && current === itemValue ? "" : itemValue;
      }
      setInternalValue(next);
      onValueChange?.(next as string);
    },
    [type, value, collapsible, onValueChange]
  );

  return (
    <AccordionContext.Provider
      value={{ type, value, onValueChange: handleValueChange, collapsible }}
    >
      <div className={cn("divide-y divide-border", className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

// ── AccordionItem ─────────────────────────────────────────────────────
interface AccordionItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

function AccordionItem({ value, children, className }: AccordionItemProps) {
  return (
    <div data-accordion-item={value} className={cn("border rounded-lg overflow-hidden", className)}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child as React.ReactElement<{ _itemValue?: string }>, {
          _itemValue: value,
        });
      })}
    </div>
  );
}

// ── AccordionTrigger ──────────────────────────────────────────────────
interface AccordionTriggerProps {
  children: React.ReactNode;
  className?: string;
  _itemValue?: string; // injected by AccordionItem
}

function AccordionTrigger({ children, className, _itemValue = "" }: AccordionTriggerProps) {
  const { value, onValueChange } = React.useContext(AccordionContext);
  const isOpen = Array.isArray(value) ? value.includes(_itemValue) : value === _itemValue;

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      onClick={() => onValueChange(_itemValue)}
      aria-expanded={isOpen}
    >
      {children}
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180"
        )}
      />
    </button>
  );
}

// ── AccordionContent ──────────────────────────────────────────────────
interface AccordionContentProps {
  children: React.ReactNode;
  className?: string;
  _itemValue?: string; // injected by AccordionItem
}

function AccordionContent({ children, className, _itemValue = "" }: AccordionContentProps) {
  const { value } = React.useContext(AccordionContext);
  const isOpen = Array.isArray(value) ? value.includes(_itemValue) : value === _itemValue;

  if (!isOpen) return null;

  return (
    <div className={cn("px-4 pb-4 pt-0 text-sm", className)}>
      {children}
    </div>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
