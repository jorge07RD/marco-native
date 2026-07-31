package com.example.sparkling.go

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

// Esquema local de Marco — espejo del backend FastAPI original (ver
// marco/backend/app/models.py) menos lo que ya no aplica a un perfil local
// único sin servidor: no hay tabla `usuarios` (reemplazada por `perfil`,
// una sola fila), no hay `push_subscriptions` (recordatorios son locales,
// ver ReminderScheduler.kt), y se omiten `habito_dias`/`registro_habito_dias`
// (confirmado código muerto en el backend original).
//
// A diferencia del original, acá sí hay UNIQUE reales en `registros.fecha` y
// `progreso_habitos(registro_id, habito_id)` — el backend solo confiaba en
// lógica de aplicación para evitar duplicados ahí.
class MarcoDbHelper(context: Context) : SQLiteOpenHelper(context, "marco.db", null, 1) {
    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE perfil (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                nombre TEXT NOT NULL,
                ver_futuro INTEGER NOT NULL DEFAULT 0,
                notificaciones_activas INTEGER NOT NULL DEFAULT 0,
                hora_recordatorio TEXT NOT NULL DEFAULT '08:00',
                created_at TEXT NOT NULL,
                updated_at TEXT
            )
            """.trimIndent(),
        )
        db.execSQL(
            """
            CREATE TABLE categorias (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL,
                updated_at TEXT
            )
            """.trimIndent(),
        )
        db.execSQL(
            """
            CREATE TABLE habitos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                categoria_id INTEGER NOT NULL REFERENCES categorias(id),
                usuario_id INTEGER NOT NULL DEFAULT 1,
                unidad_medida TEXT NOT NULL,
                meta_diaria REAL NOT NULL,
                dias TEXT NOT NULL,
                color TEXT NOT NULL,
                activo INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT
            )
            """.trimIndent(),
        )
        db.execSQL(
            """
            CREATE TABLE registros (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                usuario_id INTEGER NOT NULL DEFAULT 1,
                fecha TEXT NOT NULL UNIQUE,
                notas TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT
            )
            """.trimIndent(),
        )
        db.execSQL(
            """
            CREATE TABLE progreso_habitos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                registro_id INTEGER NOT NULL REFERENCES registros(id),
                habito_id INTEGER NOT NULL REFERENCES habitos(id),
                valor REAL NOT NULL DEFAULT 0,
                completado INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT,
                UNIQUE(registro_id, habito_id)
            )
            """.trimIndent(),
        )
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // Sin versiones previas publicadas todavía — nada que migrar aún.
    }
}
