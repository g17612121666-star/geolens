import { LabThumb } from "@/components/lab-thumb";

export function GenericFallback({
  slug,
  title,
  caption,
}: {
  slug: string;
  title: string;
  caption?: string;
}) {
  return (
    <div className="flex size-full flex-col items-center justify-center bg-void p-8">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10">
        <div className="aspect-[16/10] bg-trench">
          <LabThumb slug={slug} />
        </div>
      </div>
      <p className="mt-4 font-mono text-sm text-mist">
        {"2D fallback · "}
        {title} {"· WebGL unavailable"}
      </p>
      {caption && <p className="mt-2 max-w-md text-center text-sm text-chalk/80">{caption}</p>}
    </div>
  );
}
