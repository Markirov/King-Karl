import os
import sys
import shutil

DIRECTORIO_PROYECTO = r"E:\Drive\CBT\MechWarrior RPG"

def organizar_archivo(ruta_archivo_entrante):
    if not os.path.isfile(ruta_archivo_entrante):
        print("El elemento arrastrado no es un archivo válido.")
        return

    nombre_archivo = os.path.basename(ruta_archivo_entrante)
    destinos_encontrados = []

    # Buscar el archivo original en las carpetas
    for raiz, directorios, archivos in os.walk(DIRECTORIO_PROYECTO):
        if nombre_archivo in archivos:
            destinos_encontrados.append(os.path.join(raiz, nombre_archivo))

    if not destinos_encontrados:
        print(f"❌ No se encontró ningún archivo llamado '{nombre_archivo}' en el proyecto.")
        return

    # Si solo hay 1 coincidencia, lo movemos directamente sin preguntar
    if len(destinos_encontrados) == 1:
        destino_final = destinos_encontrados[0]
        try:
            shutil.move(ruta_archivo_entrante, destino_final)
            print(f"✅ Archivo actualizado con éxito en:\n{destino_final}")
        except Exception as e:
            print(f"❌ Error al mover el archivo: {e}")
        return

    # --- LÓGICA PARA MÚLTIPLES COPIAS ---
    print(f"⚠️ Se han encontrado múltiples copias de '{nombre_archivo}':")
    for i, destino in enumerate(destinos_encontrados):
        print(f" [{i + 1}] {destino}")
    
    print("\nOpciones:")
    print(" - Un número para sobreescribir esa copia (ej: 1)")
    print(" - Varios números separados por comas para sobreescribir varias (ej: 1,3)")
    print(" - Pulsa Enter o escribe 0 para cancelar y no hacer nada.")
    
    eleccion = input("\nElige una opción: ").strip()
    
    # Si pulsa Enter o escribe 0, salimos sin hacer nada
    if not eleccion or eleccion == '0':
        print("\nOperación cancelada. El archivo NO se ha movido.")
        return
        
    try:
        # Convertimos la entrada (ej: "1, 3") en una lista de índices de Python (ej: [0, 2])
        indices_seleccionados = [int(x.strip()) - 1 for x in eleccion.split(',')]
        
        rutas_seleccionadas = []
        for idx in indices_seleccionados:
            if 0 <= idx < len(destinos_encontrados):
                rutas_seleccionadas.append(destinos_encontrados[idx])
            else:
                print(f"⚠️ El número {idx + 1} no es una opción válida y será ignorado.")
        
        if not rutas_seleccionadas:
            print("\nNo se seleccionó ninguna ruta válida. Operación cancelada.")
            return

        # Copiamos el archivo a todas las rutas elegidas
        for ruta in rutas_seleccionadas:
            shutil.copy2(ruta_archivo_entrante, ruta)
            print(f"✅ Archivo sobreescrito en: {ruta}")
        
        # Una vez copiado en los destinos, borramos el archivo original arrastrado
        os.remove(ruta_archivo_entrante)
        
    except ValueError:
        print("\n❌ Entrada no válida. Por favor, introduce solo números y comas.")
    except Exception as e:
        print(f"\n❌ Error inesperado durante la copia: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Por favor, arrastra un archivo sobre este script.")
    else:
        archivo_arrastrado = sys.argv[1]
        organizar_archivo(archivo_arrastrado)
        
    input("\nPresiona Enter para salir...")