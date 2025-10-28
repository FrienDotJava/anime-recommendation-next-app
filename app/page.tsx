"use client";

import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";

const API_PREFIX = "/api/proxy";

interface AnimeRow {
  anime_id: number;
  name: string;
  genre: string;
  type?: string;
}

interface RatedPair {
  anime_id: number;
  rating: number;
}

async function apiPost(path: string, body: any) {
  const res = await fetch(`${API_PREFIX}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return { ok: res.ok, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, data: text };
  }
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function splitGenres(g: string | undefined) {
  if (!g) return [] as string[];
  return g
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
function scorePct(s: number) {
  return `${(s * 100).toFixed(1)}%`;
}

function malLink(id: number) {
  return `https://myanimelist.net/anime/${id}`;
}

function Stars({ score }: { score: number }) {
  const five = Math.round(score * 5);
  return (
    <span className="text-amber-500" aria-label={`${five} out of 5`}>
      {"★".repeat(five)}
      <span className="text-slate-300">{"★".repeat(5 - five)}</span>
    </span>
  );
}

type RecItem = {
  anime_id: number;
  name?: string;
  main_genre?: string;
  predicted_score_0_1: number;
};

function RecommendationGrid({ items }: { items: RecItem[] }) {
  if (!items?.length) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.anime_id}
          className="rounded-xl border shadow-sm bg-white overflow-hidden"
        >
          <div className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold leading-tight">
                {it.name || "Untitled"}
              </h3>
              <span className="text-xs shrink-0 rounded bg-slate-100 px-2 py-1">
                #{it.anime_id}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">
                {it.main_genre || "—"}
              </span>
              <Stars score={it.predicted_score_0_1} />
            </div>

            <div className="text-sm">
              Predicted match:{" "}
              <strong>{scorePct(it.predicted_score_0_1)}</strong>
            </div>

            <div className="pt-2">
              <a
                className="text-sm text-blue-600 hover:underline"
                href={malLink(it.anime_id)}
                target="_blank"
                rel="noreferrer"
              >
                View on MyAnimeList →
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RateFromCsvPage() {
  const [rows, setRows] = useState<AnimeRow[]>([]);
  const [loadingCsv, setLoadingCsv] = useState(false);
  const [error, setError] = useState<string>("");

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [genreFilter, setGenreFilter] = useState<string>("All");
  const [sessionKey, setSessionKey] = useState<string>(
    "guest-" + Math.random().toString(36).slice(2, 7)
  );
  const [topK, setTopK] = useState<number>(10);
  const [allowedGenres, setAllowedGenres] =
    useState<string>("Action, Adventure");
  const [onlyType, setOnlyType] = useState<string>("TV");

  const [ratings, setRatings] = useState<Record<number, number>>({});

  const [resp, setResp] = useState<any>(null);
  const [loadingReq, setLoadingReq] = useState(false);

  useEffect(() => {
    setLoadingCsv(true);
    setError("");
    fetch("/anime.csv")
      .then((r) => {
        if (!r.ok) throw new Error("CSV not found at /anime.csv");
        return r.text();
      })
      .then(
        (text) =>
          new Promise<AnimeRow[]>((resolve, reject) => {
            Papa.parse(text, {
              header: true,
              skipEmptyLines: true,
              complete: (res) => {
                try {
                  const out: AnimeRow[] = (res.data as any[])
                    .map((d) => ({
                      anime_id: Number(d.anime_id),
                      name: String(d.name ?? ""),
                      genre: String(d.genre ?? ""),
                      type: d.type ? String(d.type) : undefined,
                    }))
                    .filter((r) => !Number.isNaN(r.anime_id) && r.name);
                  resolve(out);
                } catch (e) {
                  reject(e);
                }
              },
              error: (err: any) => reject(err),
            });
          })
      )
      .then(setRows)
      .catch((e) => setError(e.message || String(e)))
      .finally(() => setLoadingCsv(false));
  }, []);

  const allTypes = useMemo(
    () => uniq(rows.map((r) => r.type || "Unknown")).sort(),
    [rows]
  );
  const allGenres = useMemo(
    () => uniq(rows.flatMap((r) => splitGenres(r.genre))).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const qLower = q.toLowerCase();
    return rows.filter((r) => {
      if (
        q &&
        !r.name.toLowerCase().includes(qLower) &&
        String(r.anime_id).includes(q) === false
      )
        return false;
      if (typeFilter !== "All" && (r.type || "Unknown") !== typeFilter)
        return false;
      if (genreFilter !== "All" && !splitGenres(r.genre).includes(genreFilter))
        return false;
      return true;
    });
  }, [rows, q, typeFilter, genreFilter]);

  const pageSize = 25;
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  function setRowRating(id: number, val: number) {
    setRatings((prev) => ({ ...prev, [id]: val }));
  }

  const ratedPairs: RatedPair[] = useMemo(
    () =>
      Object.entries(ratings)
        .map(([k, v]) => ({ anime_id: Number(k), rating: Number(v) }))
        .filter(
          (x) =>
            !Number.isNaN(x.anime_id) && !Number.isNaN(x.rating) && x.rating > 0
        ),
    [ratings]
  );

  async function submit() {
    if (ratedPairs.length === 0) {
      setError("Please rate at least 1 anime (0..10).");
      return;
    }
    setLoadingReq(true);
    setError("");
    setResp(null);
    const allowed = allowedGenres
      .split(/[,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const body = {
      session_key: sessionKey,
      rated: ratedPairs,
      top_k: Number(topK),
      allowed_genres: allowed.length ? allowed : null,
      only_type: onlyType === "None" ? null : onlyType,
    };
    const { ok, data } = await apiPost("/bootstrap_recommend", body);
    setLoadingReq(false);
    if (!ok)
      setError(
        typeof data === "string" ? data : data?.detail || "Request failed"
      );
    else
      setResp({
        ...data,
        items: (data.items ?? [])
          .slice()
          .sort((a: { predicted_score_0_1: number; }, b: { predicted_score_0_1: number; }) => b.predicted_score_0_1 - a.predicted_score_0_1),
      });
  }

  function clearRatings() {
    setRatings({});
    setResp(null);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 mt-10 mb-40">
      <header className="space-y-1">
        <h1 className="text-4xl font-bold">
          Rate Anime You've Watched and Get Recommendations
        </h1>
      </header>

      {error && (
        <div className="p-3 rounded bg-red-100 text-red-800 text-sm">
          {error}
        </div>
      )}

      <section className="grid md:grid-cols-4 gap-3 items-end">
        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm">Search (name or ID)</span>
          <input
            className="border rounded p-2"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="e.g. Naruto, 9253"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm">Filter Type</span>
          <select
            className="border rounded p-2"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            <option>All</option>
            {allTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm">Filter Genre</span>
          <select
            className="border rounded p-2"
            value={genreFilter}
            onChange={(e) => {
              setGenreFilter(e.target.value);
              setPage(1);
            }}
          >
            <option>All</option>
            {allGenres.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="text-left py-2 px-3">ID</th>
              <th className="text-left py-2 px-3">Name</th>
              <th className="text-left py-2 px-3">Type</th>
              <th className="text-left py-2 px-3">Main Genre</th>
              <th className="text-left py-2 px-3">Your Rating (0-10)</th>
            </tr>
          </thead>
          <tbody>
            {loadingCsv ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  Loading CSV…
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  No matches.
                </td>
              </tr>
            ) : (
              pageRows.map((row) => {
                const mainGenre = splitGenres(row.genre)[0] || "Unknown";
                const value = ratings[row.anime_id] ?? 0;
                return (
                  <tr key={row.anime_id} className="border-t">
                    <td className="py-2 px-3 align-middle text-slate-700">
                      {row.anime_id}
                    </td>
                    <td className="py-2 px-3 align-middle">{row.name}</td>
                    <td className="py-2 px-3 align-middle text-slate-700">
                      {row.type || "?"}
                    </td>
                    <td className="py-2 px-3 align-middle text-slate-700">
                      {mainGenre}
                    </td>
                    <td className="py-2 px-3 align-middle">
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={10}
                          step={1}
                          value={value}
                          onChange={(e) =>
                            setRowRating(row.anime_id, Number(e.target.value))
                          }
                          className="w-40"
                        />
                        <input
                          type="number"
                          min={0}
                          max={10}
                          step={1}
                          value={value}
                          onChange={(e) =>
                            setRowRating(
                              row.anime_id,
                              Math.max(
                                0,
                                Math.min(10, Number(e.target.value) || 0)
                              )
                            )
                          }
                          className="w-16 border rounded p-1 text-center"
                        />
                        <button
                          className="text-xs text-slate-500 underline"
                          onClick={() => setRowRating(row.anime_id, 0)}
                        >
                          clear
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div className="flex items-center justify-between p-3 text-sm bg-slate-50 border-t">
          <div>
            Showing {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, filtered.length)} of {filtered.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span>
              Page {page}/{pageCount}
            </span>
            <button
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="px-2 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-3 items-end">
        <label className="grid gap-1">
          <span className="text-sm">Session Key</span>
          <input
            className="border rounded p-2"
            value={sessionKey}
            onChange={(e) => setSessionKey(e.target.value)}
            disabled
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm">Number of recommendations</span>
          <input
            type="number"
            className="border rounded p-2"
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm">Only Type</span>
          <select
            className="border rounded p-2"
            value={onlyType}
            onChange={(e) => setOnlyType(e.target.value)}
          >
            <option>TV</option>
            <option>Movie</option>
            <option>None</option>
          </select>
        </label>
        <label className="md:col-span-2 grid gap-1">
          <span className="text-sm">Allowed Genres (comma-separated)</span>
          <input
            className="border rounded p-2"
            value={allowedGenres}
            onChange={(e) => setAllowedGenres(e.target.value)}
          />
        </label>
        <div className="flex items-center gap-2 md:col-span-1">
          <button onClick={clearRatings} className="px-3 py-2 border rounded">
            Clear ratings
          </button>
          <button
            onClick={submit}
            disabled={loadingReq}
            className="px-3 py-2 bg-blue-600 text-white rounded"
          >
            {loadingReq
              ? "Requesting…"
              : `Recommend (${ratedPairs.length} rated)`}
          </button>
        </div>
      </section>

      {resp && (
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <h2 className="font-semibold">Recommendations</h2>
            <button
              onClick={() =>
                navigator.clipboard.writeText(JSON.stringify(resp, null, 2))
              }
              className="text-xs text-slate-600 hover:underline"
              title="Copy JSON"
            >
              Copy JSON
            </button>
          </div>

          <RecommendationGrid items={(resp.items ?? resp) as RecItem[]} />

          <details className="mt-2">
            <summary className="cursor-pointer text-sm text-slate-600">
              Show raw JSON
            </summary>
            <pre className="rounded-xl bg-black text-white p-4 text-xs overflow-auto max-h-96 whitespace-pre-wrap break-words">
              {JSON.stringify(resp, null, 2)}
            </pre>
          </details>
        </section>
      )}
    </div>
  );
}
