import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchExchangeRates } from "@/lib/exchangeRates";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ExchangeRateCard() {
  const { data: rates, isLoading, isError } = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: fetchExchangeRates,
    staleTime: 1000 * 60 * 60,
    refetchInterval: 1000 * 60 * 60,
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
      <div className="flex flex-nowrap items-center gap-3 lg:gap-2 xl:gap-4 bg-foreground/90 rounded-full px-4 lg:px-3 xl:px-4 py-1.5 shrink-0">
        {rates.map((currency) => (
          <Tooltip key={currency.code}>
            <TooltipTrigger asChild>
              <div className="flex flex-nowrap items-center gap-1.5 text-xs cursor-default whitespace-nowrap">
                <span className="font-semibold text-white/90 whitespace-nowrap">
                  {currency.code}
                </span>
                <span className="text-white/70 whitespace-nowrap">
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
