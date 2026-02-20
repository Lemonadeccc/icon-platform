import * as React from "react";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: string | [string, string];
  useStrokeCurrentColor?: boolean;
  useFillCurrentColor?: boolean;
}

export type IconComponent = React.ForwardRefExoticComponent<
  IconProps & React.RefAttributes<SVGSVGElement>
>;

export const BaseIcon: IconComponent;
export function createIcon(options: {
  paths: React.ReactNode;
  iconProps?: IconProps;
  viewBox?: string;
}): IconComponent;
export const Company: IconComponent;
export const Compass: IconComponent;

export type IconName = "Company" | "Compass";
export function Icon(props: { name: IconName } & IconProps): React.ReactElement | null;
