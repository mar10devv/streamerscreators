import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type YTItem = {
  id: string; // videoId
  title: string;
  channelTitle: string;
  publishedAt: string;
  thumbnail: string | null;
  url: string | null; // shorts url
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function jsonOk(r: Response) {
  const ct = r.headers.get("content-type") || "";
  return r.ok && ct.includes("application/json");
}

function pickThumb(thumbnails: any): string | null {
  const arr = thumbnails?.thumbnails || thumbnails || null;
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const best = arr[arr.length - 1];
  return typeof best?.url === "string" ? best.url : null;
}

function safeText(x: any): string {
  if (!x) return "";
  if (typeof x === "string") return x;
  if (typeof x?.simpleText === "string") return x.simpleText;
  const runs = x?.runs;
  if (Array.isArray(runs)) return runs.map((r) => r?.text).filter(Boolean).join("");
  return "";
}

function normalizeText(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function tokenizeTopic(topic: string) {
  const t = normalizeText(topic);
  return t
    .split(/[\s/_,.-]+/g)
    .map((x) => x.trim())
    .filter((x) => x.length >= 3);
}

/** ====== Filtro pragmático de idioma (por escritura en texto) ====== */
function containsNonLatinScript(s: string) {
  // Árabe
  if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(s)) return true;
  // Hebreo
  if (/[\u0590-\u05FF]/.test(s)) return true;
  // Cirílico
  if (/[\u0400-\u04FF]/.test(s)) return true;
  // Devanagari
  if (/[\u0900-\u097F]/.test(s)) return true;
  // Tailandés
  if (/[\u0E00-\u0E7F]/.test(s)) return true;
  // Japonés
  if (/[\u3040-\u30FF]/.test(s)) return true;
  // Chino (CJK)
  if (/[\u4E00-\u9FFF]/.test(s)) return true;
  // Coreano (Hangul)
  if (/[\uAC00-\uD7AF]/.test(s)) return true;

  return false;
}

function matchSpanishPlatform(item: YTItem) {
  const raw = `${item.title} ${item.channelTitle}`;
  return !containsNonLatinScript(raw);
}

/** ====== Preferencia de español (no bloquea fuerte, prioriza) ====== */
function spanishScore(item: YTItem) {
  const raw = `${item.title} ${item.channelTitle}`.trim();
  const rawLower = raw.toLowerCase();
  const norm = normalizeText(raw);

  let score = 0;

  // acentos / ñ
  if (/[áéíóúñü]/i.test(raw)) score += 3;

  // palabras comunes ES
  const spanishWordRE =
    /\b(como|que|para|por|con|sin|en|es|son|del|al|una|uno|unos|unas|el|la|los|las|hoy|mejor|nuevo|guia|explicado|tutorial|trucos|consejos|reseña|comparativa|espanol|latino|latam)\b/i;

  if (spanishWordRE.test(rawLower)) score += 2;

  // hint fuerte
  if (norm.includes("espanol") || norm.includes("latino") || norm.includes("latam")) score += 3;

  return score;
}

function prioritizeSpanish(items: YTItem[]) {
  return [...items].sort((a, b) => spanishScore(b) - spanishScore(a));
}

/** ====== Shuffle con seed (para que “Refrescar” cambie) ====== */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleSeeded<T>(arr: T[], seed: number) {
  const a = [...arr];
  const rnd = mulberry32(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** ====== Topic matcher (igual que lo tuyo) ====== */
function buildTopicMatcher(topicRaw: string) {
  const topic = normalizeText(topicRaw);

  const isFootball =
    topic.includes("futbol") || topic.includes("fútbol") || topic.includes("football") || topic.includes("soccer");

  if (isFootball) {
    const POS = [
      "futbol",
      "football",
      "soccer",
      "gol",
      "goles",
      "partido",
      "liga",
      "champions",
      "mundial",
      "copa",
      "penal",
      "penales",
      "var",
      "messi",
      "ronaldo",
      "barcelona",
      "real madrid",
      "psg",
      "seleccion",
      "club",
      "derbi",
      "clasico",
    ];

    const NEG = [
      "iphone",
      "samsung",
      "review",
      "unboxing",
      "celular",
      "telefono",
      "smartphone",
      "regalos",
      "sorteo",
      "quiz",
      "trivia",
      "restor",
      "restore",
      "uriphone",
    ];

    return (item: YTItem) => {
      const text = normalizeText(`${item.title} ${item.channelTitle}`);
      const hasPos = POS.some((k) => text.includes(k));
      const hasNeg = NEG.some((k) => text.includes(k));
      return hasPos && !hasNeg;
    };
  }

  const tokens = tokenizeTopic(topicRaw);
  return (item: YTItem) => {
    const text = normalizeText(`${item.title} ${item.channelTitle}`);
    if (tokens.length === 0) return text.includes(topic);

    const needed = tokens.length >= 3 ? 2 : 1;
    let hits = 0;
    for (const tok of tokens) {
      if (text.includes(tok)) hits++;
      if (hits >= needed) return true;
    }
    return false;
  };
}

function dedupeById(items: YTItem[]) {
  const seen = new Set<string>();
  const out: YTItem[] = [];
  for (const it of items) {
    if (!it?.id) continue;
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
  }
  return out;
}

function extractJsonObjectAfter(html: string, needle: string): any | null {
  const i = html.indexOf(needle);
  if (i < 0) return null;

  const start = html.indexOf("{", i);
  if (start < 0) return null;

  let depth = 0;
  let inStr = false;
  let esc = false;

  for (let j = start; j < html.length; j++) {
    const c = html[j];

    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    } else {
      if (c === '"') {
        inStr = true;
        continue;
      }
      if (c === "{") depth++;
      if (c === "}") depth--;

      if (depth === 0) {
        const raw = html.slice(start, j + 1);
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function getSearchRoot(initialData: any) {
  return (
    initialData?.contents?.twoColumnSearchResultsRenderer?.primaryContents ||
    initialData?.contents?.twoColumnSearchResultsRenderer ||
    initialData
  );
}

function collectReelItems(root: any, limit: number): YTItem[] {
  const out: YTItem[] = [];
  const stack: any[] = [root];

  while (stack.length && out.length < limit) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object") continue;

    if (cur.reelItemRenderer && typeof cur.reelItemRenderer === "object") {
      const r = cur.reelItemRenderer;
      const videoId = r.videoId;
      if (typeof videoId === "string" && videoId) {
        const title = safeText(r.headline) || safeText(r.title) || "YouTube Short";
        const channelTitle =
          safeText(r.shortBylineText) || safeText(r.ownerText) || safeText(r.longBylineText) || "";
        const thumbnail = pickThumb(r.thumbnail);
        out.push({
          id: videoId,
          title,
          channelTitle,
          publishedAt: "",
          thumbnail,
          url: `https://www.youtube.com/shorts/${videoId}`,
        });
      }
    }

    for (const k of Object.keys(cur)) {
      const v = (cur as any)[k];
      if (v && typeof v === "object") stack.push(v);
    }
  }

  return out;
}

function collectVideoRenderers(root: any, limit: number): YTItem[] {
  const out: YTItem[] = [];
  const stack: any[] = [root];

  while (stack.length && out.length < limit) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object") continue;

    if (cur.videoRenderer && typeof cur.videoRenderer === "object") {
      const v = cur.videoRenderer;
      const videoId = v.videoId;
      if (typeof videoId === "string" && videoId) {
        const title = safeText(v.title) || "YouTube Video";
        const channelTitle = safeText(v.ownerText) || safeText(v.shortBylineText) || "";
        const thumbnail = pickThumb(v.thumbnail);
        out.push({
          id: videoId,
          title,
          channelTitle,
          publishedAt: "",
          thumbnail,
          url: `https://www.youtube.com/watch?v=${videoId}`,
        });
      }
    }

    for (const k of Object.keys(cur)) {
      const v = (cur as any)[k];
      if (v && typeof v === "object") stack.push(v);
    }
  }

  return out;
}

/** ====== HTML scrape con VARIAS queries para diversidad ====== */
async function fetchShortsFromYouTubeHTMLVariants(topic: string, limit: number): Promise<YTItem[]> {
  const variants = [
    `${topic} shorts`,
    `${topic} shorts en español`,
    `${topic} shorts latam`,
  ];

  const all: YTItem[] = [];
  const rawLimit = Math.min(limit * 6, 80);

  for (const q of variants) {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgZzaG9ydH&hl=es&gl=ES`;

    const r = await fetch(url, {
      headers: {
        "user-agent": UA,
        "accept-language": "es-ES,es;q=0.9,en;q=0.8",
        accept: "text/html",
      },
      cache: "no-store",
    });

    const html = await r.text();

    let data =
      extractJsonObjectAfter(html, "var ytInitialData =") ||
      extractJsonObjectAfter(html, 'window["ytInitialData"] =') ||
      extractJsonObjectAfter(html, "ytInitialData =");

    if (!data) {
      data = extractJsonObjectAfter(html, '"ytInitialData":');
      if (data?.ytInitialData) data = data.ytInitialData;
    }

    if (!data) continue;

    const root = getSearchRoot(data);
    const reels = collectReelItems(root, rawLimit);
    if (reels.length) all.push(...reels);
    else all.push(...collectVideoRenderers(root, rawLimit));
  }

  return all;
}

/** ====== Invidious con multipágina ====== */
async function tryInvidiousMultiPage(topic: string, limit: number): Promise<YTItem[] | null> {
  const instancesUrl = "https://api.invidious.io/instances.json?sort_by=health";
  try {
    const inst = await fetch(instancesUrl, {
      headers: { "user-agent": UA, accept: "application/json" },
      cache: "no-store",
    });

    if (!jsonOk(inst)) return null;

    const list = (await inst.json()) as any[];
    const candidates: string[] = [];

    for (const row of list) {
      const meta = row?.[1];
      const uri = meta?.uri;
      const api = meta?.api;
      if (api && typeof uri === "string" && uri.startsWith("http")) candidates.push(uri);
      if (candidates.length >= 6) break;
    }

    const q = `${topic} shorts`;
    const pages = [1, 2, 3];

    for (const base of candidates) {
      const collected: YTItem[] = [];

      for (const page of pages) {
        const u = `${base}/api/v1/search?q=${encodeURIComponent(q)}&type=video&sort_by=publish_date&page=${page}`;
        try {
          const r = await fetch(u, {
            headers: { "user-agent": UA, accept: "application/json" },
            cache: "no-store",
          });

          if (!jsonOk(r)) continue;

          const j = (await r.json()) as any[];
          if (!Array.isArray(j)) continue;

          const items: YTItem[] = j
            .filter((x) => x && typeof x === "object" && typeof x.videoId === "string")
            .slice(0, 60)
            .map((x) => {
              const thumbs = x.videoThumbnails || x.videoThumbnails?.thumbnails || null;
              const thumb =
                Array.isArray(thumbs) && thumbs.length ? thumbs[thumbs.length - 1]?.url || null : null;

              return {
                id: x.videoId,
                title: x.title || "YouTube Video",
                channelTitle: x.author || "",
                publishedAt: x.publishedText || "",
                thumbnail: thumb,
                url: x.videoId ? `https://www.youtube.com/shorts/${x.videoId}` : null,
              };
            });

          collected.push(...items);

          // si ya juntamos “de sobra”, cortamos
          if (dedupeById(collected).length >= limit * 4) break;
        } catch {
          // seguimos con otra página/instancia
        }
      }

      const ded = dedupeById(collected);
      if (ded.length) return ded;
    }

    return null;
  } catch {
    return null;
  }
}

function respond(items: YTItem[]) {
  return NextResponse.json({ items }, { headers: NO_STORE_HEADERS });
}

export async function GET(req: NextRequest) {
  const topic = (req.nextUrl.searchParams.get("topic") || "").trim();
  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit") || 10), 1), 20);

  // seed opcional para refrescar desde UI: ?seed=123
  const seedParam = req.nextUrl.searchParams.get("seed");
  const seed = Number.isFinite(Number(seedParam)) ? Number(seedParam) : Date.now();

  if (!topic) return respond([]);

  const matchTopic = buildTopicMatcher(topic);

  // 1) Invidious multipágina
  const invRaw = await tryInvidiousMultiPage(topic, limit);
  if (invRaw && invRaw.length) {
    const base = prioritizeSpanish(dedupeById(invRaw).filter(matchSpanishPlatform));

    const topicMatched = base.filter(matchTopic);
    const preferred = topicMatched.filter((x) => spanishScore(x) >= 2);

    const chosenBase = preferred.length >= Math.max(4, Math.floor(limit / 2)) ? preferred : topicMatched;

    const boosted = [
      ...chosenBase,
      ...base.filter((x) => !matchTopic(x)),
    ];

    const final = shuffleSeeded(dedupeById(boosted), seed).slice(0, limit);
    return respond(final);
  }

  // 2) HTML scrape con variantes de query
  try {
    const raw = await fetchShortsFromYouTubeHTMLVariants(topic, limit);
    const base = prioritizeSpanish(dedupeById(raw).filter(matchSpanishPlatform));

    const topicMatched = base.filter(matchTopic);
    const preferred = topicMatched.filter((x) => spanishScore(x) >= 2);

    const chosenBase = preferred.length >= Math.max(4, Math.floor(limit / 2)) ? preferred : topicMatched;

    const boosted = [
      ...chosenBase,
      ...base.filter((x) => !matchTopic(x)),
    ];

    const final = shuffleSeeded(dedupeById(boosted), seed).slice(0, limit);
    return respond(final);
  } catch (e: any) {
    return NextResponse.json(
      { items: [] as YTItem[], error: "youtube_fetch_failed", detail: String(e?.message || e) },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  }
}
