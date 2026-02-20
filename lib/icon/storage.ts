import { promises as fs } from "fs";

import { FONT_DIR, ICONS_DIR, REACT_DIR, SVG_DIR } from "./constants";
import { ensureRuntimeFiles } from "./runtime";

export async function ensureIconDirs() {
  await fs.mkdir(ICONS_DIR, { recursive: true });
  await fs.mkdir(SVG_DIR, { recursive: true });
  await fs.mkdir(REACT_DIR, { recursive: true });
  await fs.mkdir(FONT_DIR, { recursive: true });
  await ensureRuntimeFiles();
}
