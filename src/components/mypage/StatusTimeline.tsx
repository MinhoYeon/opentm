import type { CSSProperties, ReactNode } from "react";

import styles from "./StatusTimeline.module.css";

type TimelineStatusLog = {
  status: string;
  label?: string | null;
  description?: string | null;
  changedAt?: string | null;
  changed_at?: string | null;
  note?: string | null;
  actor?: string | null;
};

type StatusTimelineProps = {
  status?: string | null;
  statusLogs?: Array<TimelineStatusLog | null | undefined>;
  className?: string;
  emptyTitle?: string;
  emptyDescription?: string;
};

type IconProps = {
  className?: string;
};

type StatusMeta = {
  label: string;
  description: string;
  accentColor: string;
  iconBackground: string;
  iconColor: string;
  tone?: "default" | "success" | "warning" | "danger";
  Icon: (props: IconProps) => JSX.Element;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function createSvg(path: ReactNode) {
  return function Icon({ className }: IconProps) {
    return (
      <svg
        className={cx(styles.iconSvg, className)}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-hidden
      >
        {path}
      </svg>
    );
  };
}

const DocumentIcon = createSvg(
  <>
    <path d="M8 4h6l4 4v12H8z" />
    <path d="M14 4v5h5" />
    <path d="M10 12h6" />
    <path d="M10 16h6" />
    <path d="M10 8h2" />
  </>
);

const PaymentIcon = createSvg(
  <>
    <rect x="4" y="7" width="16" height="10" rx="2" />
    <path d="M4 11h16" />
    <path d="M8 15h2" />
  </>
);

const CheckIcon = createSvg(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m9.5 12.5 2 2 3.5-3.5" />
  </>
);

const ClipboardIcon = createSvg(
  <>
    <path d="M9 5h6" />
    <path d="M8 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
    <path d="M10 3h4v2h-4z" />
  </>
);

const PlaneIcon = createSvg(
  <>
    <path d="m3 12 18-9-5.4 18-4.2-6.6-6.4-2.4z" />
    <path d="m13.4 14.4 5.2 5.2" />
  </>
);

const SearchIcon = createSvg(
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16.5 16.5 3 3" />
  </>
);

const ShieldIcon = createSvg(
  <>
    <path d="M12 3 5 6v5c0 5 3.2 9.3 7 10 3.8-.7 7-5 7-10V6Z" />
    <path d="m9.5 12.5 2 2 3.5-3.5" />
  </>
);

const XIcon = createSvg(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m9.5 9.5 5 5" />
    <path d="m14.5 9.5-5 5" />
  </>
);

const BanIcon = createSvg(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m7.5 7.5 9 9" />
  </>
);

const DEFAULT_META: StatusMeta = {
  label: "진행 중",
  description: "진행 상황을 확인하고 있습니다.",
  accentColor: "#cbd5f5",
  iconBackground: "#e2e8f0",
  iconColor: "#334155",
  Icon: DocumentIcon,
};

const STATUS_META: Record<string, StatusMeta> = {
  draft: {
    label: "임시 저장",
    description: "제출 전 임시 저장 상태입니다.",
    accentColor: "#94a3b8",
    iconBackground: "#f1f5f9",
    iconColor: "#1e293b",
    Icon: DocumentIcon,
  },
  awaiting_payment: {
    label: "입금 대기",
    description: "가상계좌 입금이 확인되면 다음 단계로 진행됩니다.",
    accentColor: "#fbbf24",
    iconBackground: "#fef3c7",
    iconColor: "#b45309",
    tone: "warning",
    Icon: PaymentIcon,
  },
  payment_received: {
    label: "결제 완료",
    description: "결제가 완료되었습니다. 담당 변리사가 서류를 준비하고 있어요.",
    accentColor: "#34d399",
    iconBackground: "#d1fae5",
    iconColor: "#047857",
    tone: "success",
    Icon: CheckIcon,
  },
  preparing_filing: {
    label: "출원 준비",
    description: "제출 서류를 검토하고 있습니다.",
    accentColor: "#818cf8",
    iconBackground: "#eef2ff",
    iconColor: "#4338ca",
    Icon: ClipboardIcon,
  },
  filed: {
    label: "출원 완료",
    description: "특허청에 출원이 접수되었습니다.",
    accentColor: "#60a5fa",
    iconBackground: "#dbeafe",
    iconColor: "#1d4ed8",
    Icon: PlaneIcon,
  },
  office_action: {
    label: "심사 진행중",
    description: "특허청의 검토가 진행 중입니다.",
    accentColor: "#fbbf24",
    iconBackground: "#fef3c7",
    iconColor: "#b45309",
    tone: "warning",
    Icon: SearchIcon,
  },
  completed: {
    label: "등록 완료",
    description: "상표 등록이 완료되었습니다.",
    accentColor: "#34d399",
    iconBackground: "#d1fae5",
    iconColor: "#047857",
    tone: "success",
    Icon: ShieldIcon,
  },
  rejected: {
    label: "거절",
    description: "심사 결과 거절되었습니다.",
    accentColor: "#f87171",
    iconBackground: "#fee2e2",
    iconColor: "#b91c1c",
    tone: "danger",
    Icon: XIcon,
  },
  cancelled: {
    label: "취소됨",
    description: "요청이 취소되었습니다.",
    accentColor: "#cbd5f5",
    iconBackground: "#f1f5f9",
    iconColor: "#475569",
    Icon: BanIcon,
  },
};

function resolveMeta(statusKey: string | null | undefined) {
  if (!statusKey) {
    return DEFAULT_META;
  }

  const normalized = statusKey.trim().toLowerCase();
  return STATUS_META[normalized] ?? DEFAULT_META;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

type TimelineEntry = {
  id: string;
  statusKey: string;
  label: string;
  description: string;
  changedAt?: string;
  timestamp?: number;
  meta: StatusMeta;
  note?: string | null;
  actor?: string | null;
};

export function StatusTimeline({
  status,
  statusLogs,
  className,
  emptyTitle = "상태 이력이 아직 없습니다.",
  emptyDescription = "진행 중인 이벤트가 등록되면 이곳에서 확인할 수 있어요.",
}: StatusTimelineProps) {
  const normalizedStatus = status?.trim().toLowerCase() ?? "";

  const entries: TimelineEntry[] = (statusLogs ?? [])
    .map((log, index) => {
      if (!log) {
        return null;
      }

      const statusValue = typeof log.status === "string" ? log.status.trim() : "";
      if (!statusValue) {
        return null;
      }

      const meta = resolveMeta(statusValue);
      const changedAt = log.changedAt ?? log.changed_at ?? null;
      let timestamp: number | undefined;
      if (changedAt) {
        const parsed = new Date(changedAt);
        if (!Number.isNaN(parsed.getTime())) {
          timestamp = parsed.getTime();
        }
      }

      return {
        id: `${statusValue}-${timestamp ?? index}`,
        statusKey: statusValue.toLowerCase(),
        label: log.label?.trim() || meta.label,
        description: log.description?.trim() || meta.description,
        changedAt: changedAt ?? undefined,
        timestamp,
        meta,
        note: log.note ?? null,
        actor: log.actor ?? null,
      } satisfies TimelineEntry;
    })
    .filter((entry): entry is TimelineEntry => Boolean(entry));

  entries.sort((a, b) => {
    if (a.timestamp === b.timestamp) {
      return 0;
    }

    if (a.timestamp == null) {
      return 1;
    }

    if (b.timestamp == null) {
      return -1;
    }

    return b.timestamp - a.timestamp;
  });

  if (!entries.length) {
    return (
      <div className={cx(styles.emptyState, className)}>
        <span className={styles.emptyIcon} aria-hidden>
          <DocumentIcon />
        </span>
        <p className={styles.emptyTitle}>{emptyTitle}</p>
        <p className={styles.emptyDescription}>{emptyDescription}</p>
      </div>
    );
  }

  const activeIndex = entries.findIndex((entry) => entry.statusKey === normalizedStatus);
  const resolvedActiveIndex = activeIndex >= 0 ? activeIndex : 0;

  return (
    <ol className={cx(styles.timeline, className)}>
      {entries.map((entry, index) => {
        const Icon = entry.meta.Icon;
        const isActive = index === resolvedActiveIndex;
        const toneClass =
          entry.meta.tone === "success"
            ? styles.completed
            : entry.meta.tone === "warning"
              ? styles.warning
              : entry.meta.tone === "danger"
                ? styles.danger
                : undefined;

        const style: CSSProperties = {
          ["--timeline-accent" as const]: entry.meta.accentColor,
          ["--icon-background" as const]: entry.meta.iconBackground,
          ["--icon-color" as const]: entry.meta.iconColor,
        };

        return (
          <li
            key={entry.id}
            className={cx(styles.item, isActive && styles.active, toneClass)}
            style={style}
          >
            <div className={styles.iconColumn} aria-hidden>
              <span className={styles.iconWrap}>
                <Icon />
              </span>
            </div>

            <div className={styles.details}>
              <p className={styles.statusLabel}>{entry.label}</p>
              {entry.description ? <p className={styles.description}>{entry.description}</p> : null}
              <div className={styles.metaRow}>
                {entry.note ? <span className={styles.badge}>{entry.note}</span> : null}
                <span className={cx(styles.timestamp)}>{formatDateTime(entry.changedAt)}</span>
              </div>
              {entry.actor ? (
                <div className={styles.metaRow}>
                  <span className={styles.badge}>담당자 {entry.actor}</span>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
