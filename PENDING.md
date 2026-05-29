# Pendientes Activos

## MTF → SSW conversión
Status: parked. MTF files se aceptan as-is en `import-units.cjs`, pero index extrae solo nombre (BV2 = 0).

Para conversión real:
- Opción A: GUI manual SSW (File → Open MTF → Save As SSW). Funcional, tedioso para lote.
- Opción B: implementar parser+BV calculator en Node (~500 líneas). Heavy.
- Opción C: investigar herramientas community (MegaMek CLI, etc.) — TODO

Cuando se necesite BV2 exacto para un MTF: convertir vía SSW GUI manualmente, importar SSW resultante.

## Launcher Desktop App (Tauri)
Status: en planificación.

- Stack: Tauri (Rust + WebView2 + React)
- Plataforma: Windows
- Empaquetado: portable .exe
- Tema: Stitch (replica del SPA)
- Integración: tipo C (panel lateral + iframe app web embebido)
- Botones definidos: ver `launcher-app/BUTTONS.md` (TODO crear)

Prerequisites pendientes en máquina dev:
1. Rust toolchain (rustup)
2. MSVC C++ Build Tools
3. WebView2 runtime (preinstalado Win10+ habitual)
4. `cargo install tauri-cli` o `npm create tauri-app`

## Páginas placeholder (fase futura)
- ReclutamientoPage
- TROPage

## Features backend OK sin UI cliente
- Historial Combates (`getHistorial` endpoint listo)
- Vehículos VehicleSession (combate completo)
- AI Crónicas Gemini (helper escritura)

## CLAUDE.md desactualizado
Refleja estado pre-reskin. Actualizar con: Hoja P3, Barracones P2, Roster, Lanzas, Crónicas, toggle Legacy, C3 Calc, Logros.
