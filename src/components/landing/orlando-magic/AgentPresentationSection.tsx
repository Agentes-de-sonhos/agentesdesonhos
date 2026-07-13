import { AGENT } from "./content";

export function AgentPresentationSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-slate-200 bg-slate-50/50 p-8 text-center sm:p-10">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-2xl font-bold text-white">
            {AGENT.avatarInitials}
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">
              Eu ajudo você a escolher o melhor jogo
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Olá, eu sou {AGENT.name}. Vou verificar quais partidas acontecem durante a sua viagem e comparar as opções de setores de acordo com o perfil da sua família e o orçamento desejado.
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Você recebe as alternativas com explicações claras e pode decidir com tranquilidade, sem precisar entender sozinho o mapa da arena ou as diferenças entre cada categoria.
            </p>
          </div>
          <div className="pt-2">
            <p className="font-display text-lg font-bold text-slate-900">{AGENT.name}</p>
            <p className="text-sm text-slate-500">{AGENT.agency}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
