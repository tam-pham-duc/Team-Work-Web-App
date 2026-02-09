export type UnitCategory = 'length' | 'area' | 'volume' | 'angle';

export interface UnitDef {
  key: string;
  name: string;
  abbr: string;
  system: 'SI' | 'Imperial';
  toBase: number;
}

export interface CategoryDef {
  key: UnitCategory;
  name: string;
  baseName: string;
  defaultFrom: string;
  defaultTo: string;
  units: UnitDef[];
}

const lengthUnits: UnitDef[] = [
  { key: 'mm', name: 'Millimeter', abbr: 'mm', system: 'SI', toBase: 0.001 },
  { key: 'cm', name: 'Centimeter', abbr: 'cm', system: 'SI', toBase: 0.01 },
  { key: 'm', name: 'Meter', abbr: 'm', system: 'SI', toBase: 1 },
  { key: 'km', name: 'Kilometer', abbr: 'km', system: 'SI', toBase: 1000 },
  { key: 'in', name: 'Inch', abbr: 'in', system: 'Imperial', toBase: 0.0254 },
  { key: 'ft', name: 'Foot', abbr: 'ft', system: 'Imperial', toBase: 0.3048 },
  { key: 'yd', name: 'Yard', abbr: 'yd', system: 'Imperial', toBase: 0.9144 },
  { key: 'mi', name: 'Mile', abbr: 'mi', system: 'Imperial', toBase: 1609.344 },
];

const areaUnits: UnitDef[] = [
  { key: 'sqmm', name: 'Square Millimeter', abbr: 'mm\u00B2', system: 'SI', toBase: 1e-6 },
  { key: 'sqcm', name: 'Square Centimeter', abbr: 'cm\u00B2', system: 'SI', toBase: 1e-4 },
  { key: 'sqm', name: 'Square Meter', abbr: 'm\u00B2', system: 'SI', toBase: 1 },
  { key: 'ha', name: 'Hectare', abbr: 'ha', system: 'SI', toBase: 10000 },
  { key: 'sqkm', name: 'Square Kilometer', abbr: 'km\u00B2', system: 'SI', toBase: 1e6 },
  { key: 'sqin', name: 'Square Inch', abbr: 'in\u00B2', system: 'Imperial', toBase: 0.00064516 },
  { key: 'sqft', name: 'Square Foot', abbr: 'ft\u00B2', system: 'Imperial', toBase: 0.09290304 },
  { key: 'sqyd', name: 'Square Yard', abbr: 'yd\u00B2', system: 'Imperial', toBase: 0.83612736 },
  { key: 'ac', name: 'Acre', abbr: 'ac', system: 'Imperial', toBase: 4046.8564224 },
  { key: 'sqmi', name: 'Square Mile', abbr: 'mi\u00B2', system: 'Imperial', toBase: 2589988.110336 },
];

const volumeUnits: UnitDef[] = [
  { key: 'ml', name: 'Milliliter', abbr: 'mL', system: 'SI', toBase: 1e-6 },
  { key: 'l', name: 'Liter', abbr: 'L', system: 'SI', toBase: 0.001 },
  { key: 'cum', name: 'Cubic Meter', abbr: 'm\u00B3', system: 'SI', toBase: 1 },
  { key: 'tsp', name: 'Teaspoon', abbr: 'tsp', system: 'Imperial', toBase: 4.92892159375e-6 },
  { key: 'tbsp', name: 'Tablespoon', abbr: 'tbsp', system: 'Imperial', toBase: 1.478676478125e-5 },
  { key: 'floz', name: 'Fluid Ounce', abbr: 'fl oz', system: 'Imperial', toBase: 2.95735295625e-5 },
  { key: 'cup', name: 'Cup', abbr: 'cup', system: 'Imperial', toBase: 2.365882365e-4 },
  { key: 'pt', name: 'Pint', abbr: 'pt', system: 'Imperial', toBase: 4.73176473e-4 },
  { key: 'qt', name: 'Quart', abbr: 'qt', system: 'Imperial', toBase: 9.46352946e-4 },
  { key: 'gal', name: 'Gallon', abbr: 'gal', system: 'Imperial', toBase: 0.003785411784 },
  { key: 'cuin', name: 'Cubic Inch', abbr: 'in\u00B3', system: 'Imperial', toBase: 1.6387064e-5 },
  { key: 'cuft', name: 'Cubic Foot', abbr: 'ft\u00B3', system: 'Imperial', toBase: 0.028316846592 },
  { key: 'cuyd', name: 'Cubic Yard', abbr: 'yd\u00B3', system: 'Imperial', toBase: 0.764554857984 },
];

const angleUnits: UnitDef[] = [
  { key: 'deg', name: 'Degree', abbr: '\u00B0', system: 'SI', toBase: 1 },
  { key: 'rad', name: 'Radian', abbr: 'rad', system: 'SI', toBase: 180 / Math.PI },
  { key: 'grad', name: 'Gradian', abbr: 'grad', system: 'SI', toBase: 0.9 },
  { key: 'arcmin', name: 'Arcminute', abbr: "'", system: 'SI', toBase: 1 / 60 },
  { key: 'arcsec', name: 'Arcsecond', abbr: '"', system: 'SI', toBase: 1 / 3600 },
  { key: 'turn', name: 'Turn', abbr: 'rev', system: 'SI', toBase: 360 },
];

export const categories: CategoryDef[] = [
  { key: 'length', name: 'Length', baseName: 'meter', defaultFrom: 'ft', defaultTo: 'm', units: lengthUnits },
  { key: 'area', name: 'Area', baseName: 'square meter', defaultFrom: 'sqft', defaultTo: 'sqm', units: areaUnits },
  { key: 'volume', name: 'Volume', baseName: 'cubic meter', defaultFrom: 'gal', defaultTo: 'l', units: volumeUnits },
  { key: 'angle', name: 'Angle', baseName: 'degree', defaultFrom: 'deg', defaultTo: 'rad', units: angleUnits },
];

export function getCategoryByKey(key: UnitCategory): CategoryDef {
  return categories.find(c => c.key === key)!;
}

export function convert(value: number, fromKey: string, toKey: string, category: UnitCategory): number {
  const cat = getCategoryByKey(category);
  const fromUnit = cat.units.find(u => u.key === fromKey);
  const toUnit = cat.units.find(u => u.key === toKey);
  if (!fromUnit || !toUnit) return NaN;
  return (value * fromUnit.toBase) / toUnit.toBase;
}

export function formatResult(value: number): string {
  if (isNaN(value) || !isFinite(value)) return 'Error';
  if (value === 0) return '0';
  const abs = Math.abs(value);
  if (abs >= 1e-6 && abs < 1e12) {
    const formatted = parseFloat(value.toPrecision(10));
    return formatted.toString();
  }
  return value.toExponential(6);
}
