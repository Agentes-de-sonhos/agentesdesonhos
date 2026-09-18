import styles from "./BrandCloudLoader.module.css";

interface BrandCloudLoaderProps {
  label?: string;
  className?: string;
}

// Nuvem com base plana e cantos tangentes: o arco direito termina exatamente
// na linha da base (mesmo y do início), sem bico, cauda ou balão de fala.
const CLOUD_PATH = "M12.5 21A6.5 6.5 0 1 0 17.8 10.7A5.5 5.5 0 1 1 20.5 21Z";

export function BrandCloudLoader({
  label = "Carregando",
  className = "",
}: BrandCloudLoaderProps) {
  return (
    <div
      className={`inline-flex h-16 w-16 items-center justify-center ${className}`}
      role="status"
      aria-label={label}
    >
      <svg
        viewBox="0 0 32 32"
        className="h-[57px] w-[57px]"
        fill="none"
        aria-hidden="true"
      >
        <path
          d={CLOUD_PATH}
          pathLength="100"
          className="stroke-primary/20"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={CLOUD_PATH}
          pathLength="100"
          className={`${styles.trace} stroke-primary`}
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}