// Every piece of Dutch text on the bestelbon (routes/orderForm.js), transcribed from the
// dealership's own paper order forms ("BESTELBON GEELY E2 / E5 / STARRAY EM-I BLANCO") —
// the three are word-for-word identical apart from the branch letterhead and the model
// block. This is contract text, so wording is only ever changed here, deliberately, never
// "tidied up" in passing. Deviations from the paper forms, all agreed with the business:
// whitespace the forms had run together was restored, and the brand name was filled into
// the gaps the forms' previous brand had left ("aangeboden door GEELY, kan", "uw
// GEELY-voertuig", "de GEELY-groep", ...), typos were corrected ("13ed strijd",
// "Dilsmuide", "Switzerland", "e/of", "te beschikking gesteld", ...), run-together list
// items were split, and the privacy regulator was updated to the
// Gegevensbeschermingsautoriteit (the Commissie voor de bescherming van de persoonlijke
// levenssfeer it replaced in 2018 was still named). The French version is
// orderFormText.fr.js.
//
// The renderer draws the fill-in blanks ("…………"), the "O"/"□"/"[ ]" tick boxes and
// the signature areas itself, so those are not part of the strings below.

// ---------------------------------------------------------------- pages 1–2 (labels)

export const LABELS = {
  documentTitle: 'Bestelbon',
  kickerPrefix: 'BESTELBON',
  quoteReference: 'Offerte',
  website: 'www.geelyauto.be',
  phonePrefix: 'T',
  emailPrefix: 'M',
  vatPrefix: 'BTW',
  contactPerson: 'Uw contactpersoon',
  sellerAlias: '(Hierna ‘de verkoper’)',
  customer: 'Klantgegevens (Hierna ‘de koper’)',
  customerName: 'NAAM + VOORNAAM',
  customerCompany: 'BEDRIJFSNAAM',
  customerStreet: 'STRAAT + NUMMER',
  customerCity: 'POSTCODE + GEMEENTE',
  customerContact: 'MAIL + TEL.',
  customerVat: 'BTW-NR.',
  model: 'Uw gekozen model',
  options: 'Uw gekozen opties',
  version: 'Versie',
  color: 'Kleur',
  interior: 'Interieur',
  standardInteriorSuffix: '(standaard)',
  deliveryPack: 'Geely Delivery Pack',
  option: (n) => `Optie ${n}`,
  noOption: 'Geen',
  pricesInclVat: 'PRIJZEN HIERBOVEN ZIJN INCL BTW',
  totals: 'TOTALEN',
  totalCar: 'TOTAAL WAGEN incl btw',
  discount: 'KORTING incl btw',
  netTotal: 'NETTO TOTAAL',
  vatAmount: 'Btw-bedrag',
  tradeIn: 'OVERNAME',
  tradeInMake: 'Merk',
  tradeInModel: 'Model',
  tradeInFirstRegistration: '1ste inschrijving',
  tradeInEngine: 'Motor',
  tradeInMileage: 'Km-stand',
  tradeInColor: 'Kleur',
  tradeInVin: 'Chassisnummer',
  tradeInAmountInclVat: 'BEDRAG OVERNAME incl btw',
  tradeInAmountExclVat: 'BEDRAG OVERNAME excl btw',
  tradeInVatAmount: 'BTW-BEDRAG',
  expectedDelivery: 'VERWACHTE LEVERDATUM VAN DE WAGEN:',
  deliveryPlace: 'PLAATS VAN LEVERING:',
  footerInitials: 'Te paraferen door Koper en Verkoper …',
  pageOf: (page, total) => `Pagina ${page} van ${total}`,
  generalConditionsTitle: 'Algemene voorwaarden',
  privacyTitle: 'Privacyverklaring voor Klanten',
  // Model line for a model added later in Beheer that has no entry in MODEL_LINES.
  fullyElectric: '100% elektrisch',
};

// "Uw gekozen model": the first two lines per model, the third per trim. The templates
// show one trim each (E2 "47 kWh - 85 kW - 115 pk" = MAX/ULTRA, E5 "60 kWh" = PRO, Starray
// a pick-list); the other trims' figures are from the same price lists as
// data/technicalSpecs.js, written in the templates' format.
export const MODEL_LINES = {
  'Geely E2': {
    title: 'GEELY E2',
    drivetrain: '100% elektrisch – LFP batterij - RWD',
    trims: { PRO: '35 kWh - 60 kW - 81 pk', MAX: '47 kWh - 85 kW - 115 pk', ULTRA: '47 kWh - 85 kW - 115 pk' },
  },
  'Geely E5': {
    title: 'GEELY E5',
    drivetrain: '100% elektrisch – LFP batterij - FWD',
    trims: { PRO: '60 kWh - 160 kW - 218 pk', 'PRO+': '68 kWh - 160 kW - 218 pk', 'MAX+': '68 kWh - 160 kW - 218 pk' },
  },
  'Starray EM-i': {
    title: 'GEELY STARRAY EM-I',
    drivetrain: 'Plug-In Hybrid – 1.5i 4 Cyl – Automaat – LFP batterij',
    trims: { PRO: '18,4 kWh - 193 kW - 262 pk', 'PRO+': '29,8 kWh - 193 kW - 262 pk', 'MAX+': '29,8 kWh - 193 kW - 262 pk' },
  },
};

// The upholstery every trim gets when no optional one is picked (same names as the
// interior photos in routes/pdf.js) — shown on the "Interieur" line at €0,00.
export const STANDARD_UPHOLSTERY = {
  'Geely E2': 'Bekleding: Horizon Grey TEP-leder',
  'Geely E5': 'Bekleding: Dark Blue TEP-leder',
  'Starray EM-i': 'Bekleding: Sapphire Blue',
};

// ---------------------------------------------------------------- pages 3–6

// Block builders, shared with orderFormText.fr.js. Anything else in a block list
// ({ type: 'financing' }, ...) is drawn by routes/orderForm.js from the matching object
// below (FINANCING, ...).
export const h1 = (text) => ({ type: 'h1', text });
export const h2 = (text) => ({ type: 'h2', text });
export const p = (text) => ({ type: 'p', text });
export const numbered = (items, start = 1) => ({ type: 'numbered', items, start });
export const bullets = (items) => ({ type: 'bullets', items });
export const box = (...paragraphs) => ({ type: 'box', paragraphs });

export const WARRANTY_AND_TERMS = [
  h1('Garantie'),
  h2('Conventionele garantie:'),
  h2('A. BASISGARANTIE'),
  p('De modaliteiten van conventionele Geely garantie worden vermeld in het Garantieboekje, waarvan de Koper erkent kennis te hebben genomen en aanvaard te hebben. Deze conventionele garantie wordt aangeboden door Geely Auto Netherlands BV (gevestigd aan Jachthavenweg 112, 1081KJ Amsterdam).'),
  p('Als een onderdeel van het voertuig moet worden gerepareerd of vervangen ten gevolge van een fabricagefout of materiaaldefect, zal het onderdeel helemaal gratis worden gerepareerd of vervangen door elke dealer. Alle originele onderdelen van het merk die zijn geplaatst tijdens een basisgarantiereparatie worden gedekt gedurende de rest van de basisgarantieperiode van het voertuig. Deze conventionele garantie duurt acht jaar voor nieuwe voertuigen en één jaar voor tweedehandsvoertuigen. Zij neemt een aanvang op de dag van levering.'),
  p('Tijdens de herstelling/vervanging van het goed wordt de garantietermijn geschorst. Nadien loopt de termijn voort tot op het einde van de oorspronkelijke duurtijd.'),
  p('Elk gebrek aan overeenstemming moet aan de Verkoper per aangetekende brief gemeld worden binnen een termijn van twee maanden vanaf het ogenblik waarop de Koper het heeft vastgesteld en dit op straffe van onontvankelijkheid.'),
  p('Anders dan bij de wettelijke garantie, geldt de conventionele garantiedekking bij alle GEELY erkende Herstellers en Dealers in Europa. Het defecte onderdeel zal gratis hersteld worden of vervangen worden door een GEELY Erkende Hersteller binnen de EER en Zwitserland, aan de hand van originele GEELY-onderdelen. In uitzonderingsgevallen kan de Koper gevraagd worden voor de reparatie, die onder de garantie valt, te betalen. Indien dit het geval is, dient de Koper geadviseerd te worden de factuur met een beschrijving van de uitgevoerde prestaties en aangebrachte nieuwe onderdelen te bewaren. Wanneer hij in zijn thuisland terugkeert, kan de lokale dealer een snelle kostenvergoeding regelen. Indien de herstelling of de vervanging van het defecte onderdeel naar het oordeel van de Verkoper onmogelijk of onproportioneel zou zijn, kan de Koper overgaan tot de prijsvermindering of de ontbinding van de verkoopovereenkomst. De ontbinding kan echter niet gevraagd worden wanneer het gebrek slechts van geringe betekenis is.'),
  p('De Europese conventionele garantie geldt niet voor voertuigen die gekocht zijn van een officiële GEELY Dealer in Europa, maar niet in Europa geregistreerd zijn. Dergelijke voertuigen kunnen wel gedekt zijn door een garantie die wordt aangeboden in het land waarin het voertuig uiteindelijk verkocht, geregistreerd of gebruikt wordt.'),
  p('Voor de geldigheid van de garantie moet het voertuig worden onderhouden in overeenstemming met het onderhoudsschema (gespecificeerd in het onderhoudsboekje van het voertuig). Indien het voertuig niet wordt onderhouden door een GEELY erkende Dealer , moet er steeds gebruik worden gemaakt van originele GEELY-onderdelen en vloeistoffen of van onderdelen en vloeistoffen die overeenkomen met de originele GEELY-onderdelen en vloeistoffen van de correcte specificatie.'),
  p('Deze garantie is niet van toepassing op :'),
  numbered([
    'de normale slijtage en de normale waardevermindering van elk onderdeel, de normale onderhoudswerkzaamheden en de stukken en materialen gebruikt voor dit onderhoud (zie de beschrijving gespecificeerd in het GEELY Serviceboekje).',
    'het gebrek dat te wijten is aan een verkeersongeval, een abnormaal, slordig of foutief gebruik of misbruik van het voertuig, overbelasting van het voertuig, wijziging aan het voertuig of aan elk onderdeel ervan wanneer dit afgeraden of niet goedgekeurd is door GEELY of gebruik voor competitiedoeleinden zoals wedstrijden, rally’s, …',
    'het gebrek dat voortvloeit uit de niet-naleving van de voorschriften van de constructeur wat onderhoud betreft (d.w.z. o.a. slordigheid bij het nazicht en dagelijkse controle of bij periodieke onderhoudsbeurten zoals beschreven en gespecificeerd in het GEELY Serviceboekje of de handleiding van de gebruiker, samen met het voertuig afgeleverd) of indien geen gevolg gegeven wordt aan uitnodigingen voor specifieke technische nazichten (terugroepacties).',
    'de schade veroorzaakt ten gevolge van de montage van onderdelen die niet door GEELY goedgekeurd zijn of door het gebruik van onderdelen die de kwaliteit van de originele GEELY-onderdelen niet evenaren.',
    'de banden of koetswerkonderdelen die niet door GEELY zijn vervaardigd, waarmee het voertuig werd uitgerust',
    'de schade als gevolg van externe invloeden (zoals industriële neerslag, hars, uitwerpselen van vogels, overstroming enz.), brand of een natuurramp, of veroorzaakt door slordigheid, een menselijke fout of overmacht.',
    'de schade aan de katalysator van een voertuig, dat uitsluitend op loodvrije benzine rijdt overeenkomstig het Serviceboekje, ten gevolge van het gebruik van gelode benzine.',
    'Reparaties om de staat van de auto te verbeteren (bijvoorbeeld auto’s met een eerdere eigenaar)',
  ]),
  p('De volgende onderdelen worden gedekt tot de eerste geplande onderhoudsbeurt of gedurende 12 maanden vanaf de datum van eerste registratie, al naar gelang wat zich het eerste voordoet:'),
  numbered([
    'aandrijfriemen voor hulpaggregaten',
    'pakkingen verwijderd als onderdeel van een bijbehorende onderhoudsafstelling',
    'olie en vloeistoffen',
    'oliefilterelement, luchtfilterelement, pollenfilter of brandstoffilterelement',
    'batterij van afstandsbediening',
  ]),
  p('De volgende items worden zes maanden (onbeperkte kilometerstand) gedekt vanaf de datum van eerste registratie:'),
  numbered([
    'gloeilampen',
    'ruitenwisserbladen',
  ]),
  p('Indien de Koper deze conventionele garantie wil inroepen, mag hij zich richten tot elke Erkende Hersteller in de EER en in Zwitserland.'),
  h2('B. EXTRA GARANTIE'),
  p('Indien de Koper met de Verkoper een overeenkomst aangaat om, naast de basisgarantie vermeld in punt A, nog een extra garantie te genieten, dan wordt deze garantie geregeld door de bepalingen in het Serviceboekje, dat samen met het voertuig wordt afgegeven. De Koper erkent er kennis van te hebben genomen en aanvaard te hebben.'),
  p('Voor meer informatie over de extra garanties aangeboden door GEELY, kan de Koper het Garantieboekje van GEELY raadplegen.'),
  h2('C. WAARBORG TEGEN CORROSIEPERFORATIE'),
  p('De Verkoper garandeert dat, indien één of ander onderdeel van de carrosserie van het voertuig van binnen naar buiten door roest geperforeerd is, binnen het GEELY Serviceboekje bepaalde termijn na de datum waarop het voertuig aan de eerste eigenaar werd afgeleverd, dan zal dat onderdeel door de officiële GEELY verdeler volledig kosteloos worden hersteld of vervangen.'),
  p('De bepalingen, beperkingen en verplichtingen betreffende deze waarborg staan vermeld in het GEELY Serviceboekje. De Koper heeft er kennis van genomen en heeft ze aanvaard.'),
  h1('Wettelijke garantie :'),
  p('De conventionele garantie doet geen afbreuk aan de eventuele rechten van de Koper m.b.t. de wettelijke garantie voor gebrek aan overeenstemming (bij consumentenkoop). Desalniettemin is de garantie op tweedehandsvoertuigen beperkt tot één jaar en dient de Koper elk “gebrek aan overeenstemming” aan de Verkoper te melden per aangetekende brief binnen een termijn van twee maanden vanaf het ogenblik waarop de Koper het heeft vastgesteld.'),
  p('De conventionele garantie doet geen afbreuk aan de eventuele rechten van de Koper m.b.t. de garantie voor “verborgen gebreken”, na afloop van de wettelijke garantie voor “gebrek aan overeenstemming”. Desalniettemin dient de Koper elk verborgen gebrek aan de Verkoper te melden per aangetekende brief binnen een termijn van twee maand vanaf het ogenblik waarop hij het heeft vastgesteld of normalerwijze had moeten vaststellen.'),
  p('Na afloop van die termijnen worden klachten sowieso niet meer aanvaard.'),
  p('De wettelijke garantie blijft steeds behouden indien de Koper het voertuig volgens de instructies van de Verkoper laat onderhouden of herstellen buiten het netwerk van de door de Verkoper erkende herstellers.'),
  h1('Financiering – Lead Verzekering:'),
  { type: 'financing' },
  h1('Gebruik van het verkochte voertuig:'),
  { type: 'usage' },
  p('Indien de Koper een specifiek statuut geniet (vb. fleetklant, personeelslid), dan is deze bestelbon onderworpen aan de voorlegging van de door GEELY vereiste documenten (vb. goedkeuringsnummer; certificaat).'),
  box(
    'Bij “buiten verkoopruimten gesloten overeenkomst” zoals op salons, beurzen en tentoonstellingen, heeft de koper overeenkomstig artikel VI. 67 § 1 van het Wetboek Economisch Recht, het recht om binnen een termijn van 14 dagen van zijn aankoop af te zien, zonder motivatie en zonder andere kosten te moeten dragen dan diewelke in artikel VI. 70, § 1, tweede lid, en artikel VI. 71 zijn vastgesteld. Hiervoor kan gebruik gemaakt worden van het door de verkoper ter beschikking gestelde herroepingsformulier.',
    'Bij “overeenkomsten op afstand gesloten”, heeft de koper overeenkomstig artikel VI.47 en VI.58 van het Wetboek Economisch Recht, het recht om van zijn aankoop af te zien binnen een termijn van 14 dagen na aankoop, zonder andere kosten te moeten dragen dan die welke in artikel VI. 50, § 2, en artikel VI. 51 zijn vermeld.',
  ),
  p('Bij inschrijving van een voertuig is een eenmalige belasting op inverkeerstelling (BIV) en jaarlijkse verkeersbelasting verschuldigd door de Koper op basis van de kenmerken van het voertuig. De Koper kan voor meer informatie daaromtrent terecht bij de Verkoper.'),
  p('De koper erkent op de hoogte te zijn van de eventuele specifieke beperkingen en/of verbod opgelegd door de fabrikant en/of de wet m.b.t. de plaatsing van accessoires en /of trekhaken.'),
  p('Verkoper wijst op het risico dat bepaalde premies, ondersteuningen, kortingen, … die door de overheid worden toegekend voor deze aankoop, mogelijks niet meer gelden op moment van levering, betaling en/of inschrijving van het voertuig. Verkoper wijst elke aansprakelijkheid hieromtrent af.'),
  p('Wat betreft het brandstofverbruik en de CO2 uitstoot wijst de Verkoper erop dat de uiteindelijke cijfers licht kunnen afwijken van de gepubliceerde cijfers, en dit in het kader van de overgang naar de nieuwe test procedure (WLTP) voor de homologatie van onze nieuwe modellen. Verkoper wijst elke aansprakelijkheid hieromtrent af.'),
  box('Voor het overige wordt de verkoop gesloten volgens de voorwaarden vermeld in bijlage, die de Koper verklaart gelezen en aanvaard te hebben en waarvan hij erkent een exemplaar te hebben ontvangen.'),
  { type: 'annexes' },
  { type: 'signatures' },
];

export const FINANCING = {
  left: [
    'De Koper heeft een financieringsvoorstel gevraagd: ja – neen',
    'Door bemiddeling van de Verkoper: ja – neen.',
  ],
  right: [
    'De Koper heeft een lead verzekering gevraagd: ja – neen',
    'Door bemiddeling van de Verkoper: ja – neen',
  ],
  remark: 'Opmerking:',
};

// "O voor privé gebruik; O voor beroepsgebruik." — the O's are tick circles.
export const USAGE = {
  intro: 'De Koper verklaart dat hij het voertuig aanschaft en zal gebruiken:',
  choices: ['voor privé gebruik;', 'voor beroepsgebruik.'],
  outro: 'Indien deze rubriek niet is ingevuld wordt het voertuig geacht te zijn gekocht voor beroepsdoeleinden voor zover de Koper een rechtspersoon is of over een BTW nummer beschikt.',
};

export const ANNEXES = {
  intro: 'Deze bestelbon bevat de volgende bijlagen:',
  items: ['Algemene Voorwaarden', 'Privacyverklaring voor Klanten'],
  other: 'Eventuele andere documenten die worden overhandigd bij levering van het voertuig: gelijkvormigheidsattest, registratiedocument, onderhouds- en garantieboekje, gebruikshandleiding.',
  // "Aldus opgemaakt te ……… op ……… in 2 exemplaren."
  madeUpAt: ['Aldus opgemaakt te', 'op', 'in 2 exemplaren.'],
};

export const SIGNATURES = {
  seller: 'De Verkoper',
  buyer: 'De Koper',
  buyerNote: 'De handtekening van de Koper dient voorafgegaan te worden door de met de hand voluit geschreven vermelding “Gelezen en goedgekeurd”.',
};

// ---------------------------------------------------------------- pages 7–10

export const GENERAL_CONDITIONS = [
  p('Behoudens schriftelijk anders tussen partijen overeengekomen, zijn deze Algemene Voorwaarden integraal van toepassing.'),
  h2('1. Leveringsdatum'),
  p('De leveringsdatum aangeduid op de bestelbon is (behoudens overmacht) van strikte toepassing.'),
  p('Kan de Verkoper deze leveringsdatum niet naleven, geldt het volgende: Wanneer de leveringsdatum voor de Koper essentieel is en als dusdanig is opgenomen in de verkoopovereenkomst in de rubriek “Specifieke essentiële kenmerken voor de koper”, heeft de Koper het recht om de verkoopovereenkomst onverwijld te beëindigen. In alle andere gevallen, heeft de Koper het recht om een nieuwe leveringstermijn voor te stellen (aangepast aan de omstandigheden) en, indien het voertuig bij het verstrijken van deze nieuwe termijn niet is geleverd, de verkoopovereenkomst onverwijld te beëindigen.'),
  p('Ingeval van zulke beëindiging van de verkoopovereenkomst door de Koper, wordt het voorschot (en alle eventueel andere bedragen die reeds betaald werden door de Koper) onverwijld terugbetaald.'),
  p('Kan de Koper het voertuig op de overeengekomen leveringsdatum niet in ontvangst nemen, dan heeft de Verkoper het recht om, na verloop van tien kalenderdagen vanaf het verzenden van een ingebrekestelling per aangetekende brief, behalve indien de Koper bewijst dat het niet in bezit nemen van het voertuig het gevolg is van overmacht:'),
  p('garagekosten aan te rekenen,'),
  p('de verkoop te verbreken en een vergoeding te eisen die overeenstemt met de opgelopen schade, met een maximum van 15 % van de totale prijs (BTW exclusief).'),
  h2('2. Prijs'),
  p('De overeengekomen verkoopprijs is op geen enkele wijze herzienbaar.'),
  p('De prijs van de wettelijk verplichte, op bestendige wijze aangebrachte toebehoren wordt in de aangekondigde prijs inbegrepen geacht.'),
  h2('3. Levering'),
  p('De levering van het voertuig heeft plaats op de zetel van de Verkoper, tenzij schriftelijk anders overeengekomen is.'),
  p('De Koper draagt alle risico’s m.b.t. het voertuig van zodra hij of een door hem aangewezen persoon, die niet de vervoerder is, het voertuig fysiek in bezit neemt.'),
  p('3.3 Wanneer het voertuig wordt verzonden aan de Koper, wordt het risico op verlies of beschadiging van het voertuig overgedragen aan de Koper op het ogenblik van zijn levering aan de vervoerder die door de Koper belast is met het vervoer en voor zover de keuze voor deze vervoerder niet door Verkoper werd geboden.'),
  p('Indien de productie van het bestelde voertuig zou worden stopgezet, is de verkoop van rechtswege ontbonden.'),
  h2('4. Betaling'),
  p('Onverminderd de toepassing van Boek VII van het Wetboek Economisch Recht (WER): Betalings- en kredietdiensten, titel 4 kredietovereenkomsten, hoofdstuk 1 consumentenkrediet, kan de Verkoper geen betaling vragen van een voorschot dat meer dan 15% van de verkoopprijs van het voertuig bedraagt. Bij wijze van afwijking, kan ofwel voor een speciale bestelling ofwel mits akkoord van de Koper, het voorschot vastgesteld worden op een ander percentage.'),
  p('De integrale betaling, of het saldo bij de betaling van een voorschot, gebeurt op het ogenblik van de levering, behalve indien uitdrukkelijk iets anders is voorzien. Onafhankelijk van de totaalfactuur is een betaling in contanten slechts toegelaten voor maximaal 3.000 EUR. Indien het te betalen bedrag de 3.000 EUR overstijgt, zal de betaling echter uitsluitend gebeuren via overschrijving of kredietkaart. Gebeurt dit niet of niet tijdig, dan is op de verschuldigde som van rechtswege en zonder ingebrekestelling een intrest aan het wettelijk tarief verschuldigd.'),
  p('Onverminderd artikel 3.2. zal de eigendom op het voertuig pas overgaan op de Koper, op het moment dat de Verkoper de volledige koopprijs en alle eventuele bijkomende kosten ontvangen heeft. De Koper zal er zich van onthouden, tot op het ogenblik van de volledige betaling van de goederen, om het goed te verkopen, te verhuren, uit te voeren, het in pand (of in het bijzonder het pand voor handelsfonds) te geven, of er om het even welke manier over te beschikken en zal er geen enkele wijziging in aanbrengen, die er de waarde van zou kunnen doen verminderen.'),
  p('De Koper verbindt zich ertoe het goed in perfecte staat te onderhouden. Bij vervreemding van een niet volledig betaald voertuig door de Koper, draagt deze laatste automatisch en onvoorwaardelijk zijn rechtsvordering op zijn schuldenaar over aan de Verkoper.'),
  p('Bovendien kan de Verkoper, indien de betaling niet gebeurt binnen de tien kalenderdagen vanaf de verzending van een aangetekende brief, de verkoop ontbinden per aangetekende brief gericht aan de Koper. In dit geval is de Koper, onverminderd de bovenvermelde intresten, aan de Verkoper een vergoeding verschuldigd die overeenstemt met de opgelopen schade, met een maximum van 15% van de totale prijs van het voertuig (BTW exclusief).'),
  p('De overhandiging van een cheque of elke andere titel die een betalingsverplichting inhoudt, vormt geen bevrijdende betaling. Er is pas sprake van uitvoering van de betaling na het effectief ontvangen van de volledig gefactureerde prijs.'),
  p('De uitgifte van een ongedekte cheque, het protest van een handelspapier of om het even welk ander probleem dat de Verkoper verhindert de betaling te ontvangen van de titel die hem ter betaling wordt overhandigd, zal door hem beschouwd worden als een zware fout, die hem toelaat de verbreking van het contract, de onmiddellijke teruggave van het voertuig en een schadevergoeding te vragen.'),
  h2('5. Overeenstemming van de levering met de Overeenkomst'),
  p('De koper erkent ingelicht te zijn over en aanvaardt het evolutieproces inzake techniek, technologie, productie en esthetiek in de automobielsector, in die zin dat details van het besteld model kunnen afwijken. Deze mogen evenwel geen afbreuk doen aan de specifieke en essentiële kenmerken en het specifieke beoogd gebruik, zoals vermeld op de voorzijde van de bestelbon.'),
  p('De zichtbare gebreken aan het lakwerk, het koetswerk en de binneninrichting moeten door de Koper zonder verwijl aan de Verkoper per aangetekende brief gemeld worden. De overige zichtbare gebreken en de gebreken in de conformiteit dienen aan de Verkoper per aangetekende brief gemeld te worden, ten laatste binnen een termijn van 10 kalenderdagen vanaf de levering.'),
  h2('6. Overeenstemming van het Voertuig'),
  h2('De conventionele garantie'),
  h2('Basis Garantie'),
  p('De modaliteiten van conventionele GEELY garantie worden vermeld in het Garantieboekje, waarvan de koper erkent kennis te hebben genomen en aanvaard te hebben. Zij duurt acht jaar voor nieuwe voertuigen en één jaar voor tweedehandsvoertuigen. Zij neemt een aanvang op de dag van levering.'),
  p('Elk gebrek aan overeenstemming moet aan de Verkoper per aangetekende brief gemeld worden binnen een termijn van twee maanden vanaf het ogenblik waarop de Koper het heeft vastgesteld en dit op straffe van onontvankelijkheid.'),
  p('Het defecte onderdeel zal gratis hersteld worden of vervangen worden door een Erkende Hersteller binnen de EER en Zwitserland, aan de hand van originele GEELY -onderdelen. Indien dat naar het oordeel van de Verkoper onmogelijk of onproportioneel zou zijn, kan de Koper overgaan tot de prijsvermindering of de ontbinding van de koopovereenkomst. De ontbinding kan echter niet gevraagd worden wanneer het gebrek slechts van geringe betekenis is.'),
  p('Tijdens de herstelling/vervanging van het goed wordt de garantietermijn geschorst. Nadien loopt de termijn voort tot op het einde van de oorspronkelijke duurtijd.'),
  p('Deze garantie is niet van toepassing op :'),
  p('de normale slijtage en de normale waardevermindering van elk onderdeel, de normale onderhoudswerkzaamheden en de stukken en materialen gebruikt voor dit onderhoud (zie de beschrijving gespecificeerd in het GEELY Serviceboekje)'),
  p('het gebrek dat te wijten is aan een verkeersongeval, een abnormaal, slordig of foutief gebruik of misbruik van het voertuig, overbelasting van het voertuig, wijziging aan het voertuig of aan elk onderdeel ervan wanneer dit afgeraden of niet goedgekeurd is door GEELY of gebruik voor competitiedoeleinden zoals wedstrijden, rally’s, …'),
  p('het gebrek dat voortvloeit uit de niet-naleving van de voorschriften van de constructeur wat onderhoud betreft (d.w.z. o.a. slordigheid bij het nazicht en dagelijkse controle of bij periodieke onderhoudsbeurten zoals beschreven en gespecificeerd in het GEELY Serviceboekje of de handleiding van de gebruiker, samen met het voertuig afgeleverd) of indien geen gevolg gegeven wordt aan uitnodigingen voor specifieke technische nazichten (terugroepacties).'),
  p('de schade veroorzaakt ten gevolge van de montage van onderdelen die niet door GEELY goedgekeurd zijn of door het gebruik van onderdelen die de kwaliteit van de originele GEELYonderdelen niet evenaren.'),
  p('de banden of koetswerkonderdelen die niet door GEELY zijn vervaardigd, waarmee het voertuig werd uitgerust'),
  p('de schade als gevolg van externe invloeden (zoals industriële neerslag, hars, uitwerpselen van vogels, enz.), brand of een natuurramp, of veroorzaakt door slordigheid, een menselijke fout of overmacht.'),
  p('de schade aan de katalysator van een voertuig, dat uitsluitend op loodvrije benzine rijdt overeenkomstig het GEELY Serviceboekje, ten gevolge van het gebruik van gelode benzine.'),
  h2('Extra Garantie'),
  p('Indien de Koper met de Verkoper een overeenkomst aangaat om, naast de basisgarantie vermeld in punt A, nog een extra garantie te genieten, dan wordt deze garantie geregeld door de bepalingen in het GEELY Serviceboekje, dat samen met het voertuig wordt afgegeven. De Koper erkent er kennis van te hebben genomen en aanvaard te hebben.'),
  h2('Waarborg tegen corrosieperforatie'),
  p('De Verkoper garandeert dat, indien één of ander onderdeel van de carrosserie van het voertuig van binnen naar buiten door roest geperforeerd is, binnen het GEELY Serviceboekje bepaalde termijn na de datum waarop het voertuig aan de eerste eigenaar werd afgeleverd, dan zal dat onderdeel door de officiële GEELY verdeler volledig kosteloos worden hersteld of vervangen.'),
  p('De bepalingen, beperkingen en verplichtingen betreffende deze waarborg staan vermeld in het GEELY Serviceboekje. De Koper heeft er kennis van genomen en heeft ze aanvaard.'),
  h2('Wettelijke garantie'),
  p('De conventionele garantie doet geen afbreuk aan de eventuele rechten van de Koper m.b.t. de wettelijke garantie voor gebrek aan overeenstemming (bij consumentenkoop). Desalniettemin is de garantie op tweedehandsvoertuigen beperkt tot één jaar en dient de Koper elk “gebrek aan overeenstemming” aan de Verkoper te melden per aangetekende brief binnen een termijn van twee maanden vanaf het ogenblik waarop de Koper het heeft vastgesteld.'),
  p('De conventionele garantie doet geen afbreuk aan de eventuele rechten van de Koper m.b.t. de garantie voor “verborgen gebreken”, na afloop van de wettelijke garantie voor “gebrek aan overeenstemming”. Desalniettemin dient de Koper elk verborgen gebrek aan de Verkoper te melden per aangetekende brief binnen een termijn van twee maand vanaf het ogenblik waarop hij het heeft vastgesteld of normalerwijze had moeten vaststellen.'),
  p('Na afloop van die termijnen zullen zulke klachten sowieso niet meer aanvaard kunnen worden.'),
  p('De wettelijke garantie blijft steeds behouden indien de Koper het voertuig volgens de instructies van de Verkoper laat onderhouden of herstellen buiten het netwerk van de door de Verkoper erkende herstellers.'),
  h2('7. Financiering en mogelijkheid om van de overeenkomst af te zien'),
  p('In voorkomend geval gebeurt de financiering overeenkomstig Boek VII WER: Betalings- en kredietdiensten, titel 4 kredietovereenkomsten, hoofdstuk 1 consumentenkrediet, en inzonderheid artikel VII 83 WER. m.b.t. de mogelijkheid om van de overeenkomst af te zien.'),
  p('In geval van financiering door bemiddeling van de Verkoper zal er melding van gemaakt worden op de voorzijde van de bestelbon.'),
  p('Indien de koop wordt gesloten onder opschortende voorwaarde van de toekenning van een financiering zonder tussenkomst van de Verkoper bij deze financiering en indien de financiering wordt geweigerd door de kredietinstelling, zal de Koper onverwijld de Verkoper hiervan in kennis stellen. Daarenboven moet het schriftelijk bewijs van deze financieringsweigering onmiddellijk per brief aan de Verkoper worden overgemaakt (en in ieder geval binnen de maand na ondertekening van de bestelbon). Het eventuele betaalde voorschot zal dan na tijdige ontvangst van het schriftelijk bewijs onmiddellijk aan de Koper worden terugbetaald. Indien de Koper deze bepaling niet naleeft zal hij aan de Verkoper een schadevergoeding verschuldigd zijn die evenwel beperkt is tot 15% van de totale prijs van het voertuig (BTW exclusief).'),
  p('Indien de koop wordt gesloten onder de opschortende voorwaarde van de toekenning van een financiering, dan is de opgegeven leveringsdatum louter indicatief. Na de kennisgeving van het verkrijgen van de financiering, dienen partijen tot een definitief akkoord te komen omtrent de leveringsdatum.'),
  p('Bij “buiten verkoopruimten gesloten overeenkomst” zoals op salons, beurzen en tentoonstellingen, heeft de Koper overeenkomstig artikel VI. 67 § 1 van het Wetboek Economisch Recht, het recht om binnen een termijn van 14 dagen na levering van het voertuig van zijn aankoop af te zien, zonder motivatie en zonder andere kosten te moeten dragen dan die welke in artikel VI. 70, § 1, tweede lid, en artikel VI. 71 zijn vastgesteld. Hiervoor kan gebruik gemaakt worden van het ter beschikking gestelde herroepingsformulier.'),
  p('Bij “overeenkomsten op afstand gesloten”, heeft de Koper overeenkomstig artikel VI.47 en VI.58, het recht om van zijn aankoop af te zien binnen een termijn van 14 dagen na levering van het voertuig, zonder andere kosten te moeten dragen dan die welke in artikel VI. 50, § 2, en artikel VI. 51 zijn vermeld.'),
  h2('8. Overname van een tweedehandsvoertuig'),
  p('Indien de bestelbon de overname van een tweedehandsvoertuig vermeldt, is deze overname afhankelijk van de levering en betaling van een nieuw voertuig en van het bewijs dat de Koper eigenaar is van het over te nemen voertuig en dat alle verbintenissen m.b.t. een eventuele financiering werden uitgevoerd.'),
  p('De overnamewaarde van een tweedehandsvoertuig, overeengekomen bij de bestelling van het nieuwe voertuig, is definitief voor zover de staat van het tweedehandsvoertuig op het ogenblik van zijn levering door de Koper, met uitzondering van kleine voor de Verkoper niet essentiële details, volledig overeenstemt met de beschrijving ervan op de bestelbon. De waardevermindering van het over te nemen voertuig als gevolg van een vertraging in levering van het voertuig dat aan de Koper verkocht is, is voor rekening van de Verkoper.'),
  h2('9. Documenten van de constructeur'),
  p('Elk document uitgaande van de constructeur dat de technische eigenschappen van het bestelde voertuig vermeldt, de stempel of de handtekening van de Verkoper draagt en bijgevoegd is aan de bestelbon, wordt verondersteld deel uit te maken van de bestelbon waaraan het gehecht is.'),
  h2('10. Overmacht'),
  p('Geen enkele vergoeding of schadevergoeding is verschuldigd wanneer de annulatie of verbreking te wijten is aan overmacht. De partij die een geval van overmacht inroept, brengt de andere hiervan binnen de acht dagen van zijn kennisneming van het voorval per aangetekende brief op de hoogte.'),
  h2('11. Bewijs'),
  p('In de voorafgaande bepalingen geldt de “aangetekende” vorm van het geschrift enkel ten titel van bewijs.'),
  h2('12. Bevoegde rechtbank'),
  p('Ingeval van geschil zijn volgende rechtbanken, naar keuze van de eiser, bevoegd om kennis te nemen van de vordering:'),
  numbered([
    'de rechter van de woonplaats van de verweerder of van één van de verweerders;',
    'de rechter van de plaats waar de verbintenissen, waarover het geschil loopt of één ervan, zijn ontstaan of waar zij worden, zijn of moeten worden uitgevoerd;',
    'de rechter van de plaats waar de gerechtsdeurwaarder heeft gesproken tot de verweerder in persoon, indien noch de verweerder noch, in voorkomend geval, een van de verweerders een woonplaats heeft in België of in het buitenland.',
  ]),
  p('De Belgische rechtbanken zijn exclusief bevoegd. Indien de Koper echter in een ander Europese lidstaat gevestigd is dan de Verkoper, dan geldt Verordening (EU) 1215/2012 van 12 december 2012 van het Europees Parlement en de Raad betreffende de rechterlijke bevoegdheid, de erkenning en de tenuitvoerlegging van beslissingen in burgerlijke en handelszaken.'),
  p('Dit contract is onderworpen aan Belgisch recht, met uitsluiting van de bepalingen van het Verdrag van Wenen van 11 april 1980.'),
  h2('13. Hoedanigheid van de Koper'),
  p('Deze algemene verkoopsvoorwaarden zijn integraal van toepassing wanneer de Koper een consument is in de zin van Boek I van het WER of van het artikel 1649 bis § 2,1° van het Burgerlijk Wetboek, d.w.z. wanneer hij het voertuig dat het voorwerp van deze overeenkomst uitmaakt, aanschaft of gebruikt voor niet beroepsmatige doeleinden.'),
  p('Wanneer de Koper geen consument is in de zin van artikel 13.1. hierboven, zijn onderhavige algemene verkoopsvoorwaarden eveneens van toepassing maar dan met uitzondering van de artikelen 1.1., 2.1., 2.2., 2.3., 4.1., 6.2, 7.1., 7.2., 7.3 en 12. In dat geval:'),
  p('is de opgegeven leveringsdatum altijd louter indicatief en zonder vaste verbintenis vanwege de Verkoper; Indien de Koper het voertuig op de leveringsdatum niet in ontvangst neemt, dan heeft de Verkoper het recht om, na verloop van tien kalenderdagen vanaf het verzenden van een ingebrekestelling per aangetekende brief, garagekosten aan te rekenen en de verkoop te verbreken en een vergoeding te eisen die overeenstemt met de opgelopen schade met een minimum van 10% van de koopprijs.'),
  p('kan de Verkoper de verkoop ontbinden per aangetekende brief gericht aan de koper, indien de betaling niet gebeurt binnen de tien kalenderdagen vanaf de verzending van een aangetekende brief. In dit geval is de Koper, onverminderd de bovenvermelde intresten, aan de Verkoper een vergoeding verschuldigd die overeenstemt met de opgelopen schade, met een minimum van 10% van de totale prijs van het voertuig;'),
  p('zijn de op de voorzijde van dit document vermelde prijzen vatbaar voor verhoging indien de door de importeur of fabrikant aanbevolen catalogusprijs verhoogt;'),
  p('is op de verschuldigde som van rechtswege en zonder ingebrekestelling een intrest van 10% verschuldigd indien de betaling niet of niet tijdig gebeurt;'),
  p('zijn de rechtbanken van de woonplaats of de maatschappelijke zetel van de Verkoper uitsluitend bevoegd.'),
  p('Dient de Koper de zichtbare gebreken aan het lakwerk, koetswerk en de binneninrichting zonder verwijl te melden aan de Verkoper per aangetekende brief of door elk ander wettelijk bewijsmiddel. De overige zichtbare gebreken en de gebreken in de conformiteit dienen door de Koper aan de Verkoper per aangetekende brief gemeld te worden ten laatste binnen een termijn van tien kalenderdagen vanaf de levering en dit op straffe van onontvankelijkheid.'),
  p('Is de Koper gehouden ieder verborgen gebrek, aan de Verkoper te melden per aangetekende brief binnen een termijn van één maand vanaf het ogenblik waarop hij het heeft vastgesteld of normalerwijze had moeten vaststellen en dit op straffe van onontvankelijkheid.'),
  h2('14. Overdraagbaarheid.'),
  p('De rechten van de Koper zijn niet overdraagbaar, behalve mits voorafgaand geschreven akkoord van de Verkoper.'),
  h2('15. Aansprakelijkheid'),
  p('Behoudens andersluidende wettelijke bepalingen wijst de Verkoper elke indirecte of gevolgschade af met betrekking tot schade in het kader van deze overeenkomst.'),
  p('De Koper zal verantwoordelijk zijn voor iedere schade die voortvloeit uit het foutief gebruik van het Voertuig en zal de Verkoper vrijwaren voor iedere vordering die door derden zou worden ingesteld.'),
  p('De Verkoper kan zich niet bevrijden van haar aansprakelijkheid voor verborgen gebreken van het voertuig.'),
  h2('16. Vragen en/of klachten'),
  p('In geval van vragen en/of klachten i.v.m. de verkoopovereenkomst, kan de Koper/Klant contact opnemen met de Verkoper via onderstaande contactgegevens:'),
  { type: 'complaintContacts' },
  { type: 'readAndApproved' },
];

// Article 16's contact lines — filled in with the branch's details where known.
export const COMPLAINT_CONTACTS = { phone: 'Telefonisch:', email: 'Per email:', post: 'Per post:' };

// The signed box closing the Algemene voorwaarden: "Gelezen en goedgekeurd door de
// Koper Op ……… (datum) / Handtekening van de Koper: ………".
export const READ_AND_APPROVED = {
  line: 'Gelezen en goedgekeurd door de Koper Op',
  date: '(datum)',
  signature: 'Handtekening van de Koper:',
};

// ---------------------------------------------------------------- pages 11–15

// Placeholder the template leaves for the dealer's own details; replaced by the branch's
// name, address and e-mail when those are known (left as-is otherwise).
export const DEALER_PLACEHOLDER = '[naam, adres en email dealer invullen]';

export const PRIVACY_STATEMENT = [
  p('Wanneer u een product koopt of een dienst ontvangt van:'),
  p('De GEELY Concessiehouder; en/of'),
  p('Geely Auto Netherlands BV (gevestigd aan Jachthavenweg 112, 1081KJ Amsterdam) zal er bepaalde informatie over u en uw voertuig (‘persoonsgegevens’) verzameld worden door ons.'),
  p('Deze verklaring legt uit, hoe uw persoonsgegevens gebruikt zullen worden en met wie ze gedeeld zullen worden.'),
  p('Voor sommige producten en diensten van GEELY (waaronder bepaalde GEELY-apps) gelden (naast deze verklaring) ook nog aparte privacy verklaringen, die meer in detail beschrijven hoe uw persoonsgegevens in een specifieke context gebruikt worden. Voor meer informatie over welke gegevens uw voertuig zelf verzamelt en gebruikt, verwijzen we u ten slotte graag naar de gebruiksaanwijzing of de bijbehorende app (waar van toepassing).'),
  h2('Met wie uw persoonsgegevens gedeeld zullen worden'),
  p('Uw persoonsgegevens kunnen onthuld worden aan:'),
  bullets([
    'ondernemingen of andere organisaties die we gecontracteerd hebben om namens ons diensten te verstrekken, zoals webhostingbedrijven, mailing vendors, analytics providers, event hostingdiensten en IT-leveranciers;',
    'ondernemingen of andere organisaties met wie we uw persoonsgegevens op uw verzoek of met uw toestemming kunnen delen;',
    'GEELY concessiehouders en onze partners, wanneer dat nodig is om u een product of dienst te leveren;',
    'professionele adviseurs;',
    'ordediensten, rechtbanken, toezichthouders, overheidsinstanties of andere derden, wanneer we van mening zijn dat dit nodig is om aan een wettelijke of reglementaire verplichting te voldoen of om onze rechten, de rechten van derden of de persoonlijke veiligheid van individuen te beschermen of om fraude, beveiligings – en veiligheidsproblemen te detecteren, te voorkomen of aan te pakken; of',
    'derden die al onze activa en bedrijfsactiviteiten of een wezenlijk deel ervan overnemen of aan wie we deze overdragen. Mocht het tot een dergelijke verkoop of overdracht komen, dan zullen we ons redelijke inspanningen doen om te proberen ervoor te zorgen dat de entiteit aan wie uw persoonsgegevens overgedragen worden, deze gebruiken op een manier die strookt met voorliggende verklaring.',
  ]),
  p('GEELY Oostende/Brugge/Diksmuide/Roeselare kan uw persoonsgegevens daarnaast ook nog delen met GEELY FINANCE, of andere ondernemingen van Geely Auto Netherlands BV (gevestigd aan Jachthavenweg 112, 1081KJ Amsterdam) in de wereld. Wanneer we uw persoonsgegevens delen, zullen we ervoor zorgen dat deze gebruikt worden voor doeleinden die verenigbaar zijn met die welke in deze kennisgeving beschreven worden.'),
  h2('Internationale overdracht van uw persoonsgegevens'),
  p('Uw persoonsgegevens zullen behandeld worden in overeenstemming met de toepasselijke gegevensbeschermingswet en kunnen zowel binnen de Europese Economische Ruimte (‘EER’) als naar landen buiten de EER (met inbegrip van de Verenigde Staten) overgedragen worden. Het kan zijn dat de landen waarnaar we uw persoonsgegevens overdragen worden, niet door de Europese Commissie beschouwd worden als landen die geen “gepaste mate van bescherming voor uw persoonsgegevens” bieden. Als gevolg hiervan zullen we, wanneer we uw persoonsgegevens buiten de EER overdragen, gepaste voorzorgsmaatregelen treffen in overeenstemming met onze wettelijke verplichtingen om ervoor te zorgen dat uw persoonsgegevens naar behoren beschermd zijn, ongeacht het land waarnaar ze overgedragen worden. Deze voorzorgsmaatregelen kunnen het verkrijgen van contractuele zekerheden van een derde omvatten, aan wie toegang wordt verleend tot uw persoonsgegevens, voor het feit dat uw persoonsgegevens beschermd zullen worden door normen die gelijkwaardig zullen zijn aan die welke uw persoonsgegevens beschermen, wanneer deze zich binnen de EER bevinden. Als u graag meer wilt vernemen over de manier waarop wij uw persoonsgegevens beschermen, wanneer deze overgedragen worden buiten de EER, of als u een kopie wenst te ontvangen van de voorzorgsmaatregelen die we implementeren om uw persoonsgegevens te beschermen, wanneer deze overgedragen worden, gelieve dan contact op te nemen met: Geely Auto Netherlands BV (gevestigd aan Jachthavenweg 112, 1081KJ Amsterdam) https://www.geelyauto.be/policy'),
  h2('Welke persoonsgegevens er gebruikt zullen worden'),
  p('Wij verzamelen uw persoonsgegevens:'),
  bullets([
    'wanneer u formulieren invult of afspraken maakt (bv. Als u een afspraak voor de verstrekking van een bepaalde dienst maakt of om een testrit vraagt);',
    'wanneer u diensten ontvangt of producten koopt bij geely concessiehouder; en',
    'wanneer u contact met ons opneemt (wanneer u ons bv. Schrijft of wanneer u bv. Contact opneemt met onze customerservicecentra, zullen we de door u verstrekte informatie bijhouden);',
  ]),
  p('Wanneer u uw voertuig binnenbrengt voor een onderhoud of herstelling, zullen wij diagnostische informatie over uw voertuig verzamelen en registreren, welke tussenkomsten er precies verricht werden en welke stukken er geleverd werden. Aan het einde van deze verklaring gaan we hier in een apart gedeelte dieper op in.'),
  p('De persoonsgegevens die wij verzamelen, omvatten:'),
  bullets([
    'uw naam en contactgegevens (zoals uw adres, telefoonnummer(s) en e-mailadres) en informatie over uw bedrijf of werkgever, als u beroepsmatig vragen stelt;',
    'informatie over uw voertuig (met inbegrip van uw chassisnummer, voertuigregistratienummer, model, leeftijd en kilometerstand);',
    'de producten en diensten waarin u geïnteresseerd bent of die u gekocht hebt;',
    'uw contact- en marketingvoorkeuren; en',
    'voor financiële doeleinden benodigde informatie, zoals betalingsinformatie.',
  ]),
  p('Daarnaast en waar toegestaan bij wet, kunnen we de informatie in ons bezit ook combineren met informatie over u en uw interesses, socio-economische en socio-demografische status, online identificatiegegevens en actuele contactinformatie die door derden verzameld worden, zoals marketingbureaus, alsook van openbare bronnen.'),
  p('Wij kunnen ook bij wet verplicht zijn om bepaalde persoonsgegevens te verzamelen. Wij kunnen ons eveneens genoodzaakt zien om uw persoonsgegevens te verzamelen als gevolg van een contractuele relatie met u. Het niet verstrekken van deze informatie kan de naleving van deze verplichtingen beletten of vertragen.'),
  h2('Hoe uw persoonsgegevens gebruikt zullen worden'),
  p('Wij gebruiken de persoonsgegevens die we verzamelen om:'),
  bullets([
    'aan uw verzoeken tegemoet te komen (bv. Om u diensten te leveren);',
    'onze bedrijfsactiviteiten en de relatie met u te beheren en te verbeteren;',
    'de kwaliteit van de diensten te beoordelen, die wij verstrekken, en de diensten die onze leveranciers ons of namens ons leveren;',
    'uw vragen te beantwoorden;',
    'onderzoek te verrichten;',
    'uw marketingmateriaal toe te sturen dat is afgestemd op uw communicatievoorkeuren; en',
    'te voldoen aan onze wettelijke en reglementaire verantwoordelijkheden, te reageren op juridische procedures of verzoeken om informatie afkomstig van overheidsinstanties of andere derden, en om misdaad en fraude te voorkomen en te detecteren, of om uw of onze rechten of de rechten van anderen te beschermen.',
  ]),
  p('Voor meer informatie over de manier waarop de persoonsgegevens gebruikt worden, die verzameld worden, wanneer uw voertuig een onderhoudsbeurt krijgt of hersteld wordt, verwijzen we u graag naar het deel ‘Herstelling, diagnose en onderhoud van uw GEELY-voertuig’ hieronder.'),
  bullets([
    'onze producten, processen, diensten en marketingstrategieën te helpen begrijpen, ontwikkelen en verbeteren',
    'onze mededelingen, producten en diensten naar u toe te individualiseren;',
    'uw persoonsgegevens up-to-date te houden;',
    'onze klanten beter te begrijpen; en',
    'onze relatie met u te beheren en te verbeteren.',
  ]),
  p('Dit omvat bijvoorbeeld het verstrekken van informatie over onze distributiestrategie, het evalueren van de doeltreffendheid van onze marketing en klantendienst, het uitvoeren van marktanalyses, het identificeren van producten of diensten die van belang kunnen zijn voor u en het contact opnemen met u om u over deze producten en diensten te vertellen.'),
  p('In sommige beperkte omstandigheden kunnen de geautomatiseerde beslissingen die wij nemen, een juridisch of soortgelijk effect op u hebben. We zullen dergelijke geautomatiseerde beslissingen enkel over u nemen, wanneer:'),
  bullets([
    'de beslissingen nodig zijn om een contract met u uit te voeren of te sluiten;',
    'de beslissingen bij wet toegestaan zijn; of',
    'u ons toelating geeft om geautomatiseerde beslissingen te nemen.',
  ]),
  p('U kunt contact met ons opnemen om ons om bijkomende informatie te vragen over geautomatiseerde besluitvorming en in sommige gevallen bezwaar te maken tegen ons gebruik van geautomatiseerde besluitvorming, of om ons te vragen een geautomatiseerde beslissing te laten nakijken door een mens.'),
  p('We willen er graag voor zorgen dat de mededelingen die wij u toesturen en onze interacties met u, zo relevant mogelijk zijn voor u. Als gevolg hiervan kunnen we van tijd tot tijd informatie over u gebruiken, die we van openbare bronnen of derden verzamelden (zoals beschreven in bovenstaand deel ‘Welke persoonsgegevens er gebruikt zullen worden’) om ons te helpen bepalen, in welke producten en diensten van u geïnteresseerd zou kunnen zijn. Zo kunnen analytics providers en reclamediensten de informatie die ze online en van andere bronnen verzamelden, analyseren om ons informatie te verstrekken over uw demografische aspecten en interesses – zoals conclusies over uw leeftijdscategorie en de soorten producten of diensten die u kunnen interesseren. Vervolgens kunnen we u die informatie over deze producten en diensten toesturen in overeenstemming met uw communicatievoorkeuren en kunnen we de informatie die we over u hebben, gebruiken om onze customerservicecentra te informeren, wanneer u contact met hen opneemt. Daarnaast kunnen we ook met derden samenwerken om u reclame op maat te tonen op sociale mediaplatformen of, als u ingestemd hebt met het gebruik van cookies, wanneer u op het internet surft/andere websites bezoekt. In het gedeelte ‘Uw rechten’ hieronder kunt u te weten komen, hoe u ervoor kunt zorgen dat u van ons geen marketingmateriaal meer ontvangt.'),
  p('We bewaren uw persoonsgegevens in identificeerbare vorm, zolang dat redelijkerwijs nodig is om de doeleinden te vervullen, waarvoor de gegevens verzameld werden, en zolang dat nodig is om te voldoen aan toepasselijke wettelijke en reglementaire verplichtingen. Dit betekent gewoonlijk dat we uw persoonsgegevens bewaren, zolang een van de volgende verklaringen van toepassing is:'),
  bullets([
    'uw persoonsgegevens zijn redelijkerwijs nodig om de diensten te leveren, waarom u gevraagd hebt;',
    'uw persoonsgegevens zijn redelijkerwijs nodig om onze rechten of eigendom te beschermen en te verdedigen (dit zal gewoonlijk stroken met de duur van de wettelijke verjaringstermijn); of',
    'toepasselijke regels of voorschriften verplichten ons om uw persoonsgegevens te bewaren.',
  ]),
  h2('De wettelijke grondslagen voor het gebruik van uw persoonsgegevens'),
  p('Ons gebruik van uw persoonsgegevens is gebaseerd op verschillende wettelijke grondslagen en in de volgende situaties zullen we uw persoonsgegevens verzamelen en gebruiken:'),
  bullets([
    'wanneer ons gebruik van uw persoonsgegevens nodig is om een of meerdere contracten uit te voeren, waarbij u een partij bent, of om stappen te ondernemen die u ons vraagt te ondernemen alvorens een contract te sluiten. Deze contracten kunnen de voorwaarden bevatten op grond waarvan u deelneemt aan een wedstrijd of dienstverleningsovereenkomsten sluit, bijvoorbeeld:',
    'wanneer ons gebruik van uw persoonsgegevens binnen onze gewettigde belangen of de gewettigde belangen van de organisatie valt, waarmee we uw persoonsgegevens gedeeld hebben en we ervoor gezorgd hebben dat uw persoonsgegevens en uw rechten ten aanzien van die informatie, beschermd zijn. Zo kunnen wij ons bv. Op deze wettelijke grondslag baseren, als wij en/of de ondernemingen binnen Geely Auto Netherlands BV (gevestigd aan Jachthavenweg 112, 1081KJ Amsterdam) uw persoonsgegevens gebruiken: om onze (of hun) producten, diensten en/of bedrijfs- of marketingstrategieën te begrijpen en te verbeteren; voor onderzoeksdoeleinden; om onze relatie met u te beheren en te verbeteren alsook voor administratieve doeleinden; om met behulp hiervan te achterhalen welke informatie, producten en diensten u wellicht zullen interesseren teneinde u informatie, aanbiedingen en online reclame voor deze producten of diensten toe te sturen of te tonen; om uw ervaring met onze producten en service te individualiseren; om ervoor te zorgen dat onze producten en diensten geleverd en gebruikt worden in overeenstemming met de wet en de voorwaarden die erop van toepassing zijn; en om, waar nodig, onze rechten of eigendom of de rechten of eigendom van derden te beschermen en te verdedigen, of om fraude, beveiligings-, veiligheids- of privacyproblemen te detecteren, te voorkomen of aan te pakken;',
    'wanneer we geloven dat we uw persoonsgegevens moeten gebruiken om aan een wettelijke of reglementaire verplichting tegemoet te komen;',
    'in beperkte omstandigheden, wanneer we vinden dat het nodig is om iemands veiligheid of vitale belangen te beschermen;',
    'in bepaalde omstandigheden kan het gebeuren dat we uw persoonsgegevens nodig hebben voor doeleinden van algemeen belang; en',
    'wanneer we uw toestemming hebben. Zo zal het gebruik van uw persoonsgegevens voor het u bezorgen van marketingmateriaal via e-mail en tekstberichten op uw toestemming berusten. Wanneer het gebruik van uw persoonsgegevens op toestemming berust, hebt u het recht om die toestemming op eender welk moment in te trekken. Voor meer details ter zake verwijzen we u graag naar het ‘Uw rechten’-gedeelte van deze kennisgeving.',
  ]),
  h2('Uw rechten'),
  p('U hebt het recht als individu om na te gaan, welke informatie wij over u bewaren en voor welke doeleinden we dat doen, alsook om toegang te krijgen tot deze informatie en deze, indien nodig, te corrigeren. Verder hebt u in bepaalde omstandigheden eveneens het recht om bezwaar te maken tegen ons gebruik van uw persoonsgegevens, om ons te vragen uw persoonsgegevens te beperken of te wissen, of om te vragen dat we u uw persoonsgegevens bezorgen in een gangbare elektronische vorm, zodat u deze met andere organisaties kunt delen (dit wordt vaak het recht op ‘gegevensoverdraagbaarheid’ genoemd).'),
  p('Wanneer u ingestemd hebt met het gebruik van uw persoonsgegevens (voor meer informatie zie het stuk genaamd ‘De wettelijke grondslagen voor het gebruik van uw persoonsgegevens’), dan hebt u het recht om uw instemming op eender welk moment in te trekken.'),
  p('Als u vragen of zorgen hebt over ons gebruik van uw persoonsgegevens of als u graag toegang zou hebben tot de informatie die wij over u bewaren of als u eender welke van uw andere rechten ten aanzien van uw persoonsgegevens wenst uit te oefenen, gelieve dan contact met ons op te nemen via:'),
  p('Geely Auto Netherlands BV (gevestigd aan Jachthavenweg 112, 1081KJ Amsterdam)'),
  p('We moedigen u aan om ons ook te contacteren om uw persoonsgegevens bij te werken of te corrigeren, mochten ze veranderen of mochten de persoonsgegevens die we over u hebben, niet blijken te kloppen.'),
  p('Mocht u een klacht hebben over de manier waarop wij gebruik maken van uw persoonsgegevens, dan hopen we dat u in eerste instantie contact met ons zult opnemen. Het staat u echter vrij om ook een klacht in te dienen bij de “Gegevensbeschermingsautoriteit” (Drukpersstraat 35, 1000 Brussel, +32 (0)2 274 48 00, contact@apd-gba.be), die de instantie is die in België over de informatierechten waakt.'),
  h2('Wijzigingen aan deze verklaring'),
  p('We kunnen voorliggende verklaring van tijd tot tijd wijzigen of updaten. Als we iets aan deze kennisgeving veranderen, dan zullen wij u van de aangebrachte wijzigingen op de hoogte brengen. Mochten zulke wijzigingen een fundamentele impact hebben op de aard van de verwerking of mochten ze wezenlijke gevolgen hebben voor u, dan zullen we u voldoende op voorhand verwittigen, zodat u uw rechten ten opzichte van uw persoonsgegevens kunt uitoefenen (bv. om bezwaar te maken tegen de verwerking).'),
  h2('Herstelling, diagnose en onderhoud van uw GEELY-voertuig'),
  p('Toen uw GEELY-voertuig vervaardigd werd, kreeg het een uniek nummer toegewezen (het chassisnummer). Van dit chassisnummer kunnen we bepaalde informatie over uw voertuig afleiden, met inbegrip van het model, de leeftijd, de software die het gebruikt en zijn technische specificaties.'),
  p('Om uw voertuig te kunnen diagnosticeren, analyseren of onderhouden, zullen de technici die eraan werken, het chassisnummer moeten verzamelen, samen met bepaalde diagnostische informatie en informatie over de actuele staat van uw voertuig (bv. welke softwareversies het gebruikt, de kilometerstand ervan, enz.).'),
  p('Deze informatie zal door een door GEELY beheerd systeem overgedragen worden, zodat de technici die aan uw voertuig aan het werken zijn, van voertuigspecifieke herstelling-, onderhouds- en diagnostische informatie voorzien kunnen worden (zoals bedradingsschema\'s en voertuigsoftwareupdates), alsook van informatie over werk dat vroeger al verricht werd aan uw voertuig. Kwestie van hen te helpen bij het diagnosticeren, herstellen en/of onderhouden van het voertuig alsook opdat ze hun eigen tussenkomsten eveneens zouden kunnen bijhouden.'),
  p('Om er zeker van te zijn dat het voertuig over een uitvoerige diagnosegeschiedenis beschikt, zal er informatie over het werk dat er aan uw voertuig verricht werd tijdens een onderhoud of herstelling, aan het chassisnummer van uw voertuig gekoppeld worden. Dat zal aan het systeem overgedragen en erin opgeslagen worden, zodat GEELY (of derden aan wie GEELY toelating zou geven om het systeem op deze manier te gebruiken) informatie over voorbije herstellingen of diensten ter beschikking kan stellen van eender welke dealer of hersteller waar ook ter wereld die uw voertuig zou moeten herstellen of onderhouden.'),
  p('De op het systeem bewaarde informatie wordt daarnaast tevens door GEELY gebruikt om uw voertuig te kunnen diagnosticeren of herstellen, om garanties en soortgelijke producten en diensten te beheren, voor productveiligheids - en onderzoeks- en ontwikkelingsdoeleinden en om GEELY in staat te stellen aan haar wettelijke verplichtingen te voldoen.'),
  p('Naast de hierboven vermelde gegevensoverdrachten kan GEELY deze informatie ook doorspelen aan:'),
  bullets([
    'ondernemingen die deel uitmaken van de GEELY-groep voor onderzoeks-, ontwikkelings- en analysedoeleinden; en/of',
    'bedrijven die deel uitmaken van de GEELY-groep en/of derden, waarvan GEELY gelooft dat dit nodig is om te voldoen aan een wettelijke of reglementaire verplichting, of om de rechten van GEELY of van andere ondernemingen van de Geely Auto Netherlands BV (gevestigd aan Jachthavenweg 112, 1081KJ Amsterdam) of de rechten van derden te beschermen.',
  ]),
  p('Voor meer informatie over de wettelijke grondslagen waarop we ons baseren, wanneer we uw persoonsgegevens gebruiken, verwijzen we u graag naar het deel \'De wettelijke grondslagen voor het gebruik van uw persoonsgegevens\' hierboven.'),
  p('Gezien de algemene aard van het systeem wordt er door GEELY chassisnummerinformatie overgedragen naar landen buiten de Europese Economische Ruimte. Voor meer informatie over de internationale overdrachten van persoonsgegevens verwijzen we u graag naar het deel \'Internationale overdracht van uw persoonsgegevens\' hierboven.'),
  p('Aangezien deze informatie de officiële geschiedenis van uw voertuig vormt, wordt deze 20 jaar lang bewaard.'),
  p(`Mocht u ten slotte nog vragen hebben of mocht u graag toegang hebben tot de informatie over uw chassisnummer in het systeem of mocht u uw rechten ten opzichte van uw persoonsgegevens willen uitoefenen (meer informatie hierover vindt u hierboven), kunt u contact opnemen met geely via onderstaande gegevens: Geely Auto Netherlands BV (gevestigd aan Jachthavenweg 112, 1081KJ Amsterdam) en/of met uw Concessiehouder ${DEALER_PLACEHOLDER}.`),
  { type: 'centered', text: '***' },
];

// ---------------------------------------------------------------- page 16

export const PRIVACY_CONSENT = {
  acknowledgement: 'Door ondertekening van dit document erkent de Koper kennis te hebben genomen van de inhoud van de Privacy Verklaring en stemt hij in met de verwerking van zijn persoonsgegevens voor de daarin vermeldde doeleinden.',
  marketing: 'Wij zouden u graag op de hoogte houden van informatie en aanbiedingen van GEELY, waarvan we denken dat u erin geïnteresseerd zou kunnen zijn. Door dit vakje aan te vinken gaat de Koper akkoord om gecontacteerd te worden voor marketing doeleinden.',
  channelsIntro: 'Hieronder duidt de Koper zijn keuze aan wat betreft zijn gekozen communicatiekanaal voor contact.',
  channels: ['E-mail', 'Sms', 'De post', 'Telefoon'],
  yes: 'Ja',
  insurance: 'Door dit vakje aan te vinken gaat de Koper akkoord met de doorgifte van zijn persoonsgegevens door aan diens partner voor verzekeringsproducten (momenteel Ethias), teneinde gecontacteerd te worden voor een offerte.',
  readAndApproved: 'Gelezen en goedgekeurd door de Koper. Op',
  date: '(datum)',
  signature: 'Handtekening van de Koper:',
};

// Everything above as one object — orderFormText.fr.js exports the same shape in French.
export const ORDER_FORM_TEXT_NL = {
  labels: LABELS,
  modelLines: MODEL_LINES,
  warrantyAndTerms: WARRANTY_AND_TERMS,
  financing: FINANCING,
  usage: USAGE,
  annexes: ANNEXES,
  signatures: SIGNATURES,
  generalConditions: GENERAL_CONDITIONS,
  complaintContacts: COMPLAINT_CONTACTS,
  readAndApproved: READ_AND_APPROVED,
  dealerPlaceholder: DEALER_PLACEHOLDER,
  privacyStatement: PRIVACY_STATEMENT,
  privacyConsent: PRIVACY_CONSENT,
};
