"use client";

import { useEffect, useState } from "react";
import { ReportSkeleton } from "./ReportSkeleton";

/**
 * Altura do rodapé do Power BI escondida por crop visual:
 * o container usa overflow-hidden e o iframe recebe
 * height: calc(100% + 72px), empurrando o rodapé para fora
 * da área visível sem removê-lo de fato.
 */
const POWER_BI_FOOTER_CROP_PX = 72;

interface PowerBIFrameProps {
  src: string;
  title?: string;
  onLoaded?: () => void;
}

export function PowerBIFrame({ src, title, onLoaded }: PowerBIFrameProps) {
  const [loaded, setLoaded] = useState(false);

  // Ao trocar apenas o src (sem remontar o componente), volta ao skeleton.
  useEffect(() => {
    setLoaded(false);
  }, [src]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      {!loaded && (
        <div className="absolute inset-0 z-10 bg-background">
          <ReportSkeleton />
        </div>
      )}
      <iframe
        src={src}
        title={title ?? "Dashboard Power BI"}
        loading="eager"
        allowFullScreen
        onLoad={() => {
          setLoaded(true);
          onLoaded?.();
        }}
        className="absolute inset-x-0 top-0 w-full border-0"
        style={{ height: `calc(100% + ${POWER_BI_FOOTER_CROP_PX}px)` }}
      />
    </div>
  );
}
