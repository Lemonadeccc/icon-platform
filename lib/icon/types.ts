export type SvgNode = {
  tag: string;
  attrs: Record<string, string>;
  children: SvgNode[];
};
