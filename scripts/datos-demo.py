#!/usr/bin/env python3
"""Genera una base marco.db con datos de ejemplo para las capturas del README.

Perfil «Ana», los cinco hábitos que siembra la app (src/api/semilla.ts) y siete
semanas de historial inventado con una tendencia que mejora, para que Análisis
y el Calendario tengan algo que enseñar. Nada sale de un teléfono real.

Uso:
    python3 scripts/datos-demo.py marco.db

El esquema es el de MarcoDbHelper.kt (versión 3). Si cambia, hay que tocarlo
aquí también.
"""

import json
import random
import sqlite3
import sys
from datetime import date, datetime, timedelta, timezone

SEMILLA = 7  # mismo historial en cada ejecución
SEMANAS = 7
TODOS = json.dumps(["L", "M", "X", "J", "V", "S", "D"])
LABORABLES = json.dumps(["L", "M", "X", "J", "V"])

# nombre, descripción, categoría, unidad, meta, días, color, constancia base
HABITOS = [
    ("Tomar agua", "Repartidos a lo largo del día", "Salud", "litros", 2, TODOS, "#0b61b8", 0.80),
    ("Hacer ejercicio", "Cualquier movimiento cuenta", "Salud", "minutos", 30, LABORABLES, "#00ff88", 0.55),
    ("Leer", "Antes de dormir", "Productividad", "páginas", 20, TODOS, "#ff6b35", 0.70),
    ("Meditar", "Respirar y parar un rato", "Bienestar", "minutos", 10, TODOS, "#7b2cbf", 0.60),
    ("Dormir temprano", "Antes de medianoche", "Bienestar", "veces", 1, TODOS, "#4ecdc4", 0.50),
]

ESQUEMA = """
CREATE TABLE perfil (
    id INTEGER PRIMARY KEY CHECK (id = 1), nombre TEXT NOT NULL,
    ver_futuro INTEGER NOT NULL DEFAULT 0, notificaciones_activas INTEGER NOT NULL DEFAULT 0,
    hora_recordatorio TEXT NOT NULL DEFAULT '08:00', mostrar_ocultos INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL, updated_at TEXT);
CREATE TABLE categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL, updated_at TEXT);
CREATE TABLE habitos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, descripcion TEXT,
    categoria_id INTEGER NOT NULL REFERENCES categorias(id), usuario_id INTEGER NOT NULL DEFAULT 1,
    unidad_medida TEXT NOT NULL, meta_diaria REAL NOT NULL, dias TEXT NOT NULL, color TEXT NOT NULL,
    activo INTEGER NOT NULL DEFAULT 1, oculto INTEGER NOT NULL DEFAULT 0,
    marcado_por_defecto INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT);
CREATE TABLE registros (
    id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER NOT NULL DEFAULT 1,
    fecha TEXT NOT NULL UNIQUE, notas TEXT, created_at TEXT NOT NULL, updated_at TEXT);
CREATE TABLE progreso_habitos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, registro_id INTEGER NOT NULL REFERENCES registros(id),
    habito_id INTEGER NOT NULL REFERENCES habitos(id), valor REAL NOT NULL DEFAULT 0,
    completado INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT,
    UNIQUE(registro_id, habito_id));
"""

DIA_LETRA = ["L", "M", "X", "J", "V", "S", "D"]  # date.weekday(): lunes = 0


def main(ruta: str) -> None:
    rng = random.Random(SEMILLA)
    hoy = date.today()
    inicio = hoy - timedelta(weeks=SEMANAS)
    ahora = datetime.now(timezone.utc).isoformat()

    db = sqlite3.connect(ruta)
    db.executescript(ESQUEMA)
    db.execute("PRAGMA user_version = 3")
    db.execute(
        "INSERT INTO perfil (id, nombre, notificaciones_activas, hora_recordatorio, created_at) "
        "VALUES (1, 'Ana', 1, '08:00,21:30', ?)",
        (ahora,),
    )

    categoria_id = {}
    habito_ids = []
    for nombre, desc, cat, unidad, meta, dias, color, base in HABITOS:
        if cat not in categoria_id:
            categoria_id[cat] = db.execute(
                "INSERT INTO categorias (nombre, created_at) VALUES (?, ?)", (cat, ahora)
            ).lastrowid
        hid = db.execute(
            "INSERT INTO habitos (nombre, descripcion, categoria_id, unidad_medida, meta_diaria, dias, "
            "color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (nombre, desc, categoria_id[cat], unidad, meta, dias, color, ahora),
        ).lastrowid
        habito_ids.append((hid, meta, json.loads(dias), base))

    total_dias = (hoy - inicio).days
    for i in range(total_dias + 1):
        dia = inicio + timedelta(days=i)
        registro = db.execute(
            "INSERT INTO registros (fecha, created_at) VALUES (?, ?)", (dia.isoformat(), ahora)
        ).lastrowid
        # La constancia sube con las semanas: el mes en curso sale mejor que el anterior.
        mejora = 0.25 * i / total_dias
        for hid, meta, dias, base in habito_ids:
            if DIA_LETRA[dia.weekday()] not in dias:
                continue
            if dia == hoy:
                continue  # hoy se rellena aparte
            hecho = rng.random() < min(0.97, base + mejora)
            if hecho:
                valor, completado = meta, 1
            elif rng.random() < 0.35 and meta > 1:
                valor, completado = round(meta * rng.uniform(0.3, 0.8), 2), 0
            else:
                valor, completado = 0, 0
            db.execute(
                "INSERT INTO progreso_habitos (registro_id, habito_id, valor, completado, created_at) "
                "VALUES (?, ?, ?, ?, ?)",
                (registro, hid, valor, completado, ahora),
            )
        if dia == hoy:
            # Hoy a medias: agua y lectura hechas, meditación a 7,71 de 10.
            hoy_valores = {0: (2, 1), 2: (20, 1), 3: (7.71, 0)}
            for k, (hid, meta, dias, _) in enumerate(habito_ids):
                if DIA_LETRA[dia.weekday()] not in dias:
                    continue
                valor, completado = hoy_valores.get(k, (0, 0))
                db.execute(
                    "INSERT INTO progreso_habitos (registro_id, habito_id, valor, completado, created_at) "
                    "VALUES (?, ?, ?, ?, ?)",
                    (registro, hid, valor, completado, ahora),
                )

    db.commit()
    db.close()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
