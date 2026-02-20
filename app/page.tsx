"use client";

import { useEffect, useMemo, useState } from "react";

import { normalizeName } from "@/lib/icon/naming";

const ALLOWED_TAGS = new Set([
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "g",
]);

const STRIP_ATTRS = new Set([
  "fill",
  "stroke",
  "stroke-width",
  "fill-opacity",
  "stroke-opacity",
]);

const toJsxAttrName = (name: string) => {
  if (name === "class") return "className";
  if (name === "xlink:href") return "xlinkHref";
  return name.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
};

const escapeAttrValue = (value: string) => value.replace(/"/g, "&quot;");
const escapeSvgValue = (value: string) => value.replace(/"/g, "&quot;");

const renderSvgElement = (el: Element, depth: number): string | null => {
  const tagName = el.tagName.toLowerCase();
  if (!ALLOWED_TAGS.has(tagName)) return null;

  const attrs = Array.from(el.attributes)
    .filter((attr) => !STRIP_ATTRS.has(attr.name))
    .map(
      (attr) =>
        `${toJsxAttrName(attr.name)}="${escapeAttrValue(attr.value)}"`
    );
  const attrsString = attrs.length ? ` ${attrs.join(" ")}` : "";

  const children = Array.from(el.children)
    .map((child) => renderSvgElement(child, depth + 1))
    .filter(Boolean) as string[];

  const indent = "  ".repeat(depth);
  if (!children.length) {
    return `${indent}<${tagName}${attrsString} />`;
  }
  return `${indent}<${tagName}${attrsString}>\n${children.join(
    "\n"
  )}\n${indent}</${tagName}>`;
};

const renderSvgElementToString = (el: Element): string | null => {
  const tagName = el.tagName.toLowerCase();
  if (!ALLOWED_TAGS.has(tagName)) return null;

  const attrs = Array.from(el.attributes)
    .filter((attr) => !STRIP_ATTRS.has(attr.name))
    .map((attr) => {
      const name = attr.name === "className" ? "class" : attr.name;
      return `${name}="${escapeSvgValue(attr.value)}"`;
    });
  const attrsString = attrs.length ? ` ${attrs.join(" ")}` : "";

  const children = Array.from(el.children)
    .map((child) => renderSvgElementToString(child))
    .filter(Boolean) as string[];

  if (!children.length) {
    return `<${tagName}${attrsString} />`;
  }
  return `<${tagName}${attrsString}>${children.join("")}</${tagName}>`;
};

const buildPreviewSvg = (
  svgEl: SVGSVGElement,
  viewBox: string,
  useStrokeCurrentColor: boolean,
  useFillCurrentColor: boolean
) => {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  const all = Array.from(clone.querySelectorAll("*"));
  for (const el of all) {
    const tagName = el.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tagName)) {
      el.remove();
      continue;
    }
    for (const attr of Array.from(el.attributes)) {
      if (STRIP_ATTRS.has(attr.name)) {
        el.removeAttribute(attr.name);
      }
    }
  }

  const strokeAttr = useStrokeCurrentColor ? ' stroke="currentColor"' : "";
  const fillAttr = useFillCurrentColor ? ' fill="currentColor"' : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="24" height="24"${strokeAttr}${fillAttr} aria-hidden="true">${clone.innerHTML}</svg>`;
};

const parseSvgToIconParts = (svgText: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  const svgEl = doc.querySelector("svg");
  if (!svgEl) {
    throw new Error("Invalid SVG: missing <svg> root");
  }

  const viewBox = svgEl.getAttribute("viewBox") || "0 0 48 48";
  const allowedElements = Array.from(svgEl.querySelectorAll("*")).filter(
    (el) => ALLOWED_TAGS.has(el.tagName.toLowerCase())
  );
  let hasStroke = false;
  let hasFill = false;
  for (const el of allowedElements) {
    const stroke = el.getAttribute("stroke");
    if (stroke && stroke !== "none") hasStroke = true;
    const fill = el.getAttribute("fill");
    if (fill && fill !== "none") hasFill = true;
  }
  if (!hasStroke && !hasFill) {
    hasFill = true;
  }

  const elements = Array.from(svgEl.children)
    .map((child) => renderSvgElement(child, 3))
    .filter(Boolean) as string[];

  const svgBody = Array.from(svgEl.children)
    .map((child) => renderSvgElementToString(child))
    .filter(Boolean)
    .join("");

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${svgBody}</svg>`;
  const previewSvg = buildPreviewSvg(
    svgEl as SVGSVGElement,
    viewBox,
    hasStroke,
    hasFill
  );

  return {
    viewBox,
    elements,
    useStrokeCurrentColor: hasStroke,
    useFillCurrentColor: hasFill,
    previewSvg,
    svgContent,
  };
};

const buildReactComponentCode = (
  componentName: string,
  viewBox: string,
  elements: string[],
  useStrokeCurrentColor: boolean,
  useFillCurrentColor: boolean
) => {
  const paths = elements.length
    ? `(\n    <>\n${elements.join("\n")}\n    </>\n  )`
    : "null";

  const iconProps: string[] = [];
  if (useStrokeCurrentColor) iconProps.push("useStrokeCurrentColor: true");
  if (useFillCurrentColor) iconProps.push("useFillCurrentColor: true");
  const iconPropsBlock = iconProps.length
    ? `  iconProps: { ${iconProps.join(", ")} },\n`
    : "";

  return `import React from "react";
import { createIcon } from "./createIcon";

export const ${componentName} = createIcon({
  viewBox: "${viewBox}",
${iconPropsBlock}  paths: ${paths}
});
`;
};

const readSvgFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read SVG file"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsText(file);
  });

type IconMeta = {
  name: string;
  fileName: string;
  componentName: string;
  fontClass: string;
  viewBox: string;
  updatedAt: string;
  previewSvg?: string;
};

type PublishInfo = {
  currentVersion: string | null;
  lastPublishedVersion: string | null;
  lastPublishedAt: string | null;
};

export default function Home() {
  const [icons, setIcons] = useState<IconMeta[]>([]);
  const [busy, setBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishVersion, setPublishVersion] = useState("");
  const [publishInfo, setPublishInfo] = useState<PublishInfo | null>(null);

  const fetchIcons = async () => {
    const res = await fetch("/api/icons", { cache: "no-store" });
    const data = await res.json();
    setIcons(data?.data ?? []);
  };

  const fetchPublishInfo = async () => {
    const res = await fetch("/api/publish", { cache: "no-store" });
    const data = await res.json();
    setPublishInfo({
      currentVersion: data?.currentVersion ?? null,
      lastPublishedVersion: data?.lastPublishedVersion ?? null,
      lastPublishedAt: data?.lastPublishedAt ?? null,
    });
  };

  useEffect(() => {
    fetchIcons();
    fetchPublishInfo();
  }, []);

  const sorted = useMemo(
    () =>
      [...icons].sort(
        (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
      ),
    [icons]
  );

  const submitFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files.length) return;
    setBusy(true);
    setMessage(null);

    try {
      const icons = await Promise.all(
        files.map(async (file) => {
          const svgText = await readSvgFile(file);
          const rawName = file.name.replace(/\.svg$/i, "");
          const { componentName } = normalizeName(rawName);
          const {
            viewBox,
            elements,
            useStrokeCurrentColor,
            useFillCurrentColor,
            previewSvg,
            svgContent,
          } = parseSvgToIconParts(svgText);
          const code = buildReactComponentCode(
            componentName,
            viewBox,
            elements,
            useStrokeCurrentColor,
            useFillCurrentColor
          );
          return { name: rawName, viewBox, code, previewSvg, svgContent };
        })
      );

      const res = await fetch("/api/icons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icons }),
      });
      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload?.error || "Upload failed");
      }
      await fetchIcons();
      setMessage("生成成功：React 组件已更新。");
    } catch (error: any) {
      setMessage(error?.message || "上传失败");
    } finally {
      setBusy(false);
    }
  };

  const onUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    await submitFiles(files);
    event.target.value = "";
  };

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const items = Array.from(event.clipboardData?.files || []);
      const svgs = items.filter((file) => file.type === "image/svg+xml");
      if (!svgs.length) return;
      event.preventDefault();
      submitFiles(svgs);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const files = Array.from(event.dataTransfer.files || []).filter(
      (file) => file.type === "image/svg+xml" || file.name.endsWith(".svg")
    );
    if (files.length) {
      submitFiles(files);
    }
  };

  const deleteIcon = async (fileName: string) => {
    if (!window.confirm(`确定删除 ${fileName} 吗？`)) return;
    setActionBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/icons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "删除失败");
      }
      setIcons(payload?.data ?? []);
      setMessage("已删除图标。");
    } catch (error: any) {
      setMessage(error?.message || "删除失败");
    } finally {
      setActionBusy(false);
    }
  };

  const deleteAll = async () => {
    if (!icons.length) return;
    if (!window.confirm("确定删除全部图标吗？")) return;
    setActionBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/icons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "删除失败");
      }
      setIcons(payload?.data ?? []);
      setMessage("已删除全部图标。");
    } catch (error: any) {
      setMessage(error?.message || "删除失败");
    } finally {
      setActionBusy(false);
    }
  };

  const publishIcons = async () => {
    if (!window.confirm("确认触发发布流程吗？")) return;
    setPublishBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: publishVersion.trim() || undefined,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "发布失败");
      }
      setMessage("已触发发布流程，请在 GitHub Actions 查看进度。");
      setPublishVersion("");
      fetchPublishInfo();
    } catch (error: any) {
      setMessage(error?.message || "发布失败");
    } finally {
      setPublishBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-5xl px-6 py-12">
        <header className="flex flex-col gap-4">
          <span className="text-sm uppercase tracking-[0.2em] text-slate-400">
            Icon Platform
          </span>
          <h1 className="text-3xl font-semibold text-slate-50">
            自动化 Icon 管理平台
          </h1>
          <p className="max-w-2xl text-sm text-slate-400">
            浏览器解析 SVG 并生成 React 组件代码，提交后端保存并刷新元数据。
          </p>
        </header>

        <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-medium text-slate-50">
                上传 SVG
              </h2>
              <p className="text-sm text-slate-400">
                支持多文件上传、拖拽与粘贴，文件名将用于 Icon 命名。
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-3 rounded-full border border-slate-700 bg-slate-950 px-5 py-2 text-sm text-slate-200 hover:border-slate-500">
              <input
                type="file"
                accept=".svg"
                multiple
                onChange={onUpload}
                className="hidden"
                disabled={busy}
              />
              {busy ? "处理中..." : "选择 SVG"}
            </label>
          </div>
          <div
            className={`mt-4 rounded-2xl border border-dashed px-4 py-6 text-center text-sm transition ${
              dragActive
                ? "border-slate-500 bg-slate-950/60 text-slate-200"
                : "border-slate-800 text-slate-500"
            }`}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragActive(false);
            }}
            onDrop={onDrop}
          >
            拖拽 SVG 到这里，或直接 Ctrl/⌘ + V 粘贴 SVG 文件
          </div>
          {message ? (
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
              {message}
            </div>
          ) : null}
        </section>

        <section className="mt-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-medium text-slate-50">图标列表</h2>
              <span className="text-sm text-slate-500">
                {icons.length} icons
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>当前版本：{publishInfo?.currentVersion || "未知"}</span>
                <span>
                  {publishInfo?.lastPublishedVersion
                    ? `上次发布：${publishInfo.lastPublishedVersion} · ${publishInfo.lastPublishedAt ? new Date(publishInfo.lastPublishedAt).toLocaleString() : ""}`
                    : "暂无历史发布"}
                </span>
                <input
                  value={publishVersion}
                  onChange={(event) => setPublishVersion(event.target.value)}
                  placeholder="版本号 (可选)"
                  className="h-9 w-36 rounded-full border border-slate-800 bg-slate-950 px-3 text-sm text-slate-200 placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={publishIcons}
                  disabled={publishBusy}
                  className="h-9 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 text-sm text-emerald-200 hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {publishBusy ? "发布中..." : "确认发布"}
                </button>
                <button
                  type="button"
                  onClick={deleteAll}
                  disabled={actionBusy || !icons.length}
                  className="h-9 rounded-full border border-rose-500/40 bg-rose-500/10 px-4 text-sm text-rose-200 hover:border-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  全部删除
                </button>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {sorted.length ? (
              sorted.map((icon) => (
                <div
                  key={icon.fileName}
                  className="group relative rounded-2xl border border-slate-800 bg-slate-900/40 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-50">
                        {icon.componentName}
                      </div>
                      <div className="mt-2 text-xs text-slate-400">
                        <div>SVG: {icon.fileName}.svg</div>
                        <div>Font Class: {icon.fontClass}</div>
                        <div>viewBox: {icon.viewBox}</div>
                        <div>
                          Updated: {new Date(icon.updatedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-slate-100">
                      {icon.previewSvg ? (
                        <span
                          className="h-6 w-6 text-slate-100"
                          dangerouslySetInnerHTML={{
                            __html: icon.previewSvg,
                          }}
                        />
                      ) : (
                        <span className="text-xs text-slate-500">N/A</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteIcon(icon.fileName)}
                    disabled={actionBusy}
                    className="absolute bottom-3 right-3 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-200 opacity-0 transition hover:border-rose-400 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    删除
                  </button>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
                还没有图标，上传 SVG 开始生成。
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
