import { LoaderCircle } from "lucide-react";
/** Render inside the active dialog as well, so native top-layer forms retain feedback. */
export function LoadingIndicator({ label = "กำลังโหลด…", overlay = false }: { label?: string; overlay?: boolean }) {
 return <div className={overlay ? "app-loading-overlay" : "app-loading-inline"} role="status" aria-live="polite"><div className="app-loading-content"><LoaderCircle className="loading-spin" size={40} aria-hidden="true"/><span>{label}</span></div></div>;
}
