/** Illustrative, not-to-scale map of Al Seef (the restaurant is fictional). */
export function MapPlaceholder() {
  return (
    <figure className="relative overflow-hidden rounded-3xl bg-[#efe6d6] ring-1 ring-sand-300">
      <svg viewBox="0 0 640 480" role="img" aria-labelledby="map-title map-desc" className="h-full w-full">
        <title id="map-title">Illustrative map of Al Seef, Bur Dubai</title>
        <desc id="map-desc">
          Bayt Al Ghaf sits on the Al Seef promenade beside Dubai Creek, about five minutes&apos; walk from Al Fahidi Historical Neighbourhood, ten minutes from Al Fahidi Metro Station and twelve minutes from Bur Dubai Abra Station.
        </desc>
        <defs>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 0H0v32" fill="none" stroke="#dccbae" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="640" height="480" fill="url(#grid)" />
        {/* Creek */}
        <path d="M-20 70 C 120 40, 230 120, 330 150 S 520 170, 680 120 L 680 0 L -20 0 Z" fill="#b9cfcc" />
        <path d="M-20 70 C 120 40, 230 120, 330 150 S 520 170, 680 120" fill="none" stroke="#3d605e" strokeWidth="2" />
        <text x="470" y="80" fill="#2f4b4a" fontFamily="Cormorant Garamond, serif" fontStyle="italic" fontSize="26">Dubai Creek</text>
        <text x="520" y="40" fill="#2f4b4a" fontSize="12" letterSpacing="2">DEIRA ↑</text>
        {/* Promenade */}
        <path d="M-20 92 C 120 62, 230 142, 330 172 S 520 192, 680 142" fill="none" stroke="#c6ab80" strokeWidth="10" strokeLinecap="round" opacity="0.8" />
        <text x="40" y="118" fill="#7a5c2e" fontSize="11" letterSpacing="2.5">AL SEEF PROMENADE</text>
        {/* Streets */}
        <path d="M120 470 L 200 200 M 380 470 L 360 190 M 0 300 L 640 260" stroke="#fffaf0" strokeWidth="14" fill="none" />
        <text x="420" y="282" fill="#665c52" fontSize="11" letterSpacing="1.5" transform="rotate(-3 420 282)">AL SEEF STREET</text>
        {/* Landmarks */}
        <g fontSize="12" fill="#2b1a11">
          <rect x="96" y="214" width="92" height="64" rx="6" fill="#dcc8a6" />
          <text x="102" y="300" fontWeight="500">Al Fahidi Historical</text>
          <text x="102" y="315" fontWeight="500">Neighbourhood</text>
          <circle cx="430" cy="410" r="9" fill="#2f4b4a" />
          <text x="446" y="414">Al Fahidi Metro (Green Line)</text>
          <circle cx="40" cy="120" r="0" />
          <path d="M520 168 l10 -8 l10 8 z" fill="#2f4b4a" />
          <text x="490" y="196">Abra station</text>
        </g>
        {/* Walking route */}
        <path d="M430 400 C 400 330, 340 260, 300 200" fill="none" stroke="#7a5c2e" strokeWidth="2" strokeDasharray="5 6" />
        <path d="M188 240 C 230 220, 260 205, 290 196" fill="none" stroke="#7a5c2e" strokeWidth="2" strokeDasharray="5 6" />
        {/* Restaurant */}
        <g transform="translate(290 168)">
          <circle r="30" fill="#2b1a11" />
          <g transform="translate(-12 -15) scale(0.5)" fill="none" stroke="#dcc28f" strokeWidth="2.6" strokeLinecap="round">
            <path d="M4 54V24a20 20 0 0 1 40 0v30" />
            <path d="M24 50V33" />
            <path d="M14 32c0-6 4.5-10 10-10s10 4 10 10c-3 1.5-6.5 2-10 2s-7-.5-10-2Z" />
          </g>
        </g>
        <text x="330" y="232" fill="#2b1a11" fontFamily="Cormorant Garamond, serif" fontSize="22" fontWeight="600">Bayt Al Ghaf</text>
        <text x="330" y="250" fill="#665c52" fontSize="11" letterSpacing="1.5">GATE 3 · HERITAGE QUARTER</text>
      </svg>
      <figcaption className="absolute bottom-3 left-4 rounded-full bg-sand-50/90 px-3 py-1 text-[0.7rem] text-muted">Illustrative map, not to scale · fictional location</figcaption>
    </figure>
  );
}
