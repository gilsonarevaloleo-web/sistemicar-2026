#!/usr/bin/env python3
"""Genera clips MP3 de voz tipo GPS (gTTS) en public/voice/.

Uso:
  pip install gTTS
  python3 scripts/generate-gps-voice-clips.py
"""
from __future__ import annotations

from pathlib import Path

try:
    from gtts import gTTS
except ImportError as e:
    raise SystemExit("Instalá gTTS: pip install gTTS") from e

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "voice"

CLIPS: dict[str, str] = {
    "ring-bienvenida-1a": "Bienvenido al entrenamiento de enfoque real.",
    "ring-bienvenida-1b": "Aquí ejercitas sostener una decisión con tiempo sellado.",
    "ring-bienvenida-1c": "Lo que cierres aquí cuenta; lo que abandones, no.",
    "ring-bienvenida-2a": "Siguiente ronda. Ring de enfoque real.",
    "ring-bienvenida-2b": "Sostén cada decisión con tiempo sellado.",
    "conquista-intro-a": "Iniciando tramo uno.",
    "conquista-intro-b": "Active piloto automático. Fluya sin esfuerzo.",
    "conquista-concentrado-a": "Tramo dos: Enfoque consciente.",
    "conquista-concentrado-b": "Enderece la columna vertebral. Alineación ahora.",
    "conquista-limite-a": "Tramo final: Al límite.",
    "conquista-limite-b": "Ancle su base de fuerza. Respire profundo.",
}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for key, text in CLIPS.items():
        path = OUT / f"{key}.mp3"
        print(f"→ {path.relative_to(ROOT)}")
        gTTS(text=text, lang="es", tld="com").save(str(path))
    print(f"OK ({len(CLIPS)} clips)")


if __name__ == "__main__":
    main()
