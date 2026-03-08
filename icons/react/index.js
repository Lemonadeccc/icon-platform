import * as React from "react";
export { Icon as BaseIcon } from "./Icon";
export { createIcon } from "./createIcon";
import { Company } from "./Company";
import { Compass } from "./Compass";
export { Company, Compass };

const iconMap = {
  Company,
  Compass,
};

export function Icon({ name, ...props }) {
  const Component = iconMap[name];
  if (!Component) return null;
  return React.createElement(Component, props);
}
