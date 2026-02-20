import { NextResponse } from "next/server";

import { readMeta } from "@/lib/icon/meta";
import {
  addIconFromCode,
  deleteAllIcons,
  deleteIconByFileName,
} from "@/lib/icon/service";

export const runtime = "nodejs";

export async function GET() {
  const data = await readMeta();
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const icons = Array.isArray(body?.icons) ? body.icons : [];
  if (!icons.length) {
    return NextResponse.json(
      { error: "No icons uploaded" },
      { status: 400 }
    );
  }

  const results = [];
  for (const item of icons) {
    if (!item || typeof item !== "object") continue;
    const rawName = typeof item.name === "string" ? item.name.trim() : "";
    const code = typeof item.code === "string" ? item.code : "";
    const viewBox = typeof item.viewBox === "string" ? item.viewBox : null;
    const previewSvg =
      typeof item.previewSvg === "string" ? item.previewSvg : null;
    const svgContent =
      typeof item.svgContent === "string" ? item.svgContent : null;
    if (!rawName || !code) {
      continue;
    }
    const result = await addIconFromCode(
      code,
      rawName,
      viewBox,
      previewSvg,
      svgContent
    );
    results.push(result);
  }

  return NextResponse.json({ data: results });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null);
  if (body?.all === true) {
    const data = await deleteAllIcons();
    return NextResponse.json({ data });
  }

  const fileName = typeof body?.fileName === "string" ? body.fileName : "";
  if (!fileName) {
    return NextResponse.json(
      { error: "Missing fileName" },
      { status: 400 }
    );
  }
  const data = await deleteIconByFileName(fileName);
  return NextResponse.json({ data });
}
