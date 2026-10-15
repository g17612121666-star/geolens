import {
  useEffect,
  useRef,
  useState,
  type ImgHTMLAttributes,
  type IframeHTMLAttributes,
} from "react";
import { LoadingProgress } from "./loading-progress";
export function ProgressImage({
  className = "",
  src,
  alt = "",
  loading = "lazy",
  onLoad,
  onError,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const ref = useRef<HTMLImageElement>(null),
    [state, setState] = useState("loading"),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setState(ref.current?.complete ? (ref.current.naturalWidth ? "ready" : "error") : "loading");
  }, [src, attempt]);
  return (
    <span className={"relative block overflow-hidden bg-trench " + className}>
      <img
        key={String(src) + attempt}
        ref={ref}
        {...props}
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        onLoad={(e) => {
          setState("ready");
          onLoad?.(e);
        }}
        onError={(e) => {
          setState("error");
          onError?.(e);
        }}
        className={
          "block size-full transition-opacity duration-300 " +
          (state === "loading" ? "opacity-0 " : "opacity-100 ") +
          (className.includes("object-contain") ? "object-contain" : "object-cover")
        }
      />
      {state === "loading" && (
        <span
          className="pointer-events-none absolute inset-x-2 bottom-2"
          role="progressbar"
          aria-label="Loading photograph"
        >
          <span className="block h-1 overflow-hidden rounded-full bg-black/40">
            <span className="loading-progress-sweep block h-full rounded-full bg-glacier" />
          </span>
        </span>
      )}
      {state === "error" && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-basalt p-4 text-center text-sm text-mist">
          <span>{alt || "Photograph unavailable"}</span>
          <button
            type="button"
            className="min-h-11 rounded-full border border-white/20 px-4 text-chalk"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setState("loading");
              setAttempt((n) => n + 1);
            }}
          >
            Retry photograph
          </button>
        </span>
      )}
    </span>
  );
}
type ProgressFrameProps = IframeHTMLAttributes<HTMLIFrameElement> & {
  loadingLabel?: string;
  loadingDetail?: string;
};
export function ProgressFrame({
  loadingLabel = "Loading video player",
  loadingDetail = "The film stays paused until you play it.",
  ...props
}: ProgressFrameProps) {
  const wrapper = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "slow">("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setState("loading");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = () => {
      if (timer === undefined)
        timer = setTimeout(
          () => setState((current) => (current === "ready" ? current : "slow")),
          15000,
        );
    };
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) start();
    });
    if (wrapper.current) observer.observe(wrapper.current);
    return () => {
      observer.disconnect();
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [props.src, attempt]);
  return (
    <div ref={wrapper} className="relative">
      <iframe
        {...props}
        key={String(props.src) + attempt}
        onLoad={(event) => {
          setState("ready");
          props.onLoad?.(event);
        }}
        onError={(event) => {
          setState("slow");
          props.onError?.(event);
        }}
      />
      {state === "loading" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-basalt/95 p-5">
          <LoadingProgress label={loadingLabel} detail={loadingDetail} />
        </div>
      )}
      {state === "slow" && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-basalt/95 p-5 text-center text-sm text-mist"
          role="status"
        >
          <p>This content is taking longer than expected to load.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="min-h-11 rounded-full border border-white/20 px-4 text-chalk"
            >
              Try again
            </button>
            {props.src && (
              <a
                href={props.src}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center px-3 text-glacier underline"
              >
                Open separately
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
