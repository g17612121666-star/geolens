import { useEffect, useState } from "react";
import { Volume2, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { translate } from "@/lib/i18n";

/** Reads text aloud with the browser's own speech engine (no network), in American English or US Spanish. */
export function SpeakButton({
  text,
  label,
  showLabel = false,
  className,
  lang = "en",
}: {
  text: string;
  label: string;
  showLabel?: boolean;
  className?: string;
  /** The language of `text`, which picks the voice and this button's own words. */
  lang?: "en" | "es";
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
    // American voices first, to match the site's American English and US Spanish.
    const voices = synth.getVoices(),
      prefer = lang === "es" ? ["es-US", "es-MX"] : ["en-US"];
    u.lang = prefer[0];
    const voice =
      prefer.map((code) => voices.find((v) => v.lang === code)).find(Boolean) ??
      voices.find((v) => v.lang.startsWith(lang));
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
      aria-label={speaking ? translate(lang, "Stop reading") : label}
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
      {showLabel && <span>{translate(lang, speaking ? "Stop" : "Listen")}</span>}
    </button>
  );
}
