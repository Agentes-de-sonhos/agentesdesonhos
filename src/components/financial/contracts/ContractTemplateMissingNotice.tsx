import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { MessageCircle, ShieldCheck } from 'lucide-react';
import { useSupportWhatsApp } from '@/hooks/usePlatformSetting';

interface Props {
  agencyName?: string | null;
  cnpj?: string | null;
  userName?: string | null;
}

/**
 * Bloqueio único usado sempre que a agência ainda não tem modelo ATIVO de contrato.
 * Reutilizado pelo SaleContractDialog e pela aba Contratos.
 */
export function ContractTemplateMissingNotice({ agencyName, cnpj, userName }: Props) {
  const supportWhatsApp = useSupportWhatsApp();

  return (
    <div className="py-8 space-y-4">
      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Modelo de contrato ainda não configurado</AlertTitle>
        <AlertDescription>
          O texto jurídico do contrato é definido individualmente para cada agência. Envie o seu modelo
          para a equipe responsável e, assim que for cadastrado, a geração de contratos ficará liberada
          aqui — com os seus dados, sua identidade visual e o seu texto.
        </AlertDescription>
      </Alert>
      <Button asChild className="gap-2" disabled={!supportWhatsApp}>
        <a
          href={`https://wa.me/${supportWhatsApp}?text=${encodeURIComponent(
            [
              'Olá! Quero cadastrar o modelo de contrato da minha agência.',
              `Agência: ${agencyName || '—'}`,
              `CNPJ: ${cnpj || '—'}`,
              `Usuário: ${userName || '—'}`,
            ].join('\n'),
          )}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle className="h-4 w-4" />
          Solicitar cadastro do meu contrato
        </a>
      </Button>
    </div>
  );
}
