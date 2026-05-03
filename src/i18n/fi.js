// Finnish translations. Paragliding terms reflect best effort; correct
// any inaccuracies as needed.
export default {
  // Section headers
  'Files':                                'Tiedostot',
  'Layers':                               'Tasot',
  'Analysis':                             'Analyysi',
  'Flights':                              'Lennot',
  'Tracks':                               'Reitit',
  'Selected track coloring':              'Valitun reitin väritys',
  'No track selected':                    'Ei valittua reittiä',
  'File':                                 'Tiedosto',
  'Pilot':                                'Lentäjä',
  'Glider':                               'Varjo',
  'Distance':                             'Matka',
  'Score':                                'Pisteet',
  'Route':                                'Reitti',
  'Duration':                             'Kesto',
  'Airtime':                              'Lentoaika',
  'Max altitude':                         'Maks. korkeus',
  'Max alt. gain':                        'Maks. nousu',
  'Max climb':                            'Maks. nousuvauhti',
  'Max sink':                             'Maks. vajoaminen',
  'Avg speed':                            'Ka. nopeus',
  'Bonus':                                'Bonus',
  'Comments':                             'Kommentit',
  'Start':                                'Aloitus',
  'End':                                  'Lopetus',
  'Show track':                           'Näytä reitti',
  'Hide track':                           'Piilota reitti',
  'Remove track':                         'Poista reitti',
  'About':                                'Tietoja',

  // Layer toggles
  'Shadow':                               'Varjo',
  'Altitude marks':                       'Korkeusmerkit',
  'Time marks':                           'Aikamerkit',
  'Waypoints':                            'Reittipisteet',

  // Analysis toggles + labels
  'Thermals':                             'Termiikit',
  'Glides':                               'Liidot',
  'Dives':                                'Syöksyt',

  // Buttons
  'Create shareable link':                'Luo jaettava linkki',
  'Clear all':                            'Tyhjennä',
  'Copy':                                 'Kopioi',
  'Copied':                               'Kopioitu',
  'Close':                                'Sulje',

  // Coloring options
  'Climb':                                'Nousu',
  'Altitude':                             'Korkeus',
  'Energy':                               'Energia',
  'Ground speed':                         'Maanopeus',
  'Time':                                 'Aika',
  'Solid color':                          'Yksivärinen',
  'Hidden':                               'Piilotettu',

  // Coloring tooltips
  'Color by climb rate: red is strong climb, blue is sink.':
                                          'Värjää nousunopeuden mukaan: punainen on voimakas nousu, sininen lasku.',
  'Color by altitude above sea level.':   'Värjää korkeuden mukaan merenpinnasta.',
  'Color by total energy compensated climb (climb + speed change).':
                                          'Värjää kokonaisenergiakompensoidun nousun mukaan (nousu + nopeuden muutos).',
  'Color by ground speed.':               'Värjää maanopeuden mukaan.',
  'Color by time, from start of track to end.':
                                          'Värjää ajan mukaan, lentopolun alusta loppuun.',
  'Single color for the whole track.':    'Yksi väri koko lentopolulle.',
  'Hide the track polyline (other layers like marks and analysis stay visible).':
                                          'Piilota lentopolku (muut tasot kuten merkit ja analyysi pysyvät näkyvissä).',

  // Tooltips
  'Fullscreen':                           'Koko näyttö',
  'Exit fullscreen':                      'Poistu koko näytöltä',
  'Snap to view':                         'Sovita näkymään',
  'Settings':                             'Asetukset',
  'Expand':                               'Laajenna',
  'Collapse':                             'Tiivistä',

  // Modal text
  'Uploading flights…':                   'Ladataan lentoja…',
  'Loading flights…':                     'Ladataan lentoja…',
  'Shareable link':                       'Jaettava linkki',
  'Share failed':                         'Jakaminen epäonnistui',

  // Empty / status
  'Drop one or more IGC files to begin.': 'Pudota yksi tai useampi IGC-tiedosto aloittaaksesi.',
  'Drop IGC files or click to choose':    'Pudota IGC-tiedostot tai napsauta valitaksesi',
  'No flights loaded':                    'Ei lentoja ladattuna',
  'altitude (m)':                         'korkeus (m)',

  // Errors
  'shared bundle too large':              'jaettava paketti on liian suuri',
  'the shared file is no longer available (it may have expired)':
                                          'jaettu tiedosto ei ole enää saatavilla (se on saattanut vanhentua)',

  about: `
    <h4>Mikä tämä on</h4>
    <p>3D-katselin liitovarjolennoille (IGC-tiedostot). Reitit näkyvät
       satelliittikartalla maaston päällä.</p>

    <h4>Reittien lataaminen</h4>
    <p>Pudota yksi tai useampi IGC-tiedosto sivupaneeliin tai napsauta
       valitaksesi.</p>

    <h4>Reittien värittäminen</h4>
    <p>Käytä jokaisen ladatun reitin alla olevaa pudotusvalikkoa
       värittääksesi nousunopeuden, korkeuden, energian, maanopeuden,
       ajan tai yksivärisen mukaan. "Piilotettu" poistaa reittiviivan
       mutta säilyttää merkit ja analyysin näkyvissä.</p>

    <h4>Asetukset ja näkymä</h4>
    <p>Hammasrataskuvake vaihtaa tasoja (varjo, korkeus-/aikamerkit,
       reittipisteet) ja analyysitasoja (termiikit, liidot, syöksyt).
       Tähtäin-painike rajaa kaikki ladatut reitit; tuplaklikkaa
       korkeuskaaviota rajataksesi nykyiset osoitinpisteet.</p>

    <h4>Hiiren ohjaus</h4>
    <p>Vasen veto liikuttaa näkymää. Oikea veto tai rullaaminen zoomaa.
       Keskimmäinen veto (tai Ctrl + vasen veto) kallistaa ja kiertää
       kameraa.</p>

    <h4>Osoitin ja korkeuskaavio</h4>
    <p>Vie hiiri korkeuskaavion päälle nähdäksesi kunkin lentäjän
       sijainnin maapallolla. Osoitin pysyy paikallaan, kun hiiri poistuu
       kaaviolta.</p>

    <h4>Jakaminen</h4>
    <p>"Luo jaettava linkki" lataa ladatut reitit deduplikoituun
       varastoon ja tuottaa URL:n, joka avaa samat reitit kenelle
       tahansa, jolla on linkki.</p>
  `,
}
