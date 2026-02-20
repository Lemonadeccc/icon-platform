import { promises as fs } from "fs";
import path from "path";

import { generateIconFont } from "./font";
import { writeReactComponent, writeReactIndex, writeSvgFile } from "./generator";
import { normalizeName } from "./naming";
import { ensureIconDirs } from "./storage";
import { readMeta, upsertMeta, writeMeta } from "./meta";
import { REACT_DIR, SVG_DIR } from "./constants";
import { syncIconsToRepo } from "./git";

export async function addIconFromCode(
  reactCode: string,
  rawName: string,
  viewBox: string | null,
  previewSvg: string | null,
  svgContent: string | null
) {
  await ensureIconDirs();

  const { fileName, componentName, fontClass } = normalizeName(rawName);
  const normalizedViewBox = viewBox || "0 0 48 48";
  if (!reactCode.includes(`export const ${componentName}`)) {
    throw new Error("React component name does not match icon name.");
  }
  if (svgContent) {
    await writeSvgFile(fileName, svgContent);
  }
  await writeReactComponent(componentName, reactCode);

  const currentMeta = await readMeta();
  const updatedMeta = upsertMeta(currentMeta, {
    name: rawName,
    fileName,
    componentName,
    fontClass,
    viewBox: normalizedViewBox,
    previewSvg: previewSvg || undefined,
    updatedAt: new Date().toISOString(),
  });
  await writeMeta(updatedMeta);
  await writeReactIndex(updatedMeta);
  await generateIconFont();
  await syncIconsToRepo(`chore: add ${componentName}`);

  return {
    fileName,
    componentName,
    fontClass,
    viewBox: normalizedViewBox,
  };
}

async function removeFile(target: string) {
  try {
    await fs.unlink(target);
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
}

export async function deleteIconByFileName(fileName: string) {
  await ensureIconDirs();
  const currentMeta = await readMeta();
  const target = currentMeta.find((item) => item.fileName === fileName);
  if (!target) {
    return currentMeta;
  }

  await removeFile(path.join(SVG_DIR, `${fileName}.svg`));
  await removeFile(path.join(REACT_DIR, `${target.componentName}.js`));

  const nextMeta = currentMeta.filter((item) => item.fileName !== fileName);
  await writeMeta(nextMeta);
  await writeReactIndex(nextMeta);
  await generateIconFont();
  await syncIconsToRepo(`chore: remove ${target.componentName}`);
  return nextMeta;
}

export async function deleteAllIcons() {
  await ensureIconDirs();
  const currentMeta = await readMeta();
  await Promise.all(
    currentMeta.flatMap((item) => [
      removeFile(path.join(SVG_DIR, `${item.fileName}.svg`)),
      removeFile(path.join(REACT_DIR, `${item.componentName}.js`)),
    ])
  );
  await writeMeta([]);
  await writeReactIndex([]);
  await generateIconFont();
  await syncIconsToRepo("chore: remove all icons");
  return [];
}
