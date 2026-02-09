import { useState, useMemo, useCallback } from 'react';
import { ArrowDownUp, Ruler, Square, Box, RotateCcw, Copy, Check } from 'lucide-react';
import {
  categories,
  getCategoryByKey,
  convert,
  formatResult,
  type UnitCategory,
  type UnitDef,
} from '../../lib/unitConversions';

const categoryIcons: Record<UnitCategory, typeof Ruler> = {
  length: Ruler,
  area: Square,
  volume: Box,
  angle: RotateCcw,
};

export function UnitConverter() {
  const [activeCategory, setActiveCategory] = useState<UnitCategory>('length');
  const [fromUnit, setFromUnit] = useState(getCategoryByKey('length').defaultFrom);
  const [toUnit, setToUnit] = useState(getCategoryByKey('length').defaultTo);
  const [inputValue, setInputValue] = useState('1');
  const [copied, setCopied] = useState(false);

  const category = useMemo(() => getCategoryByKey(activeCategory), [activeCategory]);

  const result = useMemo(() => {
    const num = parseFloat(inputValue);
    if (isNaN(num)) return '';
    return formatResult(convert(num, fromUnit, toUnit, activeCategory));
  }, [inputValue, fromUnit, toUnit, activeCategory]);

  const conversionHint = useMemo(() => {
    const from = category.units.find(u => u.key === fromUnit);
    const to = category.units.find(u => u.key === toUnit);
    if (!from || !to) return '';
    const converted = formatResult(convert(1, fromUnit, toUnit, activeCategory));
    return `1 ${from.abbr} = ${converted} ${to.abbr}`;
  }, [fromUnit, toUnit, activeCategory, category]);

  const handleCategoryChange = useCallback((key: UnitCategory) => {
    const cat = getCategoryByKey(key);
    setActiveCategory(key);
    setFromUnit(cat.defaultFrom);
    setToUnit(cat.defaultTo);
    setInputValue('1');
    setCopied(false);
  }, []);

  const handleSwap = useCallback(() => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    setCopied(false);
  }, [fromUnit, toUnit]);

  const handleReset = useCallback(() => {
    setInputValue('1');
    setFromUnit(category.defaultFrom);
    setToUnit(category.defaultTo);
    setCopied(false);
  }, [category]);

  const handleCopyResult = useCallback(async () => {
    if (!result || result === 'Error') return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const handleInputChange = useCallback((value: string) => {
    if (value === '' || value === '-' || /^-?\d*\.?\d*$/.test(value)) {
      setInputValue(value);
      setCopied(false);
    }
  }, []);

  const getFromUnit = (): UnitDef | undefined => category.units.find(u => u.key === fromUnit);
  const getToUnit = (): UnitDef | undefined => category.units.find(u => u.key === toUnit);

  return (
    <div className="w-full max-w-2xl mx-auto lg:mx-0 space-y-5">
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => {
          const Icon = categoryIcons[cat.key];
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => handleCategoryChange(cat.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat.name}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                From
              </label>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={inputValue}
                    onChange={e => handleInputChange(e.target.value)}
                    placeholder="Enter value"
                    className="w-full px-4 py-3.5 text-lg font-medium text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
                  />
                  {getFromUnit() && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400 pointer-events-none">
                      {getFromUnit()!.abbr}
                    </span>
                  )}
                </div>
                <select
                  value={fromUnit}
                  onChange={e => { setFromUnit(e.target.value); setCopied(false); }}
                  className="w-44 sm:w-52 px-3 py-3.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 cursor-pointer transition-all appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:18px] bg-[right_8px_center] bg-no-repeat pr-8"
                >
                  <optgroup label="SI / Metric">
                    {category.units.filter(u => u.system === 'SI').map(u => (
                      <option key={u.key} value={u.key}>{u.name} ({u.abbr})</option>
                    ))}
                  </optgroup>
                  <optgroup label="Imperial / US">
                    {category.units.filter(u => u.system === 'Imperial').map(u => (
                      <option key={u.key} value={u.key}>{u.name} ({u.abbr})</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <button
                onClick={handleSwap}
                className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-all hover:scale-105 active:scale-95"
                title="Swap units"
              >
                <ArrowDownUp className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                To
              </label>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <div className="w-full px-4 py-3.5 text-lg font-medium bg-gray-50 border border-gray-200 rounded-xl min-h-[54px] flex items-center">
                    <span className={result && result !== 'Error' ? 'text-gray-900' : 'text-gray-400'}>
                      {result || 'Result'}
                    </span>
                  </div>
                  {getToUnit() && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-400">
                        {getToUnit()!.abbr}
                      </span>
                      {result && result !== 'Error' && (
                        <button
                          onClick={handleCopyResult}
                          className="p-1 rounded-md hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Copy result"
                        >
                          {copied ? (
                            <Check className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <select
                  value={toUnit}
                  onChange={e => { setToUnit(e.target.value); setCopied(false); }}
                  className="w-44 sm:w-52 px-3 py-3.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 cursor-pointer transition-all appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:18px] bg-[right_8px_center] bg-no-repeat pr-8"
                >
                  <optgroup label="SI / Metric">
                    {category.units.filter(u => u.system === 'SI').map(u => (
                      <option key={u.key} value={u.key}>{u.name} ({u.abbr})</option>
                    ))}
                  </optgroup>
                  <optgroup label="Imperial / US">
                    {category.units.filter(u => u.system === 'Imperial').map(u => (
                      <option key={u.key} value={u.key}>{u.name} ({u.abbr})</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500 font-medium">
            {conversionHint}
          </p>
          <button
            onClick={handleReset}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      <QuickReference category={activeCategory} fromUnit={fromUnit} toUnit={toUnit} />
    </div>
  );
}

function QuickReference({
  category: categoryKey,
  fromUnit,
  toUnit,
}: {
  category: UnitCategory;
  fromUnit: string;
  toUnit: string;
}) {
  const category = getCategoryByKey(categoryKey);
  const from = category.units.find(u => u.key === fromUnit);
  const to = category.units.find(u => u.key === toUnit);
  if (!from || !to || from.key === to.key) return null;

  const referenceValues = categoryKey === 'angle'
    ? [1, 15, 30, 45, 90, 180, 360]
    : [0.1, 0.5, 1, 5, 10, 50, 100, 1000];

  const rows = referenceValues
    .map(val => ({
      input: val,
      output: convert(val, fromUnit, toUnit, categoryKey),
    }))
    .filter(r => !isNaN(r.output) && isFinite(r.output));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 sm:px-6 py-3.5 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">Quick Reference</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {rows.map(row => (
          <div
            key={row.input}
            className="px-5 sm:px-6 py-2.5 flex items-center justify-between text-sm"
          >
            <span className="text-gray-600">
              {row.input} {from.abbr}
            </span>
            <span className="font-medium text-gray-900">
              {formatResult(row.output)} {to.abbr}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
