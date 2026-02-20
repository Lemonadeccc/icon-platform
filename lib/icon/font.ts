import svgtofont from "svgtofont";

import { FONT_DIR, SVG_DIR } from "./constants";

export async function generateIconFont() {
  await svgtofont({
    src: SVG_DIR,
    dist: FONT_DIR,
    fontName: "iconfont",
    css: true,
    useNameAsUnicode: true,
    svgicons2svgfont: {
      fontHeight: 1000,
      normalize: true,
    },
    cssOptions: {
      fontSize: "16px",
      classNamePrefix: "icon-",
    },
    startUnicode: 0xea01,
    svgicons2svgfontFontHeight: 1000,
    svgicons2svgfontNormalize: true,
    svgicons2svgfontFixedWidth: true,
    website: null,
    outSVGReact: false,
    outSVGPath: false,
  } as any);
}
