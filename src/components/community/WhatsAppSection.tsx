import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Check, Info } from "lucide-react";
import type { WhatsAppCommunity } from "@/types/community";

interface WhatsAppSectionProps {
  community: WhatsAppCommunity | null;
}

export function WhatsAppSection({ community }: WhatsAppSectionProps) {
  if (!community) {
    return null;
  }

  return (
    <section>
      <Card className="bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-500/30">
        <CardContent className="py-8">
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <div className="h-20 w-20 rounded-full bg-green-500 flex items-center justify-center">
                <MessageCircle className="h-10 w-10 text-white" />
              </div>
            </div>
            
            <div className="flex-1 text-center lg:text-left space-y-4">
              <h2 className="text-2xl font-bold">Comunidade WhatsApp</h2>
              <p className="text-muted-foreground">
                Junte-se à nossa comunidade exclusiva de agentes de viagem e fique por dentro de tudo!
              </p>
              
              {community.benefits && community.benefits.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Benefícios:</p>
                  <ul className="grid gap-1 md:grid-cols-2">
                    {community.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {community.rules && community.rules.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Info className="h-4 w-4" />
                    Regras:
                  </p>
                  <ul className="grid gap-1 text-xs text-muted-foreground">
                    {community.rules.map((rule, index) => (
                      <li key={index}>• {rule}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="flex-shrink-0">
              <Button
                size="lg"
                className="bg-green-500 hover:bg-green-600 text-white"
                onClick={() => window.open(community.invite_url, "_blank")}
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Entrar na comunidade
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
