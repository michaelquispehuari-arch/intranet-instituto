interface SectionHeadProps {
  eyebrow: string;
  title: string;
  description?: string;
}

export function SectionHead({ eyebrow, title, description }: SectionHeadProps) {
  return (
    <header className="section-head">
      <p className="eyebrow">
        <span className="eyebrow-row">
          {eyebrow}
          <span className="eyebrow-tick" aria-hidden="true" />
        </span>
      </p>
      <h1 className="h1">{title}</h1>
      {description && <p className="small">{description}</p>}
    </header>
  );
}
