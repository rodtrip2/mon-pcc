/*
 * Mon PCC — lecteurs intégrés (vidéos, musique, podcasts) pour les liens de la boîte à outils.
 *
 * Confidentialité : rien n'est chargé depuis ces sites tant que la personne
 * ne touche pas « Lire ici » (et après un avertissement). Les versions « sans
 * cookies » / « ne pas suivre » sont utilisées quand elles existent.
 * Le titre d'un lien est demandé au site (oEmbed) une seule fois, à l'ajout du lien.
 */

const id = (s) => encodeURIComponent(s);

/**
 * Reconnaît un lien et renvoie { provider, src, ratio | height, oembed, referrer } ou null.
 * ratio : proportions (largeur / hauteur) pour les vidéos ; height : hauteur fixe en px.
 */
export function parseEmbed(raw) {
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const host = u.hostname.replace(/^(www|m|mobile)\./, '');
  const path = u.pathname;
  let m;

  // YouTube (vidéos, shorts, direct, playlists, YouTube Music)
  if (['youtube.com', 'youtu.be', 'youtube-nocookie.com', 'music.youtube.com'].includes(host)) {
    let vid = null;
    if (host === 'youtu.be') vid = path.slice(1).split('/')[0];
    else if ((m = path.match(/^\/(?:embed|shorts|live|v)\/([\w-]{6,})/))) vid = m[1];
    else vid = u.searchParams.get('v');
    const list = u.searchParams.get('list');
    const oembed = `https://www.youtube.com/oembed?format=json&url=${id(raw)}`;
    const vertical = /^\/shorts\//.test(path);
    if (vid && /^[\w-]{6,}$/.test(vid)) {
      const start = parseInt(u.searchParams.get('t') || u.searchParams.get('start') || '0', 10);
      return { provider: 'YouTube', src: `https://www.youtube-nocookie.com/embed/${id(vid)}?rel=0${start ? '&start=' + start : ''}`, ratio: vertical ? 9 / 16 : 16 / 9, oembed, referrer: 'strict-origin' };
    }
    if (list) return { provider: 'YouTube', src: `https://www.youtube-nocookie.com/embed/videoseries?list=${id(list)}`, ratio: 16 / 9, oembed, referrer: 'strict-origin' };
    return null;
  }

  // Vimeo
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    if ((m = path.match(/(?:^|\/)(\d{5,})(?:\/([\da-f]{6,}))?/))) {
      const h = u.searchParams.get('h') || m[2];
      return { provider: 'Vimeo', src: `https://player.vimeo.com/video/${m[1]}?dnt=1${h ? '&h=' + id(h) : ''}`, ratio: 16 / 9, oembed: `https://vimeo.com/api/oembed.json?url=${id(raw)}` };
    }
    return null;
  }

  // Dailymotion
  if (host === 'dailymotion.com' || host === 'dai.ly') {
    m = host === 'dai.ly' ? path.match(/^\/([a-z0-9]+)/i) : path.match(/\/video\/([a-z0-9]+)/i);
    if (m) return { provider: 'Dailymotion', src: `https://www.dailymotion.com/embed/video/${id(m[1])}`, ratio: 16 / 9, oembed: `https://www.dailymotion.com/services/oembed?format=json&url=${id(raw)}` };
    return null;
  }

  // Spotify (titres, albums, playlists, podcasts, épisodes, artistes)
  if (host === 'open.spotify.com') {
    m = path.match(/^\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/);
    if (m) return { provider: 'Spotify', src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, height: m[1] === 'track' || m[1] === 'episode' ? 152 : 352, oembed: `https://open.spotify.com/oembed?url=${id(raw)}` };
    return null;
  }

  // Deezer
  if (host === 'deezer.com') {
    m = path.match(/^\/(?:[a-z]{2}\/)?(track|album|playlist|episode|show|artist)\/(\d+)/);
    if (m) return { provider: 'Deezer', src: `https://widget.deezer.com/widget/auto/${m[1]}/${m[2]}`, height: m[1] === 'track' || m[1] === 'episode' ? 160 : 380, oembed: `https://api.deezer.com/oembed?format=json&url=${id(raw)}` };
    return null;
  }

  // SoundCloud
  if (host === 'soundcloud.com' || host === 'on.soundcloud.com') {
    if (host === 'soundcloud.com' && path.split('/').filter(Boolean).length >= 2) {
      const set = /\/sets\//.test(path);
      return { provider: 'SoundCloud', src: `https://w.soundcloud.com/player/?url=${id(raw)}&visual=false&show_comments=false`, height: set ? 400 : 166, oembed: `https://soundcloud.com/oembed?format=json&url=${id(raw)}` };
    }
    return null;
  }

  // Apple Music et Apple Podcasts
  if (host === 'music.apple.com' || host === 'podcasts.apple.com') {
    const single = u.searchParams.get('i') || /\/song\//.test(path) || /[?&]i=/.test(u.search);
    return { provider: host === 'music.apple.com' ? 'Apple Music' : 'Apple Podcasts', src: `https://embed.${host}${path}${u.search}`, height: single ? 175 : 450 };
  }

  // TikTok
  if (host === 'tiktok.com') {
    if ((m = path.match(/\/video\/(\d+)/))) return { provider: 'TikTok', src: `https://www.tiktok.com/embed/v2/${m[1]}`, height: 740, oembed: `https://www.tiktok.com/oembed?url=${id(raw)}` };
    return null;
  }

  // Instagram (publications et reels)
  if (host === 'instagram.com') {
    if ((m = path.match(/^\/(p|reel|tv)\/([\w-]+)/))) return { provider: 'Instagram', src: `https://www.instagram.com/${m[1]}/${m[2]}/embed`, height: 620 };
    return null;
  }

  // Fichiers audio ou vidéo directs
  if (/\.(mp4|webm|ogv|mov)$/i.test(path)) return { provider: host, media: 'video', src: u.href, ratio: 16 / 9 };
  if (/\.(mp3|ogg|oga|m4a|aac|wav|opus)$/i.test(path)) return { provider: host, media: 'audio', src: u.href, height: 54 };

  return null;
}

/** Demande le titre au site (oEmbed). Renvoie une chaîne ou '' (jamais d'erreur). */
export async function fetchTitle(raw) {
  const e = parseEmbed(raw);
  if (!e?.oembed) return '';
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const r = await fetch(e.oembed, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctrl.signal });
    if (!r.ok) return '';
    const j = await r.json();
    const title = String(j.title || '').trim();
    const author = String(j.author_name || '').trim();
    return title && author && !title.includes(author) && e.provider !== 'Spotify' ? `${title} — ${author}` : title;
  } catch {
    return '';
  } finally {
    clearTimeout(t);
  }
}

/** Domaines autorisés dans la politique de sécurité (CSP) */
export const FRAME_HOSTS = [
  'https://www.youtube-nocookie.com', 'https://player.vimeo.com', 'https://www.dailymotion.com',
  'https://open.spotify.com', 'https://widget.deezer.com', 'https://w.soundcloud.com',
  'https://embed.music.apple.com', 'https://embed.podcasts.apple.com', 'https://www.tiktok.com',
  'https://www.instagram.com',
];
export const OEMBED_HOSTS = [
  'https://www.youtube.com', 'https://vimeo.com', 'https://www.dailymotion.com', 'https://open.spotify.com',
  'https://api.deezer.com', 'https://soundcloud.com', 'https://www.tiktok.com',
];
