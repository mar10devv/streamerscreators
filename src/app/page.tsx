"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loginConGoogle, cerrarSesion } from "../lib/auth";
import { useFirebaseUser } from "../lib/useFirebaseUser";

function isValidUrl(value: string) {
  try {
    const u = new URL(value.trim());
    return ["http:", "https:"].includes(u.protocol);
  } catch {
    return false;
  }
}

function getDomainLabel(raw: string) {
  try {
    const host = new URL(raw).hostname.replace("www.", "");
    if (host.includes("tiktok")) return "TikTok";
    if (host.includes("instagram")) return "Instagram";
    if (host.includes("youtube") || host.includes("youtu.be")) return "YouTube";
    return host;
  } catch {
    return null;
  }
}

type ClipboardState =
  | "idle"
  | "checking"
  | "unsupported"
  | "empty"
  | "invalid"
  | "valid";

type DiscordServer = { id: string; name: string };
type DiscordChannel = { id: string; name: string };

type DiscordCallbackData = {
  user: any;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  servers: DiscordServer[];
  guildId?: string | null; // ✅ server donde se agregó el bot
};

type YTItem = {
  id: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  thumbnail: string | null;
  url: string | null;
};

const INTERESES_SUGERIDOS = [
  "Videojuegos",
  "Fútbol",
  "Música",
  "Rap",
  "Jardinería",
  "Cocina",
  "Autos",
  "Fitness",
  "Memes",
  "Tecnología",
  "Anime",
  "Cine",
  "Streamers",
  "Podcasts",
  "Historia",
  "Ciencia",
];

// ✅ Persistencia tema (localStorage)
const THEME_STORAGE_KEY = "sc_theme";
type ThemeMode = "light" | "dark";

// ✅ Persistencia callback discord (por si el auth tarda en hidratar)
const PENDING_DISCORD_KEY = "sc_pending_discord_data";

// ✅ Icono Google (inline, sin dependencias)
function GoogleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.7 1.23 9.2 3.64l6.87-6.87C35.9 2.49 30.3 0 24 0 14.64 0 6.56 5.38 2.68 13.22l8.04 6.25C12.6 13.5 17.86 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.1 24.5c0-1.64-.15-3.22-.43-4.75H24v9h12.4c-.54 2.9-2.18 5.36-4.66 7.02l7.55 5.86C43.64 37.54 46.1 31.5 46.1 24.5z"
      />
      <path
        fill="#FBBC05"
        d="M10.72 28.47A14.47 14.47 0 0 1 10 24c0-1.55.26-3.05.72-4.47l-8.04-6.25A23.93 23.93 0 0 0 0 24c0 3.95.95 7.68 2.68 10.78l8.04-6.31z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.3 0 11.6-2.08 15.47-5.66l-7.55-5.86c-2.1 1.41-4.8 2.24-7.92 2.24-6.14 0-11.4-4-13.28-9.47l-8.04 6.31C6.56 42.62 14.64 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

const THEMES = {
  light: {
    pageBg: "bg-white text-[#2b0a5a]",
    subtleText: "text-[#2b0a5a]/60",
    bodyText: "text-[#2b0a5a]/75",
    titleAccent: "text-[#5b21b6]/85",
    card: "border-[#2b0a5a]/10 bg-white/60",
    cardAlt: "border-[#2b0a5a]/10 bg-white/60",
    chip: "border-[#2b0a5a]/15 bg-[#5b21b6]/5 text-[#2b0a5a]/80",
    input:
      "bg-white/70 border-[#2b0a5a]/15 text-[#2b0a5a] placeholder:text-[#2b0a5a]/35 focus:border-[#5b21b6]/40",
    btnPrimary: "bg-[#5b21b6] text-white hover:opacity-95",
    btnSecondary:
      "border-[#2b0a5a]/20 text-[#2b0a5a] hover:bg-[#5b21b6]/5",
    tipBox: "border-[#2b0a5a]/10 bg-[#5b21b6]/5",
    footerText: "text-[#2b0a5a]/50",
    glow1: "bg-[#5b21b6]/15",
    glow2: "bg-[#2b0a5a]/5",
    shellBg: "bg-white/55 border-[#2b0a5a]/12",
    pasteReady: "bg-[#5b21b6] text-white hover:opacity-95",
    overlay: "bg-black/55 backdrop-blur-md",
    drawerPanel:
      "bg-white/88 border-[#5b21b6]/15 shadow-[0_30px_90px_rgba(0,0,0,0.25)]",
    modalPanel:
      "bg-white/92 border-[#5b21b6]/15 shadow-[0_30px_90px_rgba(0,0,0,0.25)]",
    googleBtn:
      "bg-white/70 border-[#2b0a5a]/18 text-[#2b0a5a] hover:bg-[#5b21b6]/7",
    toggleOnTrack: "bg-[#5b21b6]/15 border-[#2b0a5a]/20",
    toggleOffTrack: "bg-black/5 border-[#2b0a5a]/20",
    toggleOnKnob: "bg-[#5b21b6]",
    toggleOffKnob: "bg-[#2b0a5a]/50",
  },
  dark: {
    pageBg: "bg-black text-white",
    subtleText: "text-white/60",
    bodyText: "text-white/70",
    titleAccent: "text-white/80",
    card: "border-white/10 bg-white/6",
    cardAlt: "border-white/10 bg-white/6",
    chip: "border-white/15 bg-black/30 text-white/70",
    input:
      "bg-black/30 border-white/10 text-white placeholder:text-white/30 focus:border-white/25",
    btnPrimary: "bg-white text-black hover:opacity-90",
    btnSecondary: "border-white/15 text-white/90 hover:bg-white/5",
    tipBox: "border-white/10 bg-black/30",
    footerText: "text-white/45",
    glow1: "bg-white/10",
    glow2: "bg-white/5",
    shellBg: "bg-white/5 border-white/12",
    pasteReady: "bg-white text-black hover:opacity-90",
    overlay: "bg-black/70 backdrop-blur-md",
    drawerPanel:
      "bg-black/80 border-white/15 shadow-[0_30px_90px_rgba(0,0,0,0.55)]",
    modalPanel:
      "bg-black/82 border-white/15 shadow-[0_30px_90px_rgba(0,0,0,0.55)]",
    googleBtn: "bg-white text-black border-white/25 hover:opacity-90",
    toggleOnTrack: "bg-white/15 border-white/15",
    toggleOffTrack: "bg-black/30 border-white/15",
    toggleOnKnob: "bg-white",
    toggleOffKnob: "bg-white/50",
  },
} as const;

type Theme = (typeof THEMES)[keyof typeof THEMES];

function PlayIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 5.14v13.72a1 1 0 0 0 1.52.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z"
      />
    </svg>
  );
}

/** ✅ Bloque Shorts */
function ShortsBlock({
  interests,
  theme,
  onSend,
}: {
  interests: string[];
  theme: Theme;
  onSend?: (url: string) => Promise<void>;
}) {
  const topics = useMemo(() => interests.slice(0, 3), [interests]);

  const [loading, setLoading] = useState(false);
  const [byTopic, setByTopic] = useState<Record<string, YTItem[]>>({});
  const [active, setActive] = useState<YTItem | null>(null);
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({});

  const fetchTopic = useCallback(async (t: string, signal?: AbortSignal) => {
    const r = await fetch(
      `/api/recommendations/youtube?topic=${encodeURIComponent(
        t
      )}&limit=16&r=${Date.now()}`,
      { signal, cache: "no-store" }
    );
    const j = await r.json().catch(() => ({ items: [] }));
    return (j.items || []) as YTItem[];
  }, []);

  useEffect(() => {
    if (topics.length === 0) return;

    const ac = new AbortController();
    let cancelled = false;

    async function run() {
      setLoading(true);
      try {
        const results = await Promise.all(
          topics.map(async (t) => {
            const items = await fetchTopic(t, ac.signal);
            return [t, items] as const;
          })
        );

        if (cancelled) return;

        const next: Record<string, YTItem[]> = {};
        for (const [t, items] of results) next[t] = items;
        setByTopic(next);
      } catch {
        // silencio
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [topics, fetchTopic]);

  const refreshOne = useCallback(
    async (t: string) => {
      if (refreshing[t]) return;

      setRefreshing((prev) => ({ ...prev, [t]: true }));
      try {
        const items = await fetchTopic(t);
        setByTopic((prev) => ({ ...prev, [t]: items }));
      } catch {
        // silencio
      } finally {
        setRefreshing((prev) => ({ ...prev, [t]: false }));
      }
    },
    [fetchTopic, refreshing]
  );

  if (topics.length === 0) return null;

  return (
    <div
      className={[
        "rounded-2xl sm:rounded-3xl border p-4 sm:p-6",
        theme.cardAlt,
      ].join(" ")}
    >
      {active && (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            aria-label="Cerrar reproductor"
            onClick={() => setActive(null)}
            className={`absolute inset-0 ${theme.overlay}`}
          />

          <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
            <div
              role="dialog"
              aria-modal="true"
              className={[
                "w-[92vw] max-w-sm",
                "rounded-[26px] sm:rounded-[30px] border overflow-hidden",
                "flex flex-col",
                theme.modalPanel,
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold line-clamp-2">
                    {active.title}
                  </p>
                  <p className={`mt-1 text-xs ${theme.subtleText} line-clamp-1`}>
                    {active.channelTitle}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className={[
                    "shrink-0 rounded-2xl border px-3 py-2 text-sm font-medium transition",
                    theme.btnSecondary,
                  ].join(" ")}
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>

              <div className="px-4 pb-4">
                <div className="w-full overflow-hidden rounded-2xl border">
                  <div className="aspect-[9/16] w-full">
                    <iframe
                      className="h-full w-full"
                      src={`https://www.youtube.com/embed/${active.id}?autoplay=1&playsinline=1&modestbranding=1`}
                      title={active.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0">
                <button
                  type="button"
                  onClick={async () => {
                    const link =
                      active.url ||
                      `https://www.youtube.com/watch?v=${active.id}`;
                    if (onSend) await onSend(link);
                    setActive(null);
                  }}
                  className={[
                    "w-full rounded-2xl px-4 py-3 text-sm font-semibold transition",
                    theme.btnPrimary,
                  ].join(" ")}
                >
                  Enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Shorts para vos</p>
        <span className={`text-xs ${theme.subtleText}`}>
          {loading ? "Cargando..." : "Reciente"}
        </span>
      </div>

      <p className={`mt-2 text-xs ${theme.subtleText}`}>
        Basado en tus intereses guardados.
      </p>

      <div className="mt-5 sm:mt-6 space-y-8 sm:space-y-10">
        {topics.map((t) => {
          const items = byTopic[t] || [];
          const show = items.slice(0, 8);
          const isRefreshing = !!refreshing[t];

          return (
            <div key={t}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-base font-semibold">{t}</p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void refreshOne(t)}
                    disabled={isRefreshing}
                    className={[
                      "rounded-2xl border px-3 py-2 text-xs font-medium transition",
                      theme.btnSecondary,
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                    ].join(" ")}
                    title="Traer otros videos"
                  >
                    {isRefreshing ? "Actualizando..." : "Refrescar ↻"}
                  </button>
                </div>
              </div>

              <div className="mt-4 flex gap-3 overflow-x-auto pb-2 pr-1 snap-x snap-mandatory">
                {loading &&
                  show.length === 0 &&
                  Array.from({ length: 8 }).map((_, idx) => (
                    <div
                      key={`sk-${t}-${idx}`}
                      className={`w-[140px] sm:w-[150px] shrink-0 snap-start rounded-2xl sm:rounded-3xl border p-2 ${theme.card}`}
                    >
                      <div
                        className={`aspect-[9/16] w-full rounded-2xl border ${theme.cardAlt} animate-pulse bg-black/5`}
                      />
                      <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-black/5" />
                      <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-black/5" />
                    </div>
                  ))}

                {show.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setActive(v)}
                    className={`w-[140px] sm:w-[150px] shrink-0 snap-start text-left rounded-2xl sm:rounded-3xl border p-2 transition hover:opacity-95 ${theme.card}`}
                  >
                    <div
                      className={`overflow-hidden rounded-2xl border ${theme.cardAlt}`}
                    >
                      <div className="relative aspect-[9/16] w-full">
                        {v.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={v.thumbnail}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-black/5" />
                        )}

                        <div className="absolute inset-0 bg-black/10" />
                        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1.5 text-white">
                          <PlayIcon className="h-3.5 w-3.5" />
                          <span className="text-[11px] font-semibold">Play</span>
                        </div>
                      </div>
                    </div>

                    <p className="mt-2 text-xs font-semibold line-clamp-2">
                      {v.title}
                    </p>
                    <p
                      className={`mt-1 text-[11px] ${theme.subtleText} line-clamp-1`}
                    >
                      {v.channelTitle}
                    </p>
                  </button>
                ))}

                {!loading && items.length === 0 && (
                  <p className={`text-xs ${theme.subtleText}`}>
                    No encontré Shorts para “{t}”. Probá refrescar o cambiar el
                    interés.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  const { user, loading } = useFirebaseUser();

  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  // ✅ Tema
  const [isLight, setIsLight] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [howModalOpen, setHowModalOpen] = useState(false);

  const [clipboardState, setClipboardState] = useState<ClipboardState>("idle");
  const [clipboardText, setClipboardText] = useState("");
  const [clipboardDomain, setClipboardDomain] = useState<string | null>(null);

  const [discordConnected, setDiscordConnected] = useState(false);
  const [discordData, setDiscordData] = useState<any>(null);

  const [discordServers, setDiscordServers] = useState<DiscordServer[]>([]);
  const [selectedServer, setSelectedServer] = useState<string>("");

  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>("");

  const [loadingChannels, setLoadingChannels] = useState(false);

  const [selectedServerName, setSelectedServerName] = useState<string>("");
  const [selectedChannelName, setSelectedChannelName] = useState<string>("");

  // ✅ Recomendación automática
  const [autoRecEnabled, setAutoRecEnabled] = useState(false);
  const [autoRecExpanded, setAutoRecExpanded] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [savingAutoRec, setSavingAutoRec] = useState(false);
  const [autoRecSaved, setAutoRecSaved] = useState(false);

  const channelsCacheRef = useRef<Map<string, DiscordChannel[]>>(new Map());
  const lastCheckRef = useRef<number>(0);

  // ✅ para scroll cuando el usuario toca “Cambiar canal”
  const discordConfigRef = useRef<HTMLDivElement | null>(null);

  const theme = isLight ? THEMES.light : THEMES.dark;
  const domain = useMemo(() => getDomainLabel(url), [url]);

  const canSendLink = useMemo(() => {
    const v = url.trim();
    return v.length > 0 && isValidUrl(v);
  }, [url]);

  const isLogged = !!user;
  const sendLabel = "Enviar";
  const sendDisabled = !canSendLink;

  // ✅✅✅ TEMA: leer al montar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      if (saved === "light") setIsLight(true);
      else if (saved === "dark") setIsLight(false);
    } catch {
      // silencio
    }
  }, []);

  // ✅✅✅ TEMA: guardar cambios
  useEffect(() => {
    try {
      const mode: ThemeMode = isLight ? "light" : "dark";
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // silencio
    }
  }, [isLight]);

  // ✅✅✅ TEMA: reflejar en <html>
  useEffect(() => {
    const root = document.documentElement;
    if (!root) return;
    if (isLight) root.classList.remove("dark");
    else root.classList.add("dark");
  }, [isLight]);

  useEffect(() => {
    if (!drawerOpen && !howModalOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (howModalOpen) setHowModalOpen(false);
      if (drawerOpen) setDrawerOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen, howModalOpen]);

  const openHowModal = useCallback(() => {
    setDrawerOpen(false);
    setHowModalOpen(true);
  }, []);

  // ✅ Cargar datos guardados de Firestore
  useEffect(() => {
    let cancelled = false;

    async function loadUserData() {
      if (!user) return;

      try {
        const { doc, getDoc } = await import("firebase/firestore");
        const { db } = await import("../lib/firebaseClient");

        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists() || cancelled) return;

        const data = docSnap.data();

        if (data.autoRecommendation) {
          const enabled = !!data.autoRecommendation.enabled;
          const its = Array.isArray(data.autoRecommendation.interests)
            ? (data.autoRecommendation.interests as string[])
            : [];

          setAutoRecEnabled(enabled);
          setInterests(its);
          setAutoRecExpanded(false);
          setAutoRecSaved(enabled && its.length > 0);
        }

        // ✅ discord ya guardado
        if (data.discord && data.discordTokens) {
          setDiscordConnected(true);
          setDiscordData({
            user: data.discord.user,
            accessToken: data.discordTokens.accessToken,
            servers: data.discordServers || [],
          });
          setDiscordServers(data.discordServers || []);

          if (data.selectedServer?.id) {
            setSelectedServer(data.selectedServer.id);
            setSelectedServerName(data.selectedServer.name || "");
          }

          if (data.selectedChannel?.id) {
            setSelectedChannel(data.selectedChannel.id);
            setSelectedChannelName(data.selectedChannel.name || "");
          }
        }
      } catch (error) {
        console.error("Error cargando datos de Firestore:", error);
      }
    }

    loadUserData();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // ✅ Detectar callback Discord SIEMPRE (aunque el user tarde en hidratar)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const discordDataParam = params.get("discord_data");

    if (discordDataParam) {
      try {
        const data = JSON.parse(
          decodeURIComponent(discordDataParam)
        ) as DiscordCallbackData;

        setDiscordData(data);
        setDiscordServers(data.servers || []);
        setDiscordConnected(true);

        // ✅ server donde se agregó el bot → lo dejamos como server “fijo”
        const guildId = data.guildId || "";
        if (guildId) {
          setSelectedServer(guildId);
          const s = (data.servers || []).find((x) => x.id === guildId);
          setSelectedServerName(s?.name || "");
        } else if ((data.servers || []).length === 1) {
          setSelectedServer(data.servers[0].id);
          setSelectedServerName(data.servers[0].name || "");
        }

        setStatus("✅ Discord conectado! Elegí tu canal.");

        // ✅ guardamos para cuando Firebase user esté listo
        try {
          sessionStorage.setItem(PENDING_DISCORD_KEY, JSON.stringify(data));
        } catch {
          // silencio
        }

        window.history.replaceState({}, "", "/");
      } catch (error) {
        console.error("Error parsing discord data:", error);
      }
    }

    if (params.get("error")) {
      setStatus("❌ Error al conectar Discord. Intentá de nuevo.");
      window.history.replaceState({}, "", "/");
    }
  }, []);

  // ✅ cuando ya hay user, guardamos el pending discord en Firestore
  const saveToFirestore = useCallback(
    async (data: DiscordCallbackData) => {
      if (!user) return;

      try {
        const { doc, setDoc } = await import("firebase/firestore");
        const { db } = await import("../lib/firebaseClient");

        const gid = data.guildId || null;
        const serverForBot =
          gid && (data.servers || []).find((x) => x.id === gid);

        await setDoc(
          doc(db, "users", user.uid),
          {
            discord: {
              user: data.user,
              connectedAt: new Date().toISOString(),
            },
            discordTokens: {
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
              expiresAt: new Date(
                Date.now() + data.expiresIn * 1000
              ).toISOString(),
            },
            discordServers: data.servers,

            // ✅ guardamos el server “fijo” donde se agregó el bot
            ...(serverForBot
              ? { selectedServer: { id: serverForBot.id, name: serverForBot.name } }
              : {}),
          },
          { merge: true }
        );
      } catch (error) {
        console.error("Error guardando en Firestore:", error);
      }
    },
    [user]
  );

  useEffect(() => {
    if (!user) return;

    try {
      const raw = sessionStorage.getItem(PENDING_DISCORD_KEY);
      if (!raw) return;

      const data = JSON.parse(raw) as DiscordCallbackData;
      void saveToFirestore(data);
      sessionStorage.removeItem(PENDING_DISCORD_KEY);
    } catch {
      // silencio
    }
  }, [user, saveToFirestore]);

  // ✅ cargar canales (server fijo)
  const loadChannelsForServer = useCallback(
    async (serverId: string) => {
      if (!serverId) return;

      const cached = channelsCacheRef.current.get(serverId);
      if (cached) {
        setChannels(cached);
        return;
      }

      setLoadingChannels(true);
      try {
        const response = await fetch("/api/discord/channels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serverId }),
        });

        const data = await response.json();

        if (response.ok && data.channels) {
          const list = data.channels as DiscordChannel[];
          setChannels(list);
          channelsCacheRef.current.set(serverId, list);
        } else {
          setStatus("❌ Error obteniendo canales del servidor");
        }
      } catch {
        setStatus("❌ Error obteniendo canales");
      } finally {
        setLoadingChannels(false);
      }
    },
    []
  );

  // ✅ si hay discord conectado y server seleccionado, aseguramos canales cargados
  useEffect(() => {
    if (!discordConnected) return;
    if (!selectedServer && discordServers.length === 1) {
      setSelectedServer(discordServers[0].id);
      setSelectedServerName(discordServers[0].name || "");
      return;
    }
    if (!selectedServer) return;
    void loadChannelsForServer(selectedServer);
  }, [discordConnected, selectedServer, discordServers, loadChannelsForServer]);

  const handleChannelChange = useCallback(
    (channelId: string) => {
      setSelectedChannel(channelId);
      const ch = channels.find((c) => c.id === channelId);
      setSelectedChannelName(ch?.name || "");
    },
    [channels]
  );

  const handleSaveChannelSelection = useCallback(async () => {
    if (!selectedServer || !selectedChannel || !user) {
      setStatus("Seleccioná un canal primero");
      return;
    }

    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("../lib/firebaseClient");

      const server = discordServers.find((s) => s.id === selectedServer);
      const channel = channels.find((c) => c.id === selectedChannel);

      await setDoc(
        doc(db, "users", user.uid),
        {
          selectedServer: { id: selectedServer, name: server?.name || "" },
          selectedChannel: { id: selectedChannel, name: channel?.name || "" },
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setSelectedServerName(server?.name || selectedServerName);
      setSelectedChannelName(channel?.name || "");
      setStatus("✅ Canal guardado! Ya podés enviar videos.");
    } catch {
      setStatus("❌ Error guardando el canal");
    }
  }, [
    channels,
    discordServers,
    selectedChannel,
    selectedServer,
    selectedServerName,
    user,
  ]);

  const toggleInterest = useCallback((tag: string) => {
    setInterests((prev) => {
      const exists = prev.some((x) => x.toLowerCase() === tag.toLowerCase());
      if (exists) return prev.filter((x) => x.toLowerCase() !== tag.toLowerCase());
      if (prev.length >= 8) return prev;
      return [...prev, tag];
    });
  }, []);

  const handleSaveAutoRecommendation = useCallback(async () => {
    setStatus(null);

    if (!user) {
      setStatus("Iniciá sesión primero para guardar tus intereses.");
      loginConGoogle();
      return false;
    }

    if (autoRecEnabled && interests.length === 0) {
      setStatus("Elegí al menos 1 interés para guardar.");
      return false;
    }

    setSavingAutoRec(true);
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("../lib/firebaseClient");

      await setDoc(
        doc(db, "users", user.uid),
        {
          autoRecommendation: {
            enabled: autoRecEnabled,
            interests: autoRecEnabled ? interests : [],
            updatedAt: new Date().toISOString(),
          },
        },
        { merge: true }
      );

      setStatus("✅ Preferencias guardadas!");
      setAutoRecSaved(autoRecEnabled && interests.length > 0);
      return true;
    } catch {
      setStatus("❌ Error guardando tus intereses.");
      return false;
    } finally {
      setSavingAutoRec(false);
    }
  }, [autoRecEnabled, interests, user]);

  const checkClipboardOnce = useCallback(async () => {
    const now = Date.now();
    if (now - lastCheckRef.current < 1200) {
      return { state: clipboardState, text: clipboardText, domain: clipboardDomain };
    }
    lastCheckRef.current = now;

    setClipboardState("checking");

    try {
      if (!navigator.clipboard?.readText) {
        setClipboardState("unsupported");
        setClipboardText("");
        setClipboardDomain(null);
        return { state: "unsupported" as const, text: "", domain: null };
      }

      const text = (await navigator.clipboard.readText()).trim();

      if (!text) {
        setClipboardState("empty");
        setClipboardText("");
        setClipboardDomain(null);
        return { state: "empty" as const, text: "", domain: null };
      }

      if (!isValidUrl(text)) {
        setClipboardState("invalid");
        setClipboardText(text);
        setClipboardDomain(null);
        return { state: "invalid" as const, text, domain: null };
      }

      const dom = getDomainLabel(text);
      setClipboardState("valid");
      setClipboardText(text);
      setClipboardDomain(dom);
      return { state: "valid" as const, text, domain: dom };
    } catch {
      setClipboardState("unsupported");
      setClipboardText("");
      setClipboardDomain(null);
      return { state: "unsupported" as const, text: "", domain: null };
    }
  }, [clipboardDomain, clipboardState, clipboardText]);

  const handlePaste = useCallback(async () => {
    setStatus(null);

    const res = await checkClipboardOnce();

    if (res.state === "valid" && res.text) {
      setUrl(res.text);
      setStatus("Pegado ✅");
      return;
    }

    setStatus(
      res.state === "empty"
        ? "No hay nada copiado en el portapapeles."
        : res.state === "invalid"
        ? "Lo copiado no parece un link válido (http/https)."
        : "Tu navegador no permite leer el portapapeles automáticamente."
    );
  }, [checkClipboardOnce]);

  const handleSend = useCallback(async () => {
    setStatus(null);

    if (!isLogged) {
      loginConGoogle();
      return;
    }

    const v = url.trim();
    if (!v) {
      setStatus("Pegá un link primero.");
      return;
    }

    if (!isValidUrl(v)) {
      setStatus("Ese texto no parece un link válido (http/https).");
      return;
    }

    if (!selectedChannel) {
      setStatus("Primero elegí el canal de Discord.");
      return;
    }

    try {
      setStatus("Enviando...");

      const response = await fetch("/api/discord/send-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: selectedChannel,
          message: v,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus("✅ Enviado a Discord!");
        setUrl("");
      } else {
        setStatus("❌ Error al enviar a Discord");
      }
    } catch {
      setStatus("❌ Error al enviar a Discord");
    }
  }, [isLogged, selectedChannel, url]);

  const sendFromShorts = useCallback(
    async (link: string) => {
      setStatus(null);

      if (!user) {
        loginConGoogle();
        return;
      }

      if (!isValidUrl(link)) {
        setStatus("Ese link no parece válido (http/https).");
        return;
      }

      if (!selectedChannel) {
        setStatus("Primero elegí el canal de Discord.");
        return;
      }

      try {
        setStatus("Enviando...");

        const response = await fetch("/api/discord/send-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelId: selectedChannel,
            message: link,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus("✅ Enviado a Discord!");
        } else {
          setStatus("❌ Error al enviar a Discord");
        }
      } catch {
        setStatus("❌ Error al enviar a Discord");
      }
    },
    [selectedChannel, user]
  );

  const handleConnectDiscord = useCallback(() => {
    if (!user) {
      setStatus("Iniciá sesión primero");
      return;
    }
    sessionStorage.setItem("firebase_uid", user.uid);
    window.location.href = "/api/discord/auth";
  }, [user]);

  const openDiscordSetup = useCallback(() => {
    if (!user) {
      setStatus("Iniciá sesión primero");
      setDrawerOpen(false);
      return;
    }
    if (!discordConnected) {
      handleConnectDiscord();
      return;
    }
    setDrawerOpen(false);
    setTimeout(() => {
      discordConfigRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, [discordConnected, handleConnectDiscord, user]);

  const pasteIsReady = clipboardState === "valid" && !!clipboardText;
  const pasteBtnClass = pasteIsReady ? theme.pasteReady : theme.btnSecondary;
  const pasteBtnText = pasteIsReady ? `Pegar ${clipboardDomain ?? "link"}` : "Pegar";

  const destinationText =
    selectedServerName && selectedChannelName
      ? `${selectedServerName} · #${selectedChannelName}`
      : selectedServer && selectedChannel
      ? `Servidor configurado · Canal configurado`
      : discordConnected
      ? "Elegí tu canal de Discord"
      : "Sin Discord conectado";

  const hasDiscordDestination = !!selectedChannel;

  const gateState: "login" | "discord" | "ready" = !user
    ? "login"
    : !discordConnected || !hasDiscordDestination
    ? "discord"
    : "ready";

  const gateMessage =
    gateState === "login"
      ? "Debe iniciar sesión primero"
      : !discordConnected
      ? "Conectá tu Discord"
      : "Seleccioná tu canal de Discord";

  const isLocked = gateState !== "ready";

  return (
    <main className={`min-h-screen ${theme.pageBg}`}>
      {/* glows */}
      <div className="pointer-events-none fixed inset-0 opacity-80">
        <div
          className={`absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-3xl ${theme.glow1}`}
        />
        <div
          className={`absolute bottom-[-220px] right-[-140px] h-[520px] w-[520px] rounded-full blur-3xl ${theme.glow2}`}
        />
      </div>

      <div className="relative mx-auto w-full max-w-none px-4 py-8 sm:max-w-6xl sm:px-6 sm:py-14">
        <div
          className={[
            "relative overflow-hidden border shadow-2xl backdrop-blur-xl",
            "rounded-none p-0 sm:rounded-[40px] sm:p-12",
            theme.shellBg,
          ].join(" ")}
        >
          <div className="px-4 py-8 sm:px-0 sm:py-0">
            {/* ✅ Modal "Cómo funciona" */}
            {howModalOpen && (
              <div className="fixed inset-0 z-[60]">
                <button
                  type="button"
                  aria-label="Cerrar modal"
                  onClick={() => setHowModalOpen(false)}
                  className={`absolute inset-0 ${theme.overlay}`}
                />
                <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Cómo funciona"
                    className={[
                      "w-[92vw] max-w-lg border backdrop-blur-xl",
                      "rounded-[26px] sm:rounded-[34px]",
                      "p-5 sm:p-7",
                      theme.modalPanel,
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold">Cómo funciona</p>
                        <p className={`mt-1 text-xs ${theme.subtleText}`}>
                          Todo en 3 pasos. Rápido y simple.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setHowModalOpen(false)}
                        className={[
                          "rounded-2xl border px-3 py-2 text-sm font-medium transition",
                          theme.btnSecondary,
                        ].join(" ")}
                        aria-label="Cerrar"
                      >
                        ✕
                      </button>
                    </div>

                    <div
                      className={`mt-5 space-y-3 text-sm ${
                        isLight ? "text-[#2b0a5a]/75" : "text-white/70"
                      }`}
                    >
                      <div className="flex gap-3">
                        <div
                          className={`mt-0.5 h-7 w-7 rounded-full flex items-center justify-center ${
                            isLight
                              ? "bg-[#5b21b6]/10 text-[#2b0a5a]/80"
                              : "bg-white/10 text-white/75"
                          }`}
                        >
                          1
                        </div>
                        <div>
                          <p className="font-medium">Iniciás sesión</p>
                          <p className={`${theme.subtleText} text-xs mt-0.5`}>
                            Guardamos tu configuración para que no la pierdas.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div
                          className={`mt-0.5 h-7 w-7 rounded-full flex items-center justify-center ${
                            isLight
                              ? "bg-[#5b21b6]/10 text-[#2b0a5a]/80"
                              : "bg-white/10 text-white/75"
                          }`}
                        >
                          2
                        </div>
                        <div>
                          <p className="font-medium">Conectás Discord</p>
                          <p className={`${theme.subtleText} text-xs mt-0.5`}>
                            Agregás el bot al servidor y elegís el canal destino.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div
                          className={`mt-0.5 h-7 w-7 rounded-full flex items-center justify-center ${
                            isLight
                              ? "bg-[#5b21b6]/10 text-[#2b0a5a]/80"
                              : "bg-white/10 text-white/75"
                          }`}
                        >
                          3
                        </div>
                        <div>
                          <p className="font-medium">Pegás un link y enviás</p>
                          <p className={`${theme.subtleText} text-xs mt-0.5`}>
                            El bot lo manda al canal para que reacciones después.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className={`mt-6 rounded-2xl border p-4 ${theme.tipBox}`}>
                      <p
                        className={`text-xs ${
                          isLight ? "text-[#2b0a5a]/70" : "text-white/60"
                        }`}
                      >
                        Tip: armate un canal tipo{" "}
                        <span
                          className={
                            isLight
                              ? "text-[#5b21b6] font-medium"
                              : "text-white/85 font-medium"
                          }
                        >
                          #para-reaccionar
                        </span>{" "}
                        y guardá todo ahí.
                      </p>
                    </div>

                    <div className="mt-5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setHowModalOpen(false)}
                        className={[
                          "flex-1 rounded-2xl border px-4 py-3 text-sm font-medium transition",
                          theme.btnSecondary,
                        ].join(" ")}
                      >
                        Entendido
                      </button>

                      {!user && (
                        <button
                          type="button"
                          onClick={() => {
                            setHowModalOpen(false);
                            loginConGoogle();
                          }}
                          disabled={loading}
                          className={[
                            "flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:opacity-50",
                            theme.btnPrimary,
                          ].join(" ")}
                        >
                          {loading ? "Cargando..." : "Iniciar sesión"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ✅ Drawer */}
            {drawerOpen && (
              <div className="absolute inset-0 z-50">
                <button
                  aria-label="Cerrar menú"
                  onClick={() => setDrawerOpen(false)}
                  className={`absolute inset-0 ${theme.overlay}`}
                  type="button"
                />
                <aside
                  className={[
                    "absolute right-0 top-0 h-full w-[92vw] max-w-md",
                    "border-l backdrop-blur-xl",
                    "p-6 flex flex-col gap-5",
                    "rounded-l-[34px]",
                    theme.drawerPanel,
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-xs ${theme.subtleText}`}>Cuenta</p>
                      <p className="mt-1 text-base font-semibold">
                        {user?.displayName || "Invitado"}
                      </p>
                      {user?.email && (
                        <p className={`text-xs ${theme.subtleText}`}>{user.email}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsLight((v) => !v)}
                        className={`rounded-2xl border px-3 py-2 text-sm font-medium transition ${theme.btnSecondary}`}
                        type="button"
                      >
                        {isLight ? "Modo oscuro" : "Modo claro"}
                      </button>

                      <button
                        onClick={() => setDrawerOpen(false)}
                        className={`rounded-2xl border px-3 py-2 text-sm font-medium transition ${theme.btnSecondary}`}
                        type="button"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className={`rounded-2xl sm:rounded-3xl border p-4 sm:p-5 ${theme.cardAlt}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Discord</p>
                        <p className={`mt-1 text-sm ${theme.bodyText}`}>
                          {discordConnected ? "✅ Conectado" : "⚠️ No conectado"}
                        </p>
                        <p className={`mt-1 text-xs ${theme.subtleText}`}>
                          Destino: {destinationText}
                        </p>
                      </div>

                      <span
                        className={[
                          "text-xs rounded-full px-3 py-1 font-medium border",
                          theme.chip,
                        ].join(" ")}
                      >
                        {discordConnected ? "On" : "Off"}
                      </span>
                    </div>

                    <div className="mt-4 flex gap-2">
                      {!user ? (
                        <button
                          onClick={() => {
                            setDrawerOpen(false);
                            loginConGoogle();
                          }}
                          className={`flex-1 rounded-2xl px-4 py-3 font-medium transition ${theme.btnPrimary}`}
                          type="button"
                          disabled={loading}
                        >
                          {loading ? "Cargando..." : "Iniciar sesión"}
                        </button>
                      ) : (
                        <button
                          onClick={openDiscordSetup}
                          className={`flex-1 rounded-2xl px-4 py-3 font-medium transition ${theme.btnPrimary}`}
                          type="button"
                        >
                          {!discordConnected ? "Conectar Discord" : "Cambiar canal"}
                        </button>
                      )}
                    </div>

                    {discordConnected && !selectedChannel && (
                      <p className={`mt-3 text-xs ${theme.subtleText}`}>
                        Falta elegir canal para poder enviar links.
                      </p>
                    )}
                  </div>

                  <div className={`rounded-2xl sm:rounded-3xl border p-4 sm:p-5 ${theme.cardAlt}`}>
                    <p className="text-sm font-semibold">Ayuda</p>
                    <button
                      onClick={openHowModal}
                      className={`mt-3 w-full rounded-2xl border px-4 py-3 font-medium transition ${theme.btnSecondary}`}
                      type="button"
                    >
                      Cómo funciona
                    </button>
                  </div>

                  <div className="mt-auto">
                    {user && (
                      <button
                        onClick={() => {
                          setDrawerOpen(false);
                          cerrarSesion();
                        }}
                        className={`w-full rounded-2xl border px-4 py-3 font-medium transition ${theme.btnSecondary}`}
                        type="button"
                      >
                        Cerrar sesión
                      </button>
                    )}
                    <p className={`mt-3 text-xs ${theme.footerText}`}>
                      Tip: usá un canal tipo <span className="font-medium">#para-reaccionar</span>.
                    </p>
                  </div>
                </aside>
              </div>
            )}

            <div
              className={[
                "transition duration-200",
                drawerOpen ? "blur-[2px] opacity-70" : "blur-0 opacity-100",
              ].join(" ")}
            >
              {/* HEADER */}
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className={`text-sm ${theme.subtleText}`}>StreamersCreators</p>

                  <button
                    onClick={() => setDrawerOpen(true)}
                    className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${theme.btnSecondary}`}
                    type="button"
                    aria-label="Abrir menú"
                  >
                    ☰
                  </button>
                </div>

                <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
                  Convertí vídeos virales en contenido{" "}
                  <span className={theme.titleAccent}>listo para reaccionar</span>
                </h1>

                <p className={`max-w-2xl text-base sm:text-lg ${theme.bodyText}`}>
                  Pegá el link de TikTok, Reels o Shorts
                  <br />
                  Un bot se encargará de enviarte el vídeo para que reacciones!
                </p>

                {!user && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => loginConGoogle()}
                      disabled={loading}
                      className={[
                        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        theme.googleBtn,
                      ].join(" ")}
                      aria-label="Iniciar sesión con Google"
                    >
                      <GoogleIcon className="h-4 w-4" />
                      <span>{loading ? "Cargando..." : "Iniciá sesión con Google"}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* BODY */}
              <div className="mt-8 sm:mt-10 space-y-5 sm:space-y-6">
                {/* ✅✅✅ NUEVO: selector de canal SIEMPRE visible si Discord está conectado */}
                {discordConnected && (
                  <div
                    ref={discordConfigRef}
                    className={`rounded-2xl sm:rounded-3xl border p-4 sm:p-6 ${theme.cardAlt}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
                          className={`text-sm font-semibold ${
                            isLight ? "text-[#2b0a5a]" : "text-white/90"
                          }`}
                        >
                          Seleccioná tu canal de Discord
                        </p>
                        <p className={`mt-1 text-xs ${theme.subtleText}`}>
                          {selectedServerName ? `Servidor: ${selectedServerName}` : "Servidor conectado"}
                          {" · "}Destino actual:{" "}
                          <span className="font-medium">{selectedChannelName ? `#${selectedChannelName}` : "—"}</span>
                        </p>
                      </div>

                      <span
                        className={[
                          "text-xs rounded-full px-3 py-1 font-medium border",
                          theme.chip,
                        ].join(" ")}
                      >
                        {selectedChannel ? "Canal listo" : "Falta canal"}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      <label
                        className={`block text-sm ${
                          isLight ? "text-[#2b0a5a]/70" : "text-white/70"
                        }`}
                      >
                        Canal
                      </label>

                      <select
                        value={selectedChannel}
                        onChange={(e) => handleChannelChange(e.target.value)}
                        disabled={loadingChannels}
                        className={`w-full rounded-2xl border px-4 py-3 outline-none transition ${theme.input} disabled:opacity-50`}
                      >
                        <option value="">
                          {loadingChannels ? "Cargando canales..." : "Seleccioná un canal..."}
                        </option>
                        {channels.map((channel) => (
                          <option key={channel.id} value={channel.id}>
                            # {channel.name}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => void handleSaveChannelSelection()}
                        disabled={!selectedChannel || !user}
                        className={[
                          "w-full rounded-2xl px-6 py-3 font-medium transition disabled:opacity-40 disabled:cursor-not-allowed",
                          theme.btnPrimary,
                        ].join(" ")}
                        type="button"
                      >
                        Guardar canal
                      </button>

                      <p className={`text-xs ${theme.subtleText}`}>
                        Podés cambiar el canal cuando quieras. El servidor es el mismo donde agregaste el bot.
                      </p>
                    </div>
                  </div>
                )}

                {/* Si NO está conectado, mantenemos un CTA simple */}
                {!discordConnected && user && (
                  <div className={`rounded-2xl sm:rounded-3xl border p-4 sm:p-6 ${theme.cardAlt}`}>
                    <p className="text-sm font-semibold">Conectá Discord</p>
                    <p className={`mt-1 text-xs ${theme.subtleText}`}>
                      Agregá el bot a tu servidor y después elegís el canal destino.
                    </p>
                    <button
                      type="button"
                      onClick={handleConnectDiscord}
                      className={[
                        "mt-4 w-full rounded-2xl px-6 py-3 font-medium transition",
                        theme.btnPrimary,
                      ].join(" ")}
                    >
                      Conectar Discord
                    </button>
                  </div>
                )}

                {/* ✅ Card principal */}
                <div
                  className={[
                    "relative border",
                    "rounded-2xl sm:rounded-3xl",
                    "p-4 sm:p-6",
                    isLocked ? theme.cardAlt : theme.card,
                    isLocked ? "opacity-70 grayscale" : "opacity-100",
                  ].join(" ")}
                >
                  <div className={isLocked ? "pointer-events-none select-none" : ""}>
                    <div className="mt-1">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <label
                          className={`block text-sm ${
                            isLight ? "text-[#2b0a5a]/70" : "text-white/70"
                          }`}
                        >
                          Link del video
                        </label>
                        {clipboardState === "valid" && !!clipboardText && (
                          <span
                            className={[
                              "text-xs rounded-full px-3 py-1 font-medium",
                              theme.pasteReady,
                            ].join(" ")}
                          >
                            Listo ✅
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <input
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          onFocus={() => void checkClipboardOnce()}
                          placeholder="Pegá acá el link…"
                          disabled={isLocked}
                          className={`flex-1 rounded-2xl border px-4 py-3 outline-none transition ${theme.input} disabled:opacity-50`}
                        />
                        <button
                          type="button"
                          onMouseEnter={() => void checkClipboardOnce()}
                          onClick={() => void handlePaste()}
                          disabled={isLocked}
                          className={`rounded-2xl border px-5 py-3 font-medium transition ${pasteBtnClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {pasteBtnText}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleSend()}
                        disabled={isLocked || sendDisabled}
                        className={[
                          "mt-4 w-full rounded-2xl px-6 py-3 font-medium transition disabled:opacity-40 disabled:cursor-not-allowed",
                          theme.btnPrimary,
                        ].join(" ")}
                      >
                        {sendLabel}
                      </button>

                      {status && (
                        <p className={`mt-3 text-sm ${isLight ? "text-[#2b0a5a]/60" : "text-white/60"}`}>
                          {status}
                        </p>
                      )}
                      {domain && (
                        <p className={`mt-2 text-xs ${theme.subtleText}`}>Detectado: {domain}</p>
                      )}
                    </div>
                  </div>

                  {isLocked && (
                    <div className="absolute inset-0 rounded-2xl sm:rounded-3xl overflow-hidden flex items-center justify-center">
                      <div className={["absolute inset-0", isLight ? "bg-black/15" : "bg-black/45"].join(" ")} />
                      <button
                        type="button"
                        onClick={() => {
                          if (!user) {
                            loginConGoogle();
                          } else {
                            if (!discordConnected) handleConnectDiscord();
                            else {
                              discordConfigRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }
                          }
                        }}
                        className={[
                          "relative z-10",
                          "rounded-full border px-6 py-4",
                          "text-sm sm:text-base font-extrabold",
                          "shadow-[0_18px_55px_rgba(0,0,0,0.22)]",
                          "inline-flex items-center gap-3",
                          "bg-white",
                          "border-[#5b21b6]/20",
                          "text-[#5b21b6]",
                          "hover:bg-[#5b21b6]/5",
                          "transition",
                          "focus:outline-none focus:ring-2 focus:ring-[#5b21b6]/30",
                        ].join(" ")}
                        aria-label={gateMessage}
                      >
                        <span className="text-lg">{!user ? "🔒" : "⚠️"}</span>
                        <span>{gateMessage}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* ✅ Bloque Recomendación automática */}
                <div
                  className={[
                    "border",
                    "rounded-2xl sm:rounded-3xl",
                    "p-4 sm:p-6",
                    theme.cardAlt,
                    isLocked ? "opacity-70 grayscale" : "opacity-100",
                  ].join(" ")}
                >
                  <div className={isLocked ? "pointer-events-none select-none" : ""}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">Recomendación automática</div>
                        <div className={`text-xs ${theme.subtleText}`}>
                          Elegí intereses y guardamos tu perfil para recomendarte Shorts.
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={() => {
                          const next = !autoRecEnabled;
                          setAutoRecEnabled(next);

                          if (next) {
                            setAutoRecExpanded(true);
                          } else {
                            setAutoRecExpanded(false);
                            setInterests([]);
                            setAutoRecSaved(false);
                          }
                        }}
                        className={[
                          "relative inline-flex h-8 w-14 items-center rounded-full border transition",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                          autoRecEnabled ? theme.toggleOnTrack : theme.toggleOffTrack,
                        ].join(" ")}
                        aria-label="Activar o desactivar recomendación automática"
                      >
                        <span
                          className={[
                            "inline-block h-6 w-6 transform rounded-full transition",
                            autoRecEnabled ? "translate-x-7" : "translate-x-1",
                            autoRecEnabled ? theme.toggleOnKnob : theme.toggleOffKnob,
                          ].join(" ")}
                        />
                      </button>
                    </div>

                    {autoRecEnabled && autoRecExpanded && (
                      <div className="mt-5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold">Tus intereses</p>
                          <span className={`text-xs ${theme.subtleText}`}>{interests.length}/8</span>
                        </div>

                        {interests.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {interests.map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => toggleInterest(tag)}
                                className={[
                                  "rounded-full border px-3 py-1 text-xs font-medium transition",
                                  theme.chip,
                                ].join(" ")}
                                title="Quitar"
                                disabled={isLocked}
                              >
                                {tag} ✕
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                          {INTERESES_SUGERIDOS.map((x) => {
                            const selected = interests.some(
                              (t) => t.toLowerCase() === x.toLowerCase()
                            );
                            const disabled = (!selected && interests.length >= 8) || isLocked;

                            return (
                              <button
                                key={x}
                                type="button"
                                onClick={() => toggleInterest(x)}
                                disabled={disabled}
                                className={[
                                  "rounded-full border px-3 py-1 text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed",
                                  selected ? theme.chip : theme.btnSecondary,
                                ].join(" ")}
                              >
                                {x}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await handleSaveAutoRecommendation();
                            if (ok) setAutoRecExpanded(false);
                          }}
                          disabled={isLocked || savingAutoRec || interests.length === 0}
                          className={[
                            "mt-5 w-full rounded-2xl px-6 py-3 font-medium transition disabled:opacity-40 disabled:cursor-not-allowed",
                            theme.btnPrimary,
                          ].join(" ")}
                        >
                          {savingAutoRec ? "Guardando..." : "Guardar"}
                        </button>

                        <p className={`mt-2 text-xs ${theme.subtleText}`}>
                          Esto se guarda en tu perfil para futuras recomendaciones.
                        </p>
                      </div>
                    )}

                    {autoRecEnabled && !autoRecExpanded && (
                      <div className="mt-5">
                        <div className={`text-xs ${theme.subtleText}`}>
                          {autoRecSaved
                            ? `Activado ✅ · ${interests.length} intereses guardados`
                            : "Activado ✅ · Guardá tus intereses para ver Shorts"}
                        </div>

                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => setAutoRecExpanded(true)}
                          className={[
                            "mt-3 w-full rounded-2xl border px-4 py-3 text-sm font-medium transition",
                            theme.btnSecondary,
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                          ].join(" ")}
                        >
                          Editar intereses
                        </button>
                      </div>
                    )}

                    {autoRecEnabled && autoRecSaved && interests.length > 0 && (
                      <div className="mt-6">
                        <ShortsBlock interests={interests} theme={theme} onSend={sendFromShorts} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer
          className={[
            "mt-8 sm:mt-10 border",
            "rounded-2xl sm:rounded-3xl",
            "px-4 py-5 sm:px-6",
            "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
            theme.cardAlt,
          ].join(" ")}
        >
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold">StreamersCreators</p>
            <p className={`text-xs ${theme.footerText}`}>
              Convertí links virales en contenido listo para reaccionar.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openHowModal}
                className={[
                  "rounded-2xl border px-4 py-2 text-sm font-medium transition",
                  theme.btnSecondary,
                ].join(" ")}
              >
                Cómo funciona
              </button>

              <button
                type="button"
                onClick={openDiscordSetup}
                className={[
                  "rounded-2xl border px-4 py-2 text-sm font-medium transition",
                  theme.btnSecondary,
                ].join(" ")}
              >
                Discord
              </button>

              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className={[
                  "rounded-2xl border px-4 py-2 text-sm font-medium transition",
                  theme.btnSecondary,
                ].join(" ")}
              >
                Menú
              </button>
            </div>

            <span
              className={[
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs",
                theme.chip,
              ].join(" ")}
            >
              <span className="text-sm">{user ? "👤" : "🔒"}</span>
              <span className="font-medium">{user ? "Sesión activa" : "Sin sesión"}</span>
              {user && (
                <span className={theme.subtleText}>
                  · {selectedChannel ? "Canal listo" : "Falta canal"}
                </span>
              )}
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}
