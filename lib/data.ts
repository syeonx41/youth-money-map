/** 상품 데이터와 기준 중위소득 표를 불러와요 (② data/ 폴더) */
import type { MedianIncomeTable, Product } from "@/types";
import productsJson from "@/data/products.json";
import medianIncomeJson from "@/data/median-income.json";

export const products = productsJson as unknown as Product[];
export const medianIncome = medianIncomeJson as MedianIncomeTable;

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}
