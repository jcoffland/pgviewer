// English translations. Only contains keys whose source text is too long
// or fragile to use as the lookup key directly. Short strings throughout
// the app use their English text as the key, so they don't need an entry
// here — the fallback in t() returns the key itself.
export default {
  about: `
    <h4>What it is</h4>
    <p>A 3D viewer for paragliding flight tracks (IGC files). Tracks render
       on a satellite globe with terrain.</p>

    <h4>Loading tracks</h4>
    <p>Drag and drop one or more IGC files into the side panel, or click
       to choose.</p>

    <h4>Coloring tracks</h4>
    <p>Use the dropdown under each loaded track to color by climb rate,
       altitude, energy, ground speed, time, or solid color. Hidden
       removes the polyline while keeping marks and analysis visible.</p>

    <h4>Settings and view</h4>
    <p>The gear icon toggles layers (shadow, altitude/time marks,
       waypoints) and analysis overlays (thermals, glides, dives). The
       crosshair button frames all loaded tracks; double-click the
       altitude chart to frame the current hover positions.</p>

    <h4>Mouse controls</h4>
    <p>Left-drag pans the view. Right-drag or scroll wheel zooms.
       Middle-drag (or Ctrl + left-drag) tilts and rotates the camera.</p>

    <h4>Hover and altitude chart</h4>
    <p>Hover the altitude chart to see each pilot's position on the globe.
       The hover persists when the cursor leaves the chart.</p>

    <h4>Sharing</h4>
    <p>Create shareable link uploads the loaded tracks to deduplicated
       storage and produces a URL that opens the same set of tracks for
       anyone with the link.</p>
  `,
}
