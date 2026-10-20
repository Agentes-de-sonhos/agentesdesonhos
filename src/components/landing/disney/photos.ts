// Fotos livres (Wikimedia Commons) com autor e licença exibidos em cada imagem.
import credits from "@/assets/disney/credits.json";
import mk from "@/assets/disney/magic-kingdom.webp.asset.json";
import ep from "@/assets/disney/epcot.webp.asset.json";
import hs from "@/assets/disney/hollywood-studios.webp.asset.json";
import ak from "@/assets/disney/animal-kingdom.webp.asset.json";
import tl from "@/assets/disney/typhoon-lagoon.webp.asset.json";
import bb from "@/assets/disney/blizzard-beach.webp.asset.json";
import lego from "@/assets/disney/lego.webp.asset.json";
import coke from "@/assets/disney/coca-cola.webp.asset.json";
import uniqlo from "@/assets/disney/uniqlo.webp.asset.json";
import lulu from "@/assets/disney/lululemon.webp.asset.json";
import boathouse from "@/assets/disney/boathouse.webp.asset.json";
import gideons from "@/assets/disney/gideons.webp.asset.json";
import morimoto from "@/assets/disney/morimoto.webp.asset.json";
import paddlefish from "@/assets/disney/paddlefish.webp.asset.json";
import raglan from "@/assets/disney/raglan.webp.asset.json";
import aerophile from "@/assets/disney/aerophile.webp.asset.json";
import hob from "@/assets/disney/house-of-blues.webp.asset.json";
import level99 from "@/assets/disney/level99.webp.asset.json";
import drawn from "@/assets/orlando/editorial/drawn-to-life-scenic.webp.asset.json";

type C = Record<string, { credit: string; source: string }>;
const cr = credits as C;
export interface DisneyPhoto { url: string; credit: string; source?: string }
const ph = (url: string, key: string): DisneyPhoto => ({ url, credit: cr[key].credit, source: cr[key].source });

export const DISNEY_PARK_PHOTOS: Record<string, DisneyPhoto> = {
  "magic-kingdom": ph(mk.url, "magic-kingdom"),
  epcot: ph(ep.url, "epcot"),
  "hollywood-studios": ph(hs.url, "hollywood-studios"),
  "animal-kingdom": ph(ak.url, "animal-kingdom"),
  "typhoon-lagoon": ph(tl.url, "typhoon-lagoon"),
  "blizzard-beach": ph(bb.url, "blizzard-beach"),
};

export type SpringsKind = "Loja" | "Restaurante" | "Entretenimento";
export interface SpringsSpot { name: string; kind: SpringsKind; text: string; photo: DisneyPhoto }
export const DISNEY_SPRINGS_SPOTS: SpringsSpot[] = [
  { name: "The LEGO Store", kind: "Loja", text: "Esculturas gigantes de LEGO e uma parede inteira de peças para montar.", photo: ph(lego.url, "lego") },
  { name: "Coca-Cola Store", kind: "Loja", text: "Produtos exclusivos e um terraço para provar bebidas do mundo todo.", photo: ph(coke.url, "coca-cola") },
  { name: "UNIQLO", kind: "Loja", text: "Moda casual japonesa, com coleções de estampas Disney.", photo: ph(uniqlo.url, "uniqlo") },
  { name: "lululemon", kind: "Loja", text: "Roupas esportivas e de conforto para os dias de muita caminhada.", photo: ph(lulu.url, "lululemon") },
  { name: "The BOATHOUSE", kind: "Restaurante", text: "Frutos do mar e carnes à beira do lago, com carros anfíbios na água.", photo: ph(boathouse.url, "boathouse") },
  { name: "Gideon's Bakehouse", kind: "Restaurante", text: "Cookies enormes e famosos, que costumam formar fila.", photo: ph(gideons.url, "gideons") },
  { name: "Morimoto Asia", kind: "Restaurante", text: "Culinária pan-asiática do chef Masaharu Morimoto.", photo: ph(morimoto.url, "morimoto") },
  { name: "Paddlefish", kind: "Restaurante", text: "Um barco a vapor ancorado no lago, com frutos do mar e vista.", photo: ph(paddlefish.url, "paddlefish") },
  { name: "Raglan Road", kind: "Restaurante", text: "Pub irlandês com comida típica e música ao vivo.", photo: ph(raglan.url, "raglan") },
  { name: "Aerophile", kind: "Entretenimento", text: "Balão cativo que sobe para uma vista aérea do complexo.", photo: ph(aerophile.url, "aerophile") },
  { name: "Drawn to Life", kind: "Entretenimento", text: "Espetáculo do Cirque du Soleil com a arte da animação Disney.", photo: { url: drawn.url, credit: "Imagem de divulgação" } },
  { name: "House of Blues", kind: "Entretenimento", text: "Casa de shows e restaurante com música ao vivo e culinária sulista.", photo: ph(hob.url, "house-of-blues") },
  { name: "Level99", kind: "Entretenimento", text: "Salas de desafios interativos para jogar em grupo.", photo: ph(level99.url, "level99") },
];
