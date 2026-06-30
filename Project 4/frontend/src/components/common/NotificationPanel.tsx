import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { AlertTriangle, XCircle, TrendingDown, CheckCircle, X, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/utils/cn";

export type NotificationType = "critical" | "failed" | "degrading" | "completed";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
  time: string;
}

const iconMap: Record<NotificationType, { Icon: React.ElementType; cls: string; bg: string }> = {
  critical:  { Icon: AlertTriangle, cls: "text-red-400",    bg: "bg-red-500/10" },
  failed:    { Icon: XCircle,       cls: "text-orange-400", bg: "bg-orange-500/10" },
  degrading: { Icon: TrendingDown,  cls: "text-amber-400",  bg: "bg-amber-500/10" },
  completed: { Icon: CheckCircle,   cls: "text-green-400",  bg: "bg-green-500/10" },
};

interface NotificationPanelProps {
  anchorRef: React.RefObject<HTMLButtonElement>;
  notifications: AppNotification[];
  onClose: () => void;
}

export function NotificationPanel({ anchorRef, notifications, onClose }: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Position panel below the anchor button
  const rect = anchorRef.current?.getBoundingClientRect();
  const top = rect ? rect.bottom + 8 : 60;
  const right = rect ? window.innerWidth - rect.right : 24;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose, anchorRef]);

  const panel = (
    <div
      ref={panelRef}
      style={{ position: "fixed", top, right, zIndex: 9999 }}
      className="w-80 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1724] shadow-2xl shadow-black/60"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-semibold text-white">Notifications</span>
          {notifications.length > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
              {notifications.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white/[0.06] hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03]">
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-sm font-medium text-slate-400">All clear</p>
          <p className="mt-1 text-xs text-slate-600">No alerts right now</p>
        </div>
      ) : (
        <ul className="max-h-96 divide-y divide-white/[0.04] overflow-y-auto">
          {notifications.map((n) => {
            const { Icon, cls, bg } = iconMap[n.type];
            const inner = (
              <div className="flex gap-3 px-4 py-3.5">
                <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", bg)}>
                  <Icon className={cn("h-3.5 w-3.5", cls)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-200">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{n.body}</p>
                  <p className="mt-1 text-[10px] text-slate-700">
                    {formatDistanceToNow(new Date(n.time), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );

            return (
              <li key={n.id} className="transition-colors hover:bg-white/[0.03]">
                {n.href ? (
                  <Link to={n.href} onClick={onClose}>{inner}</Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-white/[0.06] px-4 py-2.5 text-center">
          <Link
            to="/scans"
            onClick={onClose}
            className="text-xs font-medium text-blue-400 transition-colors hover:text-blue-300"
          >
            View all scans →
          </Link>
        </div>
      )}
    </div>
  );

  return createPortal(panel, document.body);
}
