import os
import re
import csv
import math
import gspread
from google.oauth2.service_account import Credentials

# ============================================================================
# CONFIGURACIÓN GENERAL
# ============================================================================
DIRECTORIO_RAIZ = '.'  # La carpeta donde tienes todos los .ssw ('.' es la carpeta actual)
ARCHIVO_SALIDA = 'hangar_maestro_3100.csv'

# Configuración de Google Sheets
# ⚠️ IMPORTANTE: PEGA AQUÍ EL ID DE TU HOJA (ESTÁ EN LA URL DE TU GOOGLE SHEET)
ID_HOJA_CALCULO = '1glFq6i2kUqfaSYsyH6vxlzfgWl4IrtnYJ97vpELeX7g' 
NOMBRE_PESTANA = 'Listado de Mechs'

# ============================================================================
# CABECERAS Y DICCIONARIO
# ============================================================================
CABECERAS = [
    "Nombre", "Peso", "Categoria", "Año", "BV", "Precio", "A", "C", "V", "Tech Base",
    "Flamer", "MG", "Small Laser", "Medium Laser", "Large Laser", "ER Small Laser", 
    "ER Medium Laser", "ER Large Laser", "Small Pulse Laser", "Medium Pulse Laser", 
    "Large Pulse Laser", "Heavy Small Laser", "Heavy Medium Laser", "Heavy Large Laser", 
    "PPC", "ER PPC", "Snub-Nose PPC", "Heavy PPC", "LRM 5", "LRM 10", "LRM 15", "LRM 20", 
    "SRM 2", "SRM 4", "SRM 6", "Streak SRM 2", "Streak SRM 4", "Streak SRM 6", 
    "MRM 10", "MRM 20", "MRM 30", "MRM 40", "ATM 3", "ATM 6", "ATM 9", "ATM 12", 
    "AC 2", "AC 5", "AC 10", "AC 20", "Ultra AC 2", "Ultra AC 5", "Ultra AC 10", "Ultra AC 20", 
    "LB 2-X", "LB 5-X", "LB 10-X", "LB 20-X", "RAC 2", "RAC 5", "Gauss Rifle", "Heavy Gauss", 
    "Plasma Rifle / Cannon", "Radiadores", "TB", "PB", "Piernas", "Blindaje", "Disipacion", 
    "TLP", "Calor", "Daño", "Reactor", "PROPIEDAD", "Comprado", "Unidad"
]

DICCIONARIO_ARMAS = [
    ('flamer', 10, 3, 2), ('machinegun', 11, 0, 2),
    ('smalllaser', 12, 1, 3), ('mediumlaser', 13, 3, 5), ('largelaser', 14, 8, 8),
    ('ersmalllaser', 15, 2, 3), ('ermediumlaser', 16, 5, 5), ('erlargelaser', 17, 12, 8),
    ('smallpulselaser', 18, 2, 3), ('mediumpulselaser', 19, 4, 6), ('largepulselaser', 20, 10, 9),
    ('heavysmalllaser', 21, 3, 6), ('heavymediumlaser', 22, 7, 10), ('heavylargelaser', 23, 18, 16),
    ('ppc', 24, 10, 10), ('erppc', 25, 15, 10), ('snubnoseppc', 26, 10, 10), ('heavyppc', 27, 15, 15),
    ('lrm5', 28, 2, 5), ('lrm10', 29, 4, 10), ('lrm15', 30, 5, 15), ('lrm20', 31, 6, 20),
    ('srm2', 32, 2, 4), ('srm4', 33, 3, 8), ('srm6', 34, 4, 12),
    ('streaksrm2', 35, 2, 4), ('streaksrm4', 36, 3, 8), ('streaksrm6', 37, 4, 12),
    ('mrm10', 38, 4, 10), ('mrm20', 39, 6, 20), ('mrm30', 40, 10, 30), ('mrm40', 41, 12, 40),
    ('atm3', 42, 2, 6), ('atm6', 43, 4, 12), ('atm9', 44, 6, 18), ('atm12', 45, 8, 24),
    ('autocannon2', 46, 1, 2), ('autocannon5', 47, 1, 5), ('autocannon10', 48, 3, 10), ('autocannon20', 49, 7, 20),
    ('ultraac2', 50, 1, 2), ('ultraac5', 51, 1, 5), ('ultraac10', 52, 4, 10), ('ultraac20', 53, 8, 20),
    ('lb2x', 54, 1, 2), ('lb5x', 55, 1, 5), ('lb10x', 56, 2, 10), ('lb20x', 57, 6, 20),
    ('rotaryac2', 58, 1, 2), ('rotaryac5', 59, 1, 5),
    ('heavygaussrifle', 61, 1, 25), ('heavygauss', 61, 1, 25), ('gaussrifle', 60, 1, 15),
    ('plasmarifle', 62, 10, 10), ('plasmacannon', 62, 7, 0)
]

# MAGIA PURA: Ordenamos el diccionario por longitud para que las palabras largas se comprueben primero
DICCIONARIO_ARMAS.sort(key=lambda x: len(x[0]), reverse=True)

# ============================================================================
# FUNCIONES DE EXTRACCIÓN
# ============================================================================
def clean(text):
    """Limpia el texto de símbolos raros y marcas como (IS) o (CL)."""
    clean_text = re.sub(r'\(IS\)|\(CL\)', '', text, flags=re.IGNORECASE)
    return re.sub(r'[^a-z0-9]', '', clean_text.lower())

def procesar_archivo(ruta, mechs_procesados):
    try:
        with open(ruta, 'r', encoding='utf-8', errors='replace') as f:
            xml = f.read()
    except Exception as e:
        return []
    
    m_tag = re.search(r'<mech([^>]+)>', xml, re.IGNORECASE)
    if not m_tag: return []
    attr = m_tag.group(1)
    
    name_match = re.search(r'name="([^"]+)"', attr, re.IGNORECASE)
    model_match = re.search(r'model="([^"]*)"', attr, re.IGNORECASE)
    tons_match = re.search(r'tons="(\d+)"', attr, re.IGNORECASE)
    
    if not name_match: return []

    name = name_match.group(1).strip()
    model = model_match.group(1).strip() if model_match else ""
    is_omni = 'omnimech="TRUE"' in attr.upper()
    tech_base = (re.search(r'<techbase[^>]*>(.*?)</techbase>', xml, re.IGNORECASE) or ["","Inner Sphere"])[1]
    
    tons = int(tons_match.group(1)) if tons_match else 0
    if tons == 0: 
        alt_tons = re.search(r'<tonnage>(.*?)</tonnage>', xml, re.IGNORECASE)
        tons = int(alt_tons.group(1)) if alt_tons else 0

    rating_match = re.search(r'<engine[^>]*rating="(\d+)"', xml, re.IGNORECASE)
    rating = int(rating_match.group(1)) if rating_match else 0
    walk = math.floor(rating / tons) if tons > 0 else 0
    
    motive_match = re.search(r'<motive_type[^>]*>(.*?)</motive_type>', xml, re.IGNORECASE)
    motive_type_raw = motive_match.group(1).strip().lower() if motive_match else "biped"
    motive = "Quad" if "quad" in motive_type_raw else "Biped"
    num_piernas = 4 if motive == "Quad" else 2

    engine = (re.search(r'<engine[^>]*>(.*?)</engine>', xml, re.IGNORECASE) or ["","Fusion"])[1]
    
    armor_block_match = re.search(r'<armor[^>]*>([\s\S]*?)</armor>', xml, re.IGNORECASE)
    armor_block = armor_block_match.group(1) if armor_block_match else ""
    pb = sum(int(n) for n in re.findall(r'>(\d+)</(?:hd|ct|ctr|lt|ltr|rt|rtr|la|ra|ll|rl)>', armor_block, re.IGNORECASE))
    
    tipo_blindaje = "Estandar"
    if "ferro" in armor_block.lower(): tipo_blindaje = "Ferro Fibroso"
    elif "stealth" in armor_block.lower(): tipo_blindaje = "Furtivo"

    baseloadout_match = re.search(r'<baseloadout[^>]*>([\s\S]*?)</baseloadout>', xml, re.IGNORECASE)
    baseloadout = baseloadout_match.group(1) if baseloadout_match else ""
    
    if is_omni:
        variantes_xml = re.findall(r'<loadout[^>]*>[\s\S]*?</loadout>', xml, re.IGNORECASE)
    else:
        variantes_xml = [xml]

    filas = []
    for var_xml in variantes_xml:
        var_name_match = re.search(r'name="([^"]+)"', var_xml, re.IGNORECASE)
        var_name = var_name_match.group(1) if var_name_match else ""
        
        fullname = f"{name} {model} {var_name}".strip()
        
        if fullname.lower() in mechs_procesados:
            continue

        bv_match = re.search(r'<battle_value[^>]*>(.*?)</battle_value>', var_xml, re.IGNORECASE) or re.search(r'<battle_value[^>]*>(.*?)</battle_value>', xml, re.IGNORECASE)
        bv = int(float(bv_match.group(1))) if bv_match else 0
        
        cost_match = re.search(r'<cost[^>]*>(.*?)</cost>', var_xml, re.IGNORECASE) or re.search(r'<cost[^>]*>(.*?)</cost>', xml, re.IGNORECASE)
        cost = int(float(cost_match.group(1))) if cost_match else 0
        
        hs_block_match = re.search(r'<heatsinks([\s\S]*?)</heatsinks>', var_xml if "heatsinks" in var_xml else baseloadout, re.IGNORECASE)
        hs_num = 0
        hs_type = "Single"
        if hs_block_match:
            num_match = re.search(r'number="(\d+)"', hs_block_match.group(0), re.IGNORECASE)
            if num_match: hs_num = int(num_match.group(1))
            if "double" in hs_block_match.group(0).lower(): hs_type = "Double"

        jump_match = re.search(r'<jumpjets[^>]*number="(\d+)"', var_xml if "jumpjets" in var_xml else baseloadout, re.IGNORECASE)
        jump = int(jump_match.group(1)) if jump_match else 0

        # Bloque para evitar leer el chasis doble en Mechs que NO son OmniMechs
        equip_text = (baseloadout + var_xml) if is_omni else xml
        equip = re.findall(r'<equipment>([\s\S]*?)</equipment>', equip_text, re.IGNORECASE)
        
        fila = [""] * 76
        calor_total = 0
        dano_total = 0

        for eq in equip:
            eq_name_match = re.search(r'<name[^>]*>(.*?)</name>', eq, re.IGNORECASE)
            if eq_name_match:
                raw_name = eq_name_match.group(1)
                
                # Barrera infalible contra la munición
                if "@" in raw_name or "ammunition" in eq.lower(): 
                    continue

                clean_name = clean(raw_name)
                for arma_id, col, heat, dmg in DICCIONARIO_ARMAS:
                    if arma_id in clean_name:
                        fila[col] = (int(fila[col]) if fila[col] else 0) + 1
                        calor_total += heat
                        dano_total += dmg
                        break

        # Rellenado de fila
        fila[0] = fullname
        fila[1] = tons
        fila[2] = "Ligero" if tons <= 35 else "Medio" if tons <= 55 else "Pesado" if tons <= 75 else "Asalto"
        year_match = re.search(r'<year[^>]*>(\d+)', xml, re.IGNORECASE)
        fila[3] = year_match.group(1) if year_match else ""
        fila[4] = bv
        fila[5] = cost
        fila[6] = walk
        fila[7] = math.ceil(walk*1.5)
        fila[8] = jump
        fila[9] = tech_base
        
        fila[63] = hs_num
        fila[64] = str(round(pb/16, 1)).replace('.', ',') 
        fila[65] = pb
        fila[66] = num_piernas
        fila[67] = tipo_blindaje
        fila[68] = hs_type
        fila[69] = hs_num * 2 if hs_type == "Double" else hs_num 
        fila[70] = ""
        fila[71] = calor_total
        fila[72] = dano_total
        fila[73] = engine
        
        fila[74] = "Compra" 
        fila[75] = "NO"

        mechs_procesados.add(fullname.lower())
        filas.append(fila)
        
    return filas

# ============================================================================
# EJECUCIÓN PRINCIPAL Y SUBIDA A GOOGLE SHEETS
# ============================================================================
if __name__ == "__main__":
    print("Iniciando extracción masiva de SSW...")
    todas_las_filas = []
    mechs_procesados = set()
    archivos_encontrados = 0

    for r, d, files in os.walk(DIRECTORIO_RAIZ):
        for f in files:
            if f.lower().endswith('.ssw'):
                archivos_encontrados += 1
                if archivos_encontrados % 100 == 0:
                    print(f"-> Analizados {archivos_encontrados} archivos...")
                
                ruta_completa = os.path.join(r, f)
                datos_mech = procesar_archivo(ruta_completa, mechs_procesados)
                if datos_mech:
                    todas_las_filas.extend(datos_mech)

    todas_las_filas.insert(0, CABECERAS)

    # 1. Guardar copia en local (CSV) por si acaso
    print(f"\nGuardando backup local en {ARCHIVO_SALIDA}...")
    with open(ARCHIVO_SALIDA, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerows(todas_las_filas)

    print(f"¡Extracción terminada! Se han preparado {len(todas_las_filas) - 1} variantes únicas.")

    # 2. Conexión y Subida a Google Sheets
    print("\nConectando con Google Sheets...")
    try:
        scopes = [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive'
        ]
        credenciales = Credentials.from_service_account_file('credenciales_py.json', scopes=scopes)
        cliente_gspread = gspread.authorize(credenciales)

        hoja = cliente_gspread.open_by_key(ID_HOJA_CALCULO)
        pestana = hoja.worksheet(NOMBRE_PESTANA)

        print("Subiendo datos al Hangar Central...")
        
        # Limpia la pestaña entera antes de volcar para evitar filas duplicadas o fantasmas
        pestana.clear()
        # Vuelca todo el bloque de datos de una sola vez
        pestana.update(values=todas_las_filas, range_name='A1')
        
        print("🚀 ¡Sincronización completada con éxito! Revisa tu Google Sheet.")

    except Exception as e:
        print(f"\n❌ Error al subir a Google Sheets: {e}")
        print("Asegúrate de:")
        print("1. Haber puesto tu ID_HOJA_CALCULO correcto en la línea 15 del código.")
        print("2. Haber compartido el archivo de Sheets con el email de tu credenciales.json.")
        print("3. Tener el archivo 'credenciales.json' en la misma carpeta que este script.")