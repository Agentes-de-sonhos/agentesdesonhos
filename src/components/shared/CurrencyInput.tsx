import { forwardRef, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatCurrencyInput, parseCurrencyInput, parsePastedCurrency } from '@/lib/currencyMask';

interface CurrencyInputProps
  extends Omit<React.ComponentPropsWithoutRef<typeof Input>, 'value' | 'onChange' | 'type'> {
  /** Valor em reais (com centavos). `null`/`undefined` = campo vazio. */
  value: number | null | undefined;
  onValueChange: (value: number | null) => void;
}

/**
 * Input de moeda pt-BR. Exibe "R$ 1.234,56" enquanto digita, permite apagar
 * livremente (campo vazio não vira zero) e aceita colagem com ou sem máscara.
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, className, ...props }, ref) => {
    const [text, setText] = useState(() => formatCurrencyInput(value));
    const [focused, setFocused] = useState(false);

    // Sincroniza quando o valor muda fora do input (reset, autofill).
    useEffect(() => {
      if (focused) return;
      setText(formatCurrencyInput(value));
    }, [value, focused]);

    return (
      <Input
        ref={ref}
        inputMode="decimal"
        className={cn('tabular-nums', className)}
        value={text}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setText(formatCurrencyInput(value));
        }}
        onPaste={(e) => {
          const pasted = e.clipboardData.getData('text');
          const parsed = parsePastedCurrency(pasted);
          if (parsed === null) return;
          e.preventDefault();
          onValueChange(parsed);
          setText(formatCurrencyInput(parsed));
        }}
        onChange={(e) => {
          const parsed = parseCurrencyInput(e.target.value);
          if (parsed === null) {
            setText('');
            onValueChange(null);
            return;
          }
          setText(formatCurrencyInput(parsed));
          onValueChange(parsed);
        }}
        placeholder={props.placeholder ?? 'R$ 0,00'}
        {...props}
      />
    );
  },
);
CurrencyInput.displayName = 'CurrencyInput';
