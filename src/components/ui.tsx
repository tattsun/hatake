import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import { Loader2, X } from "lucide-react";

export function StatusDot({ on, warn }: { on?: boolean; warn?: boolean }) {
  const cls = warn ? "warn" : on ? "on" : "off";
  return <span className={`dot ${cls}`} />;
}

export function Pill({ kind, children }: { kind: string; children: ReactNode }) {
  return <span className={`pill ${kind}`}>{children}</span>;
}

export function Spinner() {
  return <Loader2 size={15} className="spin" />;
}

export function Empty({ icon, text }: { icon?: ReactNode; text: string }) {
  return (
    <div className="empty">
      {icon && <div className="em-icon">{icon}</div>}
      <div>{text}</div>
    </div>
  );
}

export function Modal({
  title,
  children,
  footer,
  onClose,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span>{title}</span>
          <span className="spacer" />
          <button className="btn icon sm" onClick={onClose}>
            <X size={15} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// ---- Toast -----------------------------------------------------------------
type Toast = { id: number; text: string; err?: boolean };
const ToastCtx = createContext<(text: string, err?: boolean) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, err?: boolean) => {
    const id = Date.now() + Math.random();
    setItems((p) => [...p, { id, text, err }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast">
        {items.map((t) => (
          <div key={t.id} className={`item ${t.err ? "err" : ""}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
