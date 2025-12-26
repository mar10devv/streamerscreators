import * as React from "react";

type SpinnerProps = {
  /** px (number) o clases tailwind con className */
  size?: number; // default 20
  className?: string;
  /** Accesibilidad */
  label?: string; // default "Cargando..."
};

export function Spinner({ size = 20, className = "", label = "Cargando..." }: SpinnerProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`animate-spin ${className}`}
      role="status"
      aria-label={label}
    >
      <path
        fill="currentColor"
        opacity="0.25"
        d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8Z"
      />
      <path
        fill="currentColor"
        d="M20 12a8 8 0 0 0-8-8v2a6 6 0 0 1 6 6h2Z"
      />
    </svg>
  );
}

type SpinnerBubbleProps = SpinnerProps & {
  /** clases para el fondo de la pastilla/círculo */
  bubbleClassName?: string; // default "bg-black/55 text-white"
  paddingClassName?: string; // default "px-3 py-3"
};

/**
 * “Spinner dentro de burbuja” (queda lindo arriba de cards/thumbnails)
 * El color del spinner hereda de currentColor (o sea del text color).
 */
export function SpinnerBubble({
  size = 20,
  className = "",
  label = "Cargando...",
  bubbleClassName = "bg-black/55 text-white",
  paddingClassName = "px-3 py-3",
}: SpinnerBubbleProps) {
  return (
    <div className={`rounded-full ${bubbleClassName} ${paddingClassName}`} aria-hidden="true">
      <Spinner size={size} className={className} label={label} />
    </div>
  );
}
