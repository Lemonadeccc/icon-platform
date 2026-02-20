import { promises as fs } from "fs";

import { META_PATH } from "./constants";

export type IconMeta = {
  name: string;
  fileName: string;
  componentName: string;
  fontClass: string;
  viewBox: string;
  updatedAt: string;
  previewSvg?: string;
};

export async function readMeta(): Promise<IconMeta[]> {
  try {
    const raw = await fs.readFile(META_PATH, "utf8");
    return JSON.parse(raw) as IconMeta[];
  } catch (error: any) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

export async function writeMeta(list: IconMeta[]) {
  await fs.writeFile(META_PATH, JSON.stringify(list, null, 2));
}

export function upsertMeta(list: IconMeta[], next: IconMeta) {
  const index = list.findIndex((item) => item.fileName === next.fileName);
  if (index === -1) {
    return [...list, next];
  }
  const updated = [...list];
  updated[index] = next;
  return updated;
}
