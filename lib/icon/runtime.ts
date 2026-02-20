import { promises as fs } from "fs";
import path from "path";

import { REACT_DIR } from "./constants";

const ICON_FILE = path.join(REACT_DIR, "Icon.js");
const CREATE_ICON_FILE = path.join(REACT_DIR, "createIcon.js");

const ICON_CONTENT = `import React, { forwardRef } from "react";

const defaultProps = {
  size: "1em",
};

const getSize = (size) => {
  if (Array.isArray(size) && size.length === 2) {
    return size;
  }
  const width = size || "1em";
  const height = size || "1em";
  return [width, height];
};

export const Icon = forwardRef(function Icon(baseProps, ref) {
  const mergeProps = { ...defaultProps, ...baseProps };
  const {
    className,
    size,
    style,
    children,
    useStrokeCurrentColor,
    useFillCurrentColor,
    ...rest
  } = mergeProps;

  const [width, height] = getSize(size);

  return (
    React.createElement(
      "svg",
      {
        ref,
        className,
        width,
        height,
        style,
        focusable: "false",
        stroke: useStrokeCurrentColor ? "currentColor" : "none",
        fill: useFillCurrentColor ? "currentColor" : "none",
        ...rest
      },
      children
    )
  );
});
`;

const CREATE_ICON_CONTENT = `import React, { forwardRef } from "react";
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
`;

async function writeIfMissing(target: string, content: string) {
  try {
    await fs.access(target);
  } catch {
    await fs.writeFile(target, content);
  }
}

export async function ensureRuntimeFiles() {
  await writeIfMissing(ICON_FILE, ICON_CONTENT);
  await writeIfMissing(CREATE_ICON_FILE, CREATE_ICON_CONTENT);
}
