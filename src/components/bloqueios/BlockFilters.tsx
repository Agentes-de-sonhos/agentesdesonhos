import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BlockFiltersProps {
  operators: string[];
  airlines: string[];
  selectedOperator: string;
  selectedAirline: string;
  sortBy: string;
  onOperatorChange: (v: string) => void;
  onAirlineChange: (v: string) => void;
  onSortChange: (v: string) => void;
}

export function BlockFilters({
  operators, airlines,
  selectedOperator, selectedAirline, sortBy,
  onOperatorChange, onAirlineChange, onSortChange,
}: BlockFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Select value={selectedOperator} onValueChange={onOperatorChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Operadora" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Todas">Todas as operadoras</SelectItem>
          {operators.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedAirline} onValueChange={onAirlineChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Companhia aérea" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Todas">Todas as companhias</SelectItem>
          {airlines.map((a) => (
            <SelectItem key={a} value={a}>{a}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date_asc">Data mais próxima</SelectItem>
          <SelectItem value="price_asc">Menor preço</SelectItem>
          <SelectItem value="price_desc">Maior preço</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
