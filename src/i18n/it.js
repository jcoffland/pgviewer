// Italian translations. Paragliding terms reflect best effort; correct
// any inaccuracies as needed.
export default {
  'Files':                                'File',
  'Layers':                               'Livelli',
  'Analysis':                             'Analisi',
  'Flights':                              'Voli',
  'Tracks':                               'Tracce',
  'Selected track coloring':              'Colorazione traccia selezionata',
  'No track selected':                    'Nessuna traccia selezionata',
  'File':                                 'File',
  'Pilot':                                'Pilota',
  'Glider':                               'Vela',
  'Distance':                             'Distanza',
  'Duration':                             'Durata',
  'Start':                                'Inizio',
  'End':                                  'Fine',
  'Show track':                           'Mostra traccia',
  'Hide track':                           'Nascondi traccia',
  'Remove track':                         'Rimuovi traccia',
  'About':                                'Informazioni',

  'Shadow':                               'Ombra',
  'Altitude marks':                       'Indicatori di quota',
  'Time marks':                           'Indicatori temporali',
  'Waypoints':                            'Punti di rotta',

  'Thermals':                             'Termiche',
  'Glides':                               'Planate',
  'Dives':                                'Picchiate',

  'Create shareable link':                'Crea link condivisibile',
  'Clear all':                            'Cancella tutto',
  'Copy':                                 'Copia',
  'Copied':                               'Copiato',
  'Close':                                'Chiudi',

  'Climb':                                'Salita',
  'Altitude':                             'Quota',
  'Energy':                               'Energia',
  'Ground speed':                         'Velocità al suolo',
  'Time':                                 'Tempo',
  'Solid color':                          'Tinta unita',
  'Hidden':                               'Nascosto',

  // Coloring tooltips
  'Color by climb rate: red is strong climb, blue is sink.':
                                          'Colora in base al rateo di salita: rosso salita forte, blu discesa.',
  'Color by altitude above sea level.':   'Colora in base alla quota sul livello del mare.',
  'Color by total energy compensated climb (climb + speed change).':
                                          'Colora in base alla salita compensata in energia totale (salita + variazione di velocità).',
  'Color by ground speed.':               'Colora in base alla velocità al suolo.',
  'Color by time, from start of track to end.':
                                          'Colora in base al tempo, dall\'inizio alla fine del tracciato.',
  'Single color for the whole track.':    'Colore unico per tutto il tracciato.',
  'Hide the track polyline (other layers like marks and analysis stay visible).':
                                          'Nascondi il tracciato (altri livelli come indicatori e analisi rimangono visibili).',

  'Fullscreen':                           'Schermo intero',
  'Exit fullscreen':                      'Esci da schermo intero',
  'Snap to view':                         'Adatta alla vista',
  'Settings':                             'Impostazioni',
  'Expand':                               'Espandi',
  'Collapse':                             'Comprimi',

  'Uploading flights…':                   'Caricamento voli…',
  'Loading flights…':                     'Caricamento voli…',
  'Shareable link':                       'Link condivisibile',
  'Share failed':                         'Condivisione fallita',

  'Drop one or more IGC files to begin.': 'Trascina uno o più file IGC per iniziare.',
  'Drop IGC files or click to choose':    'Trascina file IGC o fai clic per scegliere',
  'No flights loaded':                    'Nessun volo caricato',
  'altitude (m)':                         'quota (m)',

  'shared bundle too large':              'pacchetto condiviso troppo grande',
  'the shared file is no longer available (it may have expired)':
                                          'il file condiviso non è più disponibile (potrebbe essere scaduto)',

  about: `
    <h4>Cos'è</h4>
    <p>Un visualizzatore 3D per tracce di volo in parapendio (file IGC).
       Le tracce vengono mostrate su un globo satellitare con il
       terreno.</p>

    <h4>Caricare le tracce</h4>
    <p>Trascina uno o più file IGC nel pannello laterale, oppure fai clic
       per scegliere.</p>

    <h4>Colorare le tracce</h4>
    <p>Usa il menu a tendina sotto ogni traccia caricata per colorare in
       base al rateo di salita, alla quota, all'energia, alla velocità al
       suolo, al tempo o a tinta unita. "Nascosto" rimuove il tracciato
       mantenendo visibili indicatori e analisi.</p>

    <h4>Impostazioni e vista</h4>
    <p>L'icona dell'ingranaggio attiva i livelli (ombra, indicatori di
       quota/temporali, punti di rotta) e gli strati di analisi
       (termiche, planate, picchiate). Il pulsante a mirino inquadra
       tutte le tracce caricate; doppio clic sul grafico delle quote per
       inquadrare i punti correnti.</p>

    <h4>Controlli del mouse</h4>
    <p>Trascina con il tasto sinistro per spostarti. Trascina con il
       tasto destro o usa la rotella per zoomare. Trascina con il tasto
       centrale (o Ctrl + tasto sinistro) per inclinare e ruotare la
       camera.</p>

    <h4>Cursore e grafico delle quote</h4>
    <p>Passa il cursore sul grafico delle quote per vedere la posizione
       di ogni pilota sul globo. Il cursore rimane visibile quando il
       mouse esce dal grafico.</p>

    <h4>Condivisione</h4>
    <p>"Crea link condivisibile" carica le tracce caricate in uno
       storage deduplicato e produce un URL che apre lo stesso set di
       tracce per chiunque abbia il link.</p>
  `,
}
