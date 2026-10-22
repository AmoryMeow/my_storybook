import type { RefAttributes } from "react";
import {
  Menu as ReactAriaMenu,
  MenuItem as ReactAriaMenuItem,
  MenuTrigger as ReactAriaMenuTrigger,
  Popover as ReactAriaPopover,
  type MenuItemProps,
  type MenuProps,
  type MenuTriggerProps,
  type PopoverProps,
} from "react-aria-components";

export function Menu<T,>(props: MenuProps<T> & RefAttributes<HTMLDivElement>) {
  return <ReactAriaMenu {...props} />;
}

export function MenuItem<T,>(
  props: MenuItemProps<T> & RefAttributes<HTMLDivElement>,
) {
  return <ReactAriaMenuItem {...props} />;
}

export function MenuTrigger(props: MenuTriggerProps) {
  return <ReactAriaMenuTrigger {...props} />;
}

export function Popover(
  props: PopoverProps & RefAttributes<HTMLElement>,
) {
  return <ReactAriaPopover {...props} />;
}
