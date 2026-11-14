// ③ 화면에서 쓰는 선 아이콘 모음 (24px 격자, 선 굵기 1.75, 둥근 끝).
// 이모지·특수문자(✓ ✖ ⓘ ⚠ ← →) 대신 써요. 색은 글자색(currentColor)을 따라가요.
// 꾸밈용이라 화면낭독기에는 숨겨요. 뜻은 옆의 글자로 전해요.
import type { ReactNode } from "react";

export interface IconProps {
  /** 한 변 길이(px) */
  size?: number;
  className?: string;
  strokeWidth?: number;
}

function icon(children: ReactNode) {
  return function Icon({ size = 20, className, strokeWidth = 1.75 }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        className={`shrink-0 ${className ?? ""}`}
      >
        {children}
      </svg>
    );
  };
}

/* ---------- 상태·동작 ---------- */

export const CheckIcon = icon(<path d="M20 6 9 17l-5-5" />);

export const XIcon = icon(<path d="M18 6 6 18M6 6l12 12" />);

export const HelpIcon = icon(
  <>
    <circle cx="12" cy="12" r="9.25" />
    <path d="M9.2 9.2a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.5-2.8 4" />
    <path d="M12 17.2h.01" />
  </>,
);

export const InfoIcon = icon(
  <>
    <circle cx="12" cy="12" r="9.25" />
    <path d="M12 16.5v-5" />
    <path d="M12 7.8h.01" />
  </>,
);

export const AlertIcon = icon(
  <>
    <path d="M10.3 4.2 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9.5v4" />
    <path d="M12 16.8h.01" />
  </>,
);

export const ChevronLeftIcon = icon(<path d="m15 18-6-6 6-6" />);

export const ChevronRightIcon = icon(<path d="m9 18 6-6-6-6" />);

export const ChatIcon = icon(<path d="M7.9 20A9 9 0 1 0 4 16.1L2.5 21.5Z" />);

export const ExternalIcon = icon(
  <>
    <path d="M14 4h6v6" />
    <path d="M20 4 10.5 13.5" />
    <path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
  </>,
);

export const SlidersIcon = icon(
  <>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </>,
);

export const SwapIcon = icon(
  <>
    <path d="M7.5 3.5 4 7l3.5 3.5" />
    <path d="M4 7h16" />
    <path d="M16.5 13.5 20 17l-3.5 3.5" />
    <path d="M20 17H4" />
  </>,
);

export const ClipboardCheckIcon = icon(
  <>
    <rect x="8.5" y="2.5" width="7" height="4" rx="1" />
    <path d="M15.5 4.5H17a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h1.5" />
    <path d="m9 14 2.2 2.2L15.2 12" />
  </>,
);

/* ---------- 안내 ---------- */

export const UserIcon = icon(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
  </>,
);

export const LockIcon = icon(
  <>
    <rect x="4" y="10.5" width="16" height="10.5" rx="2" />
    <path d="M7.5 10.5V7.5a4.5 4.5 0 0 1 9 0v3" />
  </>,
);

export const PinIcon = icon(
  <>
    <path d="M19.5 10c0 5-5.2 9.8-7 11.3a.8.8 0 0 1-1 0C9.7 19.8 4.5 15 4.5 10a7.5 7.5 0 0 1 15 0Z" />
    <circle cx="12" cy="10" r="2.75" />
  </>,
);

/* ---------- 입력 단계 ---------- */

export const CalendarIcon = icon(
  <>
    <rect x="3.5" y="4.5" width="17" height="16.5" rx="2" />
    <path d="M8 2.5v4M16 2.5v4M3.5 10h17" />
  </>,
);

export const WalletIcon = icon(
  <>
    <path d="M18.5 7.5V5a1.5 1.5 0 0 0-1.5-1.5H5.5a2 2 0 0 0 0 4h13A1.5 1.5 0 0 1 20 9v10a1.5 1.5 0 0 1-1.5 1.5h-13a2 2 0 0 1-2-2v-13" />
    <path d="M16 14h.01" />
  </>,
);

export const UsersIcon = icon(
  <>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20.5a6.5 6.5 0 0 1 13 0" />
    <path d="M16 4.8a3.5 3.5 0 0 1 0 6.4" />
    <path d="M18.5 14.6a6.5 6.5 0 0 1 3 5.9" />
  </>,
);

export const HouseIcon = icon(
  <>
    <path d="M3.5 10.5 12 3.5l8.5 7V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19Z" />
    <path d="M9.5 20.5v-6.5h5v6.5" />
  </>,
);

export const CardIcon = icon(
  <>
    <rect x="2.5" y="5" width="19" height="14" rx="2" />
    <path d="M2.5 10h19M6.5 15h3" />
  </>,
);

/* ---------- 상품 ---------- */

export const CoinsIcon = icon(
  <>
    <circle cx="9" cy="9" r="6" />
    <path d="M17.5 10.2a6 6 0 1 1-7.3 7.3" />
    <path d="M9 6.5v5" />
  </>,
);

export const KeyIcon = icon(
  <>
    <circle cx="15.5" cy="8.5" r="5" />
    <path d="M11.8 12.2 3.5 20.5V17M7 17l2 2" />
    <path d="M16.5 7.5h.01" />
  </>,
);

export const BanknoteIcon = icon(
  <>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M6.5 12h.01M17.5 12h.01" />
  </>,
);

export const SunIcon = icon(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </>,
);

export const SproutIcon = icon(
  <>
    <path d="M12 21v-9" />
    <path d="M12 14c0-3.5-2.5-6-7-6 0 3.5 2.5 6 7 6Z" />
    <path d="M12 11c0-3.5 2.5-6.5 7.5-6.5 0 4-2.5 6.5-7.5 6.5Z" />
    <path d="M8 21h8" />
  </>,
);

export const TrendingIcon = icon(
  <>
    <path d="M3 17l6-6 4 4 8-8" />
    <path d="M15.5 7H21v5.5" />
  </>,
);

export const DoorIcon = icon(
  <>
    <path d="M6 21V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21" />
    <path d="M3.5 21h17" />
    <path d="M14.5 12.5h.01" />
  </>,
);

export const BuildingIcon = icon(
  <>
    <rect x="5" y="3" width="14" height="18" rx="1.5" />
    <path d="M10 21v-3.5h4V21" />
    <path d="M9 7.5h.01M12 7.5h.01M15 7.5h.01M9 11h.01M12 11h.01M15 11h.01M9 14.5h.01M12 14.5h.01M15 14.5h.01" />
  </>,
);
