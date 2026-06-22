// Two-line Space Grotesk display heading — the signature reference treatment:
// a muted first line over a bold ink second line. e.g.
//   <DisplayHeading muted="Add your" bold="Budget Category" />
export interface DisplayHeadingProps {
  muted: string;
  bold: string;
  className?: string;
}

export function DisplayHeading({ muted, bold, className = "" }: DisplayHeadingProps) {
  return (
    <h1 className={["font-display leading-[1.05]", className].join(" ")}>
      <span className="block text-3xl font-medium text-ink-soft">{muted}</span>
      <span className="block text-4xl font-bold text-ink">{bold}</span>
    </h1>
  );
}

export default DisplayHeading;
