import { useState, useCallback, useEffect } from 'react';
import { Calculator, History, X, Delete, Copy, Check, ArrowLeftRight } from 'lucide-react';
import { useCalculationHistory } from '../hooks/useCalculation';
import type { CalculationHistory } from '../types/database';
import { UnitConverter } from '../components/calculator/UnitConverter';

type Operation = '+' | '-' | '*' | '/';
type ActiveTab = 'calculator' | 'converter';

export function CalculationPage() {
  const { history, loading, addToHistory, removeFromHistory, clearHistory } = useCalculationHistory();
  const [activeTab, setActiveTab] = useState<ActiveTab>('calculator');
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const inputDigit = useCallback((digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  }, [display, waitingForOperand]);

  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  }, [display, waitingForOperand]);

  const clear = useCallback(() => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  }, []);

  const clearEntry = useCallback(() => {
    setDisplay('0');
  }, []);

  const backspace = useCallback(() => {
    if (display.length === 1 || (display.length === 2 && display.startsWith('-'))) {
      setDisplay('0');
    } else {
      setDisplay(display.slice(0, -1));
    }
  }, [display]);

  const toggleSign = useCallback(() => {
    if (display !== '0') {
      setDisplay(display.startsWith('-') ? display.slice(1) : '-' + display);
    }
  }, [display]);

  const inputPercent = useCallback(() => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  }, [display]);

  const performOperation = useCallback((nextOperation: Operation) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(display);
    } else if (operation) {
      const prevValue = parseFloat(previousValue);
      let result: number;

      switch (operation) {
        case '+':
          result = prevValue + inputValue;
          break;
        case '-':
          result = prevValue - inputValue;
          break;
        case '*':
          result = prevValue * inputValue;
          break;
        case '/':
          result = inputValue !== 0 ? prevValue / inputValue : NaN;
          break;
        default:
          result = inputValue;
      }

      const resultStr = isNaN(result) || !isFinite(result) ? 'Error' : String(result);
      setDisplay(resultStr);
      setPreviousValue(resultStr);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  }, [display, operation, previousValue]);

  const calculate = useCallback(async () => {
    if (operation === null || previousValue === null) {
      return;
    }

    const inputValue = parseFloat(display);
    const prevValue = parseFloat(previousValue);
    let result: number;

    switch (operation) {
      case '+':
        result = prevValue + inputValue;
        break;
      case '-':
        result = prevValue - inputValue;
        break;
      case '*':
        result = prevValue * inputValue;
        break;
      case '/':
        result = inputValue !== 0 ? prevValue / inputValue : NaN;
        break;
      default:
        return;
    }

    const expression = `${previousValue} ${operation} ${display}`;
    const resultStr = isNaN(result) || !isFinite(result) ? 'Error' : String(result);

    setDisplay(resultStr);
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(true);

    if (resultStr !== 'Error') {
      await addToHistory(expression, resultStr);
    }
  }, [display, operation, previousValue, addToHistory]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (activeTab !== 'calculator') return;
    if (e.key >= '0' && e.key <= '9') {
      inputDigit(e.key);
    } else if (e.key === '.') {
      inputDecimal();
    } else if (e.key === '+') {
      performOperation('+');
    } else if (e.key === '-') {
      performOperation('-');
    } else if (e.key === '*') {
      performOperation('*');
    } else if (e.key === '/') {
      e.preventDefault();
      performOperation('/');
    } else if (e.key === 'Enter' || e.key === '=') {
      calculate();
    } else if (e.key === 'Escape') {
      clear();
    } else if (e.key === 'Backspace') {
      backspace();
    } else if (e.key === '%') {
      inputPercent();
    }
  }, [activeTab, inputDigit, inputDecimal, performOperation, calculate, clear, backspace, inputPercent]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleHistoryItemClick = (item: CalculationHistory) => {
    setDisplay(item.result);
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(true);
  };

  const handleCopyResult = async (item: CalculationHistory) => {
    await navigator.clipboard.writeText(item.result);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getOperationSymbol = (op: Operation | null) => {
    switch (op) {
      case '+': return '+';
      case '-': return '-';
      case '*': return 'x';
      case '/': return '/';
      default: return '';
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const groupedHistory = history.reduce((groups: Record<string, CalculationHistory[]>, item) => {
    const dateKey = formatDate(item.created_at);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(item);
    return groups;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="w-7 h-7 text-gray-500" />
            Calculation Tools
          </h1>
          <p className="text-gray-500 mt-1">
            Calculator and unit conversions for construction
          </p>
        </div>

        {activeTab === 'calculator' && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors"
          >
            <History className="w-4 h-4" />
            {showHistory ? 'Hide' : 'Show'} History
          </button>
        )}
      </div>

      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('calculator')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'calculator'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calculator className="w-4 h-4" />
          Calculator
        </button>
        <button
          onClick={() => setActiveTab('converter')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'converter'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          Unit Converter
        </button>
      </div>

      {activeTab === 'converter' ? (
        <UnitConverter />
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 max-w-md mx-auto lg:mx-0">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 p-6">
                <div className="text-right">
                  {previousValue !== null && operation && (
                    <div className="text-sm text-gray-500 mb-1 h-5">
                      {previousValue} {getOperationSymbol(operation)}
                    </div>
                  )}
                  <div
                    className="text-4xl font-light text-gray-900 truncate"
                    title={display}
                  >
                    {display}
                  </div>
                </div>
              </div>

              <div className="p-4 grid grid-cols-4 gap-2">
                <button
                  onClick={clear}
                  className="p-4 text-lg font-medium bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-red-600"
                >
                  AC
                </button>
                <button
                  onClick={clearEntry}
                  className="p-4 text-lg font-medium bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-gray-700"
                >
                  CE
                </button>
                <button
                  onClick={backspace}
                  className="p-4 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors text-gray-700"
                >
                  <Delete className="w-5 h-5" />
                </button>
                <button
                  onClick={() => performOperation('/')}
                  className={`p-4 text-lg font-medium rounded-xl transition-colors ${
                    operation === '/' && waitingForOperand
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-white'
                  }`}
                >
                  /
                </button>

                <button
                  onClick={() => inputDigit('7')}
                  className="p-4 text-lg font-medium bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors"
                >
                  7
                </button>
                <button
                  onClick={() => inputDigit('8')}
                  className="p-4 text-lg font-medium bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors"
                >
                  8
                </button>
                <button
                  onClick={() => inputDigit('9')}
                  className="p-4 text-lg font-medium bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors"
                >
                  9
                </button>
                <button
                  onClick={() => performOperation('*')}
                  className={`p-4 text-lg font-medium rounded-xl transition-colors ${
                    operation === '*' && waitingForOperand
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-white'
                  }`}
                >
                  x
                </button>

                <button
                  onClick={() => inputDigit('4')}
                  className="p-4 text-lg font-medium bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors"
                >
                  4
                </button>
                <button
                  onClick={() => inputDigit('5')}
                  className="p-4 text-lg font-medium bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors"
                >
                  5
                </button>
                <button
                  onClick={() => inputDigit('6')}
                  className="p-4 text-lg font-medium bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors"
                >
                  6
                </button>
                <button
                  onClick={() => performOperation('-')}
                  className={`p-4 text-lg font-medium rounded-xl transition-colors ${
                    operation === '-' && waitingForOperand
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-white'
                  }`}
                >
                  -
                </button>

                <button
                  onClick={() => inputDigit('1')}
                  className="p-4 text-lg font-medium bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors"
                >
                  1
                </button>
                <button
                  onClick={() => inputDigit('2')}
                  className="p-4 text-lg font-medium bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors"
                >
                  2
                </button>
                <button
                  onClick={() => inputDigit('3')}
                  className="p-4 text-lg font-medium bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors"
                >
                  3
                </button>
                <button
                  onClick={() => performOperation('+')}
                  className={`p-4 text-lg font-medium rounded-xl transition-colors ${
                    operation === '+' && waitingForOperand
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-white'
                  }`}
                >
                  +
                </button>

                <button
                  onClick={toggleSign}
                  className="p-4 text-lg font-medium bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors"
                >
                  +/-
                </button>
                <button
                  onClick={() => inputDigit('0')}
                  className="p-4 text-lg font-medium bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors"
                >
                  0
                </button>
                <button
                  onClick={inputDecimal}
                  className="p-4 text-lg font-medium bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors"
                >
                  .
                </button>
                <button
                  onClick={calculate}
                  className="p-4 text-lg font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors"
                >
                  =
                </button>

                <button
                  onClick={inputPercent}
                  className="col-span-4 p-3 text-sm font-medium bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors text-gray-600"
                >
                  Percent (%)
                </button>
              </div>
            </div>

            <p className="text-center text-sm text-gray-400 mt-4">
              Tip: Use your keyboard for faster input
            </p>
          </div>

          {showHistory && (
            <div className="flex-1 lg:max-w-md">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <History className="w-5 h-5 text-gray-500" />
                    History
                  </h2>
                  {history.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm('Clear all calculation history?')) {
                          clearHistory();
                        }
                      }}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="max-h-[500px] overflow-y-auto">
                  {loading ? (
                    <div className="p-8 text-center">
                      <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto" />
                    </div>
                  ) : history.length === 0 ? (
                    <div className="p-8 text-center">
                      <Calculator className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">No calculations yet</p>
                      <p className="text-gray-400 text-xs mt-1">
                        Your calculation history will appear here
                      </p>
                    </div>
                  ) : (
                    <div>
                      {Object.entries(groupedHistory).map(([date, items]) => (
                        <div key={date}>
                          <div className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 sticky top-0">
                            {date}
                          </div>
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 group"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <button
                                  onClick={() => handleHistoryItemClick(item)}
                                  className="flex-1 text-left"
                                >
                                  <div className="text-sm text-gray-500">
                                    {item.expression}
                                  </div>
                                  <div className="text-lg font-medium text-gray-900 mt-0.5">
                                    = {item.result}
                                  </div>
                                </button>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span className="text-xs text-gray-400 mr-2">
                                    {formatTime(item.created_at)}
                                  </span>
                                  <button
                                    onClick={() => handleCopyResult(item)}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Copy result"
                                  >
                                    {copiedId === item.id ? (
                                      <Check className="w-4 h-4 text-green-600" />
                                    ) : (
                                      <Copy className="w-4 h-4" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => removeFromHistory(item.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
