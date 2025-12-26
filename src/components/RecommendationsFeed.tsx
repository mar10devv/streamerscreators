"use client";

import { useEffect, useMemo, useState } from "react";

type YTItem = {
  id: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  thumbnail: string | null;
  url: string | null;
};

export function RecommendationsFeed({
  interests,
  isLight,
  theme,
}: {
  interests: string[];
  isLight: boolean;
  theme: any;
}) {
  const topics = useMemo(() => interests.slice(0, 4), [interests]); // limit para performance
  const [loading, setLoading] = useState(false);
  const [byTopic, setByTopic] = useState<Record<string, YTItem[]>>({});

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (topics.length === 0) return;

      setLoading(true);
      try {
        // Fetch en paralelo pero limitado (4)
        const results = await Promise.all(
          topics.map(async (t) => {
            const r = await fetch(
              `/api/recommendations/youtube?topic=${encodeURIComponent(t)}`,
              { cache: "no-store" } // podés sacarlo si querés que el navegador cachee también
            );
            const j = await r.json();
            return [t, (j.items || []) as YTItem[]] as const;
          })
        );

        if (!cancelled) {
          const next: Record<string, YTItem[]> = {};
          for (const [t, items] of results) next[t] = items;
          setByTopic(next);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [topics]);

  if (topics.length === 0) return null;

  return (
    <div className={`mt-6 rounded-3xl border p-6 ${theme.cardAlt}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Recomendaciones (recientes)</p>
        <span className={`text-xs ${theme.subtleText}`}>
          {loading ? "Cargando..." : "Actualizado"}
        </span>
      </div>

      <p className={`mt-2 text-xs ${theme.subtleText}`}>
        Shorts recientes según tus intereses (YouTube). TikTok/Reels: abrimos búsqueda.
      </p>

      <div className="mt-5 space-y-6">
        {topics.map((t) => {
          const items = byTopic[t] || [];
          return (
            <div key={t}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{t}</p>

                {/* TikTok / Instagram: por ahora link externo (robusto) */}
                <div className="flex gap-2">
                  <a
                    className={`rounded-2xl border px-3 py-2 text-xs font-medium transition ${theme.btnSecondary}`}
                    target="_blank"
                    rel="noreferrer"
                    href={`https://www.tiktok.com/search?q=${encodeURIComponent(t)}`}
                  >
                    Ver en TikTok
                  </a>
                  <a
                    className={`rounded-2xl border px-3 py-2 text-xs font-medium transition ${theme.btnSecondary}`}
                    target="_blank"
                    rel="noreferrer"
                    href={`https://www.instagram.com/explore/tags/${encodeURIComponent(
                      t.replace(/\s+/g, "")
                    )}/`}
                  >
                    Ver en Reels
                  </a>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.slice(0, 6).map((v) => (
                  <a
                    key={v.id}
                    href={v.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className={`rounded-3xl border p-4 transition hover:opacity-95 ${theme.card}`}
                  >
                    <div className="flex gap-3">
                      {v.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={v.thumbnail}
                          alt=""
                          className="h-16 w-16 rounded-2xl object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className={`h-16 w-16 rounded-2xl border ${theme.cardAlt}`} />
                      )}

                      <div className="min-w-0">
                        <p className="text-sm font-semibold line-clamp-2">{v.title}</p>
                        <p className={`mt-1 text-xs ${theme.subtleText} line-clamp-1`}>
                          {v.channelTitle}
                        </p>
                        <p className={`mt-1 text-[11px] ${theme.subtleText}`}>
                          {v.publishedAt ? new Date(v.publishedAt).toLocaleDateString() : ""}
                        </p>
                      </div>
                    </div>
                  </a>
                ))}

                {items.length === 0 && (
                  <p className={`text-xs ${theme.subtleText}`}>
                    No encontré Shorts recientes para “{t}”. Probá con otro interés.
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
