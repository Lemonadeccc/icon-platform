import * as React from "react";
export { Icon as BaseIcon } from "./Icon";
export { createIcon } from "./createIcon";
export { Company } from "./Company";
export { Compass } from "./Compass";

const iconMap = {
  Company,
  Compass,
};

export function Icon({ name, ...props }) {
  const Component = iconMap[name];
  if (!Component) return null;
  return React.createElement(Component, props);
}
