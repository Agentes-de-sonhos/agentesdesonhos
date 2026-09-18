import styles from "./BrandCloudLoader.module.css";

interface BrandCloudLoaderProps {
  label?: string;
  className?: string;
}

const CLOUD_PATH = "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a5.5 5.5 0 1 1 0 11Z";

export function BrandCloudLoader({
  label = "Carregando",
  className = "",
}: BrandCloudLoaderProps) {
  return (
    <div
      className={`inline-flex h-12 w-12 items-center justify-center ${className}`}
      role="status"
      aria-label={label}
    >
      <svg
        viewBox="0 0 32 32"
        className="h-11 w-11"
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