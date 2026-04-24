# King Karl's Kürassiers — Fleet Command

Comisión de Revisión y Fianza de Mercenarios.  
App de gestión de campaña BattleTech con React + TypeScript + Tailwind v4.

## Setup

```bash
npm install
npm run dev
```

## Deploy a GitHub Pages

1. Crea un repo en GitHub (ej: `warthogs-fleet`)
2. Asegúrate de que `base` en `vite.config.ts` coincide con el nombre del repo:
   ```ts
   base: '/warthogs-fleet/',
   ```
3. Conecta el repo:
   ```bash
   git init
   git remote add origin https://github.com/TU-USUARIO/warthogs-fleet.git
   ```
4. Despliega:
   ```bash
   npm run deploy
   ```
5. En GitHub → Settings → Pages → Source: **Deploy from a branch** → Branch: `gh-pages` → Save

Tu app estará en: `https://TU-USUARIO.github.io/warthogs-fleet/`

### Re-deploy tras cambios

```bash
npm run deploy
```

Esto compila (`npm run build`) y sube `dist/` a la rama `gh-pages` automáticamente.

## Stack

- React 19 + TypeScript
- Tailwind CSS v4 (`@theme` tokens)
- Vite 6
- Zustand (estado global)
- React Router v7 (HashRouter para GitHub Pages)
- Lucide React (iconos)
