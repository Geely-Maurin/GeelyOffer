// Standard equipment per model, sourced from the official Geely Belgium price lists (juli 2026).
// E5 / Starray EM-i: PRO and PRO+ share the same standard equipment; MAX+ adds items on top
// of PRO+. Geely E2: its trims don't nest like that (e.g. PRO/MAX have 4 speakers and steel
// wheels, ULTRA replaces both), so each E2 item that isn't on every trim names its trims —
// see onlyOn() and getStandardEquipment() below.

// An equipment item available on only some trims. Plain strings are on every trim.
const onlyOn = (trims, item) => ({ item, trims });

export const STANDARD_EQUIPMENT = {
  'Geely E5': {
    base: [
      {
        category: 'Veiligheid & assistentie',
        items: [
          'Automatische noodremassistent (AEB)',
          'Adaptieve & intelligente cruise control (ACC)',
          'Rijstrookhandhavingsassistent (LKA)',
          'Nood-rijstrookhandhaving (ELKA)',
          'Rijstrookwisselassistent (LCA & ALCA)',
          'Dodehoekdetectie (BSD)',
          'Verkeersbordherkenning (TSI)',
          'Intelligent Speed Assistance (ISA)',
          'Uitwijkmanoeuvreassistent (EMA)',
          'Waarschuwing kruisend verkeer voor (FCTA)',
          'Support botsing afwenden voor & achter',
          'Traction Control System (G-TCS)',
          '7 airbags incl. middenairbag',
          'ISOFIX voor- & achterbank',
          'Bandenspanningscontrole (TPMS)',
          '360° camera met Ground View',
          'Parkeersensoren achter',
        ],
      },
      {
        category: 'Comfort',
        items: [
          'Elektrisch inklapbare buitenspiegels',
          'Bestuurdersstoel 6-voudig elektrisch',
          'Voorpassagiersstoel 4-voudig elektrisch',
          'Verwarmde & geventileerde voorstoelen',
          'Klimaatregeling + uitstroom achterin',
          'Automatisch dimmende binnenspiegel',
          'Regensensor',
          'Autohold & elektrische handrem',
        ],
      },
      {
        category: 'Interieur',
        items: [
          'Vegan lederen multifunctioneel stuurwiel',
          'Geperforeerde kunstlederen stoelen',
          'Achterbank 60/40 deelbaar, verstelbaar',
          'Opberglade onder achterbank',
        ],
      },
      {
        category: 'Technologie',
        items: [
          '15,4" HD centraal touchscreen',
          '10,2" digitaal instrumentarium',
          'FLYME AUTO infotainment · E04-chipset',
          'Apple CarPlay & Android Auto',
          '4G, wifi, online navigatie & OTA-updates',
          'Handsfree kaart voor open & start',
          '6-speaker audio · DAB · Bluetooth',
          'Draadloos laden & USB-A/C voorin',
        ],
      },
      {
        category: 'Elektrisch & exterieur',
        items: [
          '11 kW AC- & 100 kW DC-lader',
          'Warmtepomp',
          'V2L & V2V (3,3 / 6,6 kW)',
          '18" lichtmetalen wielen',
          'Volledig LED',
          'Privacy glass',
        ],
      },
    ],
    // Items removed from the base list when the trim is MAX+, because MAX+ replaces them
    // rather than adding to them (e.g. it rides on 19" wheels instead of PRO/PRO+'s 18").
    maxPlusRemovals: ['18" lichtmetalen wielen'],
    maxPlusAdditional: [
      {
        category: 'Comfort',
        items: [
          'Elektrisch bedienbare achterklep',
          'Geheugen- & massagefunctie voorstoelen',
          'Voorpassagiersstoel met elektrische beensteun',
          'Panoramisch schuifdak met elektrisch zonnescherm',
          'Verwarmbare achterbank (buitenste plaatsen)',
          'Verwarmbare voorruit & ruitensproeiers',
        ],
      },
      {
        category: 'Interieur & sfeer',
        items: [
          'Ambient Lighting met 256 kleuren',
          'Zonnekleppen met verlichte spiegeltjes',
        ],
      },
      {
        category: 'Technologie & multimedia',
        items: [
          'W-HUD head-up display op de voorruit',
          '16-speaker FLYME SOUND audiosysteem',
          'Speakers in de hoofdsteunen voorin',
          'Preconditioning interieur via de app',
        ],
      },
      {
        category: 'Exterieur & veiligheid',
        items: [
          '19" lichtmetalen wielen',
          'Parkeersensoren vóór én achter',
        ],
      },
    ],
  },

  'Starray EM-i': {
    base: [
      {
        category: 'Veiligheid',
        items: [
          'Automatische noodremassistent (AEB)',
          'Adaptieve & intelligente cruise control (ACC)',
          'Active emergency braking voor & achter',
          'Achteruitrijwaarschuwing kruisend verkeer & remondersteuning',
          'Rijstrookhandhavingsassistent (LKA)',
          'Verkeersbordherkenning (TSI)',
          'Rijstrookwisselassistent (LCA)',
          'Dodehoekdetectie (BSD)',
          'Nood-rijstrookhandhavingsassistent (ELKA)',
          'Intelligent Speed Assistance (ISA)',
          'Uitwijkmanoeuvreassistent (EMA)',
          'Waarschuwing kruisend verkeer voor (FCTA)',
          'Actieve rijstrookwisselassistent (ALCA)',
          'Electronic Parking Brake (EPB) & Auto Hold (AVH)',
          'Geely Traction Control System (G-TCS)',
          '7 airbags (front, zij voorin, zijgordijn, midden)',
          'ISOFIX voor- & achterbank',
          'Tyre Pressure Monitoring System',
          'Parkeersensoren achter',
          '360° Camera met Ground View',
        ],
      },
      {
        category: 'Elektrisch rijden',
        items: [
          '6,6 kW AC-lader',
          'V2L & V2V (3,3 / 6,6 kW)',
        ],
      },
      {
        category: 'Technologie en multimedia',
        items: [
          'Handsfree kaart voor ontgrendelen en starten',
          'FLYME AUTO infotainment · E04-chipset',
          '15,4" HD centraal scherm & 10,2" LCD instrumentarium',
          'Dual-zone audio control voorin',
          'Bluetooth',
          '4G, wifi, online navigatie & OTA-updates',
          'Apple CarPlay & Android Auto',
          'FM radio & DAB',
          'USB aansluitingen voorin (Type-A & Type-C)',
          '6-speakers audiosysteem',
          '12V-aansluiting voorin',
        ],
      },
      {
        category: 'Interieur',
        items: [
          'Microfiber vegan lederen multifunctioneel stuurwiel',
          '4-weg handmatig verstelbaar stuurwiel',
          'Achterbankleuning met tweevoudige hoekinstelling, 60/40 deelbaar',
          'Opberglade onder achterbank',
          'Zonnekleppen met spiegeltjes voor',
          'Geperforeerde kunstlederen stoelen',
        ],
      },
      {
        category: 'Comfort',
        items: [
          'Elektrisch bedienbare en inklapbare buitenspiegels',
          'Regensensor',
          'Bestuurdersstoel 6-voudig elektrisch instelbaar',
          'Voorpassagiersstoel 4-voudig elektrisch instelbaar',
          'Verwarmde voorstoelen',
          'Automatisch dimmende binnenspiegel',
          'Klimaatregeling',
          'Uitstroomopening airconditioning achterbank',
          'Autohold en elektrische handrem',
          'Verwarmde ruitensproeiers',
          'Verwarmbare voorruit',
        ],
      },
      {
        category: 'Exterieur',
        items: [
          'LED-verlichting (incl. Follow Me Home)',
          'LED dagrijverlichting (DRL)',
          'Intelligent High Beam Control (IHBC)',
          'AGS actieve sluiting grille voor minder weerstand',
          'Dakdragers',
          'Privacy glass',
        ],
      },
    ],
    maxPlusAdditional: [
      {
        category: 'Comfort',
        items: [
          'Panoramisch elektrisch schuifdak met elektrisch zonnescherm',
          'Elektrisch bedienbare achterklep',
          'Voorstoelen geventileerd en met massagefunctie',
          'Stoel bestuurder met geheugenfunctie',
          'Voorpassagiersstoel met elektrisch verstelbare beensteun (2-weg)',
          'Verwarmbare achterbank (buitenste zitplaatsen)',
        ],
      },
      {
        category: 'Veiligheid',
        items: [
          'Parkeersensoren vóór en achter',
        ],
      },
      {
        category: 'Technologie & multimedia',
        items: [
          'W-HUD (Head-Up Display op voorruit)',
          '16-speaker FLYME SOUND audiosysteem (incl. speakers in hoofdsteunen)',
          'Draadloos opladen mobiele telefoon',
        ],
      },
      {
        category: 'Interieur',
        items: [
          'Ambient Lighting met 256 kleuren',
          'Zonnekleppen met verlichte spiegeltjes voor',
        ],
      },
      {
        category: 'Exterieur',
        items: [
          '19" lichtmetalen wielen met lage rolweerstand',
        ],
      },
    ],
  },

  // From "Geely E2 Prijslijst 2026 | België", pages 11–12 ("Uitrusting"). The brochure
  // splits Veiligheid over two columns; merged into one category here.
  'Geely E2': {
    base: [
      {
        category: 'Comfort',
        items: [
          'Elektrisch verstelbare bestuurdersstoel (6-weg) en passagiersstoel (4-weg)',
          'Elektrisch inklapbare en verwarmde buitenspiegels met verwarmde achterruit',
          'Elektrische ramen rondom met one-touch en anti-inklembeveiliging',
          'Automatische airco (1-zone) met achterste ventilatieroosters en ventilatie op afstand',
          'Keyless entry & start',
          'Achteruitrijcamera met parkeersensoren achter',
          onlyOn(['MAX', 'ULTRA'], 'Verwarmbare voorstoelen en stuurwiel'),
          onlyOn(['ULTRA'], 'Elektrisch bedienbare achterklep'),
          onlyOn(['ULTRA'], 'Frameloze ruitenwisser met regensensor'),
        ],
      },
      {
        category: 'Veiligheid',
        items: [
          'Adaptieve cruise control met file-assistent (ACC + ICC)',
          'Automatische noodrem met uitwijkmanoeuvre-assistent (AEB + EMA)',
          'Rijstrookassistent met noodcorrectie en automatische rijstrookwissel (LKA + ELKA + ALCA)',
          'Waarschuwing botsing frontaal of van achter, plus melding wegrijdende voorligger (FCW + RCW + FVD)',
          'Rijstrook- en dodehoekwaarschuwing met rijstrookwisselassistent (LDW + BSD + LCA)',
          'Waarschuwing kruisend verkeer voor en achter, en portier-openwaarschuwing (FCTA + RCTA + DOW)',
          'Verkeersbordherkenning met snelheidsoverschrijdingswaarschuwing (TSI)',
          'Bestuurders- en inzittendemonitoring met detectie passagiers (DMS + OMS + CPD)',
          onlyOn(['ULTRA'], 'Bandenspanningscontrolesysteem (TPMS)'),
          '7 airbags (2× front, 2× zij voorin, 2× gordijn, 1× midden) met ISOFIX voor + achter',
          'Automatische noodoproep en registratiesysteem voor gebeurtenissen (eCall + EDR)',
          'ABS met elektronische remkrachtverdeling en stabiliteitscontrole (ABS + EBD + ESC)',
          'Tractiecontrole met hellingstart- en afdaalassistent (G-TCS + HAC + HDC)',
          onlyOn(['ULTRA'], 'Directe bandenspanningscontrole (dTPMS) met realtime uitlezing'),
        ],
      },
      {
        category: 'Technologie & multimedia',
        items: [
          'Regeneratief remsysteem met elektronische parkeerrem en auto hold (EPB)',
          'Actieve sluiting lamellen in grille',
          'Automatische LED-koplampen met grootlichtassistent en "follow me home"-functie (IHBC)',
          'LED-dagrijverlichting en LED-achterlichten',
          'FLYME AUTO infotainment met 14,6" HD-touchscreen en 8,8" LCD-instrumentenpaneel',
          onlyOn(['PRO', 'MAX'], '4-speaker audiosysteem met FM-radio en DAB'),
          onlyOn(['ULTRA'], '6-speaker audiosysteem'),
          'Apple CarPlay, Android Auto en Bluetooth',
          '4G-connectiviteit met online navigatie, multimedia en GEELY App Store',
          'Over-the-air updates (OTA) en detectie/bediening op afstand',
          'USB-poorten voor (1× Type-A + 1× Type-C) en achter (1× Type-A)',
          'Registratiesysteem voor gebeurtenissen (EDR)',
          onlyOn(['ULTRA'], '256-kleuren sfeerverlichting, instelbaar en met ademeffect'),
          onlyOn(['ULTRA'], '15W Qi draadloze oplader voor telefoon'),
          onlyOn(['ULTRA'], '540° panoramisch camerabeeld met transparant chassis'),
        ],
      },
      {
        category: 'Exterieur',
        items: [
          onlyOn(['PRO', 'MAX'], '16" stalen velgen met klaverdesign'),
          onlyOn(['ULTRA'], '16" lichtmetalen velgen'),
          '70L kofferruimte voor (frunk)',
          'Frameloze ruitenwisser',
          'Privacy glas achter',
          onlyOn(['ULTRA'], 'Alu-look insert in sideskirt'),
          onlyOn(['ULTRA'], 'Zonnekleppen voor met make-upspiegel en verlichting'),
        ],
      },
      {
        category: 'Interieur',
        items: [
          '375 liter kofferruimte achter, 1320 liter met omgeklapte bank',
          'Bekleding en middenconsole in vegan leer',
          'Multifunctioneel stuurwiel in microvezelleer',
          'Middenarmsteun voor met 2 bekerhouders',
          'Dashboardvak van 10L en leeslampje achter',
          'Achterbank neerklapbaar in 4:6-verhouding',
        ],
      },
      {
        category: 'Elektrisch rijden',
        items: [
          onlyOn(['PRO'], '35 kWh batterij, WLTP-bereik 252 km, laden met 6,6 kW AC / 60 kW DC'),
          onlyOn(['MAX', 'ULTRA'], '47 kWh batterij, WLTP-bereik 345 km, laden met 6,6 kW AC / 80 kW DC'),
          'V2L – 3,3 kW stroomvoorziening voor elektrische apparaten',
        ],
      },
    ],
  },
};

// Returns [{ category, items }] for the given vehicle name + submodel (PRO / PRO+ / MAX+,
// or PRO / MAX / ULTRA for the E2), dropping onlyOn() items that aren't on this trim and
// merging the MAX+-only additions into their matching category when applicable.
export function getStandardEquipment(vehicleName, model, lang = 'nl') {
  const data = STANDARD_EQUIPMENT[vehicleName];
  if (!data) return [];

  const removals = model === 'MAX+' ? (data.maxPlusRemovals || []) : [];
  const categories = data.base
    .map(group => ({
      category: group.category,
      items: group.items
        .filter(entry => typeof entry === 'string' || entry.trims.includes(model))
        .map(entry => (typeof entry === 'string' ? entry : entry.item))
        .filter(item => !removals.includes(item)),
    }))
    .filter(group => group.items.length > 0);

  if (model === 'MAX+' && data.maxPlusAdditional) {
    for (const extra of data.maxPlusAdditional) {
      const existing = categories.find(c => c.category === extra.category);
      if (existing) {
        existing.items.push(...extra.items);
      } else {
        categories.push({ category: extra.category, items: [...extra.items] });
      }
    }
  }

  if (lang !== 'fr') return categories;
  return categories.map(group => ({
    category: CATEGORY_FR[group.category] || group.category,
    items: group.items.map(item => ITEM_FR[item] || item),
  }));
}

// French translations of the Dutch equipment copy above, keyed by the exact NL string so
// the source-of-truth STANDARD_EQUIPMENT data (and the removal/merge logic that reads it)
// never has to be duplicated per language. Standard automotive acronyms (AEB, ACC, LKA,
// ISOFIX, TPMS, DAB, HUD, ...) are kept as-is, matching normal French automotive usage.
// AI-drafted — flag for a native French speaker to review before this reaches a real
// customer quote.
const CATEGORY_FR = {
  'Veiligheid & assistentie': 'Sécurité & assistance',
  'Comfort': 'Confort',
  'Interieur': 'Intérieur',
  'Technologie': 'Technologie',
  'Elektrisch & exterieur': 'Électrique & extérieur',
  'Interieur & sfeer': 'Intérieur & ambiance',
  'Technologie & multimedia': 'Technologie & multimédia',
  'Exterieur & veiligheid': 'Extérieur & sécurité',
  'Veiligheid': 'Sécurité',
  'Elektrisch rijden': 'Conduite électrique',
  'Technologie en multimedia': 'Technologie et multimédia',
  'Exterieur': 'Extérieur',
};

const ITEM_FR = {
  'Automatische noodremassistent (AEB)': "Freinage d'urgence automatique (AEB)",
  'Adaptieve & intelligente cruise control (ACC)': 'Régulateur de vitesse adaptatif et intelligent (ACC)',
  'Rijstrookhandhavingsassistent (LKA)': 'Assistant de maintien de voie (LKA)',
  'Nood-rijstrookhandhaving (ELKA)': "Maintien de voie d'urgence (ELKA)",
  'Rijstrookwisselassistent (LCA & ALCA)': 'Assistant de changement de voie (LCA & ALCA)',
  'Dodehoekdetectie (BSD)': "Détection d'angle mort (BSD)",
  'Verkeersbordherkenning (TSI)': 'Reconnaissance des panneaux de signalisation (TSI)',
  'Intelligent Speed Assistance (ISA)': 'Intelligent Speed Assistance (ISA)',
  'Uitwijkmanoeuvreassistent (EMA)': "Assistant de manœuvre d'évitement (EMA)",
  'Waarschuwing kruisend verkeer voor (FCTA)': 'Alerte de trafic transversal avant (FCTA)',
  'Support botsing afwenden voor & achter': "Aide à l'évitement de collision avant & arrière",
  'Traction Control System (G-TCS)': 'Système de contrôle de traction (G-TCS)',
  '7 airbags incl. middenairbag': "7 airbags dont un airbag central",
  'ISOFIX voor- & achterbank': 'ISOFIX aux places avant et arrière',
  'Bandenspanningscontrole (TPMS)': 'Contrôle de pression des pneus (TPMS)',
  '360° camera met Ground View': 'Caméra 360° avec vue du dessus (Ground View)',
  'Parkeersensoren achter': 'Capteurs de stationnement arrière',
  'Elektrisch inklapbare buitenspiegels': 'Rétroviseurs extérieurs électriques et rabattables',
  'Bestuurdersstoel 6-voudig elektrisch': 'Siège conducteur électrique à 6 réglages',
  'Voorpassagiersstoel 4-voudig elektrisch': 'Siège passager avant électrique à 4 réglages',
  'Verwarmde & geventileerde voorstoelen': 'Sièges avant chauffants et ventilés',
  'Klimaatregeling + uitstroom achterin': "Climatisation avec sorties d'air à l'arrière",
  'Automatisch dimmende binnenspiegel': 'Rétroviseur intérieur à assombrissement automatique',
  'Regensensor': 'Capteur de pluie',
  'Autohold & elektrische handrem': 'Autohold et frein à main électrique',
  'Vegan lederen multifunctioneel stuurwiel': 'Volant multifonction en cuir végan',
  'Geperforeerde kunstlederen stoelen': 'Sièges en similicuir perforé',
  'Achterbank 60/40 deelbaar, verstelbaar': 'Banquette arrière fractionnable 60/40, réglable',
  'Opberglade onder achterbank': 'Tiroir de rangement sous la banquette arrière',
  '15,4" HD centraal touchscreen': 'Écran tactile central HD 15,4"',
  '10,2" digitaal instrumentarium': "Combiné d'instruments numérique 10,2\"",
  'FLYME AUTO infotainment · E04-chipset': 'Infodivertissement FLYME AUTO · puce E04',
  'Apple CarPlay & Android Auto': 'Apple CarPlay & Android Auto',
  '4G, wifi, online navigatie & OTA-updates': '4G, wifi, navigation en ligne et mises à jour OTA',
  'Handsfree kaart voor open & start': 'Carte mains libres pour ouverture et démarrage',
  '6-speaker audio · DAB · Bluetooth': 'Système audio 6 haut-parleurs · DAB · Bluetooth',
  'Draadloos laden & USB-A/C voorin': "Chargeur sans fil et USB-A/C à l'avant",
  '11 kW AC- & 100 kW DC-lader': 'Chargeur AC 11 kW et DC 100 kW',
  'Warmtepomp': 'Pompe à chaleur',
  'V2L & V2V (3,3 / 6,6 kW)': 'V2L & V2V (3,3 / 6,6 kW)',
  '18" lichtmetalen wielen': 'Jantes en alliage 18"',
  'Volledig LED': 'Éclairage full LED',
  'Privacy glass': 'Privacy glass',
  'Elektrisch bedienbare achterklep': 'Hayon à commande électrique',
  'Geheugen- & massagefunctie voorstoelen': 'Sièges avant à mémoire et fonction massage',
  'Voorpassagiersstoel met elektrische beensteun': 'Siège passager avant avec repose-jambes électrique',
  'Panoramisch schuifdak met elektrisch zonnescherm': 'Toit ouvrant panoramique avec pare-soleil électrique',
  'Verwarmbare achterbank (buitenste plaatsen)': 'Banquette arrière chauffante (places extérieures)',
  'Verwarmbare voorruit & ruitensproeiers': 'Pare-brise et lave-glace chauffants',
  'Ambient Lighting met 256 kleuren': "Éclairage d'ambiance à 256 couleurs",
  'Zonnekleppen met verlichte spiegeltjes': 'Pare-soleil avec miroirs éclairés',
  'W-HUD head-up display op de voorruit': 'Affichage tête haute (W-HUD) sur le pare-brise',
  '16-speaker FLYME SOUND audiosysteem': 'Système audio FLYME SOUND 16 haut-parleurs',
  'Speakers in de hoofdsteunen voorin': 'Haut-parleurs intégrés aux appuie-têtes avant',
  'Preconditioning interieur via de app': "Préconditionnement de l'habitacle via l'application",
  '19" lichtmetalen wielen': 'Jantes en alliage 19"',
  'Parkeersensoren vóór én achter': 'Capteurs de stationnement avant et arrière',
  'Active emergency braking voor & achter': "Freinage d'urgence actif avant & arrière",
  'Achteruitrijwaarschuwing kruisend verkeer & remondersteuning': 'Alerte de trafic transversal arrière avec assistance au freinage',
  'Rijstrookwisselassistent (LCA)': 'Assistant de changement de voie (LCA)',
  'Nood-rijstrookhandhavingsassistent (ELKA)': "Assistant de maintien de voie d'urgence (ELKA)",
  'Actieve rijstrookwisselassistent (ALCA)': 'Assistant actif de changement de voie (ALCA)',
  'Electronic Parking Brake (EPB) & Auto Hold (AVH)': 'Electronic Parking Brake (EPB) & Auto Hold (AVH)',
  'Geely Traction Control System (G-TCS)': 'Système de contrôle de traction Geely (G-TCS)',
  '7 airbags (front, zij voorin, zijgordijn, midden)': '7 airbags (frontaux, latéraux avant, rideaux, central)',
  'Tyre Pressure Monitoring System': 'Tyre Pressure Monitoring System',
  '360° Camera met Ground View': 'Caméra 360° avec vue du dessus (Ground View)',
  '6,6 kW AC-lader': 'Chargeur AC 6,6 kW',
  'Handsfree kaart voor ontgrendelen en starten': 'Carte mains libres pour déverrouillage et démarrage',
  '15,4" HD centraal scherm & 10,2" LCD instrumentarium': 'Écran central HD 15,4" et combiné LCD 10,2"',
  'Dual-zone audio control voorin': "Réglage audio double zone à l'avant",
  'Bluetooth': 'Bluetooth',
  'FM radio & DAB': 'FM radio & DAB',
  'USB aansluitingen voorin (Type-A & Type-C)': "Prises USB à l'avant (Type-A et Type-C)",
  '6-speakers audiosysteem': 'Système audio 6 haut-parleurs',
  '12V-aansluiting voorin': "Prise 12V à l'avant",
  'Microfiber vegan lederen multifunctioneel stuurwiel': 'Volant multifonction en cuir végan microfibre',
  '4-weg handmatig verstelbaar stuurwiel': 'Volant réglable manuellement sur 4 axes',
  'Achterbankleuning met tweevoudige hoekinstelling, 60/40 deelbaar': 'Dossier de banquette arrière à double inclinaison, fractionnable 60/40',
  'Zonnekleppen met spiegeltjes voor': 'Pare-soleil avec miroirs à l\'avant',
  'Elektrisch bedienbare en inklapbare buitenspiegels': 'Rétroviseurs extérieurs électriques et rabattables',
  'Bestuurdersstoel 6-voudig elektrisch instelbaar': 'Siège conducteur réglable électriquement à 6 réglages',
  'Voorpassagiersstoel 4-voudig elektrisch instelbaar': 'Siège passager avant réglable électriquement à 4 réglages',
  'Verwarmde voorstoelen': 'Sièges avant chauffants',
  'Klimaatregeling': 'Climatisation',
  'Uitstroomopening airconditioning achterbank': 'Sortie de climatisation pour la banquette arrière',
  'Autohold en elektrische handrem': 'Autohold et frein à main électrique',
  'Verwarmde ruitensproeiers': 'Lave-glace chauffants',
  'Verwarmbare voorruit': 'Pare-brise chauffant',
  'LED-verlichting (incl. Follow Me Home)': 'Éclairage LED (fonction Follow Me Home incluse)',
  'LED dagrijverlichting (DRL)': 'Feux de jour LED (DRL)',
  'Intelligent High Beam Control (IHBC)': 'Intelligent High Beam Control (IHBC)',
  'AGS actieve sluiting grille voor minder weerstand': "Volets de calandre actifs (AGS) pour réduire la résistance à l'air",
  'Dakdragers': 'Barres de toit',
  'Panoramisch elektrisch schuifdak met elektrisch zonnescherm': 'Toit ouvrant panoramique électrique avec pare-soleil électrique',
  'Voorstoelen geventileerd en met massagefunctie': 'Sièges avant ventilés avec fonction massage',
  'Stoel bestuurder met geheugenfunctie': 'Siège conducteur à mémoire',
  'Voorpassagiersstoel met elektrisch verstelbare beensteun (2-weg)': 'Siège passager avant avec repose-jambes électrique (2 réglages)',
  'Verwarmbare achterbank (buitenste zitplaatsen)': 'Banquette arrière chauffante (places extérieures)',
  'Parkeersensoren vóór en achter': 'Capteurs de stationnement avant et arrière',
  'W-HUD (Head-Up Display op voorruit)': 'Affichage tête haute W-HUD (sur le pare-brise)',
  '16-speaker FLYME SOUND audiosysteem (incl. speakers in hoofdsteunen)': 'Système audio FLYME SOUND 16 haut-parleurs (haut-parleurs dans les appuie-têtes inclus)',
  'Draadloos opladen mobiele telefoon': 'Chargeur sans fil pour téléphone',
  'Zonnekleppen met verlichte spiegeltjes voor': "Pare-soleil avec miroirs éclairés à l'avant",
  '19" lichtmetalen wielen met lage rolweerstand': "Jantes en alliage 19\" à faible résistance au roulement",
  // Geely E2
  'Elektrisch verstelbare bestuurdersstoel (6-weg) en passagiersstoel (4-weg)': 'Siège conducteur à réglage électrique (6 réglages) et siège passager (4 réglages)',
  'Elektrisch inklapbare en verwarmde buitenspiegels met verwarmde achterruit': 'Rétroviseurs extérieurs rabattables électriquement et chauffants, lunette arrière chauffante',
  'Elektrische ramen rondom met one-touch en anti-inklembeveiliging': 'Vitres électriques à impulsion avec anti-pincement',
  'Automatische airco (1-zone) met achterste ventilatieroosters en ventilatie op afstand': "Climatisation automatique (1 zone) avec aérateurs arrière et ventilation à distance",
  'Keyless entry & start': 'Accès et démarrage sans clé',
  'Achteruitrijcamera met parkeersensoren achter': 'Caméra de recul avec capteurs de stationnement arrière',
  'Verwarmbare voorstoelen en stuurwiel': 'Sièges avant et volant chauffants',
  'Frameloze ruitenwisser met regensensor': 'Essuie-glace sans cadre avec capteur de pluie',
  'Adaptieve cruise control met file-assistent (ACC + ICC)': 'Régulateur de vitesse adaptatif avec assistant embouteillages (ACC + ICC)',
  'Automatische noodrem met uitwijkmanoeuvre-assistent (AEB + EMA)': "Freinage d'urgence automatique avec assistant de manœuvre d'évitement (AEB + EMA)",
  'Rijstrookassistent met noodcorrectie en automatische rijstrookwissel (LKA + ELKA + ALCA)': "Assistant de maintien de voie avec correction d'urgence et changement de voie automatique (LKA + ELKA + ALCA)",
  'Waarschuwing botsing frontaal of van achter, plus melding wegrijdende voorligger (FCW + RCW + FVD)': 'Alerte de collision avant et arrière, avec alerte de démarrage du véhicule précédent (FCW + RCW + FVD)',
  'Rijstrook- en dodehoekwaarschuwing met rijstrookwisselassistent (LDW + BSD + LCA)': "Alerte de franchissement de ligne et d'angle mort avec assistant de changement de voie (LDW + BSD + LCA)",
  'Waarschuwing kruisend verkeer voor en achter, en portier-openwaarschuwing (FCTA + RCTA + DOW)': "Alerte de trafic transversal avant et arrière, et alerte d'ouverture de portière (FCTA + RCTA + DOW)",
  'Verkeersbordherkenning met snelheidsoverschrijdingswaarschuwing (TSI)': 'Reconnaissance des panneaux avec alerte de dépassement de vitesse (TSI)',
  'Bestuurders- en inzittendemonitoring met detectie passagiers (DMS + OMS + CPD)': 'Surveillance du conducteur et des occupants avec détection de passagers (DMS + OMS + CPD)',
  'Bandenspanningscontrolesysteem (TPMS)': 'Système de contrôle de la pression des pneus (TPMS)',
  '7 airbags (2× front, 2× zij voorin, 2× gordijn, 1× midden) met ISOFIX voor + achter': '7 airbags (2× frontaux, 2× latéraux avant, 2× rideaux, 1× central) avec ISOFIX avant + arrière',
  'Automatische noodoproep en registratiesysteem voor gebeurtenissen (eCall + EDR)': "Appel d'urgence automatique et enregistreur d'événements (eCall + EDR)",
  'ABS met elektronische remkrachtverdeling en stabiliteitscontrole (ABS + EBD + ESC)': 'ABS avec répartition électronique de freinage et contrôle de stabilité (ABS + EBD + ESC)',
  'Tractiecontrole met hellingstart- en afdaalassistent (G-TCS + HAC + HDC)': 'Contrôle de traction avec aide au démarrage en côte et aide à la descente (G-TCS + HAC + HDC)',
  'Directe bandenspanningscontrole (dTPMS) met realtime uitlezing': 'Contrôle direct de la pression des pneus (dTPMS) avec affichage en temps réel',
  'Regeneratief remsysteem met elektronische parkeerrem en auto hold (EPB)': 'Freinage régénératif avec frein de stationnement électronique et auto hold (EPB)',
  'Actieve sluiting lamellen in grille': 'Volets de calandre actifs',
  'Automatische LED-koplampen met grootlichtassistent en "follow me home"-functie (IHBC)': 'Phares LED automatiques avec assistant feux de route et fonction « follow me home » (IHBC)',
  'LED-dagrijverlichting en LED-achterlichten': 'Feux de jour LED et feux arrière LED',
  'FLYME AUTO infotainment met 14,6" HD-touchscreen en 8,8" LCD-instrumentenpaneel': 'Infodivertissement FLYME AUTO avec écran tactile HD 14,6" et combiné LCD 8,8"',
  '4-speaker audiosysteem met FM-radio en DAB': 'Système audio 4 haut-parleurs avec radio FM et DAB',
  '6-speaker audiosysteem': 'Système audio 6 haut-parleurs',
  'Apple CarPlay, Android Auto en Bluetooth': 'Apple CarPlay, Android Auto et Bluetooth',
  '4G-connectiviteit met online navigatie, multimedia en GEELY App Store': 'Connectivité 4G avec navigation en ligne, multimédia et GEELY App Store',
  'Over-the-air updates (OTA) en detectie/bediening op afstand': 'Mises à jour over-the-air (OTA) et contrôle/commande à distance',
  'USB-poorten voor (1× Type-A + 1× Type-C) en achter (1× Type-A)': 'Ports USB avant (1× Type-A + 1× Type-C) et arrière (1× Type-A)',
  'Registratiesysteem voor gebeurtenissen (EDR)': "Enregistreur d'événements (EDR)",
  '256-kleuren sfeerverlichting, instelbaar en met ademeffect': "Éclairage d'ambiance 256 couleurs, réglable avec effet respiration",
  '15W Qi draadloze oplader voor telefoon': 'Chargeur sans fil Qi 15W pour téléphone',
  '540° panoramisch camerabeeld met transparant chassis': 'Vue caméra panoramique 540° avec châssis transparent',
  '16" stalen velgen met klaverdesign': 'Jantes en acier 16" design trèfle',
  '16" lichtmetalen velgen': 'Jantes en alliage 16"',
  '70L kofferruimte voor (frunk)': 'Coffre avant de 70 L (frunk)',
  'Frameloze ruitenwisser': 'Essuie-glace sans cadre',
  'Privacy glas achter': 'Vitres arrière surteintées',
  'Alu-look insert in sideskirt': 'Insert aspect aluminium dans les bas de caisse',
  'Zonnekleppen voor met make-upspiegel en verlichting': 'Pare-soleil avant avec miroir de courtoisie éclairé',
  '375 liter kofferruimte achter, 1320 liter met omgeklapte bank': 'Coffre arrière de 375 litres, 1320 litres banquette rabattue',
  'Bekleding en middenconsole in vegan leer': 'Sellerie et console centrale en cuir végan',
  'Multifunctioneel stuurwiel in microvezelleer': 'Volant multifonction en cuir microfibre',
  'Middenarmsteun voor met 2 bekerhouders': 'Accoudoir central avant avec 2 porte-gobelets',
  'Dashboardvak van 10L en leeslampje achter': 'Boîte à gants de 10 L et liseuse arrière',
  'Achterbank neerklapbaar in 4:6-verhouding': 'Banquette arrière rabattable 40/60',
  '35 kWh batterij, WLTP-bereik 252 km, laden met 6,6 kW AC / 60 kW DC': 'Batterie 35 kWh, autonomie WLTP 252 km, recharge 6,6 kW AC / 60 kW DC',
  '47 kWh batterij, WLTP-bereik 345 km, laden met 6,6 kW AC / 80 kW DC': 'Batterie 47 kWh, autonomie WLTP 345 km, recharge 6,6 kW AC / 80 kW DC',
  'V2L – 3,3 kW stroomvoorziening voor elektrische apparaten': 'V2L – alimentation 3,3 kW pour appareils électriques',
};
