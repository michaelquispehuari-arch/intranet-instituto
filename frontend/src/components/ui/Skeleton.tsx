interface SkeletonProps {
  height?: string | number;
  width?: string | number;
  className?: string;
}

export function Skeleton({ height = "1rem", width = "100%", className }: SkeletonProps) {
  return (
    <span
      className={`skel ${className ?? ""}`}
      style={{ display: "block", height, width }}
      aria-hidden="true"
    />
  );
}
