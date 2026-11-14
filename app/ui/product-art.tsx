// ③ 상품 그림. 사진·기관 로고 대신 상품 성격을 나타내는 아이콘 타일을 써요.
// (기관 로고는 사용 승인이 필요해서 넣지 않아요)
// 상품 id 로 고르고, 모르는 상품은 분류(대출·적금·청약·주거) 그림으로 대신해요.
import type { ProductCategory } from "@/types";
import {
  BanknoteIcon,
  BuildingIcon,
  CoinsIcon,
  DoorIcon,
  HouseIcon,
  KeyIcon,
  PinIcon,
  SproutIcon,
  SunIcon,
  TrendingIcon,
  type IconProps,
} from "./icons";

type IconComponent = (props: IconProps) => React.ReactNode;

export const CATEGORY_ICON: Record<ProductCategory, IconComponent> = {
  loan: BanknoteIcon,
  saving: CoinsIcon,
  housing: BuildingIcon,
};

const PRODUCT_ICON: Record<string, IconComponent> = {
  "youth-future-saving": SproutIcon,
  "youth-leap-account": TrendingIcon,
  "youth-housing-dream": KeyIcon,
  "youth-jeonse-loan": HouseIcon,
  "youth-rent-loan": DoorIcon,
  "sunshine-loan-youth": SunIcon,
  "seoul-youth-rent": PinIcon,
};

/** 분류별 타일 색 */
const CATEGORY_TILE: Record<ProductCategory, string> = {
  loan: "bg-[#e3ecf8] text-[#1f4f8f]",
  saving: "bg-go-soft text-go-deep",
  housing: "bg-[#f6ebdc] text-[#7a4a12]",
};

export function ProductArt({
  productId,
  category,
  muted = false,
  size = 44,
}: {
  productId: string;
  category: ProductCategory;
  /** 해당 없음·가입 중 카드는 회색으로 */
  muted?: boolean;
  size?: number;
}) {
  const Icon = PRODUCT_ICON[productId] ?? CATEGORY_ICON[category];
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-xl ${
        muted ? "bg-stop-soft text-stop" : CATEGORY_TILE[category]
      }`}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.52)} />
    </span>
  );
}
