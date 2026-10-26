/*
 * Mon PCC — écriture de PDF sans dépendance, avec chiffrement facultatif.
 * Chiffrement : AES-256 (norme PDF 2.0, ISO 32000-2, gestionnaire « Standard » V5/R6),
 * reconnu par les lecteurs PDF actuels (Acrobat, Chrome, Firefox, Android, iPhone…).
 * Polices : Helvetica standard (encodage WinAnsi), aucune police embarquée.
 */

// Largeurs des glyphes (1/1000 em) pour les codes WinAnsi 32 à 255
const W = {
  R: [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,350,556,350,222,556,333,1000,556,556,333,1000,667,333,1000,350,611,350,350,222,222,333,333,350,556,1000,333,1000,500,333,944,350,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500],
  B: [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,350,556,350,278,556,500,1000,556,556,333,1000,667,333,1000,350,611,350,350,278,278,500,500,350,556,1000,333,1000,556,333,944,350,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556],};
W.I = W.R; // Helvetica-Oblique : mêmes largeurs que Helvetica

const UNI = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
  0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91,
  0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98,
  0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
  0x202f: 0x20, 0x2009: 0x20, 0x200b: -1, 0x2011: 0x2d, 0x2010: 0x2d, 0x2212: 0x2d,
};

/** Convertit une chaîne en codes WinAnsi (caractère inconnu → « ? ») */
export function winAnsi(str) {
  const out = [];
  for (const ch of String(str ?? '').normalize('NFC')) {
    const c = ch.codePointAt(0);
    if (c === 0x0a || c === 0x0d) { out.push(0x20); continue; }
    if (UNI[c] !== undefined) { if (UNI[c] >= 0) out.push(UNI[c]); continue; }
    if (c >= 0x20 && c < 0x7f) out.push(c);
    else if (c >= 0xa0 && c <= 0xff) out.push(c);
    else if (c >= 0xfe00 && c <= 0xfe0f) continue; // sélecteurs de variante
    else out.push(0x3f);
  }
  return out;
}

export function textWidth(str, font, size) {
  const t = W[font];
  let w = 0;
  for (const c of winAnsi(str)) w += t[c - 32] ?? 556;
  return (w * size) / 1000;
}

/** Découpe un texte en lignes de largeur maximale donnée */
export function wrap(str, font, size, maxWidth) {
  const lines = [];
  for (const para of String(str ?? '').split(/\n/)) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? line + ' ' + word : word;
      if (textWidth(test, font, size) <= maxWidth) { line = test; continue; }
      if (line) lines.push(line);
      // mot plus long que la ligne : coupe
      let w = word;
      while (textWidth(w, font, size) > maxWidth) {
        let i = w.length - 1;
        while (i > 1 && textWidth(w.slice(0, i), font, size) > maxWidth) i--;
        lines.push(w.slice(0, i));
        w = w.slice(i);
      }
      line = w;
    }
    lines.push(line);
  }
  return lines;
}

/* ---------- outils binaires ---------- */

const te = new TextEncoder();
const latin = (s) => Uint8Array.from(s, (ch) => ch.charCodeAt(0) & 0xff);
const hex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, '0')).join('');
const concat = (...arrs) => {
  const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0));
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
};
const rnd = (n) => crypto.getRandomValues(new Uint8Array(n));

/* ---------- chiffrement AES-256 (R6) ---------- */

async function aesCbc(keyBytes, iv, data, keepPadding) {
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-CBC', false, ['encrypt']);
  const out = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, data));
  return keepPadding ? out : out.slice(0, data.length); // sans le bloc de remplissage
}

/** Algorithme 2.B (ISO 32000-2) */
async function hashR6(pwd, salt, udata = new Uint8Array(0)) {
  let K = new Uint8Array(await crypto.subtle.digest('SHA-256', concat(pwd, salt, udata)));
  for (let round = 0; ; round++) {
    const one = concat(pwd, K, udata);
    const K1 = new Uint8Array(one.length * 64);
    for (let i = 0; i < 64; i++) K1.set(one, i * one.length);
    const E = await aesCbc(K.slice(0, 16), K.slice(16, 32), K1, false);
    let sum = 0;
    for (let i = 0; i < 16; i++) sum += E[i];
    const alg = ['SHA-256', 'SHA-384', 'SHA-512'][sum % 3];
    K = new Uint8Array(await crypto.subtle.digest(alg, E));
    if (round >= 63 && E[E.length - 1] <= round + 1 - 32) break;
  }
  return K.slice(0, 32);
}

async function makeSecurity(password) {
  const pwd = te.encode(password.normalize('NFKC')).slice(0, 127);
  const owner = te.encode(hex(rnd(16)));
  const fileKey = rnd(32);
  const zero = new Uint8Array(16);

  const uv = rnd(8); const uk = rnd(8);
  const U = concat(await hashR6(pwd, uv), uv, uk);
  const UE = await aesCbc(await hashR6(pwd, uk), zero, fileKey, false);

  const ov = rnd(8); const ok = rnd(8);
  const O = concat(await hashR6(owner, ov, U), ov, ok);
  const OE = await aesCbc(await hashR6(owner, ok, U), zero, fileKey, false);

  const P = -4; // toutes les permissions (impression, copie…)
  const perms = new Uint8Array(16);
  new DataView(perms.buffer).setInt32(0, P, true);
  perms.set([0xff, 0xff, 0xff, 0xff], 4);
  perms.set(latin('Tadb'), 8);
  perms.set(rnd(4), 12);
  const Perms = await aesCbc(fileKey, zero, perms, false);

  return {
    fileKey,
    dict: `<< /Filter /Standard /V 5 /R 6 /Length 256 /CF << /StdCF << /AuthEvent /DocOpen /CFM /AESV3 /Length 32 >> >> /StmF /StdCF /StrF /StdCF /O <${hex(O)}> /U <${hex(U)}> /OE <${hex(OE)}> /UE <${hex(UE)}> /P ${P} /Perms <${hex(Perms)}> /EncryptMetadata true >>`,
  };
}

/* ---------- document ---------- */

export class PdfDoc {
  constructor() {
    this.pages = [];   // contenus (chaînes d'opérateurs)
    this.images = [];  // { bytes, width, height }
    this.width = 595.28;
    this.height = 841.89;
  }

  addPage() {
    this.pages.push('');
    return this.pages.length - 1;
  }

  /** Ajoute une image JPEG ; renvoie son nom de ressource */
  addJpeg(bytes, width, height) {
    this.images.push({ bytes, width, height });
    return 'Im' + this.images.length;
  }

  op(page, s) { this.pages[page] += s + '\n'; }

  /** Texte à la position (x, y) — y depuis le haut de la page */
  text(page, x, y, str, font = 'R', size = 10, color = '0 0 0') {
    const bytes = winAnsi(str);
    let s = '';
    for (const b of bytes) {
      const ch = String.fromCharCode(b);
      s += ch === '(' || ch === ')' || ch === '\\' ? '\\' + ch : ch;
    }
    const f = { R: 'F1', B: 'F2', I: 'F3' }[font];
    this.op(page, `BT ${color} rg /${f} ${size} Tf ${x.toFixed(2)} ${(this.height - y).toFixed(2)} Td (${s}) Tj ET`);
  }

  line(page, x1, y1, x2, y2, width = 0.5, gray = 0.6, dash = '') {
    this.op(page, `q ${gray} G ${width} w ${dash ? `[${dash}] 0 d` : ''} ${x1.toFixed(2)} ${(this.height - y1).toFixed(2)} m ${x2.toFixed(2)} ${(this.height - y2).toFixed(2)} l S Q`);
  }

  rect(page, x, y, w, h, { stroke, fill, width = 0.6, radius = 0 } = {}) {
    const Y = this.height - y - h;
    let path;
    if (radius) {
      const r = radius; const k = 0.5523 * r;
      const x2 = x + w; const y2 = Y + h;
      path = `${x + r} ${Y} m ${x2 - r} ${Y} l ${x2 - r + k} ${Y} ${x2} ${Y + r - k} ${x2} ${Y + r} c ${x2} ${y2 - r} l ${x2} ${y2 - r + k} ${x2 - r + k} ${y2} ${x2 - r} ${y2} c ${x + r} ${y2} l ${x + r - k} ${y2} ${x} ${y2 - r + k} ${x} ${y2 - r} c ${x} ${Y + r} l ${x} ${Y + r - k} ${x + r - k} ${Y} ${x + r} ${Y} c h`;
    } else path = `${x} ${Y} ${w} ${h} re`;
    const paint = fill && stroke ? 'B' : fill ? 'f' : 'S';
    this.op(page, `q ${fill ? fill + ' rg' : ''} ${stroke ? stroke + ' RG' : ''} ${width} w ${path} ${paint} Q`);
  }

  image(page, name, x, y, w, h) {
    this.op(page, `q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${(this.height - y - h).toFixed(2)} cm /${name} Do Q`);
  }

  /** Produit le fichier ; chiffré si un mot de passe est fourni */
  async build({ title = '', password = '' } = {}) {
    const sec = password ? await makeSecurity(password) : null;
    const encBytes = async (bytes) => (sec ? concat(...await (async () => { const iv = rnd(16); return [iv, await aesCbc(sec.fileKey, iv, bytes, true)]; })()) : bytes);

    const parts = [];
    const offsets = [];
    let len = 0;
    const push = (u8) => { parts.push(u8); len += u8.length; };
    let n = 0;
    const reserve = () => ++n;

    const catalog = reserve();
    const pagesId = reserve();
    const fonts = [reserve(), reserve(), reserve()];
    const imageIds = this.images.map(() => reserve());
    const pageIds = this.pages.map(() => [reserve(), reserve()]);
    const info = reserve();
    const encrypt = sec ? reserve() : 0;

    const write = (id, dict) => { offsets[id] = len; push(latin(`${id} 0 obj\n${dict}\nendobj\n`)); };
    const writeStream = async (id, dict, bytes) => {
      const body = await encBytes(bytes);
      offsets[id] = len;
      push(latin(`${id} 0 obj\n<< ${dict} /Length ${body.length} >>\nstream\n`));
      push(body);
      push(latin('\nendstream\nendobj\n'));
    };

    push(latin('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n'));
    write(catalog, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
    write(pagesId, `<< /Type /Pages /Kids [${pageIds.map(([p]) => `${p} 0 R`).join(' ')}] /Count ${this.pages.length} >>`);
    ['Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique'].forEach((f, i) =>
      write(fonts[i], `<< /Type /Font /Subtype /Type1 /BaseFont /${f} /Encoding /WinAnsiEncoding >>`));
    for (let i = 0; i < this.images.length; i++) {
      const im = this.images[i];
      await writeStream(imageIds[i], `/Type /XObject /Subtype /Image /Width ${im.width} /Height ${im.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`, im.bytes);
    }
    const xobj = this.images.map((_, i) => `/Im${i + 1} ${imageIds[i]} 0 R`).join(' ');
    for (let i = 0; i < this.pages.length; i++) {
      const [pid, cid] = pageIds[i];
      write(pid, `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${this.width} ${this.height}] /Resources << /Font << /F1 ${fonts[0]} 0 R /F2 ${fonts[1]} 0 R /F3 ${fonts[2]} 0 R >> ${xobj ? `/XObject << ${xobj} >>` : ''} >> /Contents ${cid} 0 R >>`);
      await writeStream(cid, '', latin(this.pages[i]));
    }
    const titleBytes = Uint8Array.from(winAnsi(title));
    write(info, `<< /Title <${hex(await encBytes(titleBytes))}> /Producer <${hex(await encBytes(latin('Mon PCC')))}> >>`);
    if (sec) write(encrypt, sec.dict);

    const id = hex(rnd(16));
    const xref = len;
    let x = `xref\n0 ${n + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= n; i++) x += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    x += `trailer\n<< /Size ${n + 1} /Root ${catalog} 0 R /Info ${info} 0 R /ID [<${id}> <${id}>]${sec ? ` /Encrypt ${encrypt} 0 R` : ''} >>\nstartxref\n${xref}\n%%EOF\n`;
    push(latin(x));
    return new Blob(parts, { type: 'application/pdf' });
  }
}

/** Lit largeur et hauteur d'un JPEG */
export function jpegSize(b) {
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    const l = (b[i + 2] << 8) | b[i + 3];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { height: (b[i + 5] << 8) | b[i + 6], width: (b[i + 7] << 8) | b[i + 8] };
    i += 2 + l;
  }
  return null;
}
