import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ServerPagination } from "@/components/shared/ServerPagination";
import type { EligibilityResult } from "@/lib/raffle/types";

interface Props {
  results: EligibilityResult[];
  drawnKeys: Set<string>;
}

const PAGE_SIZES = [25, 50, 100] as const;

export function RaffleParticipantsTable({ results, drawnKeys }: Props) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const totalPages = Math.max(1, Math.ceil(results.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rows = useMemo(
    () => results.slice((safePage - 1) * pageSize, safePage * pageSize),
    [results, safePage, pageSize],
  );

  if (!results.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhum participante carregado ainda.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Empresa/Agência</TableHead>
              <TableHead className="hidden lg:table-cell">Cidade</TableHead>
              <TableHead className="hidden lg:table-cell">Estado</TableHead>
              <TableHead className="hidden md:table-cell">E-mail</TableHead>
              <TableHead>Elegível</TableHead>
              <TableHead>Participou</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.participant.id}>
                <TableCell className="font-medium">{r.participant.name}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {r.participant.company || "—"}
                </TableCell>
                <TableCell className="hidden lg:table-cell">{r.participant.city || "—"}</TableCell>
                <TableCell className="hidden lg:table-cell">{r.participant.state || "—"}</TableCell>
                <TableCell className="hidden max-w-[220px] truncate md:table-cell">
                  {r.participant.email || "—"}
                </TableCell>
                <TableCell>
                  {r.eligible ? (
                    <Badge variant="secondary">Elegível</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      {r.reason}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {drawnKeys.has(r.participant.id) ? (
                    <Badge>Sorteado</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ServerPagination
        page={safePage}
        totalPages={totalPages}
        total={results.length}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZES}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        itemLabel="participantes"
      />
    </div>
  );
}