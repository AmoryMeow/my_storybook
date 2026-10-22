import type { RefAttributes } from "react";
import {
  Button as ReactAriaButton,
  type ButtonProps,
} from "react-aria-components";

export function Button(
  props: ButtonProps & RefAttributes<HTMLButtonElement>,
) {
  return <ReactAriaButton {...props} />;
}
