import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  type ReactNode,
  type ReactElement,
} from "react";

// Explicit mathematical expressions only: surrounding explanatory prose keeps the site font.
const atom = String.raw`[−-]?(?:[A-Za-zΑ-ωΔ∑][A-Za-zΑ-ωΔ₀-₉⁰-⁹²³^_]{0,2}|\d+(?:,\d{3})*(?:\.\d+)?|[π∞])`;
const expression = String.raw`\(?${atom}\)?(?:\s*[±×÷+−*/]\s*\(?${atom}\)?)*`;
const equation = new RegExp(
  String.raw`((?<![\p{L}\p{N}_])${expression}(?:\s*[=≈≃∝<>≤≥]\s*${expression})+(?![\p{L}\p{N}_]))`,
  "gu",
);
function format(text: string) {
  return text.split(equation).map((part, i) =>
    i % 2 ? (
      <span className="formula" key={i}>
        {part}
      </span>
    ) : (
      part
    ),
  );
}
function visit(children: ReactNode): ReactNode {
  const nodes = Children.toArray(children),
    result: ReactNode[] = [];
  let text = "";
  const flush = () => {
    if (text) {
      result.push(<Fragment key={`s${result.length}`}>{format(text)}</Fragment>);
      text = "";
    }
  };
  for (const child of nodes) {
    if (typeof child === "string" || typeof child === "number") {
      text += child;
      continue;
    }
    flush();
    if (
      isValidElement<{ children?: ReactNode; className?: string }>(child) &&
      child.props.children &&
      !child.props.className?.includes("formula")
    )
      result.push(
        cloneElement(child as ReactElement<{ children?: ReactNode }>, {
          children: visit(child.props.children),
        }),
      );
    else result.push(child);
  }
  flush();
  return result;
}
export function ScientificText({ children }: { children: ReactNode }) {
  return <>{visit(children)}</>;
}
export function Formula({ children }: { children: ReactNode }) {
  return <span className="formula">{children}</span>;
}
