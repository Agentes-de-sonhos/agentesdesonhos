import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AgencyDomainInfo } from '@/lib/agencyDomains';
import { agencyContextHref } from '@/lib/agencyContextLink';
import { cruiseShipPath } from '@/lib/cruiseShips';
import { SEASON_SHIPS, INTERESTS, availableSailings, recommendSeason, type SeasonPreferences } from '@/lib/cruiseShips/season';
import { validCruiseQuote } from '@/lib/cruiseShips/quoteRequest';
import { useAgencySiteRequest } from '@/hooks/useAgencySiteRequest';
import './CruiseSeasonPage.css';
const steps = ['Quando viajar', 'Embarque', 'Duração', 'Viajantes', 'Preferências'];
const initial: SeasonPreferences = { month:'', port:'', duration:'', interests:[] };
const periodLabel = (v:string) => v ? new Date(v+'-01T12:00:00Z').toLocaleDateString('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}) : 'Tenho flexibilidade';
const dateLabel = (v:string) => v.split('-').reverse().join('/');
export default function CruiseSeasonPage({info}:{info:AgencyDomainInfo}) {
 const href = (path:string) => agencyContextHref(path);
 const [prefs,setPrefs] = useState(initial); const [step,setStep] = useState(0);
 const [adults,setAdults] = useState(2); const [ages,setAges] = useState<string[]>([]);
 const [selected,setSelected] = useState(''); const [name,setName] = useState(''); const [phone,setPhone] = useState(''); const [consent,setConsent] = useState(false); const [trap,setTrap]=useState('');
 const {state,error,submit,reset}=useAgencySiteRequest(info.hostname); const sending=useRef(false); const heading=useRef<HTMLHeadingElement>(null);
 const presentation = /\.(preview|demo)\.local$/.test(info.hostname);
 const inventory = useMemo(()=>SEASON_SHIPS.flatMap(s=>availableSailings(s)),[]);
 const months = [...new Set(inventory.map(s=>s.date.slice(0,7)))].sort(); const ports = [...new Set(inventory.map(s=>s.ports[0]))].sort();
 const results = useMemo(()=>recommendSeason(prefs),[prefs]);
 const choice=results.find(r=>r.ship.shipSlug===selected);
 const chosen=choice?.sailings[0];
 const travelersValid=Number.isInteger(adults)&&adults>=1&&adults<=20&&ages.every(a=>/^(?:[0-9]|1[0-7])$/.test(a));
 const valid=validCruiseQuote({name,phone,email:'',period:prefs.month,adults,children:ages.length,ages:ages.join(','),cabin:'',consent});
 useEffect(()=>{document.title=`Cruzeiros Brasil 2026–2027 · ${info.agency_name || 'Sua agência'}`;window.scrollTo(0,0);},[info.agency_name]);
 const advance=(n:number)=>{setStep(n);setSelected('');reset();requestAnimationFrame(()=>heading.current?.focus());};
 const send=async(e:React.FormEvent)=>{e.preventDefault();if(!valid||presentation||sending.current)return;sending.current=true;
  try {await submit({service_key:'cruzeiros',service_label:'Cruzeiros · Temporada brasileira 2026/2027',lead_name:name.trim(),lead_phone:phone,lead_email:'',preferred_channel:'WhatsApp',destination:choice?.ship.shipName||'Temporada brasileira 2026/2027',consent,consent_version:'v1',honeypot:trap,
   summary:[`Temporada brasileira 2026/2027`, `Período: ${periodLabel(prefs.month)}`,`Embarque: ${prefs.port||'Flexível'}`,`Duração: ${prefs.duration==='short'?'3 a 5 noites':prefs.duration==='week'?'6 a 7 noites':prefs.duration==='long'?'8 noites ou mais':'Flexível'}`,`Passageiros: ${adults} adultos e ${ages.length} crianças${ages.length?' (idades na viagem: '+ages.join(', ')+')':''}`,`Preferências: ${prefs.interests.join(', ')||'Quero orientação'}`,`Interesse: ${choice?.ship.shipName||'Ajuda para escolher'}`,chosen?`Exemplo apresentado: ${dateLabel(chosen.date)} · ${chosen.n} noites · ${chosen.ports.join(' → ')} (disponibilidade a confirmar)`:''].filter(Boolean).join(' | '),
   notes:'Solicitação pelo assistente da temporada brasileira. As sugestões não garantem disponibilidade nem acomodação dos passageiros em uma única cabine.',
   details:{origem:'Site / Temporada brasileira 2026/2027',navio:choice?.ship.shipName||'Quero ajuda para escolher',companhia:choice?.ship.lineName||'',periodo_desejado:prefs.month||'Flexível',porto_embarque:prefs.port||'Flexível',duracao:prefs.duration||'Flexível',preferencias:prefs.interests.join(', '),adultos:adults,criancas:ages.length,idades_criancas:ages.join(', '),data_exemplo:chosen?.date||'',roteiro_exemplo:chosen?.ports.join(' → ')||''}});
  } finally {sending.current=false;}};
 return <main className="cruise-season">
  <nav className="cs-breadcrumb" aria-label="Você está aqui"><Link to={href('/')}>Início</Link><span>/</span><span>Temporada brasileira de cruzeiros</span></nav>
  <header className="cs-intro"><p className="cs-kicker">Temporada brasileira 2026–2027</p><h1>Seu próximo destino<br/>começa a bordo.</h1><p>Conheça os oito navios, explore os roteiros e encontre a viagem que combina com você.</p><a className="cs-textlink" href="#cs-assistente">Quero ajuda para escolher →</a></header>
  <section aria-label="Os oito navios da temporada" className="cs-grid">{SEASON_SHIPS.map(ship=><article className="cs-card" key={ship.shipSlug}><Link to={href(cruiseShipPath(ship))} aria-label={`Conheça ${ship.shipName} e seus roteiros`}><img src={ship.assets[ship.hero.image]||ship.hero.image} alt={ship.hero.alt} loading="lazy"/><div><h2>{ship.shipName}</h2><p>{ship.lineName}</p><span className="cs-card-button">Conheça o navio e os roteiros <span aria-hidden="true">→</span></span></div></Link></article>)}</section>
  <p className="cs-credit">Imagens de divulgação: {Array.from(new Map(SEASON_SHIPS.map(s=>[s.lineName,s])).values()).map((s,i)=><span key={s.lineName}>{i>0?' · ':''}<a href={s.creditUrl} target="_blank" rel="noreferrer">{s.lineName}</a></span>)}.</p>
  <section id="cs-assistente" className="cs-assistant" aria-labelledby="cs-assistant-title"><p className="cs-kicker">Encontre sua próxima viagem</p><h2 id="cs-assistant-title">Qual cruzeiro combina com você?</h2><p>Conte um pouco sobre sua viagem. Nós ajudamos a encontrar as melhores opções.</p>
   <ol className="cs-progress" aria-label="Etapas">{steps.map((s,i)=><li key={s} aria-current={step===i?'step':undefined} className={i<=step?'is-active':''}><span>{i+1}</span>{s}</li>)}</ol>
   <div className="cs-step" key={step}>
    <h3 ref={heading} tabIndex={-1}>{['Quando você quer viajar?','De onde gostaria de embarcar?','Quantas noites tem em mente?','Quem vai com você?','O que mais importa nessa viagem?','Estas opções combinam com sua busca'][step]}</h3>
    {step===0&&<div className="cs-options">{[...months,''].map(v=><button key={v} aria-pressed={prefs.month===v} onClick={()=>setPrefs({...prefs,month:v})}>{periodLabel(v)}</button>)}</div>}
    {step===1&&<div className="cs-options">{[...ports,''].map(v=><button key={v} aria-pressed={prefs.port===v} onClick={()=>setPrefs({...prefs,port:v})}>{v||'Tenho flexibilidade'}</button>)}</div>}
    {step===2&&<div className="cs-options">{[['short','3 a 5 noites'],['week','6 a 7 noites'],['long','8 noites ou mais'],['','Ainda não decidi']].map(([v,l])=><button key={v} aria-pressed={prefs.duration===v} onClick={()=>setPrefs({...prefs,duration:v})}>{l}</button>)}</div>}
    {step===3&&<div className="cs-travelers"><label>Adultos<input type="number" min="1" max="20" value={adults} onChange={e=>setAdults(Number(e.target.value))}/></label><label>Crianças<input type="number" min="0" max="10" value={ages.length} onChange={e=>setAges(Array.from({length:Math.max(0,Math.min(10,Math.floor(Number(e.target.value)||0)))},(_,i)=>ages[i]??''))}/></label>{ages.map((age,i)=><label key={i}>Idade da criança {i+1} na viagem<select required value={age} onChange={e=>setAges(ages.map((a,j)=>i===j?e.target.value:a))}><option value="">Selecione</option>{Array.from({length:18},(_,n)=><option key={n} value={n}>{n===0?'Menos de 1 ano':`${n} anos`}</option>)}</select></label>)}<p>As idades ajudam a agência a conferir regras de embarque, atividades e acomodação.</p></div>}
    {step===4&&<><p>Você pode escolher mais de uma opção ou continuar sem preferência.</p><div className="cs-options">{INTERESTS.map(v=><button key={v} aria-pressed={prefs.interests.includes(v)} onClick={()=>setPrefs({...prefs,interests:prefs.interests.includes(v)?prefs.interests.filter(i=>i!==v):[...prefs.interests,v]})}>{v}</button>)}</div></>}
    {step<5&&<div className="cs-actions">{step>0&&<button className="cs-back" onClick={()=>advance(step-1)}>Voltar</button>}<button className="cs-primary" disabled={step===3&&!travelersValid} onClick={()=>advance(step+1)}>{step===4?'Ver sugestões':'Continuar'} →</button></div>}
    {step===5&&<><p>{periodLabel(prefs.month)} · {prefs.port||'Embarque flexível'} · {adults} adulto(s){ages.length?` e ${ages.length} criança(s)`:''}</p>
     {results.length?<div className="cs-results">{results.map(r=>{const s=r.sailings[0];return <article key={r.ship.shipSlug}><h4>{r.ship.shipName}</h4><p>{s.n} noites · embarque em {s.ports[0]}</p><p>{s.ports.join(' → ')}</p><p>Exemplo de saída: {dateLabel(s.date)}</p><p className="cs-reason">Atende aos filtros de período, embarque e duração.{r.interests.length?` Possui espaços relacionados a: ${r.interests.join(', ').toLowerCase()}.`:''}</p><Link to={href(cruiseShipPath(r.ship))}>Conhecer o navio →</Link><button aria-pressed={selected===r.ship.shipSlug} className="cs-primary" onClick={()=>{setSelected(r.ship.shipSlug);reset();document.getElementById('cs-contact')?.scrollIntoView({behavior:'smooth',block:'center'});}}>Solicitar esta opção</button></article>;})}</div>:<div className="cs-empty"><h4>Não encontramos uma combinação exata na seleção cadastrada.</h4><p>Experimente outro mês, porto ou duração. Você também pode pedir ajuda à agência com suas preferências atuais.</p></div>}
     <p className="cs-note">Sugestões baseadas em uma seleção de roteiros publicados, sem consulta de disponibilidade em tempo real. A agência confirma datas, cabines, regras para crianças e condições antes da reserva.</p><button className="cs-back" onClick={()=>advance(0)}>Alterar minhas preferências</button>
     <div id="cs-contact" className="cs-contact"><h3>{choice?`Solicite uma proposta para o ${choice.ship.shipName}`:'Quer ajuda para encontrar seu cruzeiro?'}</h3><p>Suas preferências acompanham o pedido. Você não precisa preencher tudo novamente.</p>{state==='success'?<div role="status"><strong>Solicitação recebida!</strong><p>A agência entrará em contato para conversar sobre sua viagem.</p></div>:<form onSubmit={send} aria-label="Solicitar proposta de cruzeiro"><label>Nome completo<input autoComplete="name" required minLength={3} maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label><label>WhatsApp com DDD<input type="tel" autoComplete="tel-national" placeholder="(11) 99999-9999" required maxLength={20} value={phone} onChange={e=>setPhone(e.target.value)}/></label><div className="cs-trap" aria-hidden="true"><input tabIndex={-1} autoComplete="off" value={trap} onChange={e=>setTrap(e.target.value)}/></div><label className="cs-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>Concordo com o envio dos meus dados para a agência entrar em contato sobre este orçamento.</label><Link to={href('/politicasdeprivacidade')}>Política de Privacidade</Link>{error&&<p role="alert">{error}</p>}<button className="cs-primary" disabled={!valid||state==='submitting'||presentation}>{state==='submitting'?'Enviando…':'Solicitar meu orçamento'}</button>{presentation&&<p>Prévia: nenhum dado será enviado.</p>}</form>}</div>
    </>}
   </div>{step<5&&<p className="cs-note">Veja sugestões antes de informar seus dados de contato.</p>}
  </section>
 </main>;
}
