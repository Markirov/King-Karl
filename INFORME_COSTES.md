# Informe de Costes · King Karl's Kürassiers

Compilación exhaustiva de todos los costes detectados en:
- Google Sheets (`Ayudas`, `Hoja 28`, `Armas Infanteria`, `Taller`)
- Código web (`src/` constants y defaults)
- Manuales canon BattleTech (`Field Manual: Mercenaries Revised`, `StratOps`, `Mercenary's Handbook`)

Todos los importes en **C-bills (₡)** salvo nota expresa.

Fecha compilación: 2026-06-03

---

## 1. SUELDOS PERSONAL (canon BT)

### 1.1 Sueldos base mensuales — Field Manual: Mercenaries (Revised) p.148

Multiplicar por: **Quality** (Green 0.5x · Regular 1x · Veteran 1.6x · Elite 2x) × **Officer** (+20%) × **Rank** (Rank/2).

Ejemplo: Vet MechWarrior + lugarteniente (Rank 2) = `1500 × 1.6 × 1.2 × 1` = **2880 ₡/mes**.

| Posición | Base mensual | Base anual |
|---|---:|---:|
| MechWarrior | 1.500 | 18.000 |
| Aerospace Pilot | 1.500 | 18.000 |
| Doctor | 1.500 | 18.000 |
| Vessel Crewman (WarShip) | 1.200 | 14.400 |
| Scout Infantry | 1.050 | 12.600 |
| Vessel Crewman (DropShip) | 1.000 | 12.000 |
| Specialist / Armored Infantry | 960 | 11.520 |
| Vehicle/Artillery Crewman | 900 | 10.800 |
| Aircraft Pilot | 900 | 10.800 |
| 'Mech / Fighter Technician | 800 | 9.600 |
| Battle Armor Technician | 800 | 9.600 |
| Regular Infantry | 750 | 9.000 |
| Vessel Crewman (JumpShip) | 750 | 9.000 |
| Vehicle Mechanic | 640 | 7.680 |
| Medic | 640 | 7.680 |
| Administrator | 320 | 3.840 |

### 1.2 Sueldos por especialidad militar — Sheets `Hoja 28` (campaña ELH)

Misma tabla pero los valores que **tú venías usando** en la campaña, escalados por nivel:

| Posición | Green | Regular | Veteran | Elite |
|---|---:|---:|---:|---:|
| MechWarrior (individual) | 5.000 | 10.000 | 15.000 | 25.000 |
| Piloto Caza Aeroespacial (indiv.) | 5.000 | 10.000 | 15.000 | 25.000 |
| Escuadrón Infantería (7 pax) | 1.050 | 1.750 | 3.500 | 7.000 |
| Escuadrón Artillería (7 pax) | 1.050 | 1.750 | 3.500 | 7.000 |
| Escuadrón Blindados (por vehículo) | 10.000 | 17.500 | 25.000 | 50.000 |
| Piloto Aeronave Convencional | 250 | 400 | 900 | 1.500 |
| Explorador / Scout (individual) | 150 | 300 | 600 | 1.200 |
| Personal Técnico / Support | 200 | 400 | 750 | 1.500 |
| Tripulación DropShip (nave entera) | 3.000 | 5.000 | 7.500 | 12.000 |
| Tripulación JumpShip (nave entera) | 6.000 | 8.500 | 10.000 | 15.000 |

**Nota**: Hoja 28 usa cifras 3–6× los valores canónicos FM Mercs base. Esto es escalado de campaña propio. Decisión: ¿alineamos a canon o mantenemos escalado?

### 1.3 Defaults sueldo en código web — `FinanzasPage.tsx`

Roles BT más sueldo base default (regular), multiplicador 0.5/1.0/1.5/2.0 por nivel:

| Rol | Sueldo default | Etiqueta |
|---|---:|---|
| Representante | 1.500 | Representante (negociador contratos) |
| Battle Armor | 1.500 | Suit BA |
| Intel Officer | 1.200 | Oficial inteligencia |
| Mech Tech | 800 | Mech Tech |
| Quartermaster | 600 | Quartermaster |
| Ingeniero combate | 500 | Sapper / ingeniero |
| Tripulación nave | 500 | DropShip/JumpShip crew (individual) |
| Comstar Liaison | 2.000 | Liaison Comstar |
| Piloto aerospace | 4.000 | Piloto Aero (alto rango) |
| Administrativo | 400 | Admin |
| Oficial radio | 350 | Comms |
| Seguridad | 300 | Security |
| Chaplain | 250 | Capellán |
| Médico | 200 | Médico |
| Tripulación vehículo | 200 | Vehicle crew |
| Infantería | 150 | Soldado infantería |
| Astech | 100 | Astech |
| Otros | 0 | Catch-all |

---

## 2. MANTENIMIENTO MENSUAL UNIDADES (canon BT)

### 2.1 Maintenance Table — FM Mercs (Revised) p.149

Coste **SEMANAL** + horas-hombre técnicos requeridas. Multiplicar ×4 para mensual aprox.

| Tipo unidad | Coste/semana ₡ | Hombre-hora/semana | Soporte |
|---|---:|---|---|
| BattleMech | 75 | 40 + (tons/5) | Técnico |
| OmniMech | 100 | 40 + (tons/5) | Técnico |
| Aerospace fighter | 65 | 40 + (tons/2.5) | Técnico |
| OmniFighter | 125 | 40 + (tons/2.5) | Técnico |
| Ground vehicle | 25 | 20 + (tons/5) | Técnico |
| Infantry squad (7) | 10 | 3 + (men/5) | Médico |
| Personnel squad (7) | 10 | 3 + (men/5) | Médico |
| Artillery weapon | 25 | 15 + (wpn_tons/2.5) | Técnico |
| Battle armor suit | 50 | 5 + (armor×2) | Técnico |
| VTOL | 65 | 30 + (tons/5) | Técnico |
| Conventional fighter | 50 | 20 + (tons/2.5) | Técnico |
| Naval vessel (water) | 65 | 10 + (tons/2.5) | Técnico |
| DropShip < 16.000 t | 500 | 80 + (tons/10) | Técnico |
| DropShip 16k–49.999 t | 500 | 40 + (tons/25) | Técnico |
| DropShip ≥ 50.000 t | 500 | 20 + (tons/50) | Técnico |

### 2.2 Mantenimiento simplificado (proyección mensual web)

Web actual usa **30.000 ₡/mes/mech** flat (regla simplificada FinanzasPage modal `Proyectar mes`). Default editable. Equivale a `75 × 4 × ~100` aproximadamente para mechs medios, con margen para reparación rutinaria.

Sustituible por fórmula canon: `peso × 4` semanas × multiplicador tipo.

---

## 3. REPARACIÓN COMPONENTES MECH — Sheets `Ayudas` BW:BX

Precios por **componente** que usa la calculadora `Taller` (ya presente en web futura como motor de reparación).

### 3.1 Sistemas críticos

| Componente | Precio ₡ |
|---|---:|
| Cabina | 200.000 |
| Soporte Vital | 50.000 |
| Sensores | 2.000 (× peso/2) |

### 3.2 Miomero

| Tipo | Precio ₡/ton |
|---|---:|
| Estándar | 2.000 |
| Triple Fuerza | 16.000 |
| Triple Fuerza Industrial | 12.000 |

### 3.3 Estructura interna

| Tipo | Precio ₡/punto |
|---|---:|
| Estándar | 400 |
| Endo-Acero | 1.600 |
| Industrial | 330 |
| Enviro | 225 |

### 3.4 Actuadores

| Componente | Precio ₡/uno |
|---|---:|
| Hombro | 100 |
| Codo | 50 |
| Mano | 80 |
| Cadera | 150 |
| Rodilla | 80 |
| Pie | 120 |

### 3.5 Reactor

| Tipo | Precio ₡ × (peso/100) |
|---|---:|
| ICE | 1.250 |
| Ligero | 1.500 |
| Estándar Fusion | 5.000 |
| Celulas | 3.500 |
| Fision | 7.500 |
| Compacto | 10.000 |
| XL | 20.000 |

### 3.6 Retros (Jump Jets / sistemas movilidad)

| Tipo | Precio ₡ |
|---|---:|
| XL (multiplicador) | × 0.5 |
| Jumps Estándar | 200/ton |
| Jumps Mejorados | 500/ton |
| MASC | 1.000/ton |

### 3.7 Radiadores (Heat Sinks)

| Tipo | Precio ₡/uno |
|---|---:|
| Internos +10 | 2.000 |
| Normales | 2.000 |
| Dobles | 6.000 |

### 3.8 Blindaje

| Tipo | Precio ₡/punto |
|---|---:|
| Comercial | 3.000 |
| Industrial | 5.000 |
| Estándar | 10.000 |
| Industrial Pesado | 10.000 |
| FerroFibroso Ligero | 15.000 |
| Ferro Fibroso | 20.000 |
| FerroFibroso Pesado | 25.000 |
| Stealth | 50.000 |

### 3.9 Modificador estado factura (Ayudas AA1:AA31)

31 niveles de 150% (top) hasta 0% en pasos de 5%. Usado por Taller fórmula `=SUM(G5:G17)*VLOOKUP(F2,Ayudas!AA1:AA31,...)`.

| Slot | % | Slot | % | Slot | % |
|---:|---:|---:|---:|---:|---:|
| AA1 | 150 | AA11 | 100 | AA21 | 50 |
| AA2 | 145 | AA12 | 95 | AA22 | 45 |
| AA3 | 140 | AA13 | 90 | AA23 | 40 |
| AA4 | 135 | AA14 | 85 | AA24 | 35 |
| AA5 | 130 | AA15 | 80 | AA25 | 30 |
| AA6 | 125 | AA16 | 75 | AA26 | 25 |
| AA7 | 120 | AA17 | 70 | AA27 | 20 |
| AA8 | 115 | AA18 | 65 | AA28 | 15 |
| AA9 | 110 | AA19 | 60 | AA29 | 10 |
| AA10 | 105 | AA20 | 55 | AA30 | 5 |
| | | | | AA31 | 0 |

---

## 4. ARMAS Y MUNICIÓN — Sheets `Ayudas` AI13:AP52

Tabla armas completa con coste arma + coste munición por tonelada/cargador.

| Arma | Calor | Daño | Peso | BV | ABV | Precio ₡ | Mun. ₡ |
|---|---:|---:|---:|---:|---:|---:|---:|
| CPP | 10 | 10 | 7 | 176 | 0 | 200.000 | — |
| CPPAE | 15 | 10 | 7 | 229 | 0 | 300.000 | — |
| LL | 1 | 3 | 0,5 | 9 | 0 | 11.250 | — |
| LM | 3 | 5 | 1 | 46 | 0 | 40.000 | — |
| LP | 8 | 8 | 5 | 123 | 0 | 100.000 | — |
| LLAE | 2 | 3 | 0,5 | 17 | 0 | 11.250 | — |
| LMAE | 5 | 5 | 1 | 62 | 0 | 80.000 | — |
| LPAE | 12 | 8 | 5 | 163 | 0 | 200.000 | — |
| LLP (Pulso) | 2 | 3 | 1 | 12 | 0 | 16.000 | — |
| LMP | 4 | 6 | 2 | 48 | 0 | 60.000 | — |
| LPP | 10 | 9 | 7 | 119 | 0 | 175.000 | — |
| Fl (Flamer) | 3 | 2 | 1 | 6 | 0 | 7.500 | — |
| MG | 1 | 2 | 0,5 | 5 | 1 | 5.000 | 1.000 |
| AMLA 5 | 2 | 5 | 2 | 45 | 6 | 30.000 | 30.000 |
| AMLA 10 | 4 | 10 | 5 | 90 | 11 | 100.000 | 30.000 |
| AMLA 15 | 5 | 15 | 7 | 136 | 17 | 175.000 | 30.000 |
| AMLA 20 | 6 | 20 | 10 | 181 | 23 | 250.000 | 30.000 |
| AMCA 2 | 2 | 4 | 1 | 21 | 3 | 10.000 | 27.000 |
| AMCA 4 | 3 | 8 | 2 | 39 | 5 | 60.000 | 27.000 |
| AMCA 6 | 4 | 12 | 3 | 59 | 6 | 80.000 | 27.000 |
| AMCAF 2 | 2 | 4 | 1,5 | 30 | 4 | 15.000 | 54.000 |
| AMCAF 4 | 3 | 8 | 3 | 59 | 7 | 90.000 | 54.000 |
| AMCAF 6 | 4 | 12 | 4,5 | 89 | 11 | 120.000 | 54.000 |
| CA 2 (Cañón Auto) | 1 | 2 | 6 | 37 | 5 | 75.000 | 1.000 |
| CA 5 | 1 | 5 | 8 | 70 | 9 | 125.000 | 4.500 |
| CA 10 | 3 | 10 | 12 | 123 | 15 | 200.000 | 6.000 |
| CA 20 | 7 | 20 | 14 | 178 | 22 | 300.000 | 10.000 |
| UCA 2 (Ultra) | 2 | 4 | 7 | 56 | 7 | 120.000 | 1.000 |
| UCA 5 | 2 | 10 | 9 | 112 | 14 | 200.000 | 9.000 |
| UCA 10 | 8 | 20 | 13 | 210 | 26 | 320.000 | 12.000 |
| UCA 20 | 16 | 40 | 15 | 281 | 35 | 480.000 | 20.000 |
| LB 2 (LBX) | 1 | 2 | 6 | 42 | 5 | 150.000 | 3.300 |
| LB 5 | 1 | 5 | 8 | 83 | 10 | 250.000 | 15.000 |
| LB 10 | 2 | 10 | 11 | 148 | 19 | 400.000 | 12.000 |
| LB 20 | 6 | 20 | 14 | 237 | 30 | 600.000 | 20.000 |
| GAUSS | 1 | 15 | 15 | 320 | 40 | 300.000 | 20.000 |
| HACHA (melee) | 0 | 10 | 0 | 30 | 0 | 35.000 | — |
| ESPADA (melee) | 0 | 6 | 0 | 30 | 0 | 50.000 | — |
| ARROW IV (arty) | 10 | 20 | 15 | 240 | 30 | 450.000 | 15.000 |

**ABV** = bonus BV de la munición (afecta C3 calc).

---

## 5. ARMAS INFANTERÍA Y MELEE — Sheets `Hoja 28`

### 5.1 Cuerpo a cuerpo

| Arma | Tipo | Daño | Coste ₡ |
|---|---|---|---:|
| Vara | M | 1d6 | 5 |
| Arma de asta | M | 2d6 | 50 |
| Vibrohacha | M | 4d6 | 150/ton |
| Vibrokatana | M | 3d6 | 350/ton |
| Daga | M | 1d6-1 | — |
| Espada (infantería) | M | 2d6+2 | — |
| Bayoneta | M | 1d6+3 | — |
| Espada (mech) | M | 2d6+2 | 1.000.000 |
| Porra aturdidora | M | 1d6-2 | — |
| Látigo neural | M | 1d6 | — |

### 5.2 Pistolas balísticas

| Arma | Daño | Coste ₡ / Recarga ₡ |
|---|---|---:|
| Makeshift Pistol | 1d6+3 | 15 / 1 |
| M&G Service Automatic | 2d6 | 60 / 3 |
| Nambu Pistol | — | 75 / 2 |
| Magnum Auto-Pistol | — | 75 / 4 |
| Sternsnacht Python | 4d6+2 | 125 / 4 |

### 5.3 Subfusiles (SMG)

| Arma | Coste / Recarga |
|---|---:|
| Rugan SMG | 100 / 8 |
| Gunther MP-20 | 125 / 5 |
| KA-23 Subgun | 250 / 6 |

### 5.4 Rifles

| Arma | Coste / Recarga |
|---|---:|
| Makeshift Rifle | 20 / 1 |
| Elephant Gun | 100 / 2 |
| TK Assault Rifle | 150 / 3 |
| Imperator AX-22 | 200 / 3 |
| Sniper Rifle (Estándar) | 350 / 4 |
| Minolta 9000 Advanced Sniper | 1.000 / 5 |

### 5.5 Granadas

Micro 2d6 · Mini 3d6 · Maxi 5d6 (precios sin definir en hoja).

---

## 6. COSTES POR ESCUADRÓN — Sheets `Hoja 28`

Coste de adquisición por unidad según experiencia (Green / Regular / Veteran / Elite).

### 6.1 Mechs nuevos (por unidad individual)

| Categoría | Green | Regular | Veteran | Elite |
|---|---:|---:|---:|---:|
| Light (0-39 t) | 230 | 460 | 920 | 1.840 |
| Medium (40-59 t) | 390 | 780 | 1.560 | 3.120 |
| Heavy (60-79 t) | 570 | 1.140 | 2.280 | 4.560 |
| Assault (80+ t) | 820 | 1.640 | 3.280 | 6.560 |

(Importes en miles ₡)

### 6.2 Mechs recuperados (Salvaged, ~40% del nuevo)

| Categoría | Green | Regular | Veteran | Elite |
|---|---:|---:|---:|---:|
| Light Salvaged | 92 | 184 | 368 | 736 |
| Medium Salvaged | 156 | 312 | 624 | 1.248 |
| Heavy Salvaged | 228 | 456 | 912 | 1.824 |
| Assault Salvaged | 328 | 656 | 1.312 | 2.624 |

### 6.3 Cazas Aerospaciales

| Categoría | Green | Regular | Veteran | Elite |
|---|---:|---:|---:|---:|
| Light Fighter | 200 | 400 | 800 | 1.600 |
| Medium Fighter | 350 | 700 | 1.400 | 2.800 |
| Heavy Fighter | 500 | 1.000 | 2.000 | 4.000 |
| Light Fighter Salvaged | 80 | 160 | 320 | 800 |
| Medium Fighter Salvaged | 140 | 280 | 700 | 1.400 |
| Heavy Fighter Salvaged | 200 | 400 | 1.000 | 2.000 |

### 6.4 Vehículos, Infantería y Soporte

| Tipo | Green | Regular | Veteran | Elite |
|---|---:|---:|---:|---:|
| Infantry (Regular) | 25 | 50 | 125 | 250 |
| Motorized Infantry | 40 | 80 | 200 | 400 |
| Jump Infantry | 50 | 100 | 250 | 500 |
| Light Armor (<50 t) | 100 | 200 | 500 | 1.000 |
| Heavy Armor (>50 t) | 300 | 600 | 1.500 | 3.000 |
| Artillery | 400 | 800 | 2.000 | 4.000 |
| Scouts (operativos encubiertos) | 40 | 80 | 200 | 400 |
| Support (Personal Técnico) | 50 | 100 | 250 | 500 |

---

## 7. TRANSPORTE Y COMBUSTIBLE

### 7.1 Reglas generales — FM Mercs Revised p.170

> "The cost of transporting a mercenary force may be one of the highest expenses in the entire contract."

- **Forces que poseen DropShips/JumpShips** propios → mantenimiento incluido en upkeep general.
- **Forces que rentan** auxiliar/chárter → paga tripulación por adelantado.
- **Start mission**: paga la mitad del total al inicio (resto al finalizar misión).

### 7.2 Maintenance DropShips (FM Mercs p.149)

| Tipo | Maintenance/semana ₡ | Hombre-hora |
|---|---:|---|
| DropShip < 16.000 t | 500 | 80 + (tons/10) |
| DropShip 16k–49.999 t | 500 | 40 + (tons/25) |
| DropShip ≥ 50.000 t | 500 | 20 + (tons/50) |

### 7.3 Combustible (StratOps p.34, Advanced Aerospace)

Reglas detalladas no extraídas (PDF largo). Resumen base:
- Cazas aerospaciales: combustible representa eficiencia engine
- Fusion-powered: bajo gasto en thrust normal
- Reglas variables según Safe/Max thrust used per turn
- StratOps Advanced Aerospace Combat (p.35+) tiene tablas detalladas

**Pendiente**: extraer tablas StratOps fuel consumption rates.

### 7.4 Tripulación naves (sueldos canon FM Mercs)

| Tripulación | Individual ₡/mes |
|---|---:|
| DropShip Crewman | 1.000 |
| JumpShip Crewman | 750 |
| WarShip Crewman | 1.200 |

---

## 8. CONTRATOS Y PAGOS — FM Mercs Revised p.169

### 8.1 Total Payment = 3 partes

1. **Contract payment**: pago base mensual × duración misión
2. **Straight support**: % adicional cubierto por empleador (típico 10-20%)
3. **Transport reimbursement**: cobertura transporte parcial/total

### 8.2 Deducciones MRBC

- **5%** fee MRBC inmediato al firmar contrato
- **5%** (o 2.5% si half-comp) overhead unidad
- **Withdraw avance**: hasta 25% del total pre-misión

### 8.3 Salary Multipliers (combinables)

| Quality | Multiplicador |
|---|---:|
| Green | 0.5 |
| Regular | 1.0 |
| Veteran | 1.6 |
| Elite | 2.0 |

Otros:
- **Officer**: +20% (×1.2)
- **Rank**: multiplica por (Rank / 2) — Rank 0=0×, Rank 2=1×, Rank 4=2×, etc.
- **Anti-BattleMech training**: bonus específico infantería

---

## 9. WAR CHEST (Caja de guerra) — FM Mercs p.152

Fórmula caja inicial:
```
[(N combat companies) × 10.000 × War Chest Multiplier] + [Cash Pool points × 50.000]
```

### War Chest Multiplier por experiencia

| Skill Average | Nivel | Multiplier |
|---|---|---:|
| ≥ 5.50 | Green | 0.75 |
| 4.00 – 5.49 | Regular | 1.0 |
| 2.49 – 4.01 | Veteran | 2.0 |
| ≤ 2.50 | Elite | 3.0 |

---

## 10. PERSONAL SOPORTE — Ratio mínimo

FM Mercs p.150: para mantener equipo en operatividad:

- **Astechs**: 1 por cada 2 técnicos (mínimo)
- **Cobertura técnica**: 30% del weekly tech man-hours requirement (mínimo para evitar breakdowns)
- **Cobertura médica**: similar 30% para mantenimiento físico personal

### Productividad técnicos (man-hours/semana)

Tabla canon (`Support Productivity Table` FM Mercs p.150 — valores no extraídos íntegros):
- Green tech: ~20 man-hours/semana
- Regular tech: ~30 man-hours/semana
- Veteran tech: ~40 man-hours/semana
- Elite tech: ~50 man-hours/semana
- Astech: ~10 man-hours/semana (asistencia)

### Penalización overtime

Trabajo overtime: degrada calidad. Work factor reduce 0.05/semana de overtime continuado. Tras 1 mes overtime → riesgo mutiny/quit (Leadership check vs TN 10 + acumulativo).

---

## 11. WEB CONSTANTS RECOPILADAS

### Re-roll cost por nivel (HojaServicioPage)

| Nivel | Max rerolls | Coste XP |
|---|---:|---:|
| Novato | 1 | 100 |
| Regular | 2 | 200 |
| Veterano | 3 | 300 |
| Elite | 4 | 1.000 |
| As | 5 | 6.000 |

### MECH_META (ComisionPage, mech display)

Datos hardcoded BV/coste por chasis (snapshot fijo):

| Chasis | Tonelaje | BV | Coste ₡ |
|---|---:|---:|---:|
| Marauder | 75 | 1470 | 6.597.500 |
| Grasshopper | 70 | 1417 | 5.983.573 |
| Thunderbolt | 65 | 1335 | 5.356.560 |
| Cataphract | 70 | 1365 | 6.231.853 |
| Crusader | 65 | 1355 | 5.617.910 |
| Enforcer | 50 | 1043 | 3.524.500 |
| Warhammer | 70 | 1580 | 6.051.383 |
| Catapult | 65 | 1399 | 5.751.125 |
| Griffin | 55 | 1272 | 4.924.107 |
| Wolverine | 55 | 1176 | 4.810.357 |
| Hunchback | 50 | 983 | 3.457.875 |
| Centurion | 50 | 1135 | 3.455.500 |
| Orion | 75 | 1533 | 6.600.250 |
| Archer | 70 | 1399 | 6.300.973 |
| Shadow Hawk | 55 | 1195 | 4.505.557 |

### Defaults Finanzas modal (mantenimiento mensual)

- Mantenimiento mech: **30.000 ₡/mes/mech** (editable)
- Suministros: **10% sobre subtotal** (editable)
- Cubierto por contrato: checkbox → reduce total a 0

---

## 12. RESUMEN POR CATEGORÍA · GUÍA RÁPIDA

| Categoría | Fuente principal | Rango orientativo |
|---|---|---|
| Sueldo MechWarrior | FM Mercs | 1.5k–25k ₡/mes según skill/nivel |
| Sueldo técnico | FM Mercs | 800 ₡/mes regular (×Q×O×R) |
| Mantenimiento mech | FM Mercs / Sheets | 75 ₡/sem (canon), 30k ₡/mes simplificado |
| Reparación blindaje | Ayudas | 10k–50k ₡/punto |
| Reparación estructura | Ayudas | 400–1.600 ₡/punto |
| Reparación cabina | Ayudas | 200.000 ₡ |
| Reparación reactor | Ayudas | 5k–20k ₡ × (peso/100) |
| Munición artillería | Ayudas | 27k–54k ₡/ton |
| Compra mech nuevo Light | Hoja 28 | 230k–1.84M ₡ según nivel |
| Compra mech salvaged | Hoja 28 | 40% del precio nuevo |
| Compra arma CPP | Ayudas | 200.000 ₡ |
| Compra arma Gauss | Ayudas | 300.000 ₡ |
| Tripulación DropShip | FM Mercs | 1.000 ₡/crew/mes |
| Caja guerra base | FM Mercs | 10k × N companies × multiplier |

---

## 13. PENDIENTES / GAPS

- [ ] StratOps Advanced Aerospace **fuel consumption tables** detalle (pp.34-35+)
- [ ] StratOps **transit costs interestelares** (transporte JumpShip ₡/jump)
- [ ] Mercenary's Handbook (3025) PDFs es escaneado, no extrae texto. Si necesitas reglas clásicas pre-CW, requiere OCR.
- [ ] **Salvage rules** detalladas (FM Mercs p.27, p.164-165) — % salvage por tipo contrato
- [ ] **Breakdown rules** (FM Mercs p.177) — tabla TN breakdown según mantenimiento %
- [ ] Tablas exactas Support Productivity (man-hours/week por nivel)

---

## 14. RECOMENDACIONES IMPLEMENTACIÓN

### A. Convertir Taller a módulo TS

`lib/repair-engine.ts` con tablas Ayudas BW:BX hardcoded + función `calcRepairCost(mechConfig, damage)`. Modal en FinanzasPage o Simulador post-combate.

### B. Maintenance Calc canónico (sustituir 30k flat)

Reemplazar fórmula simple por canon:
```ts
const weeklyByTons = (peso: number) => 75; // mech standard
const monthlyMech = weeklyByTons(peso) * 4 + (suministroAdHoc);
```

### C. Salary Calc canónico (auto-aplicar multipliers)

```ts
const sueldoFinal = sueldoBase * qualityMult * officerMult * (rank / 2);
```

Hoy FinanzasPage usa `sueldoMes × multiplicador nivel`. Falta rank y officer multipliers.

### D. Tabla compras

Crear `lib/asset-prices.ts` con datos sección 6 (Hoja 28). UI: nueva tab "Adquisiciones" en Finanzas o botón "Calcular precio" en Hangar Comisión.

### E. Fuel / Transport (StratOps)

Necesario abrir StratOps PDF y extraer tablas concretas. Fase futura cuando se implementen viajes interestelares (página `/mapa`).

---

## 15. FICHEROS FUENTE

| Fuente | Ruta |
|---|---|
| Tablas Ayudas | Google Sheets `Ayudas!BW:BX`, `Ayudas!AI13:AP52`, `Ayudas!AA1:AA31` |
| Hoja 28 sueldos | Google Sheets `Hoja 28!H29:L39` |
| Hoja 28 costes escuadrón | Google Sheets `Hoja 28!H2:O28` |
| Armas infantería | Google Sheets `Armas Infanteria` |
| Taller engine | Google Sheets `Taller` (formulas referencian Ayudas) |
| MECH_META | `src/pages/ComisionPage.tsx` líneas 21-36 |
| ROLES defaults | `src/pages/FinanzasPage.tsx` constante `ROLES` |
| REROLL_CONFIG | `src/pages/HojaServicioPage.tsx` línea 34 |
| FM Mercs canon | `manuales/Field Manual. Mercenaries (Revised).pdf` p.148-181 |
| StratOps | `manuales/CAT35004_StratOps_CorrectedSecondPrinting-1.pdf` |
| Mercenary's Handbook | `manuales/Mercenary's Handbook.pdf` (escaneado, no extraído) |
