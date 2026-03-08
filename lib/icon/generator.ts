import { promises as fs } from "fs";
import path from "path";

import { REACT_DIR, SVG_DIR } from "./constants";
import type { IconMeta } from "./meta";
export async function writeReactComponent(fileName: string, code: string) {
  const target = path.join(REACT_DIR, `${fileName}.js`);
  await fs.writeFile(target, code);
}

export async function writeSvgFile(fileName: string, svgContent: string) {
  const target = path.join(SVG_DIR, `${fileName}.svg`);
  await fs.writeFile(target, svgContent);
}

export async function writeReactIndex(metas: IconMeta[]) {
  const exportLines = [
    'import * as React from "react";',
    'export { Icon as BaseIcon } from "./Icon";',
    'export { createIcon } from "./createIcon";',
  ];

  const typeLines = [
    'import * as React from "react";',
    "",
    "export interface IconProps extends React.SVGProps<SVGSVGElement> {",
    "  size?: string | [string, string];",
    "  useStrokeCurrentColor?: boolean;",
    "  useFillCurrentColor?: boolean;",
    "}",
    "",
    "export type IconComponent = React.ForwardRefExoticComponent<",
    "  IconProps & React.RefAttributes<SVGSVGElement>",
    ">;",
    "",
    "export const BaseIcon: IconComponent;",
    "export function createIcon(options: {",
    "  paths: React.ReactNode;",
    "  iconProps?: IconProps;",
    "  viewBox?: string;",
    "}): IconComponent;",
  ];

  const iconNames = metas
    .sort((a, b) => a.componentName.localeCompare(b.componentName))
    .map((meta) => meta.componentName);

  iconNames.forEach((componentName) => {
    exportLines.push(`import { ${componentName} } from "./${componentName}";`);
    typeLines.push(`export const ${componentName}: IconComponent;`);
  });

  if (iconNames.length) {
    exportLines.push(`export { ${iconNames.join(", ")} };`);
  }

  exportLines.push("");
  exportLines.push("const iconMap = {");
  iconNames.forEach((componentName) => {
    exportLines.push(`  ${componentName},`);
  });
  exportLines.push("};");
  exportLines.push("");
  exportLines.push("export function Icon({ name, ...props }) {");
  exportLines.push("  const Component = iconMap[name];");
  exportLines.push("  if (!Component) return null;");
  exportLines.push("  return React.createElement(Component, props);");
  exportLines.push("}");

  typeLines.push("");
  typeLines.push(
    `export type IconName = ${iconNames.length ? iconNames.map((name) => `"${name}"`).join(" | ") : "string"};`
  );
  typeLines.push(
    "export function Icon(props: { name: IconName } & IconProps): React.ReactElement | null;"
  );

  await fs.writeFile(path.join(REACT_DIR, "index.js"), `${exportLines.join("\n")}\n`);
  await fs.writeFile(path.join(REACT_DIR, "index.d.ts"), `${typeLines.join("\n")}\n`);
}
