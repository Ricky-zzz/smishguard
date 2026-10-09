import { useEffect, useMemo, useRef, useState } from 'react';
import { APP_NAME, EXAMPLE_MESSAGES } from './config';
import { createDetector, Detector, LABEL_TEXT } from './detector';
import type { LoadStatus } from './detector';
import { RuleExplainer, Reason } from './explainer/ruleExplainer';
import { VerdictEngine, Verdict, VerdictSource } from './policy/verdictEngine';
import { IndexedDbStorage, HistoryEntry } from './storage/indexedDbStorage';
import { Correction, CorrectionStore } from './storage/correctionStore';
import probe from './proof/countingNetworkProbe';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

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
  const [activeTab, setActiveTab] = useState<'check' | 'history' | 'corrections'>('check');
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
  const [correctionsList, setCorrectionsList] = useState<Correction[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
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
    corrections.all().then((c) => {
      setCorrectionCount(c.length);
      setCorrectionsList(c);
    });

    const onInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    const timer = window.setInterval(() => setNetCount(probe.count()), 400);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('beforeinstallprompt', onInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

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
    const all = await corrections.all();
    setCorrectionCount(all.length);
    setCorrectionsList(all);
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
    setCorrectionsList([]);
    if (text.trim()) await check();
  };

  const removeCorrection = async (id: string) => {
    await corrections.remove(id);
    const all = await corrections.all();
    setCorrectionCount(all.length);
    setCorrectionsList(all);
  };

  const neutral = verdict?.neutral ?? false;
  const lowConfidence = verdict ? verdict.label === 'ham' && verdict.confidence < 0.55 : false;
  const lowConfidenceScam = verdict ? verdict.label !== 'ham' && verdict.confidence < 0.65 : false;
  const verdictClass = verdict
    ? neutral || lowConfidence || lowConfidenceScam
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
      <header className="app-header">
        <div>
          <h1>{APP_NAME}</h1>
          <p className="tagline">
            On-device Philippine smishing detector. Nothing leaves this phone.
          </p>
        </div>
        {!installed && installPrompt && (
          <button className="ghost install-btn" onClick={installApp}>
            Install app
          </button>
        )}
      </header>

      <nav className="tabs">
        <button
          className={activeTab === 'check' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('check')}
        >
          Suriin
        </button>
        <button
          className={activeTab === 'history' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('history')}
        >
          Listahan ({history.length})
        </button>
        <button
          className={activeTab === 'corrections' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('corrections')}
        >
          Corrections ({correctionCount})
        </button>
      </nav>

      {activeTab === 'check' && (
        <>
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
                  {neutral
                    ? 'Hindi sigurado'
                    : isScam
                      ? lowConfidenceScam
                        ? 'Posibleng scam — hindi sigurado'
                        : 'MALAMANG SCAM'
                      : lowConfidence
                        ? 'Hindi sigurado'
                        : 'Walang nakitang senyales ng scam'}
                </strong>
                <span>
                  {neutral
                    ? 'Walang malinaw na senyales'
                    : `${LABEL_TEXT[verdict.label]} · ${(verdict.confidence * 100).toFixed(1)}% confident`}
                </span>
                {neutral && (
                  <span>Hindi sigurado ang modelo — walang senyales na mapagkakatiwalaan.</span>
                )}
                {lowConfidence && (
                  <span>Mababa ang kumpiyansa — walang malinaw na senyales.</span>
                )}
                {lowConfidenceScam && (
                  <span>Mababa ang kumpiyansa — huwag munang mag-click o magbigay ng OTP.</span>
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
          </section>
        </>
      )}

      {activeTab === 'history' && (
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
      )}

      {activeTab === 'corrections' && (
        <section className="card">
          <h2>Local corrections ({correctionCount})</h2>
          {correctionCount === 0 && (
            <p className="fineprint">
              Wala pa. Sa Suriin tab, gamitin ang "Mali — legit ito" o "Scam ito — hindi
              na-flag" para magturo ang app locally.
            </p>
          )}
          <ul className="history">
            {correctionsList.map((c) => (
              <li key={c.id} className={c.label === 'ham' ? 'hist-ham' : 'hist-scam'}>
                <div>
                  <strong>
                    {c.label === 'ham' ? 'Natutunan: legit' : 'Natutunan: scam'}
                  </strong>
                  <span> · {new Date(c.at).toLocaleString()}</span>
                  <p>{c.text}</p>
                </div>
                <button className="ghost" onClick={() => removeCorrection(c.id)}>
                  x
                </button>
              </li>
            ))}
          </ul>
          {correctionCount > 0 && (
            <button className="ghost" onClick={clearCorrections}>
              Clear all corrections
            </button>
          )}
        </section>
      )}
    </div>
  );
}