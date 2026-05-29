import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";

type Cfg = {
  project_root: string;
  web_url: string;
  last_deploy_iso: string | null;
  presets: string[];
};

type GitStatus = {
  branch: string;
  ahead: number;
  behind: number;
  dirty: boolean;
};

type ShellEvent = {
  run_id: number;
  stream: "stdout" | "stderr" | "exit";
  line: string;
  code: number | null;
};

type LogLine = {
  id: number;
  stream: "stdout" | "stderr" | "exit" | "info";
  text: string;
  ts: string;
};

type ButtonDef = {
  id: string;
  label: string;
  desc?: string;
  phase: 1 | 2 | 3;
  group: "DEV" | "DEPLOY" | "DATA" | "TOOLS" | "INFO" | "EXT";
  cmd?: string;
  url?: string;
  port?: number;
};

const BUTTONS: ButtonDef[] = [
  { id: "dev",       label: "Local Dev",       desc: "vite dev server :5173",         phase: 1, group: "DEV",    cmd: "npm run dev", port: 5173 },
  { id: "quickpush", label: "Quick Push",      desc: "add -A + commit + push",        phase: 1, group: "DEPLOY", cmd: "git add -A && git commit -m \"chore: quick push\" && git push origin main" },
  { id: "deploy",    label: "Full Deploy",     desc: "scripts\\deploy.bat",           phase: 1, group: "DEPLOY", cmd: "scripts\\deploy.bat" },
  { id: "pull",      label: "Pull Remote",     desc: "git pull origin main",          phase: 1, group: "DEPLOY", cmd: "git pull origin main" },
  { id: "import",    label: "Import Units",    desc: "scripts\\import-units.bat",     phase: 1, group: "DATA",   cmd: "scripts\\import-units.bat" },
  { id: "index",     label: "Rebuild Indexes", desc: "scripts\\index.bat",            phase: 1, group: "DATA",   cmd: "scripts\\index.bat" },
  { id: "build",     label: "Build",           desc: "tsc + vite build",              phase: 2, group: "DEPLOY", cmd: "npm run build" },
  { id: "clean",     label: "Clean Build",     desc: "rmdir dist + .vite",            phase: 2, group: "DEPLOY", cmd: "rmdir /s /q dist & rmdir /s /q node_modules\\.vite" },
  { id: "snapshot",  label: "Backup Snapshot", desc: "git tag snapshot-<ts>",         phase: 2, group: "TOOLS",  cmd: "git tag snapshot-%date:~-4%%date:~3,2%%date:~0,2%-%time:~0,2%%time:~3,2%" },
  { id: "c3",        label: "C3 Calc",         desc: "todo",                          phase: 3, group: "TOOLS" },
  { id: "roster",    label: "Roster Mgr",      desc: "todo",                          phase: 3, group: "TOOLS" },
  { id: "config",    label: "Config Editor",   desc: "todo",                          phase: 3, group: "TOOLS" },
  { id: "health",    label: "Asset Health",    desc: "todo",                          phase: 3, group: "TOOLS" },
  { id: "logs",      label: "Logs Viewer",     desc: "todo",                          phase: 3, group: "INFO"  },
  { id: "pages",     label: "GitHub Pages",    desc: "markirov.github.io/King-Karl",  phase: 1, group: "EXT", url: "https://markirov.github.io/King-Karl/" },
  { id: "actions",   label: "GH Actions",      desc: "workflow runs",                 phase: 1, group: "EXT", url: "https://github.com/Markirov/King-Karl/actions" },
  { id: "sheets",    label: "Sheets",          desc: "docs.google.com",               phase: 1, group: "EXT", url: "https://docs.google.com/spreadsheets" },
  { id: "repo",      label: "Repo",            desc: "github.com/Markirov/King-Karl", phase: 1, group: "EXT", url: "https://github.com/Markirov/King-Karl" },
];

const GROUPS: ButtonDef["group"][] = ["DEV", "DEPLOY", "DATA", "TOOLS", "INFO", "EXT"];

const GROUP_LABEL: Record<ButtonDef["group"], string> = {
  DEV: "Desarrollo",
  DEPLOY: "Despliegue",
  DATA: "Datos & Assets",
  TOOLS: "Herramientas",
  INFO: "Info",
  EXT: "Enlaces externos",
};

export default function App() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [git, setGit] = useState<GitStatus | null>(null);
  const [devUp, setDevUp] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [running, setRunning] = useState<Record<string, number>>({});

  useEffect(() => {
    invoke<Cfg>("get_config").then((c) => {
      setCfg(c);
      if (!c.project_root) setShowConfig(true);
    });
  }, []);

  useEffect(() => {
    const un = listen<ShellEvent>("shell-event", (e) => {
      const ev = e.payload;
      const ts = new Date().toTimeString().slice(0, 8);
      setLogs((prev) => {
        const next = [
          ...prev,
          {
            id: prev.length,
            stream: ev.stream,
            text: ev.stream === "exit" ? `[exit code=${ev.code ?? "?"}]` : ev.line,
            ts,
          },
        ];
        return next.length > 1500 ? next.slice(-1500) : next;
      });
      if (ev.stream === "exit") {
        setRunning((prev) => {
          const copy = { ...prev };
          for (const [k, v] of Object.entries(copy)) {
            if (v === ev.run_id) delete copy[k];
          }
          return copy;
        });
      }
    });
    return () => {
      un.then((f) => f());
    };
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!cfg?.project_root) return;
    try {
      const g = await invoke<GitStatus>("get_git_status", { cwd: cfg.project_root });
      setGit(g);
    } catch {
      setGit(null);
    }
    try {
      const up = await invoke<boolean>("check_port", { port: 5173 });
      setDevUp(up);
    } catch {
      setDevUp(false);
    }
  }, [cfg?.project_root]);

  useEffect(() => {
    refreshStatus();
    const i = setInterval(refreshStatus, 5000);
    return () => clearInterval(i);
  }, [refreshStatus]);

  const pushLog = (text: string, stream: LogLine["stream"] = "info") => {
    const ts = new Date().toTimeString().slice(0, 8);
    setLogs((p) => [...p, { id: p.length, stream, text, ts }]);
  };

  const runBtn = async (b: ButtonDef) => {
    if (b.url) {
      await invoke("open_url", { url: b.url });
      pushLog(`open ${b.url}`);
      return;
    }
    if (!b.cmd) {
      pushLog(`[${b.id}] placeholder - Fase ${b.phase} pending`);
      return;
    }
    if (!cfg?.project_root) {
      pushLog("project_root vacio - abre Config", "stderr");
      setShowConfig(true);
      return;
    }
    pushLog(`> ${b.label}: ${b.cmd}`);
    try {
      const id = await invoke<number>("stream_shell", {
        cwd: cfg.project_root,
        cmd: b.cmd,
      });
      setRunning((p) => ({ ...p, [b.id]: id }));
    } catch (e) {
      pushLog(`error: ${e}`, "stderr");
    }
  };

  if (!cfg) {
    return <div className="boot">Cargando...</div>;
  }

  return (
    <div className="shell">
      {showConfig && (
        <ConfigDialog
          cfg={cfg}
          onClose={() => setShowConfig(false)}
          onSave={async (c) => {
            await invoke("save_config", { cfg: c });
            setCfg(c);
            setShowConfig(false);
            refreshStatus();
          }}
        />
      )}

      {/* HEADER STATUS BAR */}
      <header className="topbar clip-chamfer">
        <div className="brand">
          <h1>KING KARL</h1>
          <span className="subtitle">Fleet Launcher</span>
        </div>
        <div className="status-strip">
          <StatusChip label="BRANCH" value={git?.branch ?? "-"} />
          <StatusChip label="DEV" value={devUp ? "ON" : "OFF"} tone={devUp ? "ok" : "off"} />
          <StatusChip label="AHEAD" value={git ? `+${git.ahead} / -${git.behind}` : "-"} />
          <StatusChip
            label="TREE"
            value={git ? (git.dirty ? "DIRTY" : "CLEAN") : "-"}
            tone={git?.dirty ? "warn" : "ok"}
          />
        </div>
        <div className="topbar-actions">
          <button className="link-btn" onClick={() => setShowConfig(true)}>Config</button>
          <button className="link-btn" onClick={refreshStatus}>Refresh</button>
        </div>
      </header>

      {/* MAIN GRID: buttons + logs */}
      <div className="layout">
        <section className="buttons-pane">
          {GROUPS.map((g) => {
            const items = BUTTONS.filter((b) => b.group === g);
            if (items.length === 0) return null;
            return (
              <div key={g} className="group">
                <h2>
                  <span className="group-tag">{g}</span>
                  <span className="group-name">{GROUP_LABEL[g]}</span>
                </h2>
                <div className="btn-grid">
                  {items.map((b) => {
                    const isRunning = !!running[b.id];
                    return (
                      <button
                        key={b.id}
                        className={`launcher-btn clip-chamfer phase-${b.phase} ${isRunning ? "running" : ""}`}
                        onClick={() => runBtn(b)}
                        title={b.cmd || b.url || "placeholder"}
                      >
                        <span className="btn-label">{b.label}</span>
                        {b.desc && <span className="btn-desc mono">{b.desc}</span>}
                        {b.phase > 1 && <span className="btn-phase">P{b.phase}</span>}
                        {isRunning && <span className="btn-running">RUN</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        <section className="logs-pane clip-chamfer">
          <div className="logs-head">
            <span className="logs-title">LOGS</span>
            <span className="logs-count mono">({logs.length})</span>
            <div className="logs-actions">
              <button className="link-btn" onClick={() => setLogs([])}>clear</button>
            </div>
          </div>
          <div className="logs-body mono">
            {logs.length === 0 && <p className="logs-empty">- sin actividad -</p>}
            {logs.map((l) => (
              <div key={l.id} className={`log-line stream-${l.stream}`}>
                <span className="log-ts">{l.ts}</span>
                <span className="log-text">{l.text}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatusChip({ label, value, tone }: { label: string; value: string; tone?: "ok" | "off" | "warn" }) {
  return (
    <div className="chip">
      <span className="chip-label">{label}</span>
      <span className={`chip-val mono ${tone || ""}`}>{value}</span>
    </div>
  );
}

function ConfigDialog({
  cfg,
  onClose,
  onSave,
}: {
  cfg: Cfg;
  onClose: () => void;
  onSave: (c: Cfg) => void;
}) {
  const [root, setRoot] = useState(cfg.project_root || "E:\\Drive\\CBT\\MechWarrior RPG");
  const [web, setWeb] = useState(cfg.web_url || "http://127.0.0.1:5173/");

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal clip-chamfer" onClick={(e) => e.stopPropagation()}>
        <h2>Config</h2>
        <label>
          Project Root
          <input value={root} onChange={(e) => setRoot(e.target.value)} className="mono" />
        </label>
        <label>
          Web URL (browser ext)
          <input value={web} onChange={(e) => setWeb(e.target.value)} className="mono" />
        </label>
        <div className="modal-actions">
          <button className="link-btn" onClick={onClose}>Cancel</button>
          <button
            className="launcher-btn clip-chamfer phase-1"
            onClick={() =>
              onSave({
                project_root: root,
                web_url: web,
                last_deploy_iso: cfg.last_deploy_iso,
                presets: cfg.presets || [],
              })
            }
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
