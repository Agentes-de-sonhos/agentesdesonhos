import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ExchangeRate {
  code: string;
  symbol: string;
  rate: number;
  variation?: number;
}

export function ExchangeRateCard() {
  const { data: rates, isLoading, isError } = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: async (): Promise<ExchangeRate[]> => {
      // Using frankfurter.app - free API, no key required
      const response = await fetch(
        "https://api.frankfurter.app/latest?from=USD&to=BRL"
      );
      if (!response.ok) throw new Error("Failed to fetch USD rate");
      const usdData = await response.json();

      const responseEur = await fetch(
        "https://api.frankfurter.app/latest?from=EUR&to=BRL"
      );
      if (!responseEur.ok) throw new Error("Failed to fetch EUR rate");
      const eurData = await responseEur.json();

      return [
        {
          code: "USD",
          symbol: "$",
          rate: usdData.rates.BRL,
        },
        {
          code: "EUR",
          symbol: "€",
          rate: eurData.rates.BRL,
        },
      ];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    refetchInterval: 1000 * 60 * 60, // Refetch every hour
    retry: 2,
  });

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-24" />
      </div>
    );
  }

  if (isError || !rates) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Câmbio indisponível</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Não foi possível carregar as cotações no momento</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-3 sm:gap-4 bg-foreground/90 rounded-full px-4 py-1.5">
        {rates.map((currency) => (
          <Tooltip key={currency.code}>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-xs cursor-default">
                <span className="font-semibold text-white/90">
                  {currency.code}
                </span>
                <span className="text-white/70">
                  R$ {formatCurrency(currency.rate)}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                1 {currency.code} = R$ {formatCurrency(currency.rate)}
              </p>
              <p className="text-xs text-muted-foreground">
                Cotação comercial do dia
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
