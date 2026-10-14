// Herbarium: eine Seite im Stil eines alten Pflanzenbuchs. Entdeckte Typen als Vorschau (Stufe 4), unbekannte als
// Silhouette mit „?“. Antippen einer entdeckten Kachel öffnet ein Sheet mit Steckbrief und Bezugsquelle.
// Daten kommen aus spiel.herbarium(daten); hier nur Anzeige.

import { herbarium, PREISE_PFLANZEN } from '../spiel.js';
import { PFLANZEN } from '../grafik/pflanzen.js';
import { PFLANZEN2 } from '../grafik/pflanzen2.js';
import { SAAT } from '../grafik/saat.js';
import { RARITAETEN } from '../grafik/raritaeten.js';
import { vorschau, einpassen } from '../szene.js';
import { el, svgBox, zahl } from './bausteine.js';

// Botanische Namen (Latein) je Typ
const BOTANIK = {
  schnittlauch: 'Allium schoenoprasum',
  petersilie: 'Petroselinum crispum',
  minze: 'Mentha spicata',
  thymian: 'Thymus vulgaris',
  rosmarin: 'Salvia rosmarinus',
  salbei: 'Salvia officinalis',
  basilikum: 'Ocimum basilicum',
  tomate: 'Solanum lycopersicum',
  erdbeere: 'Fragaria × ananassa',
  chili: 'Capsicum annuum',
  paprika: 'Capsicum annuum',
  radieschen: 'Raphanus sativus',
  monstera: 'Monstera deliciosa',
  strelitzie: 'Strelitzia reginae',
  alocasia: 'Alocasia spp.',
  bananenstaude: 'Musa × paradisiaca',
  kentia: 'Howea forsteriana',
  kaktus: 'Echinocactus grusonii',
  aloe: 'Aloe vera',
  echeverie: 'Echeveria elegans',
  bogenhanf: 'Dracaena trifasciata',
  orchidee: 'Phalaenopsis amabilis',
  sonnenblume: 'Helianthus annuus',
  kletterrose: 'Rosa hybrida',
  lavendel: 'Lavandula angustifolia',
  hoya: 'Hoya carnosa',
  koenigin_der_nacht: 'Selenicereus grandiflorus',
  jadewein: 'Strongylodon macrobotrys',
  thai_constellation: 'Monstera deliciosa „Thai Constellation“',
  pink_princess: 'Philodendron erubescens „Pink Princess“',
  drachenbaum: 'Dracaena draco',
  gold_ginkgo: 'Ginkgo biloba',
  safran: 'Crocus sativus',
  wasabi: 'Eutrema japonicum',
  goldtomate: 'Solanum lycopersicum (gelbe Sorte)'
};

// Steckbrief-Satz je Typ (Herkunft oder Besonderheit)
const STECKBRIEF = {
  schnittlauch: 'Das Zwiebelgewächs wächst wild in Europa, Asien und Nordamerika. Die hohlen Halme schmecken mild nach Zwiebel, die lila Blütenkugeln sind essbar.',
  petersilie: 'Stammt aus dem östlichen Mittelmeerraum und ist seit der Antike als Gewürz bekannt. Im Garten wird sie meist einjährig gezogen.',
  minze: 'Die Grüne Minze stammt aus Europa und Asien. Sie breitet sich über unterirdische Ausläufer schnell aus, deshalb wächst sie am besten im eigenen Topf.',
  thymian: 'Ein kleiner Halbstrauch aus dem Mittelmeerraum, der Sonne und Trockenheit liebt. Seine Blätter enthalten viel ätherisches Öl.',
  rosmarin: 'Immergrüner Strauch aus den Küstenregionen des Mittelmeers mit nadelartigen Blättern. Er mag viel Sonne und wenig Wasser, Staunässe verträgt er schlecht.',
  salbei: 'Halbstrauch aus dem Mittelmeerraum mit graugrünen, weich behaarten Blättern. Der lateinische Name geht auf „heilen“ zurück, schon in der Antike galt Salbei als Heilpflanze.',
  basilikum: 'Stammt aus den warmen Regionen Asiens und Afrikas. Er ist sehr kälteempfindlich und braucht einen warmen, hellen Platz.',
  tomate: 'Die Tomate stammt aus den Anden in Südamerika und kam erst nach der Entdeckung Amerikas nach Europa. Sie gehört zur selben Familie wie Kartoffel und Paprika.',
  erdbeere: 'Die Gartenerdbeere ist eine Kreuzung amerikanischer Wildarten und entstand im 18. Jahrhundert in Europa. Die eigentlichen Früchte sind die kleinen Körnchen auf der Oberfläche.',
  chili: 'Stammt aus Mittel- und Südamerika und kam im 16. Jahrhundert nach Europa. Die Schärfe steckt vor allem in den weißen Trennwänden, nicht in den Kernen.',
  paprika: 'Süße Paprika gehört zur selben Art wie der Chili, wurde aber über Jahrhunderte milder gezüchtet. Sie stammt ursprünglich aus Mittel- und Südamerika.',
  radieschen: 'Ein Wurzelgemüse aus Asien, das schon nach etwa vier Wochen erntereif ist. Es gehört zu den schnellsten Gemüsen im Beet.',
  monstera: 'Stammt aus den Regenwäldern Mittelamerikas und klettert dort an Bäumen empor. Die Löcher und Schlitze in den Blättern bilden sich erst mit dem Alter der Pflanze.',
  strelitzie: 'Die Paradiesvogelblume stammt aus Südafrika. Ihre orangeblauen Blüten werden von Nektarvögeln bestäubt.',
  alocasia: 'Die Pfeilblätter stammen aus Südostasien und Nordaustralien und lieben Wärme und Feuchtigkeit. Alle Teile sind giftig, also besser außer Reichweite von Haustieren stellen.',
  bananenstaude: 'Eine riesige Staude, kein Baum: Der Stamm besteht aus ineinandergerollten Blattscheiden. Jeder Stamm trägt nur einmal Früchte, danach übernimmt ein Ableger.',
  kentia: 'Die Kentia-Palme stammt von der australischen Lord-Howe-Insel. Sie wächst langsam, verträgt aber Zimmerluft und wenig Licht erstaunlich gut.',
  kaktus: 'Der Goldkugelkaktus wächst im trockenen Zentralmexiko und braucht viele Jahre, bis er seine volle Kugelgröße erreicht.',
  aloe: 'Aloe vera stammt vermutlich von der Arabischen Halbinsel. Das Gel aus den Blättern wird seit Jahrhunderten bei Hautreizungen genutzt.',
  echeverie: 'Eine Rosettensukkulente aus Mexiko, die Wasser in ihren dicken Blättern speichert. Sie bildet gern Ableger rund um die Mutterpflanze.',
  bogenhanf: 'Der Bogenhanf stammt aus Westafrika und kommt mit wenig Licht und wenig Wasser aus. Er gehört zu den robustesten Zimmerpflanzen.',
  orchidee: 'Die Malayen-Orchidee stammt aus Südostasien und wächst auf Bäumen, nicht in der Erde. Ihre Blüten halten oft mehrere Wochen.',
  sonnenblume: 'Die Sonnenblume stammt aus Nordamerika und wurde dort schon vor Jahrtausenden kultiviert. Junge Blütenköpfe richten sich tagsüber nach der Sonne aus.',
  kletterrose: 'Eine Rosenhybride mit langen Trieben, die sich an Gittern und Spalieren hochrankt. Je nach Sorte blüht sie einmal oder mehrmals im Sommer.',
  lavendel: 'Stammt aus den Bergregionen des Mittelmeerraums. Seine Blüten werden für Duftstoffe, Tee und Öle verwendet.',
  hoya: 'Die Wachsblume stammt aus Südostasien und Australien. Ihre Blüten sind wachsartig und duften oft am Abend stärker.',
  koenigin_der_nacht: 'Die Königin der Nacht ist ein Kletterkaktus aus Mexiko und Mittelamerika. Ihre große weiße Blüte öffnet sich nur für eine Nacht.',
  jadewein: 'Eine Kletterpflanze von den Philippinen. Ihre türkisgrünen Blütentrauben hängen bis zu einem Meter lang herab, die Pflanze ist mit Erbsen verwandt.',
  thai_constellation: 'Eine gescheckte Monstera-Sorte, die aus Thailand bekannt wurde. Die hellen Stellen enthalten kein Blattgrün, deshalb wächst sie langsamer als die Wildform.',
  pink_princess: 'Eine Zuchtform des Philodendron erubescens mit rosa bis pinkfarbenen Blättern. Die Farbe bleibt nur bei viel hellem Licht kräftig.',
  drachenbaum: 'Der Drachenbaum wächst auf den Kanarischen Inseln. Verletzte Stämme geben ein rotes Harz ab, das Drachenblut, dem die Pflanze ihren Namen verdankt.',
  gold_ginkgo: 'Der Ginkgo ist ein lebendes Fossil, seine Familie gibt es seit über 200 Millionen Jahren. Als Bonsai bleibt er klein und wirft im Herbst goldgelbe Blätter ab.',
  safran: 'Der Safran stammt vermutlich aus dem östlichen Mittelmeerraum und ist seit der Antike Kulturpflanze. Für das Gewürz werden nur die drei roten Narben pro Blüte von Hand gezupft.',
  wasabi: 'Die Wasabi-Pflanze stammt aus Japan und wächst an kühlen, schnell fließenden Bachufern. Die scharfe Paste wird aus dem Wurzelstock gewonnen.',
  goldtomate: 'Eine gelbfrüchtige Tomatensorte mit meist milderem und süßerem Geschmack als rote Sorten. Sie ist eine Farbvariante der normalen Tomate.'
};

const SELTENHEIT_NAME = { gewoehnlich: 'gewöhnlich', selten: 'selten', episch: 'episch', legendaer: 'legendär' };
const SELTENHEIT_FARBE = { gewoehnlich: '#9aa1a8', selten: '#6fae6a', episch: '#9b6fc9', legendaer: '#e8b83a' };

// Grafik und Name: Saatgut zuerst (Gemüsebeet nutzt SAAT), dann Topfpflanzen, dann Raritäten
function quelleVon(typ) {
  if (SAAT[typ]) return { name: SAAT[typ].name, bild: () => SAAT[typ].zeichne(4, false) };
  if (PFLANZEN2[typ]) return { name: PFLANZEN2[typ].name, bild: () => PFLANZEN2[typ].zeichne(4, false, 'boden') };
  if (PFLANZEN[typ]) return { name: PFLANZEN[typ].name, bild: () => PFLANZEN[typ].zeichne(4, false, 'boden') };
  if (RARITAETEN[typ]) return { name: RARITAETEN[typ].name, bild: () => RARITAETEN[typ].zeichne(4, false, 'boden', { tageszeit: 'tag' }) };
  return { name: typ, bild: () => '' };
}

// Silhouette: alle Farben auf Braun, Deckkraft weg (Masken bleiben, damit Blattschlitze stehen)
const SILH = '#6b4a3a';
function silhouette(svg) {
  return svg.split(/(<mask[\s\S]*?<\/mask>)/).map((teil, i) => (i % 2 ? teil : teil
    .replace(/ fill="(?!none)[^"]*"/g, ` fill="${SILH}"`)
    .replace(/ stroke="(?!none)[^"]*"/g, ` stroke="${SILH}"`)
    .replace(/ opacity="[^"]*"/g, ''))).join('');
}

// Gepresstes Blatt als Zierde (feste Farben, nur Deko)
const BLATT_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 64" width="100%" height="100%">' +
  '<path d="M20 2 C35 16 37 42 20 62 C3 42 5 16 20 2 Z" fill="#9fb79a" stroke="#6b4a3a" stroke-width="1.2" opacity="0.75"/>' +
  '<path d="M20 8 L20 56 M20 22 L11 15 M20 22 L29 15 M20 38 L10 30 M20 38 L30 30" fill="none" stroke="#6b4a3a" stroke-width="0.9" opacity="0.55"/>' +
  '</svg>';

function blatt(klasse) {
  return svgBox(BLATT_SVG, 'h20-blatt ' + klasse);
}

// Entdeckte Pflanze als Vorschau-Kachel (Stufe 4)
function bildEntdeckt(typ) {
  return vorschau(quelleVon(typ).bild(), 'h20-vorschau');
}

// Unbekannte Pflanze: braune Silhouette, transparent
function bildUnbekannt(typ) {
  return vorschau(`<g opacity="0.3">${silhouette(quelleVon(typ).bild())}</g>`, 'h20-vorschau h20-silh');
}

// Kachel eines Mitglieds. Entdeckt: antippbar, Sheet. Nicht entdeckt: Silhouette und „?“.
function kachel(m, setName, ctx) {
  if (!m.entdeckt) {
    return el('div', { class: 'h20-kachel h20-zu', role: 'img', 'aria-label': `${setName}: noch nicht entdeckt` },
      el('div', { class: 'h20-rahmen' }, bildUnbekannt(m.typ)),
      el('div', { class: 'h20-name', text: '?' }),
      el('div', { class: 'h20-latein', text: ' ' }));
  }
  const name = quelleVon(m.typ).name;
  return el('button', {
    type: 'button',
    class: 'h20-kachel',
    'aria-label': `${name}, Steckbrief öffnen`,
    onclick: () => steckbriefZeigen(m.typ, ctx)
  },
  el('div', { class: 'h20-rahmen' }, bildEntdeckt(m.typ)),
  el('div', { class: 'h20-name', text: name }),
  el('div', { class: 'h20-latein', text: BOTANIK[m.typ] || '' }));
}

// Ein Set als Karte mit Kopf (Name, Belohnung) und Kachelraster
function setKarte(s, ctx) {
  const entdeckt = s.mitglieder.filter(m => m.entdeckt).length;
  return el('section', { class: 'h20-set' + (s.belohnt ? ' h20-erhalten' : '') },
    el('header', { class: 'h20-set-kopf' },
      blatt('h20-blatt-l'),
      el('div', { class: 'h20-set-mitte' },
        el('h2', { class: 'h20-set-name', text: s.name }),
        el('div', { class: 'h20-set-stand', text: `${entdeckt} von ${s.mitglieder.length} entdeckt` })),
      blatt('h20-blatt-r'),
      el('div', { class: 'h20-beleg' + (s.belohnt ? ' an' : ''), text: s.belohnt ? 'Erhalten ✓' : `+${zahl(s.samen)} Samen` })
    ),
    el('div', { class: 'h20-raster' }, s.mitglieder.map(m => kachel(m, s.name, ctx)))
  );
}

// Bezugsquelle als Text mit Seltenheits-Marke bei Saatgut
function bezugVon(typ) {
  if (SAAT[typ]) {
    const s = SAAT[typ].seltenheit;
    return el('p', { class: 'h20-bezug' },
      'Samentüte, Seltenheit: ',
      el('span', { class: 'h20-tag', style: `background:${SELTENHEIT_FARBE[s]}`, text: SELTENHEIT_NAME[s] }),
      el('span', { text: '. Tüten gibt es ab Level 8 für 50 Samen. Das Saatgut wächst auf einem Beetplatz.' }));
  }
  if (RARITAETEN[typ]) {
    return el('p', { class: 'h20-bezug' }, `Rarität. Freischaltung: ${RARITAETEN[typ].bedingung}. Sie gibt es nicht im Shop.`);
  }
  if (PREISE_PFLANZEN[typ]) {
    const p = PREISE_PFLANZEN[typ];
    return el('p', { class: 'h20-bezug' }, `Shop, ab Level ${p.level} für ${zahl(p.preis)} Samen.`);
  }
  return el('p', { class: 'h20-bezug' }, 'Bezug unbekannt.');
}

// Sheet mit großer Vorschau, beiden Namen, Steckbrief und Bezugsquelle
function steckbriefZeigen(typ, ctx) {
  const name = quelleVon(typ).name;
  const h = herbarium(ctx.daten);
  const set = h.sets.find(s => s.mitglieder.some(m => m.typ === typ));
  const inhalt = el('div', { class: 'h20-steck' },
    el('div', { class: 'h20-steck-rahmen' }, vorschau(quelleVon(typ).bild(), 'h20-steck-vorschau')),
    el('h2', { class: 'h20-steck-name', text: name }),
    el('div', { class: 'h20-steck-latein', text: BOTANIK[typ] || '' }),
    el('p', { class: 'h20-steck-text', text: STECKBRIEF[typ] || '' }),
    el('div', { class: 'h20-steck-label', text: 'Wo du sie bekommst' }),
    bezugVon(typ),
    set ? el('div', { class: 'h20-steck-set klein', text: `Teil des Sets „${set.name}“` }) : null
  );
  ctx.sheet(inhalt);
  einpassen(inhalt);
}

export function zeige(container, ctx) {
  const h = herbarium(ctx.daten);
  const { entdeckt, von } = h.gesamt;
  const anteil = von ? (entdeckt / von) * 100 : 0;
  container.append(
    el('section', { class: 'h20-seite' },
      el('header', { class: 'h20-kopf' },
        el('h1', { class: 'h20-titel', text: `Herbarium 📖 · ${entdeckt} von ${von} entdeckt` }),
        el('div', {
          class: 'h20-fortschritt',
          role: 'progressbar',
          'aria-label': 'Entdeckt',
          'aria-valuemin': '0',
          'aria-valuemax': String(von),
          'aria-valuenow': String(entdeckt)
        }, el('span', { style: `width:${anteil.toFixed(1)}%` })),
        el('p', { class: 'h20-hinweis', text: 'Jede Pflanze, jedes Saatgut und jede Rarität, die du einmal besessen hast, landet hier.' })
      ),
      h.sets.map(s => setKarte(s, ctx))
    )
  );
  einpassen(container);
}
