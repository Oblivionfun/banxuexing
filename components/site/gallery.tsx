"use client";

import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Download from "yet-another-react-lightbox/plugins/download";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";

export type GalleryImage = { id: string; name: string; width: number | null; height: number | null };

export function Gallery({ images, numbered = true }: { images: GalleryImage[]; numbered?: boolean }) {
  const [index, setIndex] = useState(-1);

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {images.map((image, position) => (
          <li key={image.id}>
            <button
              type="button"
              onClick={() => setIndex(position)}
              className="group relative block aspect-[3/4] w-full overflow-hidden rounded-md border border-rule bg-paper"
              aria-label={`查看第 ${position + 1} 张：${image.name}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/files/${image.id}?v=thumb`}
                alt=""
                loading="lazy"
                decoding="async"
                className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
              />
              {numbered ? (
                <span className="tabular absolute bottom-1.5 left-1.5 rounded bg-ink/65 px-1.5 py-0.5 text-xs text-white">
                  {position + 1}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      <Lightbox
        open={index >= 0}
        index={Math.max(index, 0)}
        close={() => setIndex(-1)}
        plugins={[Zoom, Counter, Download]}
        zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
        carousel={{ finite: images.length <= 1 }}
        controller={{ closeOnBackdropClick: true, closeOnPullDown: true }}
        labels={{
          Previous: "上一张",
          Next: "下一张",
          Close: "关闭",
          Download: "下载原图",
          "Zoom in": "放大",
          "Zoom out": "缩小",
        }}
        slides={images.map((image) => ({
          src: `/api/files/${image.id}?v=preview`,
          width: image.width ?? undefined,
          height: image.height ?? undefined,
          alt: image.name,
          download: { url: `/api/files/${image.id}?dl=1`, filename: image.name },
        }))}
      />
    </>
  );
}
