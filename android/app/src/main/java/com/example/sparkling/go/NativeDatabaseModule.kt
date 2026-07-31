package com.example.sparkling.go

import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import com.lynx.jsbridge.LynxMethod
import com.lynx.jsbridge.LynxModule
import com.lynx.react.bridge.Callback
import com.lynx.tasm.behavior.LynxContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader

// Puente genérico hacia SQLite: dos métodos (query/execute), toda la lógica
// de negocio (qué hábitos tocan hoy, agregaciones de calendario/análisis)
// vive en TypeScript (src/api/marco.ts), no acá — ver el plan de migración.
class NativeDatabaseModule(context: Context) : LynxModule(context) {
    private fun androidContext(): Context = (mContext as LynxContext).getContext()

    private val dbHelper: MarcoDbHelper by lazy { MarcoDbHelper(androidContext()) }

    @LynxMethod
    fun query(sql: String, paramsJson: String, callback: Callback) {
        val args = jsonArrayToStringArgs(JSONArray(paramsJson))
        val db = dbHelper.readableDatabase
        val cursor = db.rawQuery(sql, args)
        val results = JSONArray()
        cursor.use {
            while (it.moveToNext()) {
                results.put(cursorRowToJson(it))
            }
        }
        callback.invoke(results.toString())
    }

    @LynxMethod
    fun execute(sql: String, paramsJson: String, callback: Callback) {
        val params = JSONArray(paramsJson)
        val args = Array<Any?>(params.length()) { i -> params.get(i).takeIf { it != JSONObject.NULL } }
        val db = dbHelper.writableDatabase
        db.execSQL(sql, args)

        val insertId = db.rawQuery("SELECT last_insert_rowid()", null).use {
            if (it.moveToFirst()) it.getLong(0) else 0L
        }
        val rowsAffected = db.rawQuery("SELECT changes()", null).use {
            if (it.moveToFirst()) it.getInt(0) else 0
        }
        callback.invoke(JSONObject().put("insertId", insertId).put("rowsAffected", rowsAffected).toString())
    }

    @LynxMethod
    fun exportBackup(json: String, filename: String, callback: Callback) {
        try {
            val resolver = androidContext().contentResolver
            val values = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, filename)
                put(MediaStore.Downloads.MIME_TYPE, "application/json")
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    put(MediaStore.Downloads.IS_PENDING, 1)
                }
            }
            val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
            if (uri == null) {
                callback.invoke(false)
                return
            }
            resolver.openOutputStream(uri)?.use { it.write(json.toByteArray()) }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.clear()
                values.put(MediaStore.Downloads.IS_PENDING, 0)
                resolver.update(uri, values, null, null)
            }
            callback.invoke(true)
        } catch (e: Exception) {
            callback.invoke(false)
        }
    }

    @LynxMethod
    fun listBackups(callback: Callback) {
        val resolver = androidContext().contentResolver
        val results = JSONArray()
        val projection = arrayOf(MediaStore.Downloads._ID, MediaStore.Downloads.DISPLAY_NAME)
        val selection = "${MediaStore.Downloads.DISPLAY_NAME} LIKE ?"
        val cursor = resolver.query(
            MediaStore.Downloads.EXTERNAL_CONTENT_URI,
            projection,
            selection,
            arrayOf("marco_backup_%.json"),
            "${MediaStore.Downloads.DISPLAY_NAME} DESC",
        )
        cursor?.use {
            val idCol = it.getColumnIndexOrThrow(MediaStore.Downloads._ID)
            val nameCol = it.getColumnIndexOrThrow(MediaStore.Downloads.DISPLAY_NAME)
            while (it.moveToNext()) {
                val id = it.getLong(idCol)
                val uri = Uri.withAppendedPath(MediaStore.Downloads.EXTERNAL_CONTENT_URI, id.toString())
                results.put(JSONObject().put("nombre", it.getString(nameCol)).put("uri", uri.toString()))
            }
        }
        callback.invoke(results.toString())
    }

    @LynxMethod
    fun readBackup(uriString: String, callback: Callback) {
        try {
            val resolver = androidContext().contentResolver
            val text = resolver.openInputStream(Uri.parse(uriString))?.use { stream ->
                BufferedReader(InputStreamReader(stream)).readText()
            }
            callback.invoke(text)
        } catch (e: Exception) {
            callback.invoke(null)
        }
    }

    private fun jsonArrayToStringArgs(params: JSONArray): Array<String> =
        Array(params.length()) { i -> params.get(i).toString() }

    private fun cursorRowToJson(cursor: Cursor): JSONObject {
        val row = JSONObject()
        for (i in 0 until cursor.columnCount) {
            val name = cursor.getColumnName(i)
            when (cursor.getType(i)) {
                Cursor.FIELD_TYPE_INTEGER -> row.put(name, cursor.getLong(i))
                Cursor.FIELD_TYPE_FLOAT -> row.put(name, cursor.getDouble(i))
                Cursor.FIELD_TYPE_NULL -> row.put(name, JSONObject.NULL)
                else -> row.put(name, cursor.getString(i))
            }
        }
        return row
    }
}
