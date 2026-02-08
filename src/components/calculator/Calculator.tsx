import { useState, useCallback } from "react";
import { Copy, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface HistoryItem {
  operation: string;
  result: string;
  timestamp: Date;
}

export function Calculator() {
  const { toast } = useToast();
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  // Handle number input
  const handleNumberClick = useCallback((num: string) => {
    if (waitingForOperand) {
      setDisplay(String(num));
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? String(num) : display + num);
    }
  }, [display, waitingForOperand]);

  // Handle decimal point
  const handleDecimal = useCallback(() => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
    } else if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  }, [display, waitingForOperand]);

  // Calculate result based on operation
  const calculate = useCallback((
    prev: number,
    current: number,
    op: string
  ): number => {
    switch (op) {
      case "+":
        return prev + current;
      case "-":
        return prev - current;
      case "*":
        return prev * current;
      case "/":
        return current === 0 ? prev : prev / current;
      case "%":
        return prev % current;
      default:
        return current;
    }
  }, []);

  // Handle operations
  const handleOperation = useCallback(
    (nextOperation: string) => {
      const currentValue = parseFloat(display);

      if (previousValue === null) {
        setPreviousValue(currentValue);
      } else if (operation) {
        const result = calculate(previousValue, currentValue, operation);
        setDisplay(String(result));
        setPreviousValue(result);
      }

      setOperation(nextOperation);
      setWaitingForOperand(true);
    },
    [display, previousValue, operation, calculate]
  );

  // Handle equals
  const handleEquals = useCallback(() => {
    const currentValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const result = calculate(previousValue, currentValue, operation);
      const resultStr = String(
        Number.isInteger(result) ? result : result.toFixed(10)
      ).replace(/\.?0+$/, "");

      // Add to history
      const operationStr = `${previousValue} ${operation} ${currentValue}`;
      setHistory((prev) => [
        { operation: operationStr, result: resultStr, timestamp: new Date() },
        ...prev.slice(0, 19), // Keep last 20 items
      ]);

      setDisplay(resultStr);
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
    }
  }, [display, previousValue, operation, calculate]);

  // Handle percentage
  const handlePercentage = useCallback(() => {
    const currentValue = parseFloat(display);

    if (previousValue !== null && operation) {
      // Calculate percentage of previousValue
      const percentValue = (previousValue * currentValue) / 100;
      setDisplay(String(percentValue));
    } else {
      // Convert to percentage
      setDisplay(String(currentValue / 100));
    }
    setWaitingForOperand(true);
  }, [display, previousValue, operation]);

  // Handle backspace
  const handleBackspace = useCallback(() => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay("0");
    }
    setWaitingForOperand(false);
  }, [display]);

  // Handle clear
  const handleClear = useCallback(() => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  }, []);

  // Copy result
  const handleCopy = useCallback((value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedValue(value);
    toast({
      title: "Copiado",
      description: `${value} foi copiado para a área de transferência`,
    });
    setTimeout(() => setCopiedValue(null), 2000);
  }, [toast]);

  // Clear history
  const handleClearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const buttons = [
    ["C", "⌫", "%", "÷"],
    ["7", "8", "9", "×"],
    ["4", "5", "6", "-"],
    ["1", "2", "3", "+"],
    ["0", ".", "=", ""],
  ];

  const handleButtonClick = (btn: string) => {
    if (!btn) return;

    if (/[0-9]/.test(btn)) {
      handleNumberClick(btn);
    } else if (btn === ".") {
      handleDecimal();
    } else if (btn === "C") {
      handleClear();
    } else if (btn === "⌫") {
      handleBackspace();
    } else if (btn === "%") {
      handlePercentage();
    } else if (btn === "=") {
      handleEquals();
    } else if (btn === "÷") {
      handleOperation("/");
    } else if (btn === "×") {
      handleOperation("*");
    } else if (btn === "-") {
      handleOperation("-");
    } else if (btn === "+") {
      handleOperation("+");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Calculator */}
      <div className="lg:col-span-2">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-6 max-w-md mx-auto h-full flex flex-col">
          {/* Display */}
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6 mb-6">
            <div className="text-right">
              <div className="text-sm text-muted-foreground mb-2">
                {previousValue !== null && operation
                  ? `${previousValue} ${operation}`
                  : ""}
              </div>
              <div className="text-5xl font-bold text-foreground break-words">
                {display}
              </div>
            </div>
          </div>

          {/* Buttons Grid */}
          <div className="flex-1 grid grid-cols-4 gap-3">
            {buttons.map((row, rowIdx) =>
              row.map((btn, btnIdx) => {
                const isOperator =
                  ["+", "-", "×", "÷", "=", "%"].includes(btn) && btn !== "";
                const isClear = btn === "C";
                const isBackspace = btn === "⌫";
                const isEmpty = btn === "";

                return (
                  <Button
                    key={`${rowIdx}-${btnIdx}`}
                    onClick={() => handleButtonClick(btn)}
                    disabled={isEmpty}
                    className={cn(
                      "h-full text-lg font-semibold rounded-lg transition-all duration-200",
                      isEmpty && "invisible",
                      isClear && "bg-destructive/20 text-destructive hover:bg-destructive/30",
                      isBackspace && "bg-warning/20 text-warning hover:bg-warning/30",
                      isOperator && !isClear && !isBackspace && "bg-primary text-primary-foreground hover:bg-primary/90",
                      !isOperator && !isClear && !isBackspace && !isEmpty && "bg-muted text-foreground hover:bg-muted/80"
                    )}
                  >
                    {btn}
                  </Button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-6 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Histórico</h3>
          {history.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearHistory}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1">
          {history.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Nenhum cálculo realizado
            </div>
          ) : (
            <div className="space-y-2 pr-4">
              {history.map((item, idx) => (
                <div
                  key={idx}
                  className="group bg-muted/50 rounded-lg p-3 hover:bg-muted transition-colors"
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    {item.operation}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-foreground">
                      {item.result}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleCopy(item.result)}
                    >
                      {copiedValue === item.result ? (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {item.timestamp.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
