import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Shield, Users, Globe, Award, Star, Briefcase, Loader2, CheckCircle2,
} from "lucide-react";
import { SPECIALTY_OPTIONS } from "@/types/community-members";
import type { EntryMethod } from "@/types/community-members";

interface CommunityGateProps {
  onJoin: (data: any) => void;
  isJoining: boolean;
}

export function CommunityGate({ onJoin, isJoining }: CommunityGateProps) {
  const [tab, setTab] = useState<string>("cnpj");
  const [cnpj, setCnpj] = useState("");
  const [cnpjConfirm, setCnpjConfirm] = useState(false);
  const [yearsExp, setYearsExp] = useState("");
  const [bio, setBio] = useState("");
  const [segments, setSegments] = useState<string[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

  const toggleSpecialty = (s: string) => {
    setSelectedSpecialties((prev) => {
      if (prev.includes(s)) return prev.filter((x) => x !== s);
      if (prev.length >= 10) {
        toast.error("Máximo de 10 especialidades atingido");
        return prev;
      }
      return [...prev, s];
    }
    );
  };

  const handleSubmitCnpj = () => {
    if (!cnpj.trim() || !cnpjConfirm) return;
    onJoin({
      entry_method: "cnpj_8_years" as EntryMethod,
      cnpj: cnpj.trim(),
      specialties: selectedSpecialties,
    });
  };

  const handleSubmitExp = () => {
    if (!yearsExp || !bio.trim()) return;
    onJoin({
      entry_method: "experience" as EntryMethod,
      years_experience: parseInt(yearsExp),
      bio: bio.trim(),
      segments,
      specialties: selectedSpecialties,
    });
  };

  const benefits = [
    { icon: Users, title: "Networking Premium", desc: "Conecte-se com agentes experientes do Brasil inteiro" },
    { icon: Globe, title: "Oportunidades Exclusivas", desc: "Fam Trips e conteúdos só para membros" },
    { icon: Award, title: "Visibilidade", desc: "Destaque-se como especialista no mercado" },
    { icon: Star, title: "Autoridade", desc: "Construa sua reputação na comunidade" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Shield className="h-4 w-4" />
          Comunidade Exclusiva
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
          Travel Experts
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Uma comunidade exclusiva para agentes de viagens experientes, focada em qualidade,
          networking e troca de conhecimento real.
        </p>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {benefits.map((b) => (
          <Card key={b.title} className="text-center border-border/50">
            <CardContent className="pt-6 pb-4 space-y-2">
              <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <b.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">{b.title}</h3>
              <p className="text-xs text-muted-foreground">{b.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Entry Form */}
      <Card className="border-primary/20">
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold text-foreground mb-1">Solicitar acesso</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Escolha uma das opções abaixo para entrar na comunidade.
          </p>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="cnpj">CNPJ 8+ anos</TabsTrigger>
              <TabsTrigger value="experience">Experiência profissional</TabsTrigger>
            </TabsList>

            <TabsContent value="cnpj" className="space-y-4">
              <div className="space-y-2">
                <Label>CNPJ da sua agência</Label>
                <Input
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                />
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="cnpj-confirm"
                  checked={cnpjConfirm}
                  onCheckedChange={(v) => setCnpjConfirm(v === true)}
                />
                <label htmlFor="cnpj-confirm" className="text-sm text-muted-foreground cursor-pointer">
                  Confirmo que meu CNPJ possui mais de 8 anos de atividade
                </label>
              </div>

              <SpecialtySelector selected={selectedSpecialties} onToggle={toggleSpecialty} />

              <Button
                className="w-full"
                onClick={handleSubmitCnpj}
                disabled={!cnpj.trim() || !cnpjConfirm || isJoining}
              >
                {isJoining ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Entrar na Comunidade
              </Button>
            </TabsContent>

            <TabsContent value="experience" className="space-y-4">
              <div className="space-y-2">
                <Label>Tempo de experiência no turismo</Label>
                <Select value={yearsExp} onValueChange={setYearsExp}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {[8, 9, 10, 12, 15, 20, 25, 30].map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}+ anos</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mini currículo / Trajetória no turismo</Label>
                <Textarea
                  placeholder="Descreva sua experiência no mercado de turismo..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Segmentos de atuação (opcional)</Label>
                <div className="flex flex-wrap gap-2">
                  {["Lazer", "Corporativo", "Eventos", "Receptivo", "Consolidadora"].map((seg) => (
                    <Badge
                      key={seg}
                      variant={segments.includes(seg) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() =>
                        setSegments((prev) =>
                          prev.includes(seg) ? prev.filter((s) => s !== seg) : [...prev, seg]
                        )
                      }
                    >
                      {seg}
                    </Badge>
                  ))}
                </div>
              </div>

              <SpecialtySelector selected={selectedSpecialties} onToggle={toggleSpecialty} />

              <Button
                className="w-full"
                onClick={handleSubmitExp}
                disabled={!yearsExp || !bio.trim() || isJoining}
              >
                {isJoining ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Entrar na Comunidade
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function SpecialtySelector({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (s: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Especialidades (até 5)</Label>
        <span className="text-xs text-muted-foreground">{selected.length}/5</span>
      </div>
      {(Object.entries(SPECIALTY_OPTIONS) as [string, string[]][]).map(([cat, items]) => (
        <div key={cat} className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground capitalize">
            {cat === "destinations" ? "🌍 Destinos" : cat === "segments" ? "🏷️ Segmentos" : "🎯 Nichos"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {items.map((item) => (
              <Badge
                key={item}
                variant={selected.includes(item) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => onToggle(item)}
              >
                {item}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
