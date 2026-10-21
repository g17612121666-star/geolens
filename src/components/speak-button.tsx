import { useEffect, useState } from "react";
import { Volume2, Square } from "lucide-react";
import { cn } from "@/lib/utils";

/** Reads text aloud with the browser's own speech engine (no network), preferring British English. */
export function SpeakButton({
  text,
  label,
  showLabel = false,
  className,
}: {
  text: string;
  label: string;
  showLabel?: boolean;
  className?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window)
        window.speechSynthesis.cancel();
    };
  }, []);
  if (!supported) return null;
  function toggle() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-GB";
    const voice =
      synth.getVoices().find((v) => v.lang === "en-GB") ??
      synth.getVoices().find((v) => v.lang.startsWith("en"));
    if (voice) u.voice = voice;
    u.rate = 0.95;
    u.onend = u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(u);
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={speaking ? "Stop reading" : label}
      aria-pressed={speaking}
      className={cn(
        "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full text-ice hover:text-chalk",
        showLabel && "border border-white/15 px-4 text-sm",
        className,
      )}
    >
      {speaking ? (
        <Square className="size-4" aria-hidden />
      ) : (
        <Volume2 className="size-4" aria-hidden />
      )}
      {showLabel && <span>{speaking ? "Stop" : "Listen"}</span>}
    </button>
  );
}
