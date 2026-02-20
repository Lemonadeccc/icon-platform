import React, { forwardRef } from "react";
import { Icon } from "./Icon";

export function createIcon(options) {
  const { paths, iconProps = {}, viewBox = "0 0 48 48" } = options;
  return forwardRef(function GeneratedIcon(props, ref) {
    return React.createElement(
      Icon,
      { ...iconProps, ...props, ref, viewBox },
      paths
    );
  });
}
