"use client";
// ③ 시·도 지도. 사는 지역을 지도에서 눌러 고르거나(RegionMap), 그림으로만 보여줘요(KoreaSilhouette).
// 경계 자료: app/ui/korea-map-data.ts (통계청 2018 시·도 경계를 단순화)
import { DOKDO_POINT, KOREA_MAP_VIEWBOX, KOREA_REGION_SHAPES } from "./korea-map-data";

const VIEW_BOX = `0 0 ${KOREA_MAP_VIEWBOX.width} ${KOREA_MAP_VIEWBOX.height}`;

/**
 * 고르는 지도는 본토가 가운데 오도록 잘라서 보여줘요.
 * 잘려 나가는 울릉도·독도는 동해 쪽 작은 상자에 따로 그려요.
 */
const PICKER_VIEW_BOX = `20 0 300 ${KOREA_MAP_VIEWBOX.height}`;
const EAST_ISLANDS_BOX = { x: 272, y: 96, width: 44, height: 34 };

/** 면적이 작아 누르기 어려운 특별시·광역시. 점으로 표시하고 누르는 범위를 넓혀요 */
const CITY_REGIONS = new Set(["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종"]);

/** 이름표 위치. 가운데 점이 다른 시·도와 겹치는 곳만 옮겨요 */
const LABEL_SHIFT: Record<string, { dx: number; dy: number }> = {
  경기: { dx: 14, dy: 26 },
  충남: { dx: -14, dy: 4 },
  전남: { dx: 8, dy: 20 },
  경북: { dx: 6, dy: -14 },
  경남: { dx: -8, dy: 2 },
  강원: { dx: 4, dy: -4 },
  인천: { dx: 0, dy: 2 },
};

function labelPoint(name: string) {
  const { cx, cy } = KOREA_REGION_SHAPES[name];
  const shift = LABEL_SHIFT[name];
  return { x: cx + (shift?.dx ?? 0), y: cy + (shift?.dy ?? 0) };
}

/** 도 지역부터 그리고 시 지역을 위에 그려요 (작은 지역이 가려지지 않게) */
const DRAW_ORDER = Object.keys(KOREA_REGION_SHAPES).sort(
  (a, b) => Number(CITY_REGIONS.has(a)) - Number(CITY_REGIONS.has(b)),
);

/** 꾸밈용 지도 그림. 누를 수 없어요 */
export function KoreaSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox={VIEW_BOX} aria-hidden="true" focusable="false" className={className}>
      {DRAW_ORDER.map((name) => (
        <path key={name} d={KOREA_REGION_SHAPES[name].d} className="fill-land stroke-white" strokeWidth={1.2} />
      ))}
      <circle cx={DOKDO_POINT.x} cy={DOKDO_POINT.y} r={1.6} className="fill-land" />
    </svg>
  );
}

/**
 * 사는 지역을 고르는 지도.
 * 마우스·터치용이에요. 키보드와 화면낭독기는 지도 아래 지역 버튼을 써요 (그래서 지도는 aria-hidden).
 */
export function RegionMap({
  regions,
  value,
  onSelect,
}: {
  /** 고를 수 있는 시·도 짧은 이름 */
  regions: readonly string[];
  /** 고른 지역. 없거나 '모름'이면 null */
  value: string | null;
  onSelect: (region: string) => void;
}) {
  const selectable = new Set(regions);
  const selected = value !== null && KOREA_REGION_SHAPES[value] ? value : null;
  const pin = selected ? labelPoint(selected) : null;

  return (
    <svg viewBox={PICKER_VIEW_BOX} aria-hidden="true" focusable="false" className="block h-auto w-full select-none">
      {DRAW_ORDER.map((name) => {
        const active = name === selected;
        const canSelect = selectable.has(name);
        return (
          <path
            key={name}
            d={KOREA_REGION_SHAPES[name].d}
            strokeWidth={1.2}
            onClick={canSelect ? () => onSelect(name) : undefined}
            className={`stroke-white transition-colors ${canSelect ? "cursor-pointer" : ""} ${
              active ? "fill-go" : "fill-land hover:fill-[#aecbbb]"
            }`}
          />
        );
      })}

      {/* 울릉도·독도 (경북) */}
      <g
        transform={`translate(${EAST_ISLANDS_BOX.x} ${EAST_ISLANDS_BOX.y})`}
        onClick={selectable.has("경북") ? () => onSelect("경북") : undefined}
        className={selectable.has("경북") ? "cursor-pointer" : ""}
      >
        <rect
          width={EAST_ISLANDS_BOX.width}
          height={EAST_ISLANDS_BOX.height}
          rx={6}
          className="fill-white/60 stroke-line"
          strokeWidth={1}
        />
        <circle cx={15} cy={12} r={3.4} className={selected === "경북" ? "fill-go" : "fill-land"} />
        <circle cx={31} cy={14} r={1.8} className={selected === "경북" ? "fill-go" : "fill-land"} />
        <text x={22} y={26} textAnchor="middle" className="fill-ink-mute text-[7.5px]">
          울릉도·독도
        </text>
      </g>

      {/* 이름표: 도 지역은 글자, 시 지역은 점 */}
      {DRAW_ORDER.map((name) => {
        if (name === selected) return null;
        const { x, y } = labelPoint(name);
        return CITY_REGIONS.has(name) ? (
          <circle key={name} cx={x} cy={y} r={2.6} className="pointer-events-none fill-white stroke-ink-soft" strokeWidth={1.2} />
        ) : (
          <text
            key={name}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            className="pointer-events-none fill-ink-soft text-[11px] font-medium"
          >
            {name}
          </text>
        );
      })}

      {/* 시 지역은 누르는 범위를 넓혀요 */}
      {DRAW_ORDER.filter((name) => CITY_REGIONS.has(name) && selectable.has(name)).map((name) => {
        const { x, y } = labelPoint(name);
        return (
          <circle
            key={name}
            cx={x}
            cy={y}
            r={11}
            fill="transparent"
            className="cursor-pointer"
            onClick={() => onSelect(name)}
          />
        );
      })}

      {/* 고른 지역: 핀과 이름 */}
      {selected && pin && (
        <g className="pointer-events-none" transform={`translate(${pin.x} ${pin.y})`}>
          <path
            d="M0 0C-5-6.5-9-10.5-9-15.5a9 9 0 0 1 18 0C9-10.5 5-6.5 0 0Z"
            className="fill-ink stroke-white"
            strokeWidth={1.5}
          />
          <circle cx={0} cy={-15.5} r={3.2} className="fill-white" />
          <g transform="translate(0 -36)">
            <rect x={-20} y={-11} width={40} height={22} rx={11} className="fill-ink" />
            <text textAnchor="middle" dominantBaseline="central" className="fill-white text-[12px] font-semibold">
              {selected}
            </text>
          </g>
        </g>
      )}
    </svg>
  );
}
