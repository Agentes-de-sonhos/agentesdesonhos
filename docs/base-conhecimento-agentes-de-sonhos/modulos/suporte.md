# Módulo: Suporte

[← Índice](../00-LEIA-ME-E-INDICE.md)

- **Rota:** `/suporte`.
- **Estado:** CONFIRMADO.

## Funcionalidades
- Tickets (`support_tickets`) com mensagens em tempo real (`ticket_messages`).
- Anexos privados em `ticket-attachments`.
- Botão de resolver. Botão flutuante de WhatsApp em telas autenticadas.

## Evidências
`src/pages/Suporte.tsx`, `src/components/layout/WhatsAppSupportButton.tsx`, `src/hooks/useSupportTickets.ts`, `src/types/support.ts`.