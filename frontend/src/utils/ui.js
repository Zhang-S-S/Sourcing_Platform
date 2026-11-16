export function cx(...values) {
  return values
    .flatMap((value) =>
      !value
        ? []
        : typeof value === "string"
          ? [value]
          : Array.isArray(value)
            ? [cx(...value)]
            : Object.keys(value).filter((key) => value[key]),
    )
    .join(" ");
}
export function css(text) {
  return Object.fromEntries(
    text
      .split(";")
      .filter((part) => part.includes(":"))
      .map((part) => {
        const at = part.indexOf(":");
        return [
          part
            .slice(0, at)
            .trim()
            .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()),
          part.slice(at + 1).trim(),
        ];
      }),
  );
}
