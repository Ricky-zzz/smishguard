import { useEffect, useMemo, useRef, useState } from 'react';
import { APP_NAME, EXAMPLE_MESSAGES } from './config';
import { createDetector, Detector, LABEL_TEXT } from './detector';
import type { LoadStatus } from './detector';
import { RuleExplainer, Reason } from './explainer/ruleExplainer';
import { VerdictEngine, Verdict, VerdictSource } from './policy/verdictEngine';
import { IndexedDbStorage, HistoryEntry } from './storage/indexedDbStorage';
import { CorrectionStore } from './storage/correctionStore';
import probe from './proof/countingNetworkProbe';

let detectorPromise: Promise<Detector> | null = null;
const explainer = new RuleExplainer();
const storage = new IndexedDbStorage();
const corrections = new CorrectionStore();

const LABEL_CLASS: Record<string, string> = {
  ham: 'verdict ham',
  scam: 'verdict scam',
  impersonation: 'verdict scam',
  otp_phish: 'verdict scam',
  loan: 'verdict scam',
  raffle: 'verdict scam'
};

const SOURCE_TEXT: Record<VerdictSource, string> = {
  model: 'on-device model',
  rules: 'safety rules',
  correction: 'your correction'
};

export default function App() {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  const [statusMsg, setStatusMsg] = useState('Starting local engine...');
  const [modelDesc, setModelDesc] = useState('');
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [latency, setLatency] = useState<number | null>(null);
  const [netCount, setNetCount] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [correctionCount, setCorrectionCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const engineRef = useRef<VerdictEngine | null>(null);

  useEffect(() => {
    probe.start();

    const shared = new URLSearchParams(window.location.search).get('text');
    if (shared) setText(shared);

    const onStatus = (s: LoadStatus) =>
      setStatusMsg(`Loading model: ${s.phase} ${Math.round(s.progress)}%`);

    if (!detectorPromise) detectorPromise = createDetector(onStatus);
    detectorPromise.then((d) => {
      engineRef.current = new VerdictEngine(d, corrections);
      setModelDesc(d.describe());
      probe.reset();
      setStatus('ready');
    });

    storage.all().then(setHistory);
    corrections.all().then((c) => setCorrectionCount(c.length));

    const timer = window.setInterval(() => setNetCount(probe.count()), 400);
    return () => window.clearInterval(timer);
  }, []);

  const useClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const copied = await navigator.clipboard.readText();
        if (copied && copied.trim()) setText(copied.trim());
      }
    } catch {
      /* clipboard read requires permission / gesture; ignore */
    }
  };

  const check = async () => {
    const engine = engineRef.current;
    const trimmed = text.trim();
    if (!engine || !trimmed) return;
    setBusy(true);
    setError(null);
    if (trimmed.length < 8) {
      setBusy(false);
      setError('Masyadong maikli — i-paste ang buong SMS na natanggap mo.');
      return;
    }
    if (trimmed.length > 500) {
      setBusy(false);
      setError('Mas mahaba pa sa 500 characters — i-paste lang ang SMS.');
      return;
    }
    try {
      const { result, ms } = await probe.measure(() => engine.judge(trimmed));
      setVerdict(result);
      setLatency(Math.round(ms));
      setReasons(await explainer.explain(trimmed, result));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const correct = async (label: 'ham' | 'scam') => {
    const trimmed = text.trim();
    if (!trimmed) return;
    await corrections.add(trimmed, label);
    setCorrectionCount((await corrections.all()).length);
    await check();
  };

  const save = async () => {
    if (!verdict) return;
    await storage.add({
      text: text.trim(),
      label: verdict.label,
      confidence: verdict.confidence,
      at: Date.now()
    });
    setHistory(await storage.all());
  };

  const removeEntry = async (id: string) => {
    await storage.remove(id);
    setHistory(await storage.all());
  };

  const clearCorrections = async () => {
    await corrections.clear();
    setCorrectionCount(0);
    if (text.trim()) await check();
  };

  const lowConfidence = verdict ? verdict.label === 'ham' && verdict.confidence < 0.55 : false;
  const verdictClass = verdict
    ? lowConfidence
      ? 'verdict low'
      : LABEL_CLASS[verdict.label]
    : 'verdict';
  const isScam = verdict ? verdict.label !== 'ham' : false;

  const scoreRows = useMemo(() => {
    if (!verdict) return [];
    return Object.entries(verdict.scores)
      .filter(([, v]) => v > 0.001)
      .sort((a, b) => b[1] - a[1]);
  }, [verdict]);

  return (
    <div className="app">
      <header>
        <h1>{APP_NAME}</h1>
        <p className="tagline">
          On-device Philippine smishing detector. Nothing leaves this phone.
        </p>
      </header>

      <section className="card">
        <div className="row">
          <span className={`pill ${status}`}>
            {status === 'loading' ? statusMsg : `Engine ready — ${modelDesc}`}
          </span>
        </div>

        <textarea
          value={text}
          placeholder="I-paste dito ang suspicious na text message..."
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={500}
        />
        <span className="fineprint">{text.length}/500</span>
        {!text && (
          <button className="ghost" onClick={useClipboard}>
            Gamitin ang na-copy kong message
          </button>
        )}

        <div className="examples">
          {EXAMPLE_MESSAGES.map((ex) => (
            <button
              key={ex.title}
              className="ghost"
              onClick={() => setText(ex.text)}
            >
              {ex.title}
            </button>
          ))}
        </div>

        <div className="row">
          <button
            className="primary"
            disabled={busy || status !== 'ready' || !text.trim()}
            onClick={check}
          >
            {busy ? 'Sinusuri...' : 'Suriin locally'}
          </button>
        </div>

        {error && <p className="error">{error}</p>}
      </section>

      {verdict && (
        <section className="card">
          <div className={verdictClass}>
            <strong>
              {isScam
                ? 'MALAMANG SCAM'
                : lowConfidence
                  ? 'Hindi sigurado'
                  : 'Walang nakitang senyales ng scam'}
            </strong>
            <span>
              {LABEL_TEXT[verdict.label]} ·{' '}
              {(verdict.confidence * 100).toFixed(1)}% confident
            </span>
            {lowConfidence && (
              <span>Mababa ang kumpiyansa — walang malinaw na senyales.</span>
            )}
          </div>

          <div className="row">
            <span className={`source source-${verdict.source}`}>
              via {SOURCE_TEXT[verdict.source]}
            </span>
            {verdict.note && <span className="note">{verdict.note}</span>}
          </div>

          <ul className="reasons">
            {reasons.map((r, i) => (
              <li key={i}>{r.text}</li>
            ))}
          </ul>

          <div className="scores">
            {scoreRows.map(([label, score]) => (
              <div key={label} className="score-row">
                <span>{LABEL_TEXT[label as keyof typeof LABEL_TEXT]}</span>
                <div className="bar">
                  <div
                    className="bar-fill"
                    style={{ width: `${Math.round(score * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="row">
            <button className="ghost" onClick={save}>
              I-save sa listahan
            </button>
            {isScam ? (
              <button className="ghost" onClick={() => correct('ham')}>
                Mali — legit ito
              </button>
            ) : (
              <button className="ghost" onClick={() => correct('scam')}>
                Scam ito — hindi na-flag
              </button>
            )}
          </div>
        </section>
      )}

      <section className="card">
        <h2>Proof panel</h2>
        <div className="proof">
          <div className="proof-item">
            <span className="proof-num">{netCount}</span>
            <span className="proof-label">network calls since ready</span>
          </div>
          <div className="proof-item">
            <span className="proof-num">
              {latency === null ? '—' : `${latency}ms`}
            </span>
            <span className="proof-label">last inference</span>
          </div>
          <div className="proof-item">
            <span className="proof-num">{correctionCount}</span>
            <span className="proof-label">local corrections learned</span>
          </div>
        </div>
        <p className="fineprint">
          The model downloads once on first load, then is cached. After that all
          inference and corrections stay on your device — try airplane mode.
        </p>
        {correctionCount > 0 && (
          <button className="ghost" onClick={clearCorrections}>
            Clear my corrections ({correctionCount})
          </button>
        )}
      </section>

      <section className="card">
        <h2>Listahan ({history.length})</h2>
        {history.length === 0 && <p className="fineprint">Wala pa.</p>}
        <ul className="history">
          {history.map((h) => (
            <li key={h.id} className={h.label === 'ham' ? 'hist-ham' : 'hist-scam'}>
              <div>
                <strong>{LABEL_TEXT[h.label]}</strong>
                <span> · {new Date(h.at).toLocaleString()}</span>
                <p>{h.text}</p>
              </div>
              <button className="ghost" onClick={() => removeEntry(h.id)}>
                x
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
