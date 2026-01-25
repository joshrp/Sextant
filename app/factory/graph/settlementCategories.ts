/**
 * Settlement product categorization for SettlementNodeView
 * Organizes settlement inputs into logical groups for display
 */
import type { ProductId, RecipeProduct } from './loadJsonData';

export type FoodSubCategory = 'carbs' | 'protein' | 'vitamins' | 'treats';

export type SettlementCategory = 
  | 'utilities'
  | 'commodities' 
  | 'health'
  | `food-${FoodSubCategory}`


export interface CategoryInfo {
  id: SettlementCategory;
  label: string;
  isFood?: boolean;
  foodSubCategory?: FoodSubCategory;
}

export const CATEGORY_INFO: Record<SettlementCategory, CategoryInfo> = {
  'utilities': { id: 'utilities', label: 'Utilities' },
  'commodities': { id: 'commodities', label: 'Commodities' },
  'health': { id: 'health', label: 'Health' },
  'food-carbs': { id: 'food-carbs', label: 'Carbs', isFood: true, foodSubCategory: 'carbs' },
  'food-protein': { id: 'food-protein', label: 'Protein', isFood: true, foodSubCategory: 'protein' },
  'food-vitamins': { id: 'food-vitamins', label: 'Vitamins', isFood: true, foodSubCategory: 'vitamins' },
  'food-treats': { id: 'food-treats', label: 'Treats', isFood: true, foodSubCategory: 'treats' },
};

// Product ID to category mapping
const PRODUCT_CATEGORIES: Record<string, SettlementCategory> = {
  // Utilities
  'Product_Water': 'utilities',
  'Product_Virtual_Electricity': 'utilities',
  'Product_Virtual_Computing': 'utilities',
  
  // Commodities
  'Product_HouseholdGoods': 'commodities',
  'Product_HouseholdAppliances': 'commodities',
  'Product_LuxuryGoods': 'commodities',
  'Product_ConsumerElectronics': 'commodities',
  
  // Health
  'Product_MedicalSupplies': 'health',
  'Product_MedicalSupplies2': 'health',
  'Product_MedicalSupplies3': 'health',
  
  // Food - Carbs
  'Product_Potato': 'food-carbs',
  'Product_Corn': 'food-carbs',
  'Product_Bread': 'food-carbs',
  
  // Food - Protein
  'Product_Meat': 'food-protein',
  'Product_Eggs': 'food-protein',
  'Product_Tofu': 'food-protein',
  'Product_Sausage': 'food-protein',
  
  // Food - Vitamins
  'Product_Vegetables': 'food-vitamins',
  'Product_Fruit': 'food-vitamins',
  
  // Food - Treats
  'Product_Snack': 'food-treats',
  'Product_Cake': 'food-treats',
};

/**
 * Get the category for a product ID
 */
export function getProductCategory(productId: ProductId): SettlementCategory | null {
  return PRODUCT_CATEGORIES[productId] ?? null;
}

/**
 * Check if a category is a food category
 */
export function isFoodCategory(category: SettlementCategory): boolean {
  return category.startsWith('food-');
}

/**
 * Group recipe products by their settlement category
 */
export function groupProductsByCategory(products: RecipeProduct[]): Map<SettlementCategory, RecipeProduct[]> {
  const groups = new Map<SettlementCategory, RecipeProduct[]>();
  
  // Initialize all categories with empty arrays to maintain consistent ordering
  const categoryOrder: SettlementCategory[] = [
    'utilities',
    'commodities', 
    'health',
    'food-carbs',
    'food-protein',
    'food-vitamins',
    'food-treats',
  ];
  
  for (const category of categoryOrder) {
    groups.set(category, []);
  }
  
  for (const product of products) {
    const category = getProductCategory(product.product.id);
    if (category) {
      groups.get(category)!.push(product);
    }
  }
  
  // Remove empty categories
  for (const [category, prods] of groups) {
    if (prods.length === 0) {
      groups.delete(category);
    }
  }
  
  return groups;
}

/**
 * Get food categories that have products in a grouped map
 */
export function getFoodCategories(groups: Map<SettlementCategory, RecipeProduct[]>): SettlementCategory[] {
  return Array.from(groups.keys()).filter(isFoodCategory);
}
