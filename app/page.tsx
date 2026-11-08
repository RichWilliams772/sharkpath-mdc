"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Explorer, { type Focus } from "@/components/Explorer";
import GuideOrb from "@/components/GuideOrb";
import OceanScene, { jet, jetTo } from "@/components/OceanScene";
import Voices from "@/components/Voices";
import { DEMO_CAREERS } from "@/lib/demo-data";
import { DEFAULT_WEIGHTS, normalize, scoreOptions } from "@/lib/scoring";
import type { GuideReply, LlmPref, LlmProvider, Profile, Roadmap, Weights } from "@/lib/types";
import { listen, warmUpEars, type Listening } from "@/lib/mic";
import { playReply, stopVoice } from "@/lib/voices";

const CAREER_BLURB: Record<string, string> = {
  Architect: "Design the buildings Miami lives in.",
  "Mechanical Engineer": "Machines, aerospace, energy systems.",
  Chef: "Run a kitchen, or open your own.",
  "Cybersecurity Specialist": "Defend networks and people.",
  "IT Consultant": "Fix how organizations run on tech.",
};

const PREF_KEY = "sharkpath:llm";
function loadPref(): LlmPref & { speak: boolean } {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { provider: "gemini", apiKey: "", speak: true };
}

export default function Home() {
  const [college, setCollege] = useState("Miami Dade College");
  const [career, setCareer] = useState("");
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [charting, setCharting] = useState(false);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [exploring, setExploring] = useState(false);
  const [profile, setProfileState] = useState<Profile | null>(null);
  useEffect(() => {
    try { const raw = localStorage.getItem("sharkpath:profile"); if (raw) setProfileState(JSON.parse(raw)); } catch {}
  }, []);
  const setProfile = (p: Profile) => {
    setProfileState(p);
    try { localStorage.setItem("sharkpath:profile", JSON.stringify(p)); } catch {}
  };

  const [question, setQuestion] = useState<string>();
  const [reply, setReply] = useState<GuideReply | null>(null);
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(-1);
  const [history, setHistory] = useState<{ voice: string; text: string }[]>([]);
  const [listening, setListening] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pref, setPref] = useState<LlmPref & { speak: boolean }>({ provider: "gemini", apiKey: "", speak: true });
  useEffect(() => setPref(loadPref()), []);
  const savePref = (p: typeof pref) => {
    setPref(p);
    try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch {}
  };
  const llm = { provider: pref.provider, apiKey: pref.apiKey || undefined };

  const scored = useMemo(() => (roadmap ? scoreOptions(roadmap.options, weights) : []), [roadmap, weights]);
  const pct = normalize(weights);
  const routeTitle = (id?: string) => scored.find((r) => r.id === id)?.title;

  /* ---- the guide ---- */
  async function ask(message: string, shown?: string, focus?: Focus): Promise<GuideReply | null> {
    stopVoice();
    setSpeaking(-1);
    setQuestion(shown);
    setThinking(true);
    try {
      const res = await fetch("/api/guide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message, career: roadmap?.career ?? career, college: roadmap?.college ?? college, weights: pct, history, llm, profile, focus,
          routes: scored.map(({ id, title, score, metrics }) => ({ id, title, score, metrics })),
        }),
      });
      const r: GuideReply = await res.json();
      setReply(r);
      setHistory((h) => [...h, { voice: "student", text: message }, ...r.lines].slice(-12));
      if (pref.speak) {
        playReply(r.lines, llm, setSpeaking).then((ok) => { if (!ok) setOrbNote("Voice is unavailable right now; the guides' replies are shown as text."); });
      }
      return r;
    } catch {
      return null;
    } finally {
      setThinking(false);
    }
  }

  // Once routes are ranked, the guides weigh in automatically.
  const lastBriefed = useRef<string>("");
  useEffect(() => {
    if (!roadmap || !scored.length) return;
    const key = roadmap.career + roadmap.college;
    if (lastBriefed.current === key) return;
    lastBriefed.current = key;
    ask(`I just charted routes to become a ${roadmap.career} starting at ${roadmap.college}. Which should I take?`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadmap, scored.length]);

  /* ---- voice in ----
     Our own capture + speech model (lib/mic.ts → /api/transcribe), so it works the same in every browser.
     Tap once and talk: live words appear as you speak, and it sends itself when you pause. */
  const micRef = useRef<Listening | null>(null);
  const [orbNote, setOrbNote] = useState<string>();
  useEffect(() => { warmUpEars(); }, []);

  async function toggleListen() {
    stopVoice();
    setSpeaking(-1);
    if (micRef.current) return micRef.current.stop(); // second tap = "I'm done"
    setOrbNote("Listening… just talk. I'll send when you pause.");
    setListening(true);
    try {
      const mic = await listen({
        llm,
        onLevel: (l) => document.documentElement.style.setProperty("--mic", l.toFixed(3)),
        onPreview: (t) => setOrbNote(`“${t}…”`),
        onTranscribing: () => setOrbNote((n) => (n?.startsWith("“") ? n.replace(/…”$/, "”") : "Got it…")),
      });
      micRef.current = mic;
      const said = await mic.result;
      if (!said) return setOrbNote("Didn't catch that. Tap the orb and try again.");
      setOrbNote(undefined);
      ask(said, said);
    } catch (e) {
      const blocked = e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError");
      setOrbNote(blocked ? "Microphone blocked. Allow it in the address bar, or type below." : "Couldn't hear that. Try again, or type below.");
    } finally {
      micRef.current = null;
      setListening(false);
      document.documentElement.style.setProperty("--mic", "0");
    }
  }

  /* ---- charting ---- */
  async function chart(c: string, from?: Element | null) {
    if (!c.trim()) return;
    setCareer(c);
    setRoadmap(null);
    setCharting(true);
    jet(from);
    try {
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ career: c, college, llm }),
      });
      setRoadmap(await res.json());
      // second burst: the dive down into the explorer
      jet();
      setExploring(true);
      scrollTo({ top: 0 });
    } finally {
      setCharting(false);
    }
  }

  function surface() {
    jet();
    setExploring(false);
    requestAnimationFrame(() => document.getElementById("start")?.scrollIntoView({ block: "start" }));
  }
  return (
    <>
      <OceanScene pinDepth={exploring ? 0.8 : null} />

      <div className="content">
        <header>
          <div className="brand">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="#7FF0E0" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="18" cy="18" r="16" /><path d="M6 20c3-3 6-3 9 0s6 3 9 0 4-2 6-1" /><path d="M18 6v6M18 12l-3 3M18 12l3 3" /></svg>
            <div className="brand-text">
              <span className="brand-name display">SharkPath</span>
              <span className="brand-sub">Any college. Any career.</span>
            </div>
          </div>
          <nav aria-label="Main">
            {!exploring && <><a href="#start">Chart a path</a><a href="#guide">Guides</a></>}
            <button className="btn btn-ghost glass" type="button" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((o) => !o)}>
              Guide settings
            </button>
          </nav>
          {settingsOpen && (
            <div className="settings glass" role="dialog" aria-label="Guide settings">
              <div className="field">
                <label htmlFor="prov">AI model</label>
                <select id="prov" value={pref.provider} onChange={(e) => savePref({ ...pref, provider: e.target.value as LlmProvider })}>
                  <option value="gemini">Google Gemini</option>
                  <option value="anthropic">Anthropic Claude</option>
                  <option value="openai">OpenAI</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="key">Your API key (optional)</label>
                <input id="key" type="password" placeholder="Uses the SharkPath key if blank" value={pref.apiKey ?? ""} onChange={(e) => savePref({ ...pref, apiKey: e.target.value })} />
              </div>
              <label className="toggle">
                <input type="checkbox" checked={pref.speak} onChange={(e) => { savePref({ ...pref, speak: e.target.checked }); if (!e.target.checked) stopVoice(); }} />
                Speak the guides out loud
              </label>
              <p>Your key stays in this browser and is sent only with your own requests. With no key at all, SharkPath runs on demo data.</p>
            </div>
          )}
        </header>

        {exploring && roadmap && (
          <Explorer
            roadmap={roadmap} scored={scored} weights={weights} setWeights={setWeights}
            profile={profile} setProfile={setProfile} llm={llm} onSurface={surface}
            ask={ask} reply={reply} thinking={thinking} speaking={speaking} question={question}
            listening={listening} toggleListen={toggleListen} voiceNote={orbNote}
          />
        )}

        <main hidden={exploring}>
          {/* 0 m — surface: the guides */}
          <section id="guide" className="hero tilt">
            <p className="eyebrow">You&apos;re in. Look up — then dive down.</p>
            <h1 className="display">Dive into what comes next.</h1>
            <p className="lede">Courses, transfers and careers from any college — priced, ranked and charted one clear step at a time, with two guides in your ear.</p>

            <div className="orb-wrap">
              <GuideOrb
                listening={listening}
                split={reply?.stance === "split"}
                speaking={speaking >= 0 && reply ? reply.lines[speaking]?.voice : null}
                onClick={toggleListen}
              />
              <p className={`orb-label${listening ? " live" : ""}`} aria-live="polite">
                {orbNote ?? (listening ? "Listening… ask anything about your path" : "Tap to talk to Sonar & Tide")}
              </p>
            </div>

            <form
              className="ask-form glass"
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem("ask") as HTMLInputElement;
                const q = input.value.trim();
                if (!q) return;
                input.value = "";
                ask(q, q);
              }}
            >
              <label htmlFor="ask" className="sr-only">Ask your guides</label>
              <input id="ask" name="ask" className="ask" type="text" placeholder="e.g. I like drawing and math — what could I become?" autoComplete="off" />
              <button className="btn send" type="submit" aria-label="Send question">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
              </button>
            </form>

            {!exploring && <Voices question={question} reply={reply} loading={thinking} speakingIndex={speaking} routeTitle={routeTitle} />}

            <div className="scroll-hint">
              <span>Scroll to descend</span>
              <svg width="18" height="26" viewBox="0 0 18 26" fill="none" stroke="#7FF0E0" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="1" y="1" width="16" height="24" rx="8" /><path d="M9 7v5" /></svg>
            </div>
          </section>

          {/* −15 m — where you start, where you're going */}
          <section id="start" className="section tilt" aria-labelledby="start-h">
            <span className="marker">−15 m · Choose a current</span>
            <div className="section-head">
              <h2 id="start-h" className="display">Where are you starting, and where are you headed?</h2>
            </div>
            <div className="fields">
              <div className="field glass">
                <label htmlFor="college">Your college</label>
                <input id="college" value={college} onChange={(e) => setCollege(e.target.value)} placeholder="Any college or university" />
              </div>
              <form className="field glass" onSubmit={(e) => { e.preventDefault(); chart(career, e.currentTarget); }}>
                <label htmlFor="career">Dream career</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input id="career" style={{ flex: 1, minWidth: 0 }} value={career} onChange={(e) => setCareer(e.target.value)} placeholder="Type any career, or pick one below" />
                  <button className="btn send" type="submit" aria-label="Chart this career" disabled={!career.trim()}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
                  </button>
                </div>
              </form>
            </div>
            <div className="cards">
              {DEMO_CAREERS.map((c) => (
                <button key={c} className={`card glass${roadmap?.career === c ? " on" : ""}`} type="button" aria-pressed={roadmap?.career === c} onClick={(e) => chart(c, e.currentTarget)}>
                  <span className="card-title">{c}</span>
                  <span className="card-desc">{CAREER_BLURB[c]}</span>
                </button>
              ))}
            </div>
            {charting && (
              <p className="charting-msg" role="status"><span className="dots" aria-hidden="true"><i /><i /><i /></span>Sonar is charting routes to {career} from {college} and pulling real pay data. Usually 10–20 seconds.</p>
            )}
            {roadmap && !exploring && (
              <div className="row" style={{ justifyContent: "flex-start" }}>
                <button className="btn btn-primary" type="button" onClick={(e) => { jet(e.currentTarget); setExploring(true); scrollTo({ top: 0 }); }}>Back to my {roadmap.career} routes</button>
              </div>
            )}
          </section>

          {/* −30 m — the floor */}
          <section className="floor tilt" aria-labelledby="end-h">
            <span className="marker" style={{ width: "min(420px,100%)" }}>−30 m · The floor</span>
            <h2 id="end-h" className="display" style={{ fontWeight: 700, fontSize: "clamp(32px,4vw,52px)", letterSpacing: "-.02em" }}>Ready to chart your path?</h2>
            <button className="btn btn-primary" type="button" style={{ padding: "16px 32px", minHeight: 52, fontSize: 17, boxShadow: "0 0 40px rgba(127,240,224,.35)" }} onClick={(e) => jetTo(e.currentTarget, "start")}>
              Start my path
            </button>
          </section>
        </main>
      </div>
    </>
  );
}
