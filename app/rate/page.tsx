"use client";

import { useMemo, useState } from "react";

const API_PREFIX = "/api/proxy";

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

async function apiGet(path: string) {
  const res = await fetch(`${API_PREFIX}${path}`, { cache: "no-store" });
  const text = await res.text();
  try {
    return { ok: res.ok, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, data: text };
  }
}

function JsonView({ data }: { data: any }) {
  return (
    <pre className="rounded-xl bg-black text-white p-4 text-sm overflow-auto max-h-96 whitespace-pre-wrap break-words">
      {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
    </pre>
  );
}

function parseCsvNumbers(s: string) {
  if (!s) return [] as number[];
  return s
    .split(/[\,\s]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => Number(x))
    .filter((n) => !Number.isNaN(n));
}
function parseCsvStrings(s: string) {
  if (!s) return [] as string[];
  return s
    .split(/[\,\n]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}
function parseRatedPairs(s: string) {
  if (!s) return [] as { anime_id: number; rating: number }[];
  return s
    .split(/[\,\n]+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const [idStr, ratingStr] = p.split(":").map((x) => x.trim());
      const anime_id = Number(idStr);
      const rating = Number(ratingStr);
      if (Number.isNaN(anime_id) || Number.isNaN(rating)) return null;
      return { anime_id, rating };
    })
    .filter(Boolean) as { anime_id: number; rating: number }[];
}

export default function Page() {
  const [health, setHealth] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Predict
  const [predUserId, setPredUserId] = useState<number>(12345);
  const [predAnimeId, setPredAnimeId] = useState<number>(9253);
  const [predResp, setPredResp] = useState<any>(null);

  // Recommend
  const [recUserId, setRecUserId] = useState<number | "">(12345);
  const [recTopK, setRecTopK] = useState<number>(10);
  const [recGenres, setRecGenres] = useState<string>("Action, Comedy");
  const [recExclude, setRecExclude] = useState<string>("11061, 9253");
  const [recType, setRecType] = useState<string>("TV");
  const [recPreferred, setRecPreferred] = useState<string>("");
  const [recResp, setRecResp] = useState<any>(null);

  // Bootstrap
  const [bootSession, setBootSession] = useState<string>(
    "guest-" + Math.random().toString(36).slice(2, 7)
  );
  const [bootRated, setBootRated] = useState<string>(
    "9253:10, 11061:9, 1535:8"
  );
  const [bootTopK, setBootTopK] = useState<number>(10);
  const [bootGenres, setBootGenres] = useState<string>("Action, Adventure");
  const [bootType, setBootType] = useState<string>("TV");
  const [bootResp, setBootResp] = useState<any>(null);

  const recAllowedGenres = useMemo(
    () => parseCsvStrings(recGenres),
    [recGenres]
  );
  const recExcludeIds = useMemo(
    () => parseCsvNumbers(recExclude),
    [recExclude]
  );
  const recPreferredGenres = useMemo(
    () => parseCsvStrings(recPreferred),
    [recPreferred]
  );
  const bootAllowedGenres = useMemo(
    () => parseCsvStrings(bootGenres),
    [bootGenres]
  );
  const bootRatedPairs = useMemo(() => parseRatedPairs(bootRated), [bootRated]);

  async function ping() {
    setLoading(true);
    setError("");
    const { ok, data } = await apiGet("/health");
    setLoading(false);
    if (!ok)
      return setError(
        typeof data === "string" ? data : data?.detail || "Request failed"
      );
    setHealth(data);
  }

  async function doPredict() {
    setLoading(true);
    setError("");
    const { ok, data } = await apiPost("/predict", {
      user_id: Number(predUserId),
      anime_id: Number(predAnimeId),
    });
    setLoading(false);
    if (!ok)
      return setError(
        typeof data === "string" ? data : data?.detail || "Request failed"
      );
    setPredResp(data);
  }

  async function doRecommend() {
    setLoading(true);
    setError("");
    const body = {
      user_id: recUserId === "" ? null : Number(recUserId),
      top_k: Number(recTopK),
      allowed_genres: recAllowedGenres.length ? recAllowedGenres : null,
      exclude_anime_ids: recExcludeIds.length ? recExcludeIds : null,
      only_type: recType === "None" ? null : recType,
      preferred_genres: recPreferredGenres.length ? recPreferredGenres : null,
    };
    const { ok, data } = await apiPost("/recommend", body);
    setLoading(false);
    if (!ok)
      return setError(
        typeof data === "string" ? data : data?.detail || "Request failed"
      );
    setRecResp(data);
  }

  async function doBootstrap() {
    setLoading(true);
    setError("");
    const body = {
      session_key: bootSession,
      rated: bootRatedPairs,
      top_k: Number(bootTopK),
      allowed_genres: bootAllowedGenres.length ? bootAllowedGenres : null,
      only_type: bootType === "None" ? null : bootType,
    };
    const { ok, data } = await apiPost("/bootstrap_recommend", body);
    setLoading(false);
    if (!ok)
      return setError(
        typeof data === "string" ? data : data?.detail || "Request failed"
      );
    setBootResp(data);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">
          Anime Recommender – Next.js Client
        </h1>
        <p className="text-slate-600 text-sm">
          Using a Next.js proxy to call FastAPI safely.
        </p>
        <button
          onClick={ping}
          className="px-3 py-2 bg-blue-600 text-white rounded mt-2"
        >
          Check /health
        </button>
      </header>

      {error && (
        <div className="p-3 rounded bg-red-100 text-red-800 text-sm">
          {error}
        </div>
      )}

      {health && (
        <section>
          <h2 className="font-semibold mb-2">Health</h2>
          <JsonView data={health} />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Predict (/predict)</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1">
            <span className="text-sm">User ID</span>
            <input
              type="number"
              value={predUserId}
              onChange={(e) => setPredUserId(Number(e.target.value))}
              className="border rounded p-2"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Anime ID</span>
            <input
              type="number"
              value={predAnimeId}
              onChange={(e) => setPredAnimeId(Number(e.target.value))}
              className="border rounded p-2"
            />
          </label>
        </div>
        <button
          onClick={doPredict}
          className="px-3 py-2 bg-blue-600 text-white rounded"
        >
          Predict
        </button>
        {predResp && <JsonView data={predResp} />}
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold">Recommend (/recommend)</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <label className="grid gap-1">
            <span className="text-sm">User ID (optional)</span>
            <input
              value={recUserId}
              onChange={(e) =>
                setRecUserId(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              className="border rounded p-2"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Top K</span>
            <input
              type="number"
              value={recTopK}
              onChange={(e) => setRecTopK(Number(e.target.value))}
              className="border rounded p-2"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Only Type</span>
            <select
              value={recType}
              onChange={(e) => setRecType(e.target.value)}
              className="border rounded p-2"
            >
              <option>TV</option>
              <option>Movie</option>
              <option>None</option>
            </select>
          </label>
          <label className="md:col-span-2 grid gap-1">
            <span className="text-sm">Allowed Genres (comma-separated)</span>
            <input
              value={recGenres}
              onChange={(e) => setRecGenres(e.target.value)}
              className="border rounded p-2"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Exclude Anime IDs</span>
            <input
              value={recExclude}
              onChange={(e) => setRecExclude(e.target.value)}
              className="border rounded p-2"
            />
          </label>
          <label className="md:col-span-3 grid gap-1">
            <span className="text-sm">Preferred Genres (cold-start)</span>
            <input
              value={recPreferred}
              onChange={(e) => setRecPreferred(e.target.value)}
              className="border rounded p-2"
              placeholder="e.g. Action, Adventure"
            />
          </label>
        </div>
        <button
          onClick={doRecommend}
          className="px-3 py-2 bg-blue-600 text-white rounded"
        >
          Get Recommendations
        </button>
        {recResp && <JsonView data={recResp} />}
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold">
          Bootstrap Recommend (/bootstrap_recommend)
        </h2>
        <div className="grid md:grid-cols-3 gap-3">
          <label className="grid gap-1">
            <span className="text-sm">Session Key</span>
            <input
              value={bootSession}
              onChange={(e) => setBootSession(e.target.value)}
              className="border rounded p-2"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Top K</span>
            <input
              type="number"
              value={bootTopK}
              onChange={(e) => setBootTopK(Number(e.target.value))}
              className="border rounded p-2"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm">Only Type</span>
            <select
              value={bootType}
              onChange={(e) => setBootType(e.target.value)}
              className="border rounded p-2"
            >
              <option>TV</option>
              <option>Movie</option>
              <option>None</option>
            </select>
          </label>
          <label className="md:col-span-2 grid gap-1">
            <span className="text-sm">Allowed Genres</span>
            <input
              value={bootGenres}
              onChange={(e) => setBootGenres(e.target.value)}
              className="border rounded p-2"
            />
          </label>
          <label className="md:col-span-3 grid gap-1">
            <span className="text-sm">
              Rated (anime_id:rating, comma-separated)
            </span>
            <textarea
              rows={3}
              value={bootRated}
              onChange={(e) => setBootRated(e.target.value)}
              className="border rounded p-2"
            />
            <span className="text-xs text-slate-500">
              Example: 9253:10, 11061:9, 1535:8
            </span>
          </label>
        </div>
        <button
          onClick={doBootstrap}
          className="px-3 py-2 bg-blue-600 text-white rounded"
        >
          Personalize & Recommend
        </button>
        {bootResp && <JsonView data={bootResp} />}
      </section>
    </div>
  );
}
