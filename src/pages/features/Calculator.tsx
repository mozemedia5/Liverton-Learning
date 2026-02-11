import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { History, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface CalculationHistory {
  id: string;
  userId: string;
  expression: string;
  result: string;
  timestamp: Timestamp;
  mode: 'basic' | 'scientific';
}

export default function Calculator() {
  const { currentUser } = useAuth();
  const [mode, setMode] = useState<'basic' | 'scientific'>('basic');
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);
  const [history, setHistory] = useState<CalculationHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadHistory();
    }
  }, [currentUser]);

  const loadHistory = async () => {
    if (!currentUser) return;
    try {
      const q = query(
        collection(db, 'calculations'),
        where('userId', '==', currentUser.uid),
        orderBy('timestamp', 'desc')
      );
      const snapshot = await getDocs(q);
      const calcs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as CalculationHistory[];
      setHistory(calcs.slice(0, 20));
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const saveToHistory = async (expression: string, result: string) => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, 'calculations'), {
        userId: currentUser.uid,
        expression,
        result,
        timestamp: Timestamp.now(),
        mode,
      });
      loadHistory();
    } catch (error) {
      console.error('Error saving calculation:', error);
    }
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
      case '*':
        return prev * current;
      case '/':
        return prev / current;
      case '%':
        return prev % current;
      case '^':
        return Math.pow(prev, current);
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

  const handleScientificFunction = (func: string) => {
    const value = parseFloat(display);
    let result: number;

    switch (func) {
      case 'sin':
        result = Math.sin(value * Math.PI / 180);
        break;
      case 'cos':
        result = Math.cos(value * Math.PI / 180);
        break;
      case 'tan':
        result = Math.tan(value * Math.PI / 180);
        break;
      case 'sqrt':
        result = Math.sqrt(value);
        break;
      case 'log':
        result = Math.log10(value);
        break;
      case 'ln':
        result = Math.log(value);
        break;
      case 'factorial':
        result = factorial(value);
        break;
      default:
        result = value;
    }

    setDisplay(String(result));
    saveToHistory(`${func}(${value})`, String(result));
    setWaitingForNewValue(true);
  };

  const factorial = (n: number): number => {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
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

  const handleClearHistory = async () => {
    setHistory([]);
    toast.success('History cleared');
  };

  const handleHistoryClick = (result: string) => {
    setDisplay(result);
    setShowHistory(false);
    setWaitingForNewValue(true);
  };

  const basicButtons = [
    ['7', '8', '9', '/'],
    ['4', '5', '6', '*'],
    ['1', '2', '3', '-'],
    ['0', '.', '=', '+'],
  ];

  const scientificButtons = [
    ['sin', 'cos', 'tan', '/'],
    ['sqrt', 'log', 'ln', '*'],
    ['(', ')', '^', '-'],
    ['7', '8', '9', '+'],
    ['4', '5', '6', '%'],
    ['1', '2', '3', '='],
    ['0', '.', 'C', 'Back'],
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Calculator</h1>
          <p className="text-gray-600">Basic and Scientific calculations with history</p>
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
                History
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
                            else if (['+', '-', '*', '/'].includes(btn)) handleOperation(btn);
                            else handleNumberClick(btn);
                          }}
                          variant={['=', '+', '-', '*', '/'].includes(btn) ? 'default' : 'outline'}
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
                    Clear
                  </Button>
                  <Button onClick={handleBackspace} variant="outline" className="h-12">
                    Backspace
                  </Button>
                </div>
              </TabsContent>

              {/* Scientific Mode */}
              <TabsContent value="scientific" className="space-y-4">
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {scientificButtons.map((row, rowIdx) => (
                    <div key={rowIdx} className="contents">
                      {row.map((btn) => {
                        const isFunction = ['sin', 'cos', 'tan', 'sqrt', 'log', 'ln'].includes(btn);
                        const isOperation = ['+', '-', '*', '/', '%', '^', '='].includes(btn);
                        const isControl = ['C', 'Back'].includes(btn);

                        return (
                          <Button
                            key={btn}
                            onClick={() => {
                              if (btn === '=') handleEquals();
                              else if (btn === 'C') handleClear();
                              else if (btn === 'Back') handleBackspace();
                              else if (btn === '.') handleDecimal();
                              else if (isFunction) handleScientificFunction(btn);
                              else if (isOperation) handleOperation(btn);
                              else handleNumberClick(btn);
                            }}
                            variant={isOperation || isFunction ? 'default' : 'outline'}
                            className={`h-12 text-sm font-semibold ${
                              btn === '=' ? 'bg-green-600 hover:bg-green-700' : ''
                            } ${isControl ? 'bg-red-600 hover:bg-red-700' : ''}`}
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
                <CardTitle>Calculation History</CardTitle>
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
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No calculations yet</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {history.map((calc) => (
                    <div
                      key={calc.id}
                      onClick={() => handleHistoryClick(calc.result)}
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-mono text-gray-700">{calc.expression}</p>
                          <p className="text-xs text-gray-500">= {calc.result}</p>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {calc.mode}
                        </span>
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
