import type { ReactNode } from "react";
import { ErrorBoundary } from "react-error-boundary";

type Props = {
  children: ReactNode;
  /** Short label for the fallback copy, e.g. "支付方式" */
  label: string;
};

function SectionFallback({ label }: { label: string }) {
  return <p className="error">{label} 区域加载失败，请刷新重试。</p>;
}

/** Isolates a logical page section so one crash does not take down the whole page. */
export function SectionErrorBoundary({ children, label }: Props) {
  return (
    <ErrorBoundary
      fallback={<SectionFallback label={label} />}
      onError={function logSectionError(err) {
        console.error(`[SectionErrorBoundary:${label}]`, err);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
