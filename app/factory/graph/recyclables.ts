import Big from 'big.js';
import { ProductId } from './loadJsonData';

export const recyclablesProductId = ProductId('Product_Recyclables');

export type RecyclablesMaterial = 'copper' | 'gold' | 'aluminium' | 'glass' | 'iron';

export type RecyclablesMaterialSplit = Partial<Record<RecyclablesMaterial, Big>>;

/** Per-unit recyclable material breakdown for each product that contributes recyclables */
export const recyclablesSourceMaterialSplit: Partial<Record<ProductId, RecyclablesMaterialSplit>> = {
  [ProductId('Product_ConsumerElectronics')]: {
    copper: Big(1).div(30).plus(1),
    gold: Big(1).div(7.5),
    aluminium: Big(3).div(10),
    glass: Big(1).div(5),
  },
  [ProductId('Product_HouseholdGoods')]: {
    iron: Big(15).div(100),
    glass: Big(1).div(3),
  },
  [ProductId('Product_HouseholdAppliances')]: {
    copper: Big(85).div(100),
    glass: Big(1).div(10),
    iron: Big(10).div(4),
  },
};

/** Sum material quantities in a split */
const sumMaterials = (split: RecyclablesMaterialSplit): Big =>
  Object.values(split).reduce<Big>((total, v) => total.plus(v ?? 0), Big(0));

/** Total recyclables produced by one unit of a given input product */
const recyclablesPerUnit = (productId: ProductId): Big => {
  const materials = recyclablesSourceMaterialSplit[productId];
  if (!materials) return Big(0);
  return sumMaterials(materials);
};

/** Recyclables output from a single product at the given input rate */
export const recyclablesForProduct = (productId: ProductId, inputRate: Big): Big =>
  recyclablesPerUnit(productId).mul(inputRate);

/** Material breakdown of recyclables from a single product at the given input rate */
export const materialSplitForProduct = (
  productId: ProductId,
  inputRate: Big,
): RecyclablesMaterialSplit => {
  const materials = recyclablesSourceMaterialSplit[productId];
  if (!materials) return {};
  return Object.fromEntries(
    Object.entries(materials).map(([mat, qty]) => [mat, qty!.mul(inputRate)]),
  ) as RecyclablesMaterialSplit;
};

/**
 * Total recyclables output from all input products.
 * Sums the recycling contribution of each input product that generates recyclables.
 */
export const totalRecyclablesOutput = (
  inputs: Partial<Record<ProductId, Big>>,
): Big =>
  Object.entries(inputs).reduce<Big>(
    (total, [productId, rate]) =>
      rate ? total.plus(recyclablesForProduct(productId as ProductId, rate)) : total,
    Big(0),
  );
