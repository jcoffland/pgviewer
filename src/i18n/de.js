// German translations. Paragliding terms reflect best effort; correct
// any inaccuracies as needed.
export default {
  'Files':                                'Dateien',
  'Layers':                               'Ebenen',
  'Analysis':                             'Analyse',
  'Flights':                              'Flüge',
  'Tracks':                               'Tracks',
  'Selected track coloring':              'Färbung des ausgewählten Tracks',
  'No track selected':                    'Kein Track ausgewählt',
  'File':                                 'Datei',
  'Pilot':                                'Pilot',
  'Glider':                               'Schirm',
  'Distance':                             'Entfernung',
  'Points':                               'Punkte',
  'Score':                                'Wertung',
  'Route':                                'Route',
  'Duration':                             'Dauer',
  'Airtime':                              'Flugzeit',
  'Max altitude':                         'Max. Höhe',
  'Max alt. gain':                        'Max. Höhengewinn',
  'Max climb':                            'Max. Steigen',
  'Max sink':                             'Max. Sinken',
  'Avg speed':                            'Ø Geschw.',
  'Bonus':                                'Bonus',
  'Comments':                             'Kommentar',
  'Start':                                'Start',
  'End':                                  'Ende',
  'Show track':                           'Track anzeigen',
  'Hide track':                           'Track ausblenden',
  'Remove track':                         'Track entfernen',
  'About':                                'Über',

  'Shadow':                               'Schatten',
  'Altitude marks':                       'Höhenmarken',
  'Time marks':                           'Zeitmarken',
  'Waypoints':                            'Wegpunkte',

  'Thermals':                             'Thermik',
  'Glides':                               'Gleitstrecken',
  'Dives':                                'Sturzflüge',

  'Create shareable link':                'Teilbaren Link erstellen',
  'Clear all':                            'Alles löschen',
  'Copy':                                 'Kopieren',
  'Copied':                               'Kopiert',
  'Close':                                'Schließen',

  'Climb':                                'Steigen',
  'Altitude':                             'Höhe',
  'Energy':                               'Energie',
  'Ground speed':                         'Geschwindigkeit über Grund',
  'Time':                                 'Zeit',
  'Speed':                                'Geschw.',
  'Alt MSL':                              'Höhe MSL',
  'Alt AGL':                              'Höhe AGL',
  'Ground':                               'Boden',
  'Solid color':                          'Einfarbig',
  'Hidden':                               'Ausgeblendet',

  // Coloring tooltips
  'Color by climb rate: red is strong climb, blue is sink.':
                                          'Farbe nach Steigrate: rot = starkes Steigen, blau = Sinken.',
  'Color by altitude above sea level.':   'Farbe nach Höhe über dem Meeresspiegel.',
  'Color by total energy compensated climb (climb + speed change).':
                                          'Farbe nach gesamtenergiekompensiertem Steigen (Steigen + Geschwindigkeitsänderung).',
  'Color by ground speed.':               'Farbe nach Geschwindigkeit über Grund.',
  'Color by time, from start of track to end.':
                                          'Farbe nach Zeit, vom Beginn bis zum Ende der Strecke.',
  'Single color for the whole track.':    'Einheitliche Farbe für die gesamte Strecke.',
  'Hide the track polyline (other layers like marks and analysis stay visible).':
                                          'Strecke ausblenden (andere Ebenen wie Marken und Analyse bleiben sichtbar).',

  'Fullscreen':                           'Vollbild',
  'Exit fullscreen':                      'Vollbild beenden',
  'Snap to view':                         'An Ansicht anpassen',
  'Settings':                             'Einstellungen',
  'Expand':                               'Erweitern',
  'Collapse':                             'Einklappen',

  'Uploading flights…':                   'Flüge werden hochgeladen…',
  'Loading flights…':                     'Flüge werden geladen…',
  'Shareable link':                       'Teilbarer Link',
  'Share failed':                         'Teilen fehlgeschlagen',

  'Drop one or more IGC files to begin.': 'Eine oder mehrere IGC-Dateien hier ablegen, um zu beginnen.',
  'Drop IGC files or click to choose':    'IGC-Dateien hier ablegen oder klicken zum Auswählen',
  'No flights loaded':                    'Keine Flüge geladen',
  'altitude (m)':                         'Höhe (m)',

  'shared bundle too large':              'geteiltes Paket zu groß',
  'the shared file is no longer available (it may have expired)':
                                          'die geteilte Datei ist nicht mehr verfügbar (möglicherweise abgelaufen)',

  about: `
    <h4>Was es ist</h4>
    <p>Ein 3D-Viewer für Gleitschirm-Flugtracks (IGC-Dateien). Tracks
       werden auf einem Satellitenglobus mit Gelände angezeigt.</p>

    <h4>Tracks laden</h4>
    <p>Eine oder mehrere IGC-Dateien in das Seitenpanel ziehen, oder zum
       Auswählen klicken.</p>

    <h4>Tracks einfärben</h4>
    <p>Über das Dropdown-Menü unter jedem geladenen Track lässt sich die
       Färbung nach Steigrate, Höhe, Energie, Geschwindigkeit, Zeit oder
       einfarbig wählen. "Ausgeblendet" entfernt die Linie, während
       Marken und Analyse sichtbar bleiben.</p>

    <h4>Einstellungen und Ansicht</h4>
    <p>Das Zahnrad-Symbol schaltet Ebenen (Schatten, Höhen-/Zeitmarken,
       Wegpunkte) und Analyse-Overlays (Thermik, Gleitstrecken,
       Sturzflüge) um. Die Fadenkreuz-Schaltfläche rahmt alle geladenen
       Tracks; Doppelklick auf das Höhendiagramm rahmt die aktuellen
       Cursor-Positionen.</p>

    <h4>Maussteuerung</h4>
    <p>Linke Maustaste ziehen verschiebt die Ansicht. Rechte Maustaste
       ziehen oder Mausrad zoomt. Mittlere Maustaste ziehen (oder
       Strg + linke Maustaste) neigt und dreht die Kamera.</p>

    <h4>Cursor und Höhendiagramm</h4>
    <p>Mit der Maus über das Höhendiagramm fahren, um die Position jedes
       Piloten auf dem Globus zu sehen. Der Cursor bleibt erhalten, wenn
       die Maus das Diagramm verlässt.</p>

    <h4>Teilen</h4>
    <p>"Teilbaren Link erstellen" lädt die geladenen Tracks in einen
       deduplizierten Speicher hoch und erzeugt eine URL, die dieselben
       Tracks für jeden mit dem Link öffnet.</p>
  `,
}
