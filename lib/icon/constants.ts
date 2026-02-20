import path from "path";

export const ROOT_DIR = process.cwd();
export const ICONS_DIR = path.join(ROOT_DIR, "icons");
export const SVG_DIR = path.join(ICONS_DIR, "svg");
export const REACT_DIR = path.join(ICONS_DIR, "react");
export const FONT_DIR = path.join(ICONS_DIR, "font");
export const META_PATH = path.join(ICONS_DIR, "meta.json");
export const PUBLISH_META_PATH = path.join(ICONS_DIR, "publish.json");
