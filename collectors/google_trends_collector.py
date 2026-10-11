"""MM Intelligence — Google Trends das dores do método MM (EUA + México)."""
import json
import os
import time
from datetime import datetime, timezone

import requests
from pytrends.request import TrendReq

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_KEY = os.environ["SUPABASE_ANON_KEY"]

# Dores do método MM (mesma lista do robô da Meta). en -> EUA, es -> México.
UNIVERSOS = json.load(open(os.path.join(os.path.dirname(__file__), "universos_mm.json"), encoding="utf-8"))
REGIONS = {"US": ("en", "en-US"), "MX": ("es", "es-MX")}
ROTACAO = 6  # cada dor é medida a cada 6 dias (o Google limita robô)


def seeds_do_dia(idioma):
    lst = [(t, u) for u, langs in UNIVERSOS.items() if not u.startswith("_") for t in langs.get(idioma, [])]
    hoje = datetime.now(timezone.utc).date().toordinal() % ROTACAO
    return [x for i, x in enumerate(lst) if i % ROTACAO == hoje]


BLOCKED = ("capsule", "capsules", "supplement", "course", "ebook", "pdf", "training program")


def physical_only(term: str) -> bool:
    t = term.lower()
    return not any(x in t for x in BLOCKED)


def fetch_trends(seed: str, geo: str, hl: str = "en-US"):
    last_exc = None
    for attempt in range(3):
        try:
            py = TrendReq(hl=hl, tz=360, timeout=(10, 30))
            py.build_payload([seed], timeframe="today 3-m", geo=geo)
            interest = py.interest_over_time()
            avg = peak = latest = 0
            growth = 0.0
            if not interest.empty and seed in interest.columns:
                vals = interest[seed].astype(float)
                avg = round(float(vals.mean()), 2)
                peak = int(vals.max())
                latest = int(vals.iloc[-1])
                if len(vals) >= 4:
                    first = float(vals.iloc[: max(1, len(vals)//3)].mean())
                    last = float(vals.iloc[-max(1, len(vals)//3):].mean())
                    growth = round(((last - first) / max(first, 1.0)) * 100, 2)
            related = []
            rq = py.related_queries().get(seed) or {}
            rising = rq.get("rising")
            if rising is not None:
                for _, row in rising.head(10).iterrows():
                    q = str(row.get("query", "")).strip()
                    if q and physical_only(q):
                        related.append({"query": q, "value": str(row.get("value", ""))})
            return {"avg_interest": avg, "peak_interest": peak, "latest_interest": latest, "growth_pct": growth, "rising_queries": related}
        except Exception as exc:
            last_exc = exc
            if attempt < 2:
                time.sleep(5 * (attempt + 1))
    raise last_exc


def write_signal(name: str, signal: dict):
    url = f"{SUPABASE_URL}/rest/v1/collector_signals"
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json", "Prefer": "return=minimal"}
    payload = [{"coletor": "google_trends", "produto_nome_bruto": name, "sinal": signal, "processado": False}]
    r = requests.post(url, headers=headers, data=json.dumps(payload), timeout=30)
    if not r.ok:
        raise RuntimeError(f"Supabase write failed ({r.status_code}): {r.text[:500]}")


def main():
    now = datetime.now(timezone.utc).isoformat()
    errors = []
    written = 0
    for geo, (idioma, hl) in REGIONS.items():
        for seed, universo in seeds_do_dia(idioma):
            if not physical_only(seed):
                continue
            try:
                data = fetch_trends(seed, geo, hl)
                signal = {"source": "Google Trends", "geo": geo, "seed": seed, "universo": universo, "collected_at": now, **data}
                write_signal(seed, signal)
                written += 1
                print(f"OK {geo} {seed}: {data['latest_interest']} growth={data['growth_pct']}%")
                for item in data["rising_queries"]:
                    write_signal(item["query"], {"source": "Google Trends Rising", "geo": geo, "parent_seed": seed, "universo": universo, "trend_value": item["value"], "collected_at": now})
                    written += 1
                time.sleep(5)
            except Exception as exc:
                msg = f"{geo} {seed}: {exc}"
                errors.append(msg)
                print(f"ERROR {msg}")
    print(f"SUMMARY written={written} errors={len(errors)}")
    if written == 0:
        raise RuntimeError("Google Trends collector wrote zero signals: " + " | ".join(errors))
    if errors:
        print("Incompleto (o Google limita robô; a dor volta no próximo rodízio): " + " | ".join(errors))


if __name__ == "__main__":
    main()
