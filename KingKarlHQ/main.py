from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import sqlite3

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    conn = sqlite3.connect('mercenarios.db')
    conn.row_factory = sqlite3.Row 
    return conn

# ==========================================
# 1. EL FRONTEND (LA INTERFAZ VISUAL)
# ==========================================
@app.get("/")
def read_root():
    """Esta es la magia: al entrar a la raíz, sirve tu panel de mando visual."""
    return FileResponse("index.html")

# ==========================================
# 2. EL BACKEND (LOS DATOS)
# ==========================================
@app.get("/api/status")
def get_system_status():
    return {"status": "ENLACE OPERATIVO", "stardate": "12 OCT 3049"}

@app.get("/api/pilots")
def get_pilots():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM pilotos")
        rows = cursor.fetchall()
        conn.close()
        
        if not rows: return _get_mock_pilots()
            
        pilots_data = []
        for row in rows:
            data = dict(row)
            pilots_data.append({
                "id": str(data.get("id", data.get("ID", len(pilots_data)))),
                "name": data.get("name", data.get("nombre", data.get("Nombre", "Desconocido"))),
                "callsign": data.get("callsign", data.get("apodo", data.get("Apodo", ""))),
                "xp": int(data.get("xp", data.get("XP_TOTAL", data.get("xp_total", 0)))),
                "health": 100, 
                "status": data.get("status", data.get("estado", data.get("Estado", "OK"))).upper()
            })
        return pilots_data

    except sqlite3.OperationalError as e:
        return _get_mock_pilots()

@app.get("/api/finances")
def get_finances():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM configuracion LIMIT 1")
        row = cursor.fetchone()
        conn.close()
        
        if row:
            data = dict(row)
            return {
                "balance": float(data.get("balance", data.get("fondos", data.get("Fondos", 0)))),
                "maintenance": float(data.get("maintenance", data.get("mantenimiento", data.get("Mantenimiento", 120000)))),
                "operational_costs": float(data.get("operational_costs", data.get("costes", data.get("Costes", 85000)))),
            }
        return _get_mock_finances()

    except sqlite3.OperationalError as e:
        return _get_mock_finances()

@app.get("/api/contracts")
def get_contracts():
    return [
        { "id": "c1", "faction": "Casa Davion", "type": "Asalto", "payout": "2,500,000", "difficulty": "Alta" },
        { "id": "c2", "faction": "Magistrado", "type": "Escolta", "payout": "850,000", "difficulty": "Baja" },
        { "id": "c3", "faction": "ComStar", "type": "Recuperación", "payout": "1,200,000", "difficulty": "Media" },
    ]

# --- DATOS DE PRUEBA DE EMERGENCIA ---
def _get_mock_pilots():
    return [
        { "id": "p1", "name": "Takeshi", "callsign": "Envoy", "xp": 850, "health": 100, "status": "OK" },
        { "id": "p2", "name": "Miles", "callsign": "Naismith", "xp": 320, "health": 80, "status": "WOUNDED" },
        { "id": "p3", "name": "Elena", "callsign": "Valkyrie", "xp": 410, "health": 100, "status": "OK" },
    ]

def _get_mock_finances():
    return {"balance": 1250000, "maintenance": 120000, "operational_costs": 85000}