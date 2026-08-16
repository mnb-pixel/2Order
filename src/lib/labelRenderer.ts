import QRCode from 'qrcode';
import { CustomLabelData, RecipeItem, CraftCategory, AllergenCode } from './types';
import { ALLERGEN_LABELS } from './allergens';

export interface LabelRenderOptions {
  category: CraftCategory;
  producerName: string;
  customLabel: CustomLabelData;
  recipe?: RecipeItem[];
  selections?: Record<string, string>;
  productTitle: string;
  weightText: string;
  allergens?: AllergenCode[];
  traceabilityUrl?: string; // if provided, a scannable QR is embedded encoding a plain-text batch/lot summary
}

// Standalone scannable QR snippet for traceability display outside the main label
// (e.g. OrderTracker / KDS print slip once a real lot number exists). The QR payload
// is a plain-text batch summary — this app has no client-side router to resolve a
// public URL against, so the code is honestly scoped to "scan to read", not "scan to browse".
export function generateTraceabilityQrSvg(payloadText: string, sizePx: number = 140): string {
  const inner = renderQrModulesSvg(payloadText, 4, 4, sizePx - 8);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sizePx} ${sizePx}" width="${sizePx}" height="${sizePx}">${inner}</svg>`;
}

function renderQrModulesSvg(text: string, x: number, y: number, boxSize: number): string {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const size = qr.modules.size;
  const cell = boxSize / size;
  let rects = '';
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.modules.get(col, row)) {
        rects += `<rect x="${(x + col * cell).toFixed(2)}" y="${(y + row * cell).toFixed(2)}" width="${(cell + 0.3).toFixed(2)}" height="${(cell + 0.3).toFixed(2)}" fill="#111111" />`;
      }
    }
  }
  return `<rect x="${x - 4}" y="${y - 4}" width="${boxSize + 8}" height="${boxSize + 8}" fill="#FFFFFF" stroke="#E5E5DF" stroke-width="1" />${rects}`;
}

export function generateLabelSvg(options: LabelRenderOptions): string {
  const { producerName, customLabel, recipe, selections, productTitle, weightText, allergens, traceabilityUrl } = options;
  const { headline, subtitle, dedication, fontStyle, batchNumber, roastOrBrewDate } = customLabel;

  // Font family mapping
  let mainFont = 'Inter, -apple-system, sans-serif';
  let fontClass = 'font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;';

  if (fontStyle === 'editorial-serif') {
    mainFont = '"Playfair Display", Georgia, serif';
    fontClass = 'font-weight: 500; font-style: italic; letter-spacing: 0.01em; text-transform: none;';
  } else if (fontStyle === 'minimal-mono') {
    mainFont = '"JetBrains Mono", monospace';
    fontClass = 'font-weight: 500; letter-spacing: -0.02em; text-transform: none;';
  }

  const recipeBreakout = recipe && recipe.length > 0
    ? recipe.map(r => `${r.ratio}% ${r.componentName} (${r.grams}g)`).join(' · ')
    : '';

  const selectionText = selections
    ? Object.entries(selections).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(' | ')
    : '';

  const allergenText = allergens && allergens.length > 0
    ? `ENTHÄLT: ${allergens.map(a => ALLERGEN_LABELS[a]).join(', ')}`
    : 'Keine deklarationspflichtigen Allergene bekannt';

  const qrBlock = traceabilityUrl ? renderQrModulesSvg(traceabilityUrl, 655, 320, 90) : '';

  // Return crisp, high-res scalable SVG string
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="100%" height="100%" style="background-color: #FFFFFF; font-family: ${mainFont};">
      <defs>
        <pattern id="dotGrid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#EAEAEA" />
        </pattern>
        <linearGradient id="terracottaFade" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#9C4A2F" />
          <stop offset="100%" stop-color="#111111" />
        </linearGradient>
      </defs>

      <!-- Outer Swiss Frame -->
      <rect x="15" y="15" width="770" height="470" fill="#FCFCFB" stroke="#111111" stroke-width="2" rx="4" />
      <rect x="25" y="25" width="750" height="450" fill="url(#dotGrid)" opacity="0.4" />

      <!-- Top Header Bar -->
      <line x1="25" y1="85" x2="775" y2="85" stroke="#111111" stroke-width="1.5" />

      <!-- Producer Logo & Category Seal -->
      <text x="45" y="60" font-size="14" font-weight="700" fill="#111111" letter-spacing="0.18em" font-family="'Inter', sans-serif">
        ✦ ${producerName.toUpperCase()}
      </text>

      <rect x="630" y="42" width="115" height="26" fill="#111111" rx="2" />
      <text x="687" y="59" font-size="11" font-weight="600" fill="#FFFFFF" text-anchor="middle" letter-spacing="0.12em" font-family="'Inter', sans-serif">
        MADE-TO-ORDER
      </text>

      <!-- Main Personalized Headline -->
      <text x="45" y="155" font-size="28" fill="#111111" style="${fontClass}">
        ${escapeXml(headline || productTitle)}
      </text>

      <!-- Subtitle -->
      <text x="45" y="190" font-size="14" fill="#555555" font-family="'Inter', sans-serif" font-weight="400">
        ${escapeXml(subtitle || 'Custom Bespoke Creation')}
      </text>

      <!-- Dedication / Custom Message if present -->
      ${dedication ? `
        <rect x="45" y="215" width="710" height="40" fill="#F4F4F0" rx="3" stroke="#E5E5DF" stroke-width="1" />
        <text x="60" y="240" font-size="13" font-style="italic" fill="#333333" font-family="'Playfair Display', serif">
          "${escapeXml(dedication)}"
        </text>
      ` : ''}

      <!-- Recipe Visual Breakdown Bar -->
      <g transform="translate(45, ${dedication ? 280 : 230})">
        <text x="0" y="0" font-size="11" font-weight="700" fill="#111111" letter-spacing="0.15em" font-family="'Inter', sans-serif">
          SPEZIFIKATION & REZEPTUR
        </text>
        <line x1="0" y1="10" x2="710" y2="10" stroke="#E5E5DF" stroke-width="1" />

        <!-- Recipe pills or segments -->
        <text x="0" y="32" font-size="12.5" font-weight="500" fill="#222222" font-family="'JetBrains Mono', monospace">
          ${escapeXml(recipeBreakout || selectionText || 'Handgefertigt nach Auftrag')}
        </text>

        ${selectionText ? `
          <text x="0" y="52" font-size="11.5" fill="#666666" font-family="'Inter', sans-serif">
            ${escapeXml(selectionText)}
          </text>
        ` : ''}

        <!-- Allergen declaration (LMIV / LIV Pflichtangabe) -->
        <text x="0" y="76" font-size="10.5" font-weight="700" fill="#9C4A2F" font-family="'Inter', sans-serif">
          ${escapeXml(allergenText)}
        </text>
      </g>

      <!-- Bottom Meta Section -->
      <line x1="25" y1="415" x2="775" y2="415" stroke="#111111" stroke-width="1.5" />

      <!-- Batch ID -->
      <g transform="translate(45, 448)">
        <text x="0" y="0" font-size="10" font-weight="600" fill="#888888" letter-spacing="0.1em" font-family="'Inter', sans-serif">BATCH / LOT</text>
        <text x="0" y="15" font-size="13" font-weight="700" fill="#111111" font-family="'JetBrains Mono', monospace">${escapeXml(batchNumber || 'CH-MTO-001')}</text>
      </g>

      <!-- Date -->
      <g transform="translate(240, 448)">
        <text x="0" y="0" font-size="10" font-weight="600" fill="#888888" letter-spacing="0.1em" font-family="'Inter', sans-serif">DATUM / FRISCHE</text>
        <text x="0" y="15" font-size="13" font-weight="600" fill="#111111" font-family="'Inter', sans-serif">${escapeXml(roastOrBrewDate || new Date().toLocaleDateString('de-CH'))}</text>
      </g>

      <!-- Net Weight -->
      <g transform="translate(430, 448)">
        <text x="0" y="0" font-size="10" font-weight="600" fill="#888888" letter-spacing="0.1em" font-family="'Inter', sans-serif">NETTOGEWICHT</text>
        <text x="0" y="15" font-size="13" font-weight="600" fill="#111111" font-family="'Inter', sans-serif">${escapeXml(weightText || '500g')}</text>
      </g>

      <!-- Swiss Origin Stamp -->
      <g transform="translate(${traceabilityUrl ? 555 : 640}, 436)">
        <rect x="0" y="0" width="${traceabilityUrl ? 90 : 105}" height="32" fill="none" stroke="#111111" stroke-width="1" rx="2" />
        <text x="${traceabilityUrl ? 45 : 52}" y="20" font-size="${traceabilityUrl ? 9.5 : 10.5}" font-weight="700" fill="#111111" text-anchor="middle" letter-spacing="0.1em" font-family="'Inter', sans-serif">
          + SWISS CRAFT
        </text>
      </g>

      ${qrBlock ? `
      <!-- Scannable Herkunfts-/Chargen-QR-Code -->
      <g>
        ${qrBlock}
        <text x="700" y="422" font-size="8" fill="#888888" text-anchor="middle" font-family="'Inter', sans-serif">HERKUNFT SCANNEN</text>
      </g>
      ` : ''}
    </svg>
  `;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
