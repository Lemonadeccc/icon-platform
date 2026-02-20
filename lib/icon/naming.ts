const toKebab = (input: string) =>
  input
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

const toPascal = (input: string) =>
  input
    .split("-")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join("");

export function normalizeName(input: string) {
  const base = toKebab(input);
  if (!base) {
    throw new Error("Icon name is empty after normalization");
  }
  const rawComponent = toPascal(base);
  const componentName = /^\d/.test(rawComponent)
    ? `Icon${rawComponent}`
    : rawComponent;
  return {
    fileName: base,
    componentName,
    fontClass: `icon-${base}`,
  };
}
