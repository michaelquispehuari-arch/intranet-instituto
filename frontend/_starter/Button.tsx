// starter/Button.tsx — botón base de PeRTS (sin emojis; icono opcional de lucide-react)
import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  /** Icono de lucide-react, ej: <Plus/>. Va a la izquierda del texto. */
  icon?: ReactNode;
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  block = false,
  icon,
  loading = false,
  disabled,
  children,
  className = "",
  ...rest
}: Props) {
  const classes = [
    "btn",
    `btn--${variant}`,
    size === "sm" ? "btn--sm" : size === "lg" ? "btn--lg" : "",
    block ? "btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} disabled={disabled || loading} {...rest}>
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

// Spinner inline minimalista (para estados de carga dentro del botón)
function Spinner() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden
      style={{ animation: "spin .7s linear infinite" }}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeOpacity=".25" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
// En globals.css agrega: @keyframes spin{to{transform:rotate(360deg)}}

/* Ejemplos de uso:
   import { Plus, LogIn } from "lucide-react";
   <Button variant="primary" icon={<Plus/>}>Nuevo curso</Button>
   <Button variant="accent" icon={<Video/>}>Unirse a la clase ahora</Button>
   <Button variant="secondary" size="sm">Cancelar</Button>
   <Button variant="danger" icon={<Trash2/>}>Eliminar</Button>
   <Button block loading>Ingresando…</Button>
*/
