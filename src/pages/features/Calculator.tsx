import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { History, Trash2, Copy, ArrowLeft, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface CalculationHistory {
  expression: string;
  result: string;
  timestamp: number;
  mode: 'basic' | 'scientific';
}

export default function Calculator() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [mode, setMode] = useState<'basic' | 'scientific'>('basic');
  const [angleMode, setAngleMode] = useState<'deg' | 'rad'>('deg');
  const [display, setDisplay] = useState('0');
  const [memory, setMemory] = useState<number>(0);
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);
  const [history, setHistory] = useState<CalculationHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load session history on mount
  useEffect(() => {
    const savedHistory = sessionStorage.getItem('calculatorHistory');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Error loading history:', error);
      }
    }
  }, []);

  // Save to session storage whenever history changes
  const saveToHistory = (expression: string, result: string) => {
    const newEntry: CalculationHistory = {
      expression,
      result,
      timestamp: Date.now(),
      mode,
    };
    const newHistory = [newEntry, ...history].slice(0, 50); // Keep last 50 calculations
    setHistory(newHistory);
    sessionStorage.setItem('calculatorHistory', JSON.stringify(newHistory));
  };

  const handleNumberClick = (num: string) => {
    if (waitingForNewValue) {
      setDisplay(num);
      setWaitingForNewValue(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const handleDecimal = () => {
    if (waitingForNewValue) {
      setDisplay('0.');
      setWaitingForNewValue(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleOperation = (op: string) => {
    const currentValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(currentValue);
    } else if (operation) {
      const result = calculate(previousValue, currentValue, operation);
      setDisplay(String(result));
      setPreviousValue(result);
    }

    setOperation(op);
    setWaitingForNewValue(true);
  };

  const calculate = (prev: number, current: number, op: string): number => {
    switch (op) {
      case '+':
        return prev + current;
      case '-':
        return prev - current;
      case '×':
      case '*':
        return prev * current;
      case '÷':
      case '/':
        return prev / current;
      case '%':
        return prev % current;
      case '^':
      case 'x^y':
        return Math.pow(prev, current);
      case 'mod':
        return prev % current;
      default:
        return current;
    }
  };

  const handleEquals = () => {
    if (operation && previousValue !== null) {
      const currentValue = parseFloat(display);
      const result = calculate(previousValue, currentValue, operation);
      const expression = `${previousValue} ${operation} ${currentValue}`;
      setDisplay(String(result));
      saveToHistory(expression, String(result));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForNewValue(true);
    }
  };

  const toRadians = (deg: number) => deg * Math.PI / 180;
  const toDegrees = (rad: number) => rad * 180 / Math.PI;

  const handleScientificFunction = (func: string) => {
    const value = parseFloat(display);
    let result: number;
    let expression = '';

    switch (func) {
      // Trigonometric functions
      case 'sin':
        result = angleMode === 'deg' ? Math.sin(toRadians(value)) : Math.sin(value);
        expression = `sin(${value}${angleMode})`;
        break;
      case 'cos':
        result = angleMode === 'deg' ? Math.cos(toRadians(value)) : Math.cos(value);
        expression = `cos(${value}${angleMode})`;
        break;
      case 'tan':
        result = angleMode === 'deg' ? Math.tan(toRadians(value)) : Math.tan(value);
        expression = `tan(${value}${angleMode})`;
        break;
      case 'asin':
        result = angleMode === 'deg' ? toDegrees(Math.asin(value)) : Math.asin(value);
        expression = `asin(${value})`;
        break;
      case 'acos':
        result = angleMode === 'deg' ? toDegrees(Math.acos(value)) : Math.acos(value);
        expression = `acos(${value})`;
        break;
      case 'atan':
        result = angleMode === 'deg' ? toDegrees(Math.atan(value)) : Math.atan(value);
        expression = `atan(${value})`;
        break;
      case 'sinh':
        result = Math.sinh(value);
        expression = `sinh(${value})`;
        break;
      case 'cosh':
        result = Math.cosh(value);
        expression = `cosh(${value})`;
        break;
      case 'tanh':
        result = Math.tanh(value);
        expression = `tanh(${value})`;
        break;
      
      // Exponential and Logarithmic
      case 'sqrt':
      case '√':
        result = Math.sqrt(value);
        expression = `√(${value})`;
        break;
      case 'cbrt':
        result = Math.cbrt(value);
        expression = `∛(${value})`;
        break;
      case 'x²':
        result = Math.pow(value, 2);
        expression = `${value}²`;
        break;
      case 'x³':
        result = Math.pow(value, 3);
        expression = `${value}³`;
        break;
      case 'log':
        result = Math.log10(value);
        expression = `log(${value})`;
        break;
      case 'ln':
        result = Math.log(value);
        expression = `ln(${value})`;
        break;
      case 'log2':
        result = Math.log2(value);
        expression = `log2(${value})`;
        break;
      case 'exp':
      case 'e^x':
        result = Math.exp(value);
        expression = `e^${value}`;
        break;
      case '10^x':
        result = Math.pow(10, value);
        expression = `10^${value}`;
        break;
      case '2^x':
        result = Math.pow(2, value);
        expression = `2^${value}`;
        break;
      
      // Special functions
      case '!':
      case 'factorial':
        result = factorial(Math.floor(value));
        expression = `${Math.floor(value)}!`;
        break;
      case '1/x':
        result = 1 / value;
        expression = `1/${value}`;
        break;
      case 'abs':
      case '|x|':
        result = Math.abs(value);
        expression = `|${value}|`;
        break;
      case 'π':
        result = Math.PI;
        expression = 'π';
        break;
      case 'e':
        result = Math.E;
        expression = 'e';
        break;
      case '%':
        result = value / 100;
        expression = `${value}%`;
        break;
      case '±':
        result = -value;
        expression = `-(${value})`;
        break;
      case 'rand':
        result = Math.random();
        expression = 'rand()';
        break;
      
      default:
        result = value;
        expression = String(value);
    }

    setDisplay(String(result));
    saveToHistory(expression, String(result));
    setWaitingForNewValue(true);
  };

  const factorial = (n: number): number => {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    if (n > 170) return Infinity; // Prevent overflow
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  };

  const handleClear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForNewValue(false);
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const handleCopyResult = () => {
    navigator.clipboard.writeText(display);
    toast.success('Copied to clipboard');
  };

  const handleClearHistory = () => {
    setHistory([]);
    sessionStorage.removeItem('calculatorHistory');
    toast.success('History cleared');
  };

  const handleHistoryClick = (result: string) => {
    setDisplay(result);
    setShowHistory(false);
    setWaitingForNewValue(true);
  };

  // Memory functions
  const handleMemoryClear = () => {
    setMemory(0);
    toast.success('Memory cleared');
  };

  const handleMemoryRecall = () => {
    setDisplay(String(memory));
    setWaitingForNewValue(true);
    toast.success('Memory recalled');
  };

  const handleMemoryAdd = () => {
    setMemory(memory + parseFloat(display));
    toast.success('Added to memory');
  };

  const handleMemorySubtract = () => {
    setMemory(memory - parseFloat(display));
    toast.success('Subtracted from memory');
  };

  const handleMemoryStore = () => {
    setMemory(parseFloat(display));
    toast.success('Stored in memory');
  };

  const basicButtons = [
    ['7', '8', '9', '÷'],
    ['4', '5', '6', '×'],
    ['1', '2', '3', '-'],
    ['0', '.', '=', '+'],
  ];

  const scientificButtons = [
    // Row 1: Angle mode and memory functions
    ['MC', 'MR', 'M+', 'M-', 'MS'],
    // Row 2: Trigonometric functions
    ['sin', 'cos', 'tan', 'asin', 'acos'],
    // Row 3: Hyperbolic functions  
    ['sinh', 'cosh', 'tanh', 'atan', '÷'],
    // Row 4: Powers and roots
    ['x²', 'x³', '√', '∛', '×'],
    // Row 5: Exponential and logs
    ['log', 'ln', 'log2', 'e^x', '-'],
    // Row 6: Special functions
    ['10^x', '2^x', 'x^y', '!', '+'],
    // Row 7: Constants and operations
    ['π', 'e', '1/x', '|x|', '%'],
    // Row 8: Numbers
    ['7', '8', '9', '(', ')'],
    ['4', '5', '6', 'mod', 'rand'],
    ['1', '2', '3', '±', '='],
    ['0', '.', 'C', '⌫', ''],
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-black dark:text-white transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white dark:text-black" />
              </div>
              <span className="font-semibold">Calculator</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 lg:p-6">
        {/* Sub-Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Advanced Scientific Calculator</h1>
          <p className="text-gray-600 dark:text-gray-400">Comprehensive calculator with session-based history</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Calculator</CardTitle>
                <CardDescription>Switch between Basic and Scientific modes</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="gap-2"
              >
                <History className="w-4 h-4" />
                History ({history.length})
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <Tabs value={mode} onValueChange={(value: any) => {
              setMode(value);
              handleClear();
            }}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="scientific">Scientific</TabsTrigger>
              </TabsList>

              {/* Display */}
              <div className="mb-6 p-4 bg-gray-900 rounded-lg">
                <div className="text-right">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-xs text-gray-400">
                      {memory !== 0 && <span>M: {memory}</span>}
                    </div>
                    {mode === 'scientific' && (
                      <button
                        onClick={() => setAngleMode(angleMode === 'deg' ? 'rad' : 'deg')}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                      >
                        {angleMode === 'deg' ? 'DEG' : 'RAD'}
                      </button>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm mb-2 h-6">
                    {operation && previousValue !== null ? `${previousValue} ${operation}` : ''}
                  </p>
                  <p className="text-white text-4xl font-mono break-words">{display}</p>
                </div>
              </div>

              {/* Basic Mode */}
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {basicButtons.map((row, rowIdx) => (
                    <div key={rowIdx} className="contents">
                      {row.map((btn) => (
                        <Button
                          key={btn}
                          onClick={() => {
                            if (btn === '=') handleEquals();
                            else if (btn === 'C') handleClear();
                            else if (btn === '.') handleDecimal();
                            else if (['+', '-', '×', '÷', '*', '/'].includes(btn)) handleOperation(btn);
                            else handleNumberClick(btn);
                          }}
                          variant={['=', '+', '-', '×', '÷'].includes(btn) ? 'default' : 'outline'}
                          className={`h-16 text-lg font-semibold ${
                            btn === '=' ? 'bg-green-600 hover:bg-green-700' : ''
                          }`}
                        >
                          {btn}
                        </Button>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={handleClear} variant="outline" className="h-12">
                    Clear (C)
                  </Button>
                  <Button onClick={handleBackspace} variant="outline" className="h-12">
                    Backspace (⌫)
                  </Button>
                </div>
              </TabsContent>

              {/* Scientific Mode */}
              <TabsContent value="scientific" className="space-y-4">
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {scientificButtons.map((row, rowIdx) => (
                    <div key={rowIdx} className="contents">
                      {row.map((btn, btnIdx) => {
                        if (btn === '') return <div key={`empty-${rowIdx}-${btnIdx}`} />;
                        
                        const isMemory = ['MC', 'MR', 'M+', 'M-', 'MS'].includes(btn);
                        const isFunction = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 
                          'sinh', 'cosh', 'tanh', 'sqrt', 'cbrt', 'log', 'ln', 'log2', 
                          'exp', 'e^x', '10^x', '2^x', '√', '∛', 'x²', 'x³', '!', 
                          '1/x', '|x|', 'abs', 'factorial', 'rand'].includes(btn);
                        const isOperation = ['+', '-', '×', '÷', '*', '/', '%', '^', 'x^y', 'mod', '='].includes(btn);
                        const isConstant = ['π', 'e'].includes(btn);
                        const isControl = ['C', '⌫', '±'].includes(btn);

                        return (
                          <Button
                            key={btn}
                            onClick={() => {
                              if (btn === '=') handleEquals();
                              else if (btn === 'C') handleClear();
                              else if (btn === '⌫') handleBackspace();
                              else if (btn === '.') handleDecimal();
                              else if (btn === 'MC') handleMemoryClear();
                              else if (btn === 'MR') handleMemoryRecall();
                              else if (btn === 'M+') handleMemoryAdd();
                              else if (btn === 'M-') handleMemorySubtract();
                              else if (btn === 'MS') handleMemoryStore();
                              else if (isConstant) handleScientificFunction(btn);
                              else if (isFunction) handleScientificFunction(btn);
                              else if (isOperation) handleOperation(btn);
                              else if (btn === '(' || btn === ')') handleNumberClick(btn);
                              else handleNumberClick(btn);
                            }}
                            variant={isOperation || isFunction ? 'default' : 'outline'}
                            className={`h-12 text-xs font-semibold ${
                              btn === '=' ? 'bg-green-600 hover:bg-green-700' : ''
                            } ${isControl ? 'bg-red-600 hover:bg-red-700' : ''} ${
                              isMemory ? 'bg-purple-600 hover:bg-purple-700' : ''
                            } ${isConstant ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                          >
                            {btn}
                          </Button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            {/* Copy Button */}
            <Button
              onClick={handleCopyResult}
              variant="outline"
              className="w-full gap-2 mt-4"
            >
              <Copy className="w-4 h-4" />
              Copy Result
            </Button>
          </CardContent>
        </Card>

        {/* History Panel */}
        {showHistory && (
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Session History</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearHistory}
                  className="gap-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </Button>
              </div>
              <CardDescription>
                History is stored temporarily and will disappear when you reload the page
              </CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No calculations yet</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {history.map((calc, index) => (
                    <div
                      key={index}
                      onClick={() => handleHistoryClick(calc.result)}
                      className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-mono text-gray-700 dark:text-gray-300">{calc.expression}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">= {calc.result}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                            {calc.mode}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(calc.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
