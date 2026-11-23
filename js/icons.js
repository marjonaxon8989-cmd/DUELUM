// icons.js — every icon in the app is an inline SVG line icon (no emoji, no
// image files). icon('home') returns an <svg> string that takes the current
// text colour, so icons follow the light/dark theme automatically.

const ICON_PATHS={
  home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  swords:'<path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6"/><path d="m16 16 4 4"/><path d="m19 21 2-2"/><path d="M14.5 6.5 18 3h3v3l-3.5 3.5"/><path d="m5 14 4 4"/><path d="m7 17-3 3"/><path d="m3 19 2 2"/>',
  trophy:'<path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3"/><path d="M7 5H4v2a3 3 0 0 0 3 3"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  bell:'<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  back:'<path d="m15 18-6-6 6-6"/>',
  chevron:'<path d="m9 18 6-6-6-6"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  flag:'<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
  half:'<circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none"/>',
  bulb:'<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z"/>',
  logout:'<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h11"/>',
  lock:'<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18"/>',
  crown:'<path d="M3 7l4.5 4L12 5l4.5 6L21 7l-2 11H5L3 7Z"/>',
  send:'<path d="M21 3 10 14"/><path d="M21 3 14.5 21l-4.5-7-7-4.5L21 3Z"/>',
  play:'<rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="m10 9 5 3-5 3V9Z" fill="currentColor"/>',
  chat:'<path d="M21 12a8.5 8.5 0 0 1-12.5 7.5L3 21l1.5-5.5A8.5 8.5 0 1 1 21 12Z"/>',
  bot:'<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4"/><circle cx="12" cy="3.5" r="1"/><path d="M9 13v1M15 13v1"/><path d="M2 13v3M22 13v3"/>',
  megaphone:'<path d="M3 11v3a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1Z"/><path d="M17 8a5 5 0 0 1 0 8"/>',
  mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:'<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4V8Z"/><circle cx="12" cy="13" r="3.5"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.8.7V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.8-.7l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3.9 15H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 .7-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.8-.7V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.8.7l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 .7 2.8H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  userPlus:'<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M19 8v6M16 11h6"/>',
  userCheck:'<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="m16 11 2 2 4-4"/>',
  share:'<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6"/>',
  calc:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18h.01M12 18h.01M16 18h.01"/>',
  shield:'<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3Z"/>',
  clip:'<path d="m21 11-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8l9-9a3.7 3.7 0 0 1 5.2 5.2l-9 9a1.8 1.8 0 0 1-2.6-2.6L15.5 6"/>',
  dots:'<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  // subjects
  math:'<path d="M5 6h14M5 6l7 6-7 6h14"/>',
  geom:'<path d="M4 20 12 4l8 16H4Z"/><path d="M8.5 13h7"/>',
  onatili:'<path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H11v18H5.5A2.5 2.5 0 0 1 3 18.5v-13Z"/><path d="M21 5.5A2.5 2.5 0 0 0 18.5 3H13v18h5.5a2.5 2.5 0 0 0 2.5-2.5v-13Z"/>',
  adabiyot:'<path d="M20 4c-6 0-11 4-12.5 10.5L6 20"/><path d="M20 4c0 6-4 11-11 11.5"/><path d="M12 12 4 20"/>',
  hist:'<path d="M3 21h18M4 10h16M12 3l9 5H3l9-5Z"/><path d="M6 10v8M10 10v8M14 10v8M18 10v8"/>',
  worldhist:'<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/>',
  geo:'<circle cx="12" cy="12" r="9"/><path d="M3.5 9h17M3.5 15h17"/><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18"/>',
  phys:'<circle cx="12" cy="12" r="1.6" fill="currentColor"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>',
  chem:'<path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7 15h10"/>',
  bio:'<path d="M7 3c0 5 10 5 10 9s-10 4-10 9"/><path d="M17 3c0 5-10 5-10 9s10 4 10 9"/><path d="M8 7h8M8 17h8"/>',
  eng:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7.5 9.5h3M7.5 12h2.5M7.5 14.5h3M7.5 9.5v5M13.5 14.5v-5l3 5v-5"/>',
  rus:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7.5 14.5v-5h2a1.5 1.5 0 0 1 0 3h-2m2 0 1.5 2M13.5 9.5v3.5a1.5 1.5 0 0 0 3 0V9.5"/>',
  cs:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/><path d="m9.5 8.5-2 1.5 2 1.5M14.5 8.5l2 1.5-2 1.5"/>',
  huquq:'<path d="M12 3v18M7 21h10M5 7h14"/><path d="m5 7-3 7a3.5 3.5 0 0 0 6 0L5 7ZM19 7l-3 7a3.5 3.5 0 0 0 6 0l-3-7Z"/>',
  logic:'<path d="M9 3.5A3.5 3.5 0 0 0 5.5 7 3.5 3.5 0 0 0 4 13a3.5 3.5 0 0 0 3 5.5A3 3 0 0 0 12 20V5a2.5 2.5 0 0 0-3-1.5Z"/><path d="M15 3.5A3.5 3.5 0 0 1 18.5 7 3.5 3.5 0 0 1 20 13a3.5 3.5 0 0 1-3 5.5A3 3 0 0 1 12 20"/>',
  // reaction stickers (drawn faces instead of emoji)
  r_laugh:'<circle cx="12" cy="12" r="9"/><path d="M7.5 9.5l2 1-2 1M16.5 9.5l-2 1 2 1"/><path d="M7.5 14h9a4.5 4.5 0 0 1-9 0Z"/>',
  r_angry:'<circle cx="12" cy="12" r="9"/><path d="M7 8l3 1.5M17 8l-3 1.5"/><path d="M9 11h.01M15 11h.01"/><path d="M8.5 17a4 4 0 0 1 7 0"/>',
  r_fist:'<path d="M6 12V9a2 2 0 0 1 4 0v3M10 11V8a2 2 0 0 1 4 0v3M14 11V9a2 2 0 0 1 4 0v5a6 6 0 0 1-6 6h-1a5 5 0 0 1-5-5v-2a2 2 0 0 1 2-2h3"/>',
  r_grimace:'<circle cx="12" cy="12" r="9"/><path d="M9 9.5h.01M15 9.5h.01"/><rect x="7" y="13" width="10" height="4" rx="1"/><path d="M10.3 13v4M13.7 13v4"/>',
  r_sleep:'<circle cx="12" cy="12" r="9"/><path d="M7.5 10.5h3M13.5 10.5h3"/><path d="M10 15.5h4"/><path d="M17 3h3l-3 3h3"/>',
};
function icon(name,size,extra){
  const p=ICON_PATHS[name]||ICON_PATHS.info;
  return `<svg class="ico${extra?' '+extra:''}" width="${size||22}" height="${size||22}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}
// Replace every <i data-icon="name" data-size="20"></i> placeholder in the DOM with its SVG.
function hydrateIcons(root){
  (root||document).querySelectorAll('i[data-icon]').forEach(el=>{ el.outerHTML=icon(el.dataset.icon,+el.dataset.size||22); });
}
