"use client";

import type { GuideLine, GuideReply, Voice } from "@/lib/types";

const NAME: Record<Voice, string> = { sonar: "Sonar", tide: "Tide" };

function Line({ line, speaking }: { line: GuideLine; speaking: boolean }) {
  return (
    <div className={`line ${line.voice}${speaking ? " speaking" : ""}`}>
      <span className="who">{NAME[line.voice]}</span>
      <span>{line.text}</span>
    </div>
  );
}

/**
 * One guide, two inner voices.
 * agree → a single thread where Sonar and Tide finish each other's thoughts.
 * split → each voice takes a side; the last line hands the choice back to the student.
 */
export default function Voices({
  question, reply, loading, speakingIndex, routeTitle,
}: {
  question?: string;
  reply: GuideReply | null;
  loading: boolean;
  speakingIndex: number;
  routeTitle: (id?: string) => string | undefined;
}) {
  if (!reply && !loading) return null;

  return (
    <div className="voices glass" aria-live="polite">
      <div className="voices-head">
        <span>{question ? <span className="voices-q" style={{ textTransform: "none", letterSpacing: 0 }}>“{question}”</span> : "Your guides"}</span>
        {loading ? (
          <span className="dots" aria-label="Thinking"><i /><i /><i /></span>
        ) : reply?.stance === "split" ? (
          <span className="stance split"><i />Split decision</span>
        ) : (
          <span className="stance"><i />In sync</span>
        )}
      </div>

      {reply && !loading && (reply.stance === "split" ? <Split reply={reply} speakingIndex={speakingIndex} routeTitle={routeTitle} /> : (
        <div className="thread">
          {reply.lines.map((l, i) => <Line key={i} line={l} speaking={i === speakingIndex} />)}
        </div>
      ))}
    </div>
  );
}

function Split({ reply, speakingIndex, routeTitle }: { reply: GuideReply; speakingIndex: number; routeTitle: (id?: string) => string | undefined }) {
  // The final line is the hand-back to the student; the rest go to each voice's own side.
  const body = reply.lines.slice(0, -1);
  const last = reply.lines[reply.lines.length - 1];
  const indexed = body.map((line, i) => ({ line, i }));
  const side = (v: Voice) => (
    <div className="col">
      {reply.picks?.[v] && routeTitle(reply.picks[v]) && <span className="pick">Argues for <b>{routeTitle(reply.picks[v])}</b></span>}
      {indexed.filter(({ line }) => line.voice === v).map(({ line, i }) => <Line key={i} line={line} speaking={i === speakingIndex} />)}
    </div>
  );
  return (
    <>
      <div className="split-cols">{side("sonar")}{side("tide")}</div>
      {last && (
        <p className="handback" style={{ margin: 0, fontWeight: speakingIndex === reply.lines.length - 1 ? 600 : 400 }}>
          {last.text}
        </p>
      )}
    </>
  );
}
