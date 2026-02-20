import React, { forwardRef } from "react";

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

  return React.createElement(
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
      ...rest,
    },
    children
  );
});
