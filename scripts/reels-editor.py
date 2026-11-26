#!/usr/bin/env python3
"""MM · Editor automático de Reels do @kliccasa (roda no GitHub Actions, com ffmpeg).

Pega o trabalho na função mm-video-api do Supabase:
  - vídeos enviados no painel (kind "manual"): corta para no máximo 45 s, deixa vertical 1080x1920,
    coloca gancho, preço, "Comente EU QUERO" e @kliccasa;
  - produtos sem vídeo (kind "auto"): monta um Reel de 12 s a partir da foto oficial do produto
    (fundo desfocado, zoom lento e os mesmos textos).
Sobe o vídeo final e a capa por URL assinada e marca o vídeo como "pronto". A publicação no Instagram
continua com a função mm-instagram, nos horários de Reel.

Autenticação: token OIDC que o próprio GitHub emite para este workflow (nenhuma chave guardada no GitHub).
Teste local sem a API:  python3 scripts/reels-editor.py --local job.json saida.mp4
"""
import json
import os
import subprocess
import sys
import tempfile
import textwrap
import urllib.request

API = "https://tazyeczbbgspqbyluynf.supabase.co/functions/v1/mm-video-api"
AUDIENCE = "mm-video-api"
W, H, FPS = 1080, 1920, 30
AUTO_SECONDS = 12
MAX_SECONDS = 45
FONT = next((f for f in [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
] if os.path.exists(f)), "DejaVuSans-Bold")
UA = {"User-Agent": "mm-reels-editor/1.0"}


# ---------- API ----------
def oidc_token():
    url, tok = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_URL"), os.environ.get("ACTIONS_ID_TOKEN_REQUEST_TOKEN")
    if not url or not tok:
        sys.exit("sem token OIDC do GitHub (o workflow precisa de permissions: id-token: write)")
    req = urllib.request.Request(f"{url}&audience={AUDIENCE}", headers={"Authorization": f"Bearer {tok}", **UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)["value"]


def api(token, action, **body):
    data = json.dumps({"action": action, **body}).encode()
    req = urllib.request.Request(API, data=data, method="POST", headers={
        "Content-Type": "application/json", "Authorization": f"Bearer {token}", **UA})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{action}: HTTP {e.code} {e.read().decode(errors='replace')[:300]}")


def download(url, dest):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r, open(dest, "wb") as f:
        while chunk := r.read(1 << 20):
            f.write(chunk)
    if os.path.getsize(dest) < 1000:
        raise RuntimeError("arquivo baixado vazio")


def upload(signed_url, path, content_type):
    with open(path, "rb") as f:
        data = f.read()
    req = urllib.request.Request(signed_url, data=data, method="PUT", headers={"Content-Type": content_type, "x-upsert": "true", **UA})
    with urllib.request.urlopen(req, timeout=300) as r:
        if r.status >= 300:
            raise RuntimeError(f"upload HTTP {r.status}")


# ---------- textos ----------
def brl(v):
    s = f"{float(v or 0):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"R$ {s}"


def ascii_safe(t):
    # a fonte desenha acentos; tira só o que não existe nela (emoji e símbolos raros)
    return "".join(ch for ch in str(t or "") if ch.isalnum() or ch in " .,!?%$:+-/()'\"&" or ord(ch) < 0x250).strip()


def write_text(tmp, name, text):
    p = os.path.join(tmp, name)
    with open(p, "w", encoding="utf-8") as f:
        f.write(text)
    return p.replace("\\", "/").replace(":", "\\:")


def texts(job, tmp):
    hook = ascii_safe(job.get("hook") or job.get("name") or "Achadinho de casa").upper()
    hook = "\n".join(textwrap.wrap(hook, 20)[:3])
    info = [brl(job.get("price"))]
    sales, rating = int(job.get("sales") or 0), float(job.get("rating") or 0)
    sub = []
    if sales >= 50:
        sub.append(f"{sales:,}".replace(",", ".") + " vendidos")
    if rating >= 4:
        sub.append(f"nota {rating:.1f}".replace(".", ","))
    return {
        "hook": write_text(tmp, "hook.txt", hook),
        "price": write_text(tmp, "price.txt", info[0]),
        "sub": write_text(tmp, "sub.txt", " · ".join(sub)) if sub else None,
        "cta": write_text(tmp, "cta.txt", "COMENTE  EU QUERO"),
        "cta2": write_text(tmp, "cta2.txt", "que eu te mando o link no direct"),
        "handle": write_text(tmp, "handle.txt", "@kliccasa"),
    }


def overlays(t, dur, intro=0.2):
    """Camadas de texto (drawtext). O gancho fica no topo, preço no meio-baixo, chamada embaixo."""
    d = lambda file, size, y, color="white", box=None, start=0.0, end=None, extra="": (
        f"drawtext=fontfile='{FONT}':textfile='{file}':expansion=none:fontsize={size}:fontcolor={color}"
        f":x=(w-text_w)/2:y={y}:line_spacing=12:borderw=3:bordercolor=black@0.85"
        + (f":box=1:boxcolor={box}:boxborderw=26" if box else "")
        + f":enable='between(t,{start},{end if end is not None else dur + 1})'{extra}"
    )
    layers = [
        d(t["hook"], 70, 110, box="black@0.55", start=intro),
        d(t["price"], 104, 1345, color="#FFD400", box="black@0.6", start=1.2),
    ]
    if t["sub"]:
        layers.append(d(t["sub"], 44, 1490, start=1.6))
    layers += [
        d(t["cta"], 70, 1590, color="black", box="#FFD400@0.95", start=2.5),
        d(t["cta2"], 40, 1712, start=2.8),
        d(t["handle"], 38, 1810, color="white@0.9", start=0),
    ]
    return ",".join(layers)


def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError("ffmpeg: " + p.stderr.strip().splitlines()[-1][:300] if p.stderr else "ffmpeg falhou")
    return p.stdout


def probe(path):
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type", "-of", "json", path])
    j = json.loads(out)
    dur = float(j.get("format", {}).get("duration") or 0)
    has_audio = any(s.get("codec_type") == "audio" for s in j.get("streams", []))
    return dur, has_audio


ENC = ["-c:v", "libx264", "-preset", "medium", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", str(FPS),
       "-b:v", "6M", "-maxrate", "8M", "-bufsize", "12M", "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "2",
       "-movflags", "+faststart"]


# ---------- montagem ----------
def render_auto(job, image, out, tmp):
    t = texts(job, tmp)
    dur = AUTO_SECONDS
    fc = (
        f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=30:3,eq=brightness=-0.18[bg];"
        f"[0:v]scale=860:860:force_original_aspect_ratio=decrease,scale='trunc(iw*(1+0.06*t/{dur})/2)*2':-2:eval=frame[fg];"
        f"[bg][fg]overlay=x=(W-w)/2:y=845-h/2:shortest=1,{overlays(t, dur)},format=yuv420p[v]"
    )
    run(["ffmpeg", "-y", "-loop", "1", "-framerate", str(FPS), "-t", str(dur), "-i", image,
         "-f", "lavfi", "-t", str(dur), "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
         "-filter_complex", fc, "-map", "[v]", "-map", "1:a", "-t", str(dur), *ENC, out])


def render_manual(job, raw, out, tmp):
    t = texts(job, tmp)
    dur, has_audio = probe(raw)
    if dur < 3:
        raise RuntimeError("vídeo com menos de 3 segundos")
    dur = min(dur, MAX_SECONDS)
    fc = (
        f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=30:3,eq=brightness=-0.2[bg];"
        f"[0:v]scale={W}:{H}:force_original_aspect_ratio=decrease[fg];"
        f"[bg][fg]overlay=x=(W-w)/2:y=(H-h)/2,fps={FPS},{overlays(t, dur)},format=yuv420p[v]"
    )
    inputs = ["-i", raw]
    amap = ["-map", "0:a:0"]
    if not has_audio:
        inputs += ["-f", "lavfi", "-t", str(dur), "-i", "anullsrc=channel_layout=stereo:sample_rate=44100"]
        amap = ["-map", "1:a"]
    run(["ffmpeg", "-y", *inputs, "-filter_complex", fc, "-map", "[v]", *amap, "-t", f"{dur:.2f}", *ENC, out])


def cover(video, out):
    run(["ffmpeg", "-y", "-ss", "3", "-i", video, "-frames:v", "1", "-q:v", "3", out])


def build(job, out, tmp):
    if job["kind"] == "manual":
        raw = os.path.join(tmp, "raw.mp4")
        download(job["raw_url"], raw)
        render_manual(job, raw, out, tmp)
    else:
        if not job.get("image"):
            raise RuntimeError("produto sem foto")
        img = os.path.join(tmp, "foto.jpg")
        download(job["image"], img)
        render_auto(job, img, out, tmp)
    dur, _ = probe(out)
    if not 3 <= dur <= 90:
        raise RuntimeError(f"duração final fora do limite do Reels: {dur:.1f}s")


def main():
    if len(sys.argv) >= 2 and sys.argv[1] == "--local":
        job = json.load(open(sys.argv[2], encoding="utf-8"))
        out = sys.argv[3] if len(sys.argv) > 3 else "reel.mp4"
        with tempfile.TemporaryDirectory() as tmp:
            if job["kind"] == "manual" and os.path.exists(job.get("raw_url", "")):
                render_manual(job, job["raw_url"], out, tmp)
            elif job["kind"] == "auto" and os.path.exists(job.get("image", "")):
                render_auto(job, job["image"], out, tmp)
            else:
                build(job, out, tmp)
            cover(out, out.rsplit(".", 1)[0] + ".jpg")
        print("ok", out)
        return

    token = oidc_token()
    jobs = api(token, "jobs").get("jobs", [])
    print(f"{len(jobs)} vídeo(s) para editar")
    failed = 0
    for job in jobs:
        label = f"#{job['id']} ({job['kind']}) {job.get('name', '')[:60]}"
        try:
            with tempfile.TemporaryDirectory() as tmp:
                out, jpg = os.path.join(tmp, "final.mp4"), os.path.join(tmp, "final.jpg")
                build(job, out, tmp)
                cover(out, jpg)
                urls = api(token, "final-url", id=job["id"])
                upload(urls["video"], out, "video/mp4")
                upload(urls["cover"], jpg, "image/jpeg")
                api(token, "done", id=job["id"])
                print(f"✓ {label}: {os.path.getsize(out) // 1024} KB")
        except Exception as e:  # noqa: BLE001 — registra e segue para o próximo
            failed += 1
            print(f"✕ {label}: {e}")
            try:
                api(token, "fail", id=job["id"], error=str(e)[:400])
            except Exception as e2:  # noqa: BLE001
                print(f"  (não consegui registrar a falha: {e2})")
    if failed and failed == len(jobs):
        sys.exit(1)


if __name__ == "__main__":
    main()
