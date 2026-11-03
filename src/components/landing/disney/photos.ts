// Somente fotos de fontes oficiais: site oficial Walt Disney World (disneyworld.disney.go.com)
// ou fotos publicadas pela própria conta do estabelecimento no Google. Sem fotos de visitantes.
import mk from "@/assets/disney/official/magic-kingdom.jpg.asset.json";
import ep from "@/assets/disney/official/epcot.jpg.asset.json";
import hs from "@/assets/disney/official/hollywood-studios.jpg.asset.json";
import ak from "@/assets/disney/official/animal-kingdom.jpg.asset.json";
import tl from "@/assets/disney/official/typhoon-lagoon.jpg.asset.json";
import bb from "@/assets/disney/official/blizzard-beach.jpg.asset.json";
import lego from "@/assets/disney/official/lego.jpg.asset.json";
import coke from "@/assets/disney/official/coca-cola.jpg.asset.json";
import uniqlo from "@/assets/disney/official/uniqlo.jpg.asset.json";
import lulu from "@/assets/disney/official/lululemon.jpg.asset.json";
import boathouse from "@/assets/disney/official/boathouse.jpg.asset.json";
import gideons from "@/assets/disney/official/gideons.jpg.asset.json";
import morimoto from "@/assets/disney/official/morimoto.jpg.asset.json";
import paddlefish from "@/assets/disney/official/paddlefish.jpg.asset.json";
import raglan from "@/assets/disney/official/raglan.jpg.asset.json";
import hob from "@/assets/disney/official/hob.jpg.asset.json";
import level99 from "@/assets/disney/official/level99.jpg.asset.json";
import drawn from "@/assets/disney/official/drawn.jpg.asset.json";

export interface DisneyPhoto { url: string; credit: string; source?: string }
const WDW = "© Disney · Walt Disney World (site oficial)";
const wdw = (url: string, source: string): DisneyPhoto => ({ url, credit: WDW, source });
const g = (url: string, owner: string): DisneyPhoto => ({ url, credit: `${owner} · foto oficial no Google` });
const D = "https://disneyworld.disney.go.com";

export const DISNEY_PARK_PHOTOS: Record<string, DisneyPhoto> = {
  "magic-kingdom": wdw(mk.url, `${D}/destinations/magic-kingdom/`),
  epcot: wdw(ep.url, `${D}/destinations/epcot/`),
  "hollywood-studios": wdw(hs.url, `${D}/destinations/hollywood-studios/`),
  "animal-kingdom": wdw(ak.url, `${D}/destinations/animal-kingdom/`),
  "typhoon-lagoon": wdw(tl.url, `${D}/destinations/typhoon-lagoon/`),
  "blizzard-beach": wdw(bb.url, `${D}/destinations/blizzard-beach/`),
};

export type SpringsKind = "Loja" | "Restaurante" | "Entretenimento";
export interface SpringsSpot { name: string; kind: SpringsKind; text: string; photo: DisneyPhoto }
export const DISNEY_SPRINGS_SPOTS: SpringsSpot[] = [
  { name: "The LEGO Store", kind: "Loja", text: "Esculturas gigantes de LEGO e uma parede inteira de peças para montar.", photo: g(lego.url, "The LEGO® Store Disney Springs") },
  { name: "Coca-Cola Store", kind: "Loja", text: "Produtos exclusivos e um terraço para provar bebidas do mundo todo.", photo: g(coke.url, "Coca-Cola Store") },
  { name: "UNIQLO", kind: "Loja", text: "Moda casual japonesa, com coleções de estampas Disney.", photo: g(uniqlo.url, "UNIQLO Disney Springs") },
  { name: "lululemon", kind: "Loja", text: "Roupas esportivas e de conforto para os dias de muita caminhada.", photo: wdw(lulu.url, `${D}/shops/disney-springs/lululemon/`) },
  { name: "The BOATHOUSE", kind: "Restaurante", text: "Frutos do mar e carnes à beira do lago, com carros anfíbios na água.", photo: g(boathouse.url, "The Boathouse") },
  { name: "Gideon's Bakehouse", kind: "Restaurante", text: "Cookies enormes e famosos, que costumam formar fila.", photo: wdw(gideons.url, `${D}/dining/disney-springs/gideons-bakehouse/`) },
  { name: "Morimoto Asia", kind: "Restaurante", text: "Culinária pan-asiática do chef Masaharu Morimoto.", photo: g(morimoto.url, "Morimoto Asia") },
  { name: "Paddlefish", kind: "Restaurante", text: "Um barco a vapor ancorado no lago, com frutos do mar e vista.", photo: g(paddlefish.url, "Paddlefish") },
  { name: "Raglan Road", kind: "Restaurante", text: "Pub irlandês com comida típica e música ao vivo.", photo: g(raglan.url, "Raglan Road Irish Pub") },
  { name: "Drawn to Life", kind: "Entretenimento", text: "Espetáculo do Cirque du Soleil com a arte da animação Disney.", photo: wdw(drawn.url, `${D}/destinations/disney-springs/`) },
  { name: "House of Blues", kind: "Entretenimento", text: "Casa de shows e restaurante com música ao vivo e culinária sulista.", photo: g(hob.url, "House of Blues Orlando") },
  { name: "Level99", kind: "Entretenimento", text: "Salas de desafios interativos para jogar em grupo.", photo: g(level99.url, "Level99 Disney Springs") },
];
