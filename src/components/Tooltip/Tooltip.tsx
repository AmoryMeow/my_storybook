import type { RefAttributes } from "react";
import {
  Tooltip as ReactAriaTooltip,
  TooltipTrigger as ReactAriaTooltipTrigger,
  type TooltipProps,
  type TooltipTriggerComponentProps,
} from "react-aria-components";

export function TooltipTrigger(props: TooltipTriggerComponentProps) {
  return <ReactAriaTooltipTrigger {...props} />;
}

export function Tooltip(
  props: TooltipProps & RefAttributes<HTMLDivElement>,
) {
  return <ReactAriaTooltip {...props} />;
}
