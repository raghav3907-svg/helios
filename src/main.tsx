import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, CheckCircle2, Clock3, Database, FileWarning, Radio, Sparkles } from "lucide-react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type Point = { t: number; rate: number; error: number };
type Lightcurve = { id: string; instrument: string; detector: string; rows: Point[] };
type Spectrum = { id: string; instrument: string; detector: string; rows: Array<Record<string, number>> };
type Observation = { id: string; date: string; lightcurves: Lightcurve[]; spectra: Spectrum[]; events: { size: number; rows: number; columns: string[]; timeColumn: string | null; timeMin: number | null; timeMax: number | null } | null };
type Dataset = { observations: Observation[] };
type View = "lightcurve" | "spectrum" | "comparison" | "quality";

const palette = ["#c4f36a", "#5bd6d2", "#f7bd68", "#e98c92", "#b99eff"];
const formatBytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

function linePath(points: Point[], width: number, height: number, min: number, max: number) {
  const first = points[0]?.t ?? 0;
  const last = points.length ? points[points.length - 1].t : first + 1;
  return points.map((point, index) => {
    const x = ((point.t - first) / Math.max(last - first, 1)) * width;
    const y = height - ((point.rate - min) / Math.max(max - min, 1)) * height;
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function Chart({ curves }: { curves: Lightcurve[] }) {
  const values = curves.flatMap((curve) => curve.rows.map((point) => point.rate));
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  return <div className="chart"><svg viewBox="0 0 820 260" role="img" aria-label="Light curve chart"><path className="gridline" d="M0 0H820M0 130H820M0 260H820" />{curves.map((curve, index) => <path key={curve.id} className="curve" stroke={palette[index % palette.length]} d={linePath(curve.rows, 820, 260, min, max)} />)}</svg><div className="chart-legend">{curves.map((curve, index) => <span key={curve.id}><i style={{ background: palette[index % palette.length] }} />{curve.id.replace("LC_", "").split("_").join(" ")}</span>)}</div></div>;
}

function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [day, setDay] = useState(0);
  const [instrument, setInstrument] = useState("All");
  const [band, setBand] = useState("All bands");
  const [tab, setTab] = useState<View>("lightcurve");

  useEffect(() => { fetch(`${import.meta.env.BASE_URL}sample-data.json`).then((response) => response.json()).then(setDataset).catch(() => setDataset({ observations: [] })); }, []);
  const observation = dataset?.observations[day];
  const curves = useMemo(() => observation?.lightcurves.filter((curve) => (instrument === "All" || curve.instrument === instrument) && (band === "All bands" || curve.id === band)) ?? [], [observation, instrument, band]);
  const spectra = useMemo(() => observation?.spectra.filter((spectrum) => instrument === "All" || spectrum.instrument === instrument) ?? [], [observation, instrument]);
  const rates = curves.flatMap((curve) => curve.rows.map((point) => point.rate));
  const averageRate = rates.length ? rates.reduce((sum, value) => sum + value, 0) / rates.length : 0;
  const maxRate = rates.length ? Math.max(...rates) : 0;
  const medianRate = rates.length ? [...rates].sort((a, b) => a - b)[Math.floor(rates.length / 2)] : 0;
  const zeroFraction = rates.length ? rates.filter((value) => value === 0).length / rates.length : 0;
  const bands = observation?.lightcurves.filter((curve) => instrument === "All" || curve.instrument === instrument).map((curve) => curve.id) ?? [];
  const activeBands = curves.filter((curve) => curve.rows.some((point) => point.rate > averageRate * 2)).length;

  if (!dataset || !observation) return <main><div className="loading"><Sparkles /> Preparing observation workspace...</div></main>;
  return <main>
    <header className="topbar"><div className="brand"><span className="brand-mark">H</span><span>Helios</span></div><span className="status"><span className="dot" />Analysis workspace · local data</span></header>
    <section className="hero"><div><p className="eyebrow">ASTROSAT OBSERVATION ANALYSIS</p><h1>See the signal<br /><em>inside the data.</em></h1><p className="lede">Explore light curves and energy spectra from the supplied AstroSat observations. Helios turns raw science products into a focused visual workspace.</p></div><div className="hero-orbit" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><span>✦</span></div></section>
    <section className="workspace">
      <div className="toolbar"><Select label="Observation" value={String(day)} onChange={(value) => setDay(Number(value))} options={dataset.observations.map((item, index) => ({ value: String(index), label: `Observation ${item.id} · ${item.date}` }))} /><Select label="Detector" value={instrument} onChange={(value) => { setInstrument(value); setBand("All bands"); }} options={["All", "CdTe", "CZT"].map((value) => ({ value, label: value }))} /><Select label="Energy band" value={band} onChange={setBand} options={[{ value: "All bands", label: "All bands" }, ...bands.map((value) => ({ value, label: value }))]} /><div className="mission-state"><span className="dot" /><div><small>PROCESSING STATE</small><strong>NOMINAL</strong></div></div></div>
      <div className="command-grid"><aside className="fleet-panel"><div className="fleet-title"><span>OBSERVATION FLEET</span><span className="fleet-count">{dataset.observations.length.toString().padStart(2, "0")}</span></div>{dataset.observations.map((item, index) => <button className={index === day ? "fleet-item selected" : "fleet-item"} key={item.id} onClick={() => setDay(index)}><span className="status-light" /><span><strong>OBS-{item.id}</strong><small>{item.date}</small></span><em>{index === day ? "ACTIVE" : "READY"}</em></button>)}<div className="fleet-divider" /><div className="fleet-title"><span>ANALYSIS SIGNALS</span></div><div className="signal-row"><span className="status-light" />{activeBands} active bands</div><div className="signal-row"><span className="status-light" />{observation.spectra.length} spectra indexed</div></aside><div className="telemetry-panel"><div className="fleet-title"><span>OBSERVATION TELEMETRY</span><span className="telemetry-time">LOCAL COMPUTE</span></div><div className="telemetry-grid"><Telemetry label="MEAN RATE" value={averageRate.toFixed(2)} unit="counts/s" /><Telemetry label="PEAK RATE" value={maxRate.toFixed(2)} unit="counts/s" /><Telemetry label="LIGHT CURVES" value={String(observation.lightcurves.length)} unit="extensions" /><Telemetry label="EVENT STREAM" value={observation.events ? formatBytes(observation.events.size) : "—"} unit="source file" /></div></div></div>
      <div className="stats"><Stat icon={<Radio />} label="Data products" value={String(curves.length + spectra.length)} /><Stat icon={<Activity />} label="Average count rate" value={averageRate.toFixed(2)} /><Stat icon={<BarChart3 />} label="Peak count rate" value={maxRate.toFixed(2)} /><Stat icon={<Database />} label="Event file" value={observation.events ? formatBytes(observation.events.size) : "—"} /></div>
      <div className="analysis-panel"><div className="panel-tabs">{(["lightcurve", "spectrum", "comparison", "quality"] as View[]).map((value) => <button key={value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{({ lightcurve: "Light curves", spectrum: "Energy spectra", comparison: "Compare days", quality: "Data quality" })[value]}</button>)}<span className="panel-context"><Clock3 size={14} />{curves[0]?.rows.length ?? 0} sampled points</span></div>
        {tab === "lightcurve" && <><SectionHeading eyebrow="TEMPORAL BEHAVIOUR" title="Count rate over observation time" badge={`${curves.length} energy bands`} /><Chart curves={curves} /><p className="note">Curves are downsampled for responsive exploration. Values are read from the <code>CTR</code> column in each light-curve FITS extension.</p></>}
        {tab === "spectrum" && <SpectrumPanel spectra={spectra} />}
        {tab === "comparison" && <ComparisonPanel observations={dataset.observations} instrument={instrument} band={band} />}
        {tab === "quality" && <QualityPanel observation={observation} zeroFraction={zeroFraction} />}
      </div>
      <div className="metric-strip"><Telemetry label="MEDIAN RATE" value={medianRate.toFixed(2)} unit="counts/s" /><Telemetry label="ZERO-RATE SAMPLES" value={`${(zeroFraction * 100).toFixed(1)}%`} unit="of sampled points" /><Telemetry label="VALID PRODUCTS" value={`${observation.lightcurves.length + observation.spectra.length}/24`} unit="indexed products" /><Telemetry label="EVENT ROWS" value={observation.events ? observation.events.rows.toLocaleString() : "—"} unit={observation.events ? `${observation.events.columns.length} columns` : "event stream"} /></div>
    </section>
    <footer><span>HELIOS · ASTROSAT DATA WORKSPACE</span><span>Analysis is performed locally in your browser</span></footer>
  </main>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) { return <div className="select-group"><label>{label}</label><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></div>; }
function SectionHeading({ eyebrow, title, badge }: { eyebrow: string; title: string; badge: string }) { return <div className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><span className="badge">{badge}</span></div>; }
function SpectrumPanel({ spectra }: { spectra: Spectrum[] }) { const rows = spectra[0]?.rows ?? []; const values = rows.map((row) => row.COUNTS ?? 0); const max = Math.max(...values, 1); return <><SectionHeading eyebrow="ENERGY DISTRIBUTION" title="Counts by detector channel" badge={`${spectra.length} spectra`} /><div className="spectrum"><div className="bars">{values.map((value, index) => <i key={index} style={{ height: `${Math.max(2, value / max * 100)}%` }} />)}</div></div><p className="note">Showing {values.length} sampled channels from <code>{spectra[0]?.id ?? "spectrum"}</code>. Select a detector above to compare instruments.</p></>; }
function ComparisonPanel({ observations, instrument, band }: { observations: Observation[]; instrument: string; band: string }) { const curves = observations.map((observation) => observation.lightcurves.find((curve) => (instrument === "All" || curve.instrument === instrument) && (band === "All bands" || curve.id === band))).filter((curve): curve is Lightcurve => Boolean(curve)).map((curve, index) => ({ ...curve, id: `${observations[index].date} · ${curve.id}` })); return <><SectionHeading eyebrow="OBSERVATION COMPARISON" title="Compare count rates across days" badge={`${curves.length} observations`} />{curves.length ? <Chart curves={curves} /> : <p className="note">Choose a compatible detector and energy band to compare observations.</p>}<p className="note">Comparison uses the same energy-band product from each observation where available.</p></>; }
function QualityPanel({ observation, zeroFraction }: { observation: Observation; zeroFraction: number }) { const checks = [{ label: "Observation products indexed", ok: observation.lightcurves.length > 0 }, { label: "Energy spectra available", ok: observation.spectra.length > 0 }, { label: "Event stream present", ok: Boolean(observation.events) }, { label: "Detector products complete", ok: observation.lightcurves.length >= 20 }, { label: "Zero-rate samples reviewed", ok: zeroFraction < 0.99 }]; return <><SectionHeading eyebrow="DATA QUALITY" title="Observation readiness checks" badge={`${checks.filter((check) => check.ok).length}/${checks.length} passed`} /><div className="quality-list">{checks.map((check) => <div className="quality-row" key={check.label}><CheckCircle2 size={17} className={check.ok ? "ok" : "warn"} /><span>{check.label}</span><strong>{check.ok ? "PASS" : "REVIEW"}</strong></div>)}</div>{observation.events && <div className="event-summary"><div className="fleet-title"><span>EVENT DATA SUMMARY</span><span className="telemetry-time">{observation.events.timeColumn ?? "TIME UNAVAILABLE"}</span></div><div className="event-summary-grid"><SummaryValue label="ROWS" value={observation.events.rows.toLocaleString()} /><SummaryValue label="COLUMNS" value={String(observation.events.columns.length)} /><SummaryValue label="START" value={formatMjd(observation.events.timeMin)} /><SummaryValue label="END" value={formatMjd(observation.events.timeMax)} /></div><p className="note">Coverage is reported from the event FITS table's <code>{observation.events.timeColumn ?? "time"}</code> column.</p></div>}<p className="note">Checks summarize file availability and sampled light-curve quality. They are not a substitute for instrument-specific calibration.</p></>; }
function SummaryValue({ label, value }: { label: string; value: string }) { return <div><small>{label}</small><strong>{value}</strong></div>; }
function formatMjd(value: number | null) { return value === null ? "—" : value.toFixed(5); }
function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="stat"><span className="stat-icon">{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div>; }
function Telemetry({ label, value, unit }: { label: string; value: string; unit: string }) { return <div className="telemetry"><small>{label}</small><strong>{value}</strong><span>{unit}</span><div className="meter"><i /></div></div>; }

createRoot(document.getElementById("root")!).render(<App />);
