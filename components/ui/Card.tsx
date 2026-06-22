import type { HTMLAttributes } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement>;

// Surface card — cream panel with generous padding and a soft radius.
export function Card({ className = "", ...props }: CardProps) {
  return (
    <div
      className={["bg-surface rounded-2xl p-4", className].join(" ")}
      {...props}
    />
  );
}

export type CardLabelProps = HTMLAttributes<HTMLSpanElement>;

// Small uppercase wide-tracking label (the recurring .label-caps pattern).
export function CardLabel({ className = "", ...props }: CardLabelProps) {
  return <span className={["label-caps", className].join(" ")} {...props} />;
}

export default Card;
