import { promises as fs } from "fs";
import path from "path";

import { NextResponse } from "next/server";

import { PUBLISH_META_PATH, ROOT_DIR } from "@/lib/icon/constants";

export const runtime = "nodejs";

const ICONS_DIR = path.join(ROOT_DIR, "icons");
const ICONS_PACKAGE = path.join(ICONS_DIR, "package.json");

const readJson = async <T,>(target: string): Promise<T | null> => {
  try {
    const raw = await fs.readFile(target, "utf8");
    return JSON.parse(raw) as T;
  } catch (error: any) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
};

export async function GET() {
  const pkg = await readJson<{ version?: string }>(ICONS_PACKAGE);
  const publishMeta = await readJson<{
    lastPublishedVersion?: string;
    lastPublishedAt?: string;
  }>(PUBLISH_META_PATH);

  return NextResponse.json({
    currentVersion: pkg?.version || null,
    lastPublishedVersion: publishMeta?.lastPublishedVersion || null,
    lastPublishedAt: publishMeta?.lastPublishedAt || null,
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const version =
    typeof body?.version === "string" && body.version.trim()
      ? body.version.trim()
      : null;

  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  const workflow = process.env.GITHUB_WORKFLOW || "publish-icons.yml";
  const ref = process.env.GITHUB_REF || "main";

  if (!owner || !repo || !token) {
    return NextResponse.json(
      { error: "Missing GitHub publish configuration" },
      { status: 500 }
    );
  }

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref,
        inputs: version ? { version } : {},
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: "Failed to trigger publish", detail: text },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
