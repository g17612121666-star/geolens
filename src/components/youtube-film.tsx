import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { ProgressFrame } from "@/components/progress-media";
import type { LabVideo } from "@/lib/lab-videos";

/**
 * A YouTube film that loads nothing from YouTube until a reader presses play. Until then it is a
 * plain panel with a play button, so a lab page makes no request to Google and downloads none of
 * the player's code; pressing play swaps in the privacy-enhanced player (youtube-nocookie.com),
 * which starts at once.
 */
export function YouTubeFilm({ video }: { video: LabVideo }) {
  const [playing, setPlaying] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  // Keep keyboard focus on the film when the button it replaces goes away.
  useEffect(() => {
    if (playing) box.current?.querySelector("iframe")?.focus();
  }, [playing]);
  return (
    <div ref={box}>
      {playing ? (
        <ProgressFrame
          title={video.title}
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1`}
          className="aspect-video w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loadingDetail="The film starts when the player is ready."
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play the film “${video.title}”`}
          className="group flex aspect-video w-full flex-col items-center justify-center gap-3 bg-[#0f2019] p-4 text-center"
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-[#eef4ef] text-[#0f2019] transition-colors group-hover:bg-[#62e2c9]">
            <Play className="ml-0.5 size-6 fill-current" aria-hidden="true" />
          </span>
          <span className="text-sm text-[#eef4ef]">Play film</span>
          <span className="text-xs text-[#a7b9b1]">The player loads from YouTube.</span>
        </button>
      )}
    </div>
  );
}
