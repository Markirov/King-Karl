# Informe Discrepancias — Taller propio vs Canon (CamOps)

Fecha: 2026-06-07
Fuente canon: **Campaign Operations** 3rd Print (CAT35007), capítulo
"Maintenance, Salvage, Repair & Customization" p.205-212 + TechManual
component costs.

## Resumen

El sistema de la campaña ("propio", reflejado en Sheets Taller G5:G19 +
Ayudas BW:BX) NO es el sistema canon. Las diferencias son sustanciales,
no sólo de precio sino de **filosofía de cálculo**.

Esta es la primera vez que ambos sistemas conviven en el motor.
Se ha añadido toggle `sistema: propio | canon` en TallerModal.

## Filosofía

### CamOps canon

- **Repair** = devolver pieza a estado funcional sin reemplazarla.
  - Coste ₡: **0**. Sólo tiempo + tirada Skill del Tech Team.
- **Replace** = sustituir pieza por una nueva.
  - Coste ₡: precio completo de la pieza (TechManual).
  - Sólo si la pieza está **destruida** (ej. engine 3 crits, gyro 2 crits).
- **Daño parcial** (1 crit reactor, 1 crit gyro) → 0 ₡ siempre.
- **Estado factura % / mantenimiento %** → no existe en canon.

### Tu Taller (house rule)

- **Cualquier daño** → cobro proporcional × peso × pts/2.
- **Estado factura %** modifica subtotal (50-150%, simula buen/mal mantenedor).
- **Estado mech** se infiere de % daño total (LEVES/MEDIOS/etc.).

## Tabla discrepancias por componente

| Componente | Tu Taller | Canon CamOps | Diferencia |
|------------|-----------|--------------|------------|
| **Reactor** destruido (3 crits) | `base × rating × peso / 75` | `base × rating × peso / 75` | ✅ idéntico |
| **Reactor** parcial (1-2 crits) | `... × daños / 2` (proporcional) | **0 ₡** (sólo labor) | propio sobre-carga |
| **Gyro** destruido | `ceil(peso/100) × base × mult` | `ceil(rating/100) × base × mult` | propio infra-carga 1-3× |
| **Gyro** parcial | `... × daños / 2` | **0 ₡** | propio sobre-carga |
| **Cabina** | 200k flat | 200k flat | ✅ idéntico |
| **Soporte vida** | `50k × cantidad` | 50k flat (sólo hay 1 ud) | propio sobre-carga ×N |
| **Sensores** | `2k × cantidad × peso/2` | `2k × peso` (1 conjunto) | propio sobre-carga ×N/2 |
| **Estructura** | `400 × peso × pts/2` | `400 × IS_tons × pts/IS_total` | propio sobre-carga ~100-500× |
| **Blindaje** | `precio × ceil(pts/16)` | `precio × ceil(pts/16)` | ✅ idéntico |
| **Miomero** | `precio × cantidad` | Sólo premium (Triple Fuerza) | propio cobra miomero estándar |
| **Actuadores** | `precio × peso × qty` | `precio × qty` (flat) | propio sobre-carga × peso |
| **Retros** | `precio × cantidad` | `precio × cantidad` | ✅ idéntico |
| **Radiadores** | `precio × cantidad` | `precio × cantidad` | ✅ idéntico |
| **Estado factura %** | × 0-150% subtotal | No existe | propio house rule |

## Ejemplos numéricos

### Atlas AS7-D (100t, 300 rating)

#### Caso A: Gyro destruido (2 crits), nada más

- **Propio**: `ceil(100/100) × 300000 × 1.0 × 2/2 = 300,000 ₡`
- **Canon**:  `ceil(300/100) × 300000 = 3 × 300000 = 900,000 ₡`
- **Diferencia**: canon cobra **3× más**

#### Caso B: 1 crit engine (no destruido)

- **Propio**: `5000 × 30000 × 100/75 × 1/2 = 1,000,000 ₡`
- **Canon**:  0 ₡ (repair, no replace)
- **Diferencia**: canon **gratis**, propio cobra 1M

#### Caso C: 50 pts estructura LT perdidos

- **Propio**: `400 × 100 × 50/2 = 1,000,000 ₡`
- **Canon**:  `400 × 10 × 50/250 = 800 ₡` (aprox)
- **Diferencia**: propio cobra **~1250×** más

#### Caso D: 100 pts blindaje perdidos

- **Propio**: `10000 × ceil(100/16) = 70,000 ₡`
- **Canon**:  `10000 × ceil(100/16) = 70,000 ₡`
- **Diferencia**: 0, son la misma fórmula

## Implementación

Archivo: `src/lib/repair-engine.ts`

- `calcRepairCost()` — propio (existente, sin cambios)
- `calcRepairCostCanon()` — nuevo, sigue CamOps + TM
- `calcRepairCostBySystem(system, ...)` — dispatcher
- `RepairSystem = 'propio' | 'canon'`

UI: TallerModal en `FinanzasPage.tsx` tiene toggle dos botones.
Concepto en libro mayor se etiqueta `[CamOps]` o `[propio · 100%]`.

## Limitaciones modo canon

- No modela **tiempo de reparación** (sólo precios).
- No modela **tiradas Tech Team** (skill, quality rating modifiers).
- No modela **partial repairs** (cuando fallas check por poco).
- No modela **acquisition checks** (CamOps p.196) para conseguir piezas
  en el mercado.

Si se quieren añadir, son nuevos campos (no rompen la API actual):
- `tiempoMinutos: number`
- `tnRequerido: number` (TN final tras modificadores)
- `partialRepairTried: boolean`

## Recomendación de uso

- **Propio** para sesiones donde los jugadores admiten/aceptan house rules
  expresivos (estado de mantenimiento del taller importa para narrar).
- **Canon** para presupuestos rigurosos cuando otros campañistas BT
  consultan los números (o auditoría externa).

El default actual es `propio` para no romper expectativas históricas
de la campaña.
