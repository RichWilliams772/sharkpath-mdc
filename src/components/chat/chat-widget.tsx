"use client";

import { AnimatePresence, motion } from "motion/react";
import { AudioLines, Mic, MicOff, PhoneOff, Route, Send, Sparkles, Square, Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { SharkFinIcon } from "@/components/brand/shark";
import { SourceChip } from "@/components/source-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { streamChat } from "@/lib/api/counselor";
import { cn } from "@/lib/utils";
import { useSpeechInput, useSpeechOutput, type VoiceError } from "@/lib/voice";
import { useChatStore } from "@/store/chat-store";
import { usePlanStore } from "@/store/plan-store";
import type { ChatMessage } from "@/types/roadmap";

let nextId = 0;
const newId = () => `m${++nextId}`;

export function ChatWidget() {
  const t = useTranslations("chat");
  const tv = useTranslations("chat.voice");
  const open = useChatStore((s) => s.open);
  const setOpen = useChatStore((s) => s.setOpen);
  const pending = useChatStore((s) => s.pending);
  const takePending = useChatStore((s) => s.takePending);
  const inputs = usePlanStore((s) => s.inputs);
  const locale = usePlanStore((s) => s.locale);
  const name = usePlanStore((s) => s.profile?.name);
  const setCareer = usePlanStore((s) => s.setCareer);
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  // ── Voice ──
  const ear = useSpeechInput(locale);
  const mouth = useSpeechOutput(locale);
  const { listen, cancel: cancelListening } = ear;
  const { speak, stop: stopSpeaking } = mouth;
  const [voiceMode, setVoiceMode] = useState(false);
  const [voicePaused, setVoicePaused] = useState(false);
  const voiceOn = useRef(false);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, ear.interim]);

  /** Sends a question; resolves with Finn's final answer text. */
  const send = useCallback(
    async (text: string): Promise<string> => {
      const question = text.trim();
      if (!question || busy) return "";
      const user: ChatMessage = { id: newId(), role: "user", content: question };
      const replyId = newId();
      const history = [...messages, user];
      setMessages([...history, { id: replyId, role: "assistant", content: "" }]);
      setDraft("");
      setBusy(true);
      try {
        const final = await streamChat(history, { inputs, locale, studentName: name }, (partial) =>
          setMessages((m) => m.map((msg) => (msg.id === replyId ? { ...msg, content: partial } : msg))),
        );
        setMessages((m) => m.map((msg) => (msg.id === replyId ? { ...msg, ...final } : msg)));
        return final.content;
      } catch {
        const lost = t("lostSignal");
        setMessages((m) => m.map((msg) => (msg.id === replyId ? { ...msg, content: lost } : msg)));
        return lost;
      } finally {
        setBusy(false);
      }
    },
    [busy, messages, inputs, locale, name, t],
  );

  // The voice loop runs across many renders, so it always calls the latest `send`.
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  /** Hands-free conversation: listen → answer → speak → listen again. */
  const converse = useCallback(async () => {
    setVoicePaused(false);
    while (voiceOn.current) {
      const heard = await listen();
      if (!voiceOn.current) break;
      if (!heard) {
        // Silence or an error: pause until the student taps the orb.
        setVoicePaused(true);
        break;
      }
      const reply = await sendRef.current(heard);
      if (!voiceOn.current) break;
      await speak(reply);
    }
  }, [listen, speak]);

  function startVoice() {
    voiceOn.current = true;
    setVoiceMode(true);
    void converse();
  }

  function endVoice() {
    voiceOn.current = false;
    setVoiceMode(false);
    setVoicePaused(false);
    ear.cancel();
    mouth.stop();
  }

  /** The orb: interrupt Finn, finish speaking early, or resume after a pause. */
  function tapOrb() {
    if (mouth.speaking) mouth.stop();
    else if (ear.listening) ear.stop();
    else if (voicePaused && !busy) void converse();
  }

  /** Push-to-talk dictation in the regular text box. */
  async function dictate() {
    if (ear.listening) return ear.stop();
    mouth.stop();
    const heard = await ear.listen();
    if (heard) void send(heard);
  }

  // Closing the panel ends any voice activity.
  useEffect(() => {
    if (open) return;
    voiceOn.current = false;
    cancelListening();
    stopSpeaking();
  }, [open, cancelListening, stopSpeaking]);

  // Questions sent from other screens ("Ask Finn about it").
  useEffect(() => {
    if (!open || !pending || busy) return;
    const id = setTimeout(() => {
      const q = takePending();
      if (q) void send(q);
    }, 0);
    return () => clearTimeout(id);
  }, [open, pending, busy, takePending, send]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(draft);
  }

  const suggestions = [t("suggestions.one"), t("suggestions.two"), t("suggestions.three")];
  const errorText = (e: VoiceError | null) => (e && e !== "no-speech" ? tv(`errors.${e}`) : null);
  const phase = mouth.speaking === "reply" ? "speaking" : busy ? "thinking" : ear.listening ? "listening" : "paused";

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed right-4 bottom-4 z-40"
          >
            <Button size="lg" onClick={() => setOpen(true)} className="glow h-12 rounded-full px-5 shadow-lg">
              <SharkFinIcon className="size-5" />
              {t("open")}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet
        open={open}
        onOpenChange={(o) => {
          if (!o) endVoice();
          setOpen(o);
        }}
      >
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border">
            <SheetTitle className="flex items-center gap-2">
              <SharkFinIcon className="size-5 text-primary" />
              {t("title")}
            </SheetTitle>
            <SheetDescription>{t("subtitle")}</SheetDescription>
            {!voiceMode && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2 self-start border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
                onClick={startVoice}
                disabled={!ear.supported}
                title={ear.supported ? undefined : tv("unsupported")}
              >
                <AudioLines /> {tv("talk")}
              </Button>
            )}
          </SheetHeader>

          <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
            <Bubble role="assistant">{t("greeting", { name: name ? `, ${name}` : "" })}</Bubble>
            {messages.map((m) => (
              <div key={m.id} className="space-y-2">
                <Bubble role={m.role}>
                  {m.content || <span className="animate-pulse text-muted-foreground">…</span>}
                </Bubble>
                {m.role === "assistant" && m.content && mouth.supported && !voiceMode && (
                  <Button
                    size="xs"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={() => (mouth.speaking === m.id ? mouth.stop() : void mouth.speak(m.content, m.id))}
                    aria-label={mouth.speaking === m.id ? tv("stopReading") : tv("readAloud")}
                  >
                    {mouth.speaking === m.id ? <Square /> : <Volume2 />}
                    {mouth.speaking === m.id ? tv("stopReading") : tv("readAloud")}
                  </Button>
                )}
                {m.extended && (
                  <Badge variant="outline" className="border-sand/40 text-sand">
                    <Sparkles /> {t("extended")}
                  </Badge>
                )}
                {m.suggestedCareer && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setCareer(m.suggestedCareer!);
                      setOpen(false);
                      router.push("/plan");
                    }}
                  >
                    <Route /> {t("planThis", { career: m.suggestedCareer.title })}
                  </Button>
                )}
                {m.facts && m.facts.length > 0 && (
                  <div className="glass rounded-xl p-3 text-xs">
                    <p className="mb-2 font-semibold text-muted-foreground">{t("facts")}</p>
                    <ul className="space-y-1.5">
                      {m.facts.map((f) => (
                        <li key={f.label} className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-muted-foreground">{f.label}</span>
                          <span className="flex items-center gap-1.5 font-semibold">
                            {f.value} <SourceChip source={f.source} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
            {/* Live transcript while the student is talking */}
            {ear.interim && (
              <Bubble role="user">
                <span className="opacity-70">{ear.interim}…</span>
              </Bubble>
            )}
            {messages.length === 0 && !voiceMode && (
              <div className="flex flex-wrap gap-2 pt-2">
                {suggestions.map((s) => (
                  <Button key={s} variant="outline" size="sm" onClick={() => send(s)} className="h-auto py-1.5 whitespace-normal text-left">
                    {s}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {voiceMode ? (
            <VoicePanel phase={phase} error={errorText(ear.error)} onOrb={tapOrb} onEnd={endVoice} />
          ) : (
            <>
              <form onSubmit={onSubmit} className="flex gap-2 border-t border-border p-3">
                <Input
                  value={ear.listening ? ear.interim : draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={ear.listening ? tv("listening") : t("placeholder")}
                  aria-label={t("placeholder")}
                  className="h-10"
                  readOnly={ear.listening}
                />
                <Button
                  type="button"
                  size="icon-lg"
                  variant={ear.listening ? "destructive" : "outline"}
                  onClick={dictate}
                  disabled={!ear.supported || busy}
                  title={ear.supported ? undefined : tv("unsupported")}
                  aria-label={ear.listening ? tv("stopMic") : tv("mic")}
                  aria-pressed={ear.listening}
                  className={cn(ear.listening && "animate-pulse")}
                >
                  {ear.supported ? <Mic /> : <MicOff />}
                </Button>
                <Button type="submit" size="icon-lg" disabled={busy || !draft.trim() || ear.listening} aria-label={t("send")}>
                  <Send />
                </Button>
              </form>
              {errorText(ear.error) && <p className="px-3 pb-1 text-xs text-coral">{errorText(ear.error)}</p>}
              {!ear.supported && <p className="px-3 pb-1 text-xs text-muted-foreground">{tv("unsupported")}</p>}
            </>
          )}
          <p className="px-3 pb-3 text-[11px] text-muted-foreground">{t("mock")}</p>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Hands-free voice controls: a glowing orb that shows who's talking. */
function VoicePanel({
  phase,
  error,
  onOrb,
  onEnd,
}: {
  phase: "listening" | "thinking" | "speaking" | "paused";
  error: string | null;
  onOrb: () => void;
  onEnd: () => void;
}) {
  const tv = useTranslations("chat.voice");
  return (
    <div className="flex flex-col items-center gap-3 border-t border-border px-4 pt-5 pb-3">
      <button
        type="button"
        onClick={onOrb}
        aria-label={tv(`orb.${phase}`)}
        className={cn(
          "relative flex size-20 items-center justify-center rounded-full border transition-colors",
          phase === "speaking" ? "border-primary bg-primary/20" : phase === "listening" ? "border-coral bg-coral/15" : "border-border bg-card/60",
        )}
      >
        {/* Pulsing rings while listening / speaking */}
        {(phase === "listening" || phase === "speaking") && (
          <>
            {[0, 0.6].map((delay) => (
              <motion.span
                key={delay}
                aria-hidden
                className={cn("absolute inset-0 rounded-full border-2", phase === "listening" ? "border-coral/60" : "border-primary/60")}
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 1.4, repeat: Infinity, delay, ease: "easeOut" }}
              />
            ))}
          </>
        )}
        {phase === "speaking" ? (
          <span className="flex h-7 items-center gap-1" aria-hidden>
            {[0, 0.15, 0.3, 0.45].map((d) => (
              <motion.span
                key={d}
                className="w-1.5 rounded-full bg-primary"
                animate={{ height: [8, 26, 12, 22, 8] }}
                transition={{ duration: 1, repeat: Infinity, delay: d }}
              />
            ))}
          </span>
        ) : phase === "thinking" ? (
          <SharkFinIcon className="size-8 animate-pulse text-primary" />
        ) : (
          <Mic className={cn("size-8", phase === "listening" ? "text-coral" : "text-muted-foreground")} />
        )}
      </button>
      <p className="min-h-5 text-center text-sm font-medium" aria-live="polite">
        {error ?? tv(`status.${phase}`)}
      </p>
      <Button size="sm" variant="ghost" onClick={onEnd} className="text-muted-foreground">
        <PhoneOff /> {tv("end")}
      </Button>
    </div>
  );
}

function Bubble({ role, children }: { role: ChatMessage["role"]; children: React.ReactNode }) {
  return (
    <div className={cn("flex", role === "user" && "justify-end")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
          role === "user" ? "rounded-br-sm bg-primary text-primary-foreground" : "glass rounded-bl-sm",
        )}
      >
        {children}
      </div>
    </div>
  );
}
