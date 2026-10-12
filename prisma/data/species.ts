export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EPIC' | 'LEGENDARY'

export type ClosedSeason = {
  region: string
  period: string
  rule: string
}

export type MapPlace = { x: string; y: string }

export type Region = { name: string; season: string; place: MapPlace }

export interface SpeciesSeed {
  name: string
  scientificName: string
  family: string
  difficulty: Difficulty
  baseXp: number
  habitat: 'Doce' | 'Salgada'
  averageSizeCm: number
  diet: string
  tone: [string, string]
  illustration: string
  description: string
  baits: string[]
  regions: Region[]
  bestTime: string
  techniques: string[]
  closedSeasons: ClosedSeason[]
  tipsReviewed?: boolean
}

const PIRACEMA_RULE = 'Piracema: pesca de espécies nativas proibida ou limitada nos rios'

const PIRACEMA_PARANA: ClosedSeason = {
  region: 'Bacia do Paraná (SP/PR/MS/MG/GO)',
  period: '1 nov – 28 fev',
  rule: PIRACEMA_RULE,
}

const PIRACEMA_SAO_FRANCISCO: ClosedSeason = {
  region: 'Bacia do São Francisco',
  period: '1 nov – 28 fev',
  rule: PIRACEMA_RULE,
}

const PIRACEMA_ARAGUAIA: ClosedSeason = {
  region: 'Bacia Araguaia-Tocantins',
  period: '1 nov – 28 fev',
  rule: PIRACEMA_RULE,
}

const PIRACEMA_PANTANAL_MS: ClosedSeason = {
  region: 'Pantanal (MS)',
  period: '1 nov – 28 fev',
  rule: PIRACEMA_RULE,
}

const PIRACEMA_MT: ClosedSeason = {
  region: 'Mato Grosso',
  period: 'definido pelo estado a cada ano',
  rule: 'Piracema estadual: confira o calendário da SEMA-MT',
}

const PIRACEMA_AMAZONIA: ClosedSeason = {
  region: 'Bacia Amazônica',
  period: '15 nov – 15 mar (varia por estado)',
  rule: 'Piracema: confira a portaria da espécie no seu estado',
}

const PIRACEMA_ESTADUAL: ClosedSeason = {
  region: 'Rios e lagoas do seu estado',
  period: 'em geral 1 nov – 28 fev',
  rule: 'Piracema estadual: confira as regras locais',
}

const PIRARUCU_AM: ClosedSeason = {
  region: 'Amazonas',
  period: '1 dez – 31 mai',
  rule: 'Defeso. No resto do ano, só em áreas de manejo autorizadas',
}

const DOURADO_MS: ClosedSeason = {
  region: 'Mato Grosso do Sul',
  period: 'ano todo',
  rule: 'Pesque e solte obrigatório para o dourado (lei estadual)',
}

const TILAPIA_EXOTICA: ClosedSeason = {
  region: 'Todo o país',
  period: 'sem defeso',
  rule: 'Espécie exótica: costuma ser liberada na piracema, com aparelhos permitidos',
}

const TUCUNARE_EXOTICO: ClosedSeason = {
  region: 'Represas fora da Amazônia',
  period: 'sem defeso na maioria dos estados',
  rule: 'Exótico nessas represas: confira se a piracema estadual libera',
}

const ROBALO: ClosedSeason = {
  region: 'Todo o litoral',
  period: 'sem defeso federal fixo',
  rule: 'Respeite o tamanho mínimo; alguns estados têm regras próprias',
}

const MAR_GERAL: ClosedSeason = {
  region: 'Todo o litoral',
  period: 'sem defeso federal específico',
  rule: 'Confira tamanho mínimo e regras do estado',
}

const MARLIM: ClosedSeason = {
  region: 'Todo o litoral',
  period: 'ano todo',
  rule: 'Pesca esportiva: o peixe deve ser solto vivo',
}

const MAP_WEST = -74.5
const MAP_EAST = -34.2
const MAP_NORTH = 5.8
const MAP_SOUTH = -34.3

function place(lat: number, lng: number): MapPlace {
  const x = ((lng - MAP_WEST) / (MAP_EAST - MAP_WEST)) * 100
  const y = ((MAP_NORTH - lat) / (MAP_NORTH - MAP_SOUTH)) * 100
  return { x: `${x.toFixed(1)}%`, y: `${y.toFixed(1)}%` }
}

const MAP = {
  rioNegro: place(-0.97, -62.9),
  mamiraua: place(-2.5, -65.0),
  am: place(-3.1, -60.0),
  amazonasRiver: place(-2.6, -56.7),
  tapajos: place(-4.3, -56.0),
  xingu: place(-3.2, -52.2),
  tucurui: place(-3.8, -49.7),
  paCoast: place(-0.9, -47.5),
  ma: place(-2.5, -44.3),
  neAcudes: place(-5.5, -39.5),
  neCoast: place(-7.5, -34.9),
  rn: place(-5.8, -35.2),
  ro: place(-8.8, -63.9),
  araguaia: place(-11.0, -50.3),
  ba: place(-13.0, -38.5),
  saoFrancisco: place(-17.3, -44.9),
  pantanal: place(-18.5, -56.0),
  mg: place(-20.7, -46.2),
  rioGrande: place(-20.2, -49.0),
  es: place(-20.3, -40.3),
  sp: place(-22.5, -48.5),
  parana: place(-22.6, -52.8),
  rj: place(-22.9, -43.2),
  caboFrio: place(-22.9, -42.0),
  spRj: place(-23.4, -44.6),
  spCoast: place(-24.0, -46.0),
  pr: place(-25.5, -48.5),
  sc: place(-28.0, -48.7),
  sul: place(-28.5, -52.0),
  rs: place(-32.2, -52.2),
}

export const SPECIES: SpeciesSeed[] = [
  {
    name: 'Lambari',
    scientificName: 'Astyanax lacustris',
    family: 'Characidae',
    difficulty: 'EASY',
    baseXp: 10,
    habitat: 'Doce',
    averageSizeCm: 12,
    diet: 'Onívoro',
    tone: ['#3b4a52', '#2f3c43'],
    illustration: 'lambari',
    description:
      'Pequeno, prateado e de cauda amarelada. Anda em cardume na beira de represas e riachos — ótima isca viva para predadores.',
    baits: ['Massa de pão', 'Minhoca picada', 'Larva de mosca'],
    regions: [
      { name: 'Represas do Sudeste (SP/MG)', season: 'ano todo', place: MAP.sp },
      { name: 'Rios do Sul (PR/SC/RS)', season: 'out–mar', place: MAP.sul },
    ],
    bestTime: 'Manhã e fim de tarde, com água calma',
    techniques: ['Vara de mão com anzol pequeno', 'Chuveirinho com ceva'],
    closedSeasons: [PIRACEMA_ESTADUAL],
  },
  {
    name: 'Acará',
    scientificName: 'Geophagus brasiliensis',
    family: 'Cichlidae',
    difficulty: 'EASY',
    baseXp: 10,
    habitat: 'Doce',
    averageSizeCm: 20,
    diet: 'Onívoro',
    tone: ['#2e4a3a', '#253d30'],
    illustration: 'acara',
    description:
      'Ciclídeo nativo de lagoas e rios costeiros, com uma mancha escura no meio do corpo. Casal cuida dos filhotes com dedicação.',
    baits: ['Minhoca', 'Massa', 'Pedaço de camarão'],
    regions: [
      { name: 'Lagoas costeiras (SP/RJ/ES)', season: 'set–abr', place: MAP.rj },
      { name: 'Rios do Sul (PR/SC/RS)', season: 'out–mar', place: MAP.sul },
    ],
    bestTime: 'Dia todo, melhor com sol',
    techniques: ['Vara de mão com boia', 'Fundo leve perto da vegetação'],
    closedSeasons: [PIRACEMA_ESTADUAL],
  },
  {
    name: 'Tilápia',
    scientificName: 'Oreochromis niloticus',
    family: 'Cichlidae',
    difficulty: 'EASY',
    baseXp: 12,
    habitat: 'Doce',
    averageSizeCm: 35,
    diet: 'Onívoro',
    tone: ['#3d4450', '#323843'],
    illustration: 'tilapia',
    description:
      'Africana, foi espalhada por represas e pesqueiros do país inteiro. Fácil de achar, mas briga bem na vara leve.',
    baits: ['Massa de ração', 'Milho verde', 'Minhoca'],
    regions: [
      { name: 'Pesqueiros (todo o país)', season: 'ano todo', place: MAP.sp },
      { name: 'Represas do Sudeste (SP/MG)', season: 'out–abr', place: MAP.mg },
      { name: 'Açudes do Nordeste (CE/RN/PB)', season: 'ano todo', place: MAP.neAcudes },
    ],
    bestTime: 'Dias quentes, do meio da manhã ao fim da tarde',
    techniques: ['Boia com massa', 'Fundo com mola e ceva'],
    closedSeasons: [TILAPIA_EXOTICA],
  },
  {
    name: 'Mandi',
    scientificName: 'Pimelodus maculatus',
    family: 'Pimelodidae',
    difficulty: 'EASY',
    baseXp: 12,
    habitat: 'Doce',
    averageSizeCm: 30,
    diet: 'Onívoro',
    tone: ['#4a4232', '#3c3629'],
    illustration: 'mandi',
    description:
      'Bagre pintado com ferrões nas nadadeiras — segure com cuidado. Come no fundo, principalmente à noite.',
    baits: ['Minhoca', 'Coração de galinha', 'Massa de queijo'],
    regions: [
      { name: 'Rio Paraná (PR/SP/MS)', season: 'mar–out', place: MAP.parana },
      { name: 'Rio São Francisco (MG/BA)', season: 'mar–out', place: MAP.saoFrancisco },
    ],
    bestTime: 'Noite e madrugada',
    techniques: ['Fundo com chumbo corrido', 'Vara de espera no barranco'],
    closedSeasons: [PIRACEMA_PARANA, PIRACEMA_SAO_FRANCISCO],
  },
  {
    name: 'Traíra',
    scientificName: 'Hoplias malabaricus',
    family: 'Erythrinidae',
    difficulty: 'EASY',
    baseXp: 15,
    habitat: 'Doce',
    averageSizeCm: 50,
    diet: 'Carnívoro',
    tone: ['#22453c', '#1b3931'],
    illustration: 'traira',
    description:
      'Predadora de emboscada comum em açudes e brejos. Ataca iscas de superfície ao amanhecer e no fim da tarde.',
    baits: ['Isca de superfície', 'Minhoca', 'Peixe vivo'],
    regions: [
      { name: 'Açudes do Nordeste (CE/RN/PB)', season: 'ano todo', place: MAP.neAcudes },
      { name: 'Brejos e represas do Sudeste (SP/MG)', season: 'set–mar', place: MAP.sp },
    ],
    bestTime: 'Amanhecer e fim de tarde, perto da vegetação',
    techniques: ['Isca artificial de superfície (sapinho)', 'Isca viva na boia'],
    closedSeasons: [PIRACEMA_ESTADUAL],
  },
  {
    name: 'Curimbatá',
    scientificName: 'Prochilodus lineatus',
    family: 'Prochilodontidae',
    difficulty: 'MEDIUM',
    baseXp: 25,
    habitat: 'Doce',
    averageSizeCm: 45,
    diet: 'Detritívoro',
    tone: ['#4a4a3a', '#3d3d30'],
    illustration: 'curimbata',
    description:
      'Raspa lodo e algas do fundo, por isso é difícil de fisgar. Na piracema sobe os rios em cardumes enormes.',
    baits: ['Massa de farelo', 'Massa de mandioca', 'Pão'],
    regions: [
      { name: 'Rio Paraná (PR/SP/MS)', season: 'mar–out', place: MAP.parana },
      { name: 'Rio Grande (SP/MG)', season: 'abr–set', place: MAP.rioGrande },
    ],
    bestTime: 'Manhã, com água mais limpa',
    techniques: ['Massa na boia com anzol pequeno', 'Ceva de farelo'],
    closedSeasons: [PIRACEMA_PARANA],
  },
  {
    name: 'Piranha-vermelha',
    scientificName: 'Pygocentrus nattereri',
    family: 'Serrasalmidae',
    difficulty: 'MEDIUM',
    baseXp: 25,
    habitat: 'Doce',
    averageSizeCm: 25,
    diet: 'Carnívoro',
    tone: ['#5a2a24', '#4a221d'],
    illustration: 'piranha-vermelha',
    description:
      'Barriga vermelha e dentes em serra. Anda em cardume e corta linha de náilon fino num piscar de olhos.',
    baits: ['Pedaço de peixe', 'Carne bovina', 'Coração de galinha'],
    regions: [
      { name: 'Pantanal (MS/MT)', season: 'mar–out', place: MAP.pantanal },
      { name: 'Rio Araguaia (TO/GO)', season: 'mai–out', place: MAP.araguaia },
      { name: 'Bacia Amazônica (AM)', season: 'ago–nov', place: MAP.am },
    ],
    bestTime: 'Dia todo; mais ativa no calor',
    techniques: ['Fundo com encastoado de aço', 'Vara de mão no barranco'],
    closedSeasons: [PIRACEMA_PANTANAL_MS, PIRACEMA_MT, PIRACEMA_AMAZONIA],
  },
  {
    name: 'Piau-três-pintas',
    scientificName: 'Leporinus friderici',
    family: 'Anostomidae',
    difficulty: 'MEDIUM',
    baseXp: 30,
    habitat: 'Doce',
    averageSizeCm: 35,
    diet: 'Onívoro',
    tone: ['#4b4a2c', '#3d3c24'],
    illustration: 'piau-tres-pintas',
    description:
      'Reconhecido pelas três manchas escuras no flanco. Belisca a isca devagar — quem fisga cedo demais perde o peixe.',
    baits: ['Milho cozido', 'Massa de farelo', 'Minhoca'],
    regions: [
      { name: 'Rio Paraná (PR/SP/MS)', season: 'mar–out', place: MAP.parana },
      { name: 'Rio Araguaia (TO/GO)', season: 'mai–out', place: MAP.araguaia },
    ],
    bestTime: 'Manhã e fim de tarde',
    techniques: ['Fundo leve com ceva de milho', 'Boia com anzol pequeno'],
    closedSeasons: [PIRACEMA_PARANA, PIRACEMA_ARAGUAIA],
  },
  {
    name: 'Pacu',
    scientificName: 'Piaractus mesopotamicus',
    family: 'Serrasalmidae',
    difficulty: 'MEDIUM',
    baseXp: 30,
    habitat: 'Doce',
    averageSizeCm: 60,
    diet: 'Onívoro',
    tone: ['#2f4522', '#26381c'],
    illustration: 'pacu',
    description:
      'Muito comum em pesqueiros do Sudeste. Briga forte em água rasa e aceita iscas vegetais.',
    baits: ['Massa de trigo', 'Milho verde', 'Coração de galinha'],
    regions: [
      { name: 'Rio Paraná (PR/SP/MS)', season: 'mar–out', place: MAP.parana },
      { name: 'Pantanal (MS/MT)', season: 'mar–out', place: MAP.pantanal },
      { name: 'Pesqueiros (todo o país)', season: 'ano todo', place: MAP.sp },
    ],
    bestTime: 'Dias quentes, com sol',
    techniques: ['Fundo com massa e mola', 'Boia com fruta ou milho'],
    closedSeasons: [PIRACEMA_PARANA, PIRACEMA_PANTANAL_MS, PIRACEMA_MT],
  },
  {
    name: 'Tambaqui',
    scientificName: 'Colossoma macropomum',
    family: 'Serrasalmidae',
    difficulty: 'MEDIUM',
    baseXp: 35,
    habitat: 'Doce',
    averageSizeCm: 90,
    diet: 'Onívoro',
    tone: ['#1c3f47', '#16333b'],
    illustration: 'tambaqui',
    description:
      'Come frutos e sementes na várzea amazônica. Boca forte: exige anzol robusto e linha resistente à abrasão.',
    baits: ['Fruto de açaí', 'Massa de milho', 'Ração'],
    regions: [
      { name: 'Bacia Amazônica (AM)', season: 'jul–nov', place: MAP.am },
      { name: 'Pesqueiros (todo o país)', season: 'ano todo', place: MAP.sp },
    ],
    bestTime: 'Manhã; na cheia, perto das árvores frutíferas',
    techniques: ['Fundo com fruta ou massa', 'Linha forte com anzol robusto'],
    closedSeasons: [PIRACEMA_AMAZONIA],
  },
  {
    name: 'Tucunaré-amarelo',
    scientificName: 'Cichla kelberi',
    family: 'Cichlidae',
    difficulty: 'MEDIUM',
    baseXp: 35,
    habitat: 'Doce',
    averageSizeCm: 40,
    diet: 'Carnívoro',
    tone: ['#4d4518', '#3f3913'],
    illustration: 'tucunare-amarelo',
    description:
      'Introduzido em represas do Sudeste e do Nordeste. Menor que o açu, mas ataca isca artificial com a mesma raiva.',
    baits: ['Zara de superfície', 'Jig pequeno', 'Lambari vivo'],
    regions: [
      { name: 'Represas do Sudeste (SP/MG)', season: 'out–abr', place: MAP.sp },
      { name: 'Rio Araguaia (TO/GO)', season: 'mai–out', place: MAP.araguaia },
    ],
    bestTime: 'Manhã cedo e fim de tarde, em dias de sol',
    techniques: ['Arremesso com isca de superfície', 'Meia-água perto de galhadas'],
    closedSeasons: [TUCUNARE_EXOTICO, PIRACEMA_ARAGUAIA],
  },
  {
    name: 'Matrinxã',
    scientificName: 'Brycon amazonicus',
    family: 'Bryconidae',
    difficulty: 'HARD',
    baseXp: 40,
    habitat: 'Doce',
    averageSizeCm: 45,
    diet: 'Onívoro',
    tone: ['#3a4a50', '#2f3d42'],
    illustration: 'matrinxa',
    description:
      'Rápido e saltador, vive em rios de água corrente. Come frutos e insetos que caem da mata.',
    baits: ['Frutos da mata', 'Gafanhoto', 'Colherzinha'],
    regions: [
      { name: 'Bacia Amazônica (AM)', season: 'jul–nov', place: MAP.am },
      { name: 'Rio Tapajós (PA)', season: 'jul–nov', place: MAP.tapajos },
    ],
    bestTime: 'Manhã, em corredeiras',
    techniques: ['Linha leve com isca de fruta', 'Arremesso com colher pequena'],
    closedSeasons: [PIRACEMA_AMAZONIA],
  },
  {
    name: 'Tucunaré-açu',
    scientificName: 'Cichla temensis',
    family: 'Cichlidae',
    difficulty: 'HARD',
    baseXp: 45,
    habitat: 'Doce',
    averageSizeCm: 70,
    diet: 'Carnívoro',
    tone: ['#134539', '#0e392f'],
    illustration: 'tucunare-acu',
    description:
      'O ciclídeo mais cobiçado do Brasil. Ataque explosivo em iscas de superfície perto de galhadas e pedrais.',
    baits: ['Zara / isca de hélice', 'Jig 3/8 oz', 'Lambari vivo'],
    regions: [
      { name: 'Rio Negro (AM)', season: 'set–fev', place: MAP.rioNegro },
      { name: 'Lago de Tucuruí (PA)', season: 'jun–nov', place: MAP.tucurui },
    ],
    bestTime: 'Manhã e fim de tarde, na seca dos rios',
    techniques: ['Isca de hélice ou zara na superfície', 'Jig perto de galhadas e pedrais'],
    closedSeasons: [PIRACEMA_AMAZONIA],
  },
  {
    name: 'Pintado',
    scientificName: 'Pseudoplatystoma corruscans',
    family: 'Pimelodidae',
    difficulty: 'HARD',
    baseXp: 50,
    habitat: 'Doce',
    averageSizeCm: 90,
    diet: 'Carnívoro',
    tone: ['#4a4f55', '#3c4046'],
    illustration: 'pintado',
    description:
      'Bagre grande de pintas pretas, rei do fundo nos rios do Pantanal e do Paraná. Puxa pesado e procura a correnteza.',
    baits: ['Tuvira', 'Muçum', 'Lambari vivo'],
    regions: [
      { name: 'Pantanal (MS/MT)', season: 'mar–out', place: MAP.pantanal },
      { name: 'Rio São Francisco (MG/BA)', season: 'mar–out', place: MAP.saoFrancisco },
      { name: 'Rio Paraná (PR/SP/MS)', season: 'mar–out', place: MAP.parana },
    ],
    bestTime: 'Noite e madrugada',
    techniques: ['Fundo com chumbo pesado na correnteza', 'Barco ancorado em poço fundo'],
    closedSeasons: [PIRACEMA_PANTANAL_MS, PIRACEMA_MT, PIRACEMA_SAO_FRANCISCO, PIRACEMA_PARANA],
  },
  {
    name: 'Bicuda',
    scientificName: 'Boulengerella cuvieri',
    family: 'Ctenoluciidae',
    difficulty: 'HARD',
    baseXp: 50,
    habitat: 'Doce',
    averageSizeCm: 60,
    diet: 'Carnívoro',
    tone: ['#3a4a3e', '#2f3d33'],
    illustration: 'bicuda',
    description:
      'Corpo comprido e bico duro. Dá saltos acrobáticos e escapa fácil — a boca óssea dificulta a fisgada.',
    baits: ['Isca de hélice', 'Stick de superfície', 'Colher'],
    regions: [
      { name: 'Rio Negro (AM)', season: 'set–fev', place: MAP.rioNegro },
      { name: 'Rio Tapajós (PA)', season: 'jul–nov', place: MAP.tapajos },
      { name: 'Rio Araguaia (TO/GO)', season: 'mai–out', place: MAP.araguaia },
    ],
    bestTime: 'Dias de sol, nas corredeiras',
    techniques: ['Arremesso com isca de superfície rápida', 'Anzol bem afiado e fisgada firme'],
    closedSeasons: [PIRACEMA_AMAZONIA, PIRACEMA_ARAGUAIA],
  },
  {
    name: 'Cachorra',
    scientificName: 'Hydrolycus armatus',
    family: 'Cynodontidae',
    difficulty: 'EPIC',
    baseXp: 60,
    habitat: 'Doce',
    averageSizeCm: 70,
    diet: 'Carnívoro',
    tone: ['#3e4552', '#323844'],
    illustration: 'cachorra',
    description:
      'Dois caninos enormes saem da mandíbula inferior. Vive em corredeiras e dá saltos violentos depois da fisgada.',
    baits: ['Peixe vivo', 'Jig pesado', 'Colher grande'],
    regions: [
      { name: 'Rio Araguaia (TO/GO)', season: 'jun–out', place: MAP.araguaia },
      { name: 'Rio Xingu (PA)', season: 'jul–nov', place: MAP.xingu },
      { name: 'Rio Tapajós (PA)', season: 'jul–nov', place: MAP.tapajos },
    ],
    bestTime: 'Manhã, em corredeiras',
    techniques: ['Jig na correnteza', 'Isca viva com encastoado de aço'],
    closedSeasons: [PIRACEMA_AMAZONIA, PIRACEMA_ARAGUAIA],
  },
  {
    name: 'Dourado',
    scientificName: 'Salminus brasiliensis',
    family: 'Bryconidae',
    difficulty: 'EPIC',
    baseXp: 70,
    habitat: 'Doce',
    averageSizeCm: 80,
    diet: 'Carnívoro',
    tone: ['#5b4614', '#4a3a11'],
    illustration: 'dourado',
    description:
      'O "tigre dos rios": saltos e corridas longas. Sobe corredeiras na piracema em busca de cardumes.',
    baits: ['Isca artificial de meia-água', 'Tuvira', 'Colher giratória'],
    regions: [
      { name: 'Rio Paraná (PR/SP/MS)', season: 'mar–out', place: MAP.parana },
      { name: 'Pantanal (MS/MT)', season: 'mar–out', place: MAP.pantanal },
    ],
    bestTime: 'Manhã, em corredeiras e saídas de lagoa',
    techniques: ['Meia-água com isca artificial', 'Isca viva com encastoado de aço'],
    closedSeasons: [PIRACEMA_PARANA, DOURADO_MS, PIRACEMA_MT],
  },
  {
    name: 'Pirarara',
    scientificName: 'Phractocephalus hemioliopterus',
    family: 'Pimelodidae',
    difficulty: 'EPIC',
    baseXp: 75,
    habitat: 'Doce',
    averageSizeCm: 110,
    diet: 'Onívoro',
    tone: ['#4a3226', '#3c291f'],
    illustration: 'pirarara',
    description:
      'Bagre de cauda vermelha e cabeça coberta por placa óssea. Pode passar de 40 kg e arrasta o barco para o fundo.',
    baits: ['Peixe inteiro', 'Fruto (jamari)', 'Pedaço de piranha'],
    regions: [
      { name: 'Rio Madeira (RO)', season: 'jul–nov', place: MAP.ro },
      { name: 'Rio Araguaia (TO/GO)', season: 'jun–out', place: MAP.araguaia },
      { name: 'Bacia Amazônica (AM)', season: 'jul–nov', place: MAP.am },
    ],
    bestTime: 'Noite',
    techniques: ['Fundo pesado em poço', 'Linha 0,60 mm ou mais, anzol 8/0'],
    closedSeasons: [PIRACEMA_AMAZONIA, PIRACEMA_ARAGUAIA],
  },
  {
    name: 'Pirarucu',
    scientificName: 'Arapaima gigas',
    family: 'Arapaimidae',
    difficulty: 'LEGENDARY',
    baseXp: 120,
    habitat: 'Doce',
    averageSizeCm: 200,
    diet: 'Carnívoro',
    tone: ['#471f26', '#39191f'],
    illustration: 'pirarucu',
    description:
      'Gigante amazônico que sobe à superfície para respirar. Pesca permitida só em áreas de manejo comunitário.',
    baits: ['Peixe vivo grande', 'Isca de superfície XL'],
    regions: [
      { name: 'Mamirauá (AM)', season: 'set–nov', place: MAP.mamiraua },
      { name: 'Rio Araguaia (TO/GO)', season: 'jun–set', place: MAP.araguaia },
    ],
    bestTime: 'Manhã; ele sobe para respirar a cada 15–20 minutos',
    techniques: ['Pesque e solte com isca de superfície grande', 'Só em áreas de manejo autorizadas'],
    closedSeasons: [PIRARUCU_AM, PIRACEMA_ARAGUAIA],
  },
  {
    name: 'Piraíba',
    scientificName: 'Brachyplatystoma filamentosum',
    family: 'Pimelodidae',
    difficulty: 'LEGENDARY',
    baseXp: 140,
    habitat: 'Doce',
    averageSizeCm: 200,
    diet: 'Carnívoro',
    tone: ['#3a3f4a', '#2f343d'],
    illustration: 'piraiba',
    description:
      'O maior bagre da Amazônia, pode passar de 2 m. Vive no canal profundo dos grandes rios e a briga dura horas.',
    baits: ['Peixe inteiro grande', 'Pedaço de pirarara', 'Isca viva de 1 kg'],
    regions: [
      { name: 'Rio Madeira (RO)', season: 'jul–nov', place: MAP.ro },
      { name: 'Rio Amazonas (AM/PA)', season: 'ago–dez', place: MAP.amazonasRiver },
      { name: 'Rio Araguaia (TO/GO)', season: 'jun–out', place: MAP.araguaia },
    ],
    bestTime: 'Noite, em poços fundos',
    techniques: ['Fundo muito pesado no canal', 'Equipamento pesado: linha 0,90 mm ou mais'],
    closedSeasons: [PIRACEMA_AMAZONIA, PIRACEMA_ARAGUAIA],
  },
  {
    name: 'Corvina',
    scientificName: 'Micropogonias furnieri',
    family: 'Sciaenidae',
    difficulty: 'EASY',
    baseXp: 12,
    habitat: 'Salgada',
    averageSizeCm: 45,
    diet: 'Carnívoro',
    tone: ['#4a4a40', '#3c3c34'],
    illustration: 'corvina',
    description:
      'Ronca quando sai da água. Comum em praias, baías e na Lagoa dos Patos, come camarão e poliquetas no fundo.',
    baits: ['Camarão', 'Corrupto', 'Tatuí'],
    regions: [
      { name: 'Praias do Sul (RS/SC)', season: 'out–mar', place: MAP.rs },
      { name: 'Baía de Guanabara (RJ)', season: 'ano todo', place: MAP.rj },
      { name: 'Litoral de SP', season: 'set–mar', place: MAP.spCoast },
    ],
    bestTime: 'Maré enchendo, fim de tarde e noite',
    techniques: ['Pesca de praia com chumbada pirâmide', 'Fundo em barco na baía'],
    closedSeasons: [MAR_GERAL],
  },
  {
    name: 'Peixe-espada',
    scientificName: 'Trichiurus lepturus',
    family: 'Trichiuridae',
    difficulty: 'MEDIUM',
    baseXp: 25,
    habitat: 'Salgada',
    averageSizeCm: 100,
    diet: 'Carnívoro',
    tone: ['#46505a', '#3a424b'],
    illustration: 'peixe-espada',
    description:
      'Comprido, prateado e sem nadadeira na cauda. Os dentes cortam linha — use empate de aço.',
    baits: ['Sardinha em tiras', 'Lula', 'Jig metálico'],
    regions: [
      { name: 'Litoral de SP', season: 'mai–set', place: MAP.spCoast },
      { name: 'Litoral de SC', season: 'abr–set', place: MAP.sc },
      { name: 'Baía de Guanabara (RJ)', season: 'mai–ago', place: MAP.rj },
    ],
    bestTime: 'Noite, com luz na água',
    techniques: ['Fundo com empate de aço', 'Jig vertical em píer ou barco'],
    closedSeasons: [MAR_GERAL],
  },
  {
    name: 'Pampo',
    scientificName: 'Trachinotus carolinus',
    family: 'Carangidae',
    difficulty: 'MEDIUM',
    baseXp: 25,
    habitat: 'Salgada',
    averageSizeCm: 35,
    diet: 'Carnívoro',
    tone: ['#4a4f3a', '#3d4130'],
    illustration: 'pampo',
    description:
      'Corpo achatado e prateado, entra na arrebentação atrás de tatuí. Briga de lado, muito forte para o tamanho.',
    baits: ['Tatuí', 'Camarão', 'Corrupto'],
    regions: [
      { name: 'Praias de SC e PR', season: 'out–mar', place: MAP.sc },
      { name: 'Litoral de SP', season: 'nov–mar', place: MAP.spCoast },
      { name: 'Praias do ES', season: 'ano todo', place: MAP.es },
    ],
    bestTime: 'Maré enchendo, de manhã',
    techniques: ['Pesca de praia na arrebentação', 'Chumbo leve e anzol pequeno'],
    closedSeasons: [MAR_GERAL],
  },
  {
    name: 'Pescada-amarela',
    scientificName: 'Cynoscion acoupa',
    family: 'Sciaenidae',
    difficulty: 'MEDIUM',
    baseXp: 30,
    habitat: 'Salgada',
    averageSizeCm: 80,
    diet: 'Carnívoro',
    tone: ['#55482a', '#463b22'],
    illustration: 'pescada-amarela',
    description:
      'Grande pescada de estuário, de garganta amarelada. Muito pescada no litoral do Pará e do Maranhão.',
    baits: ['Camarão vivo', 'Isca de meia-água', 'Peixe pequeno'],
    regions: [
      { name: 'Litoral do Pará (PA)', season: 'jul–dez', place: MAP.paCoast },
      { name: 'Baía de São Marcos (MA)', season: 'ago–dez', place: MAP.ma },
      { name: 'Estuários de SP', season: 'set–mar', place: MAP.spCoast },
    ],
    bestTime: 'Maré de virada, fim de tarde',
    techniques: ['Fundo com camarão vivo', 'Meia-água em canal de estuário'],
    closedSeasons: [MAR_GERAL],
  },
  {
    name: 'Robalo-peva',
    scientificName: 'Centropomus parallelus',
    family: 'Centropomidae',
    difficulty: 'MEDIUM',
    baseXp: 35,
    habitat: 'Salgada',
    averageSizeCm: 40,
    diet: 'Carnívoro',
    tone: ['#2f4550', '#273a43'],
    illustration: 'robalo-peva',
    description:
      'Primo menor do robalo-flecha, vive em mangues e rios de água salobra. Ataca camarão encostado na galhada.',
    baits: ['Camarão vivo', 'Shad 3"', 'Meia-água pequena'],
    regions: [
      { name: 'Litoral de SP', season: 'set–abr', place: MAP.spCoast },
      { name: 'Baía de Paranaguá (PR)', season: 'nov–mar', place: MAP.pr },
      { name: 'Mangues de SC', season: 'nov–mar', place: MAP.sc },
    ],
    bestTime: 'Maré enchendo, ao amanhecer',
    techniques: ['Arremesso perto do mangue', 'Camarão vivo com boia'],
    closedSeasons: [ROBALO],
  },
  {
    name: 'Anchova',
    scientificName: 'Pomatomus saltatrix',
    family: 'Pomatomidae',
    difficulty: 'HARD',
    baseXp: 50,
    habitat: 'Salgada',
    averageSizeCm: 70,
    diet: 'Carnívoro',
    tone: ['#1c3141', '#162836'],
    illustration: 'anchova',
    description:
      'Caça em cardumes na arrebentação durante o inverno. Dentição afiada exige encastoamento de aço.',
    baits: ['Sardinha inteira', 'Jig metálico', 'Isca de arrasto'],
    regions: [
      { name: 'Praias do Sul (RS/SC)', season: 'mai–ago', place: MAP.rs },
      { name: 'Cabo Frio (RJ)', season: 'jun–set', place: MAP.caboFrio },
    ],
    bestTime: 'Inverno, com mar mexido e cardume na arrebentação',
    techniques: ['Arremesso com jig metálico', 'Isca natural com encastoado de aço'],
    closedSeasons: [MAR_GERAL],
  },
  {
    name: 'Xaréu',
    scientificName: 'Caranx hippos',
    family: 'Carangidae',
    difficulty: 'HARD',
    baseXp: 50,
    habitat: 'Salgada',
    averageSizeCm: 70,
    diet: 'Carnívoro',
    tone: ['#3e4a55', '#333d47'],
    illustration: 'xareu',
    description:
      'Corpo alto e cauda em forma de foice. Caça em bando nas barras e costões — puxa forte e sem parar.',
    baits: ['Peixe vivo', 'Popper', 'Jig'],
    regions: [
      { name: 'Litoral da Bahia (BA)', season: 'set–mar', place: MAP.ba },
      { name: 'Litoral do Nordeste (PE/RN)', season: 'ano todo', place: MAP.neCoast },
      { name: 'Costões do ES', season: 'out–mar', place: MAP.es },
    ],
    bestTime: 'Manhã, com cardume de isca na superfície',
    techniques: ['Popper na superfície', 'Isca viva no costão'],
    closedSeasons: [MAR_GERAL],
  },
  {
    name: 'Robalo-flecha',
    scientificName: 'Centropomus undecimalis',
    family: 'Centropomidae',
    difficulty: 'HARD',
    baseXp: 55,
    habitat: 'Salgada',
    averageSizeCm: 90,
    diet: 'Carnívoro',
    tone: ['#1b3f54', '#153446'],
    illustration: 'robalo-flecha',
    description:
      'Vive em estuários, manguezais e barras de rio. Sensível a barulho — aproximação silenciosa é decisiva.',
    baits: ['Camarão vivo', 'Shad 4"', 'Bailarina'],
    regions: [
      { name: 'Litoral Sudeste (SP/RJ)', season: 'set–abr', place: MAP.spRj },
      { name: 'Baía de Paranaguá (PR)', season: 'nov–mar', place: MAP.pr },
    ],
    bestTime: 'Maré enchendo, à noite e ao amanhecer',
    techniques: ['Shad na barra de rio', 'Camarão vivo com boia'],
    closedSeasons: [ROBALO],
  },
  {
    name: 'Dourado-do-mar',
    scientificName: 'Coryphaena hippurus',
    family: 'Coryphaenidae',
    difficulty: 'HARD',
    baseXp: 55,
    habitat: 'Salgada',
    averageSizeCm: 100,
    diet: 'Carnívoro',
    tone: ['#2f5a48', '#264a3b'],
    illustration: 'dourado-do-mar',
    description:
      'Verde-dourado, muda de cor quando sai da água. Anda perto de troncos e algas boiando no mar aberto.',
    baits: ['Sardinha viva', 'Isca de corrico', 'Lula'],
    regions: [
      { name: 'Mar aberto do ES', season: 'out–mar', place: MAP.es },
      { name: 'Mar aberto de SC', season: 'dez–abr', place: MAP.sc },
      { name: 'Litoral do Nordeste (PE/RN)', season: 'ano todo', place: MAP.neCoast },
    ],
    bestTime: 'Manhã, perto de objetos boiando',
    techniques: ['Corrico com isca artificial', 'Isca viva perto de troncos e algas'],
    closedSeasons: [MAR_GERAL],
  },
  {
    name: 'Olho-de-boi',
    scientificName: 'Seriola dumerili',
    family: 'Carangidae',
    difficulty: 'EPIC',
    baseXp: 70,
    habitat: 'Salgada',
    averageSizeCm: 120,
    diet: 'Carnívoro',
    tone: ['#4a4232', '#3c3629'],
    illustration: 'olho-de-boi',
    description:
      'Musculoso e de olho grande, vive em parcéis e naufrágios. Corre direto para a pedra — briga de força bruta.',
    baits: ['Peixe vivo', 'Jig vertical pesado', 'Lula'],
    regions: [
      { name: 'Parcéis de SP e RJ', season: 'out–abr', place: MAP.spRj },
      { name: 'Ilhas de SC', season: 'nov–abr', place: MAP.sc },
    ],
    bestTime: 'Manhã, com maré correndo',
    techniques: ['Jig vertical em parcel', 'Isca viva no fundo'],
    closedSeasons: [MAR_GERAL],
  },
  {
    name: 'Atum-amarelo',
    scientificName: 'Thunnus albacares',
    family: 'Scombridae',
    difficulty: 'EPIC',
    baseXp: 80,
    habitat: 'Salgada',
    averageSizeCm: 150,
    diet: 'Carnívoro',
    tone: ['#2a3a5a', '#22304a'],
    illustration: 'atum-amarelo',
    description:
      'Nadadeiras amarelas e velocidade de torpedo. Caça cardumes de sardinha longe da costa.',
    baits: ['Sardinha viva', 'Popper grande', 'Isca de corrico'],
    regions: [
      { name: 'Mar aberto do Nordeste (RN/PE)', season: 'ano todo', place: MAP.rn },
      { name: 'Mar aberto do Sudeste (RJ/ES)', season: 'nov–mar', place: MAP.es },
    ],
    bestTime: 'Amanhecer, quando os pássaros mergulham no cardume',
    techniques: ['Popper no cardume', 'Corrico em mar aberto'],
    closedSeasons: [MAR_GERAL],
  },
  {
    name: 'Marlim-azul',
    scientificName: 'Makaira nigricans',
    family: 'Istiophoridae',
    difficulty: 'LEGENDARY',
    baseXp: 150,
    habitat: 'Salgada',
    averageSizeCm: 350,
    diet: 'Carnívoro',
    tone: ['#182c52', '#132444'],
    illustration: 'marlim-azul',
    description:
      'Troféu do oceano aberto. Corrida de centenas de metros — pesque com cadeira de luta e solte com cuidado.',
    baits: ['Corrico de superfície', 'Cavala viva'],
    regions: [
      { name: 'Vitória (ES)', season: 'nov–mar', place: MAP.es },
      { name: 'Cabo Frio offshore (RJ)', season: 'dez–abr', place: MAP.caboFrio },
    ],
    bestTime: 'Dias de mar calmo e água azul quente',
    techniques: ['Corrico com isca de superfície', 'Pesque e solte com anzol circular'],
    closedSeasons: [MARLIM],
  },
]
