'use client';

import React from 'react';

type Props = {
  url: string;
  open: boolean;
  onClose: () => void;
  title?: string;
};

/** Riconosce YT/Vimeo/mp4 e restituisce il tipo di player e la src da usare */
function resolvePlayer(url: string): { kind: 'iframe' | 'video'; src: string } | null {
  const u = url.trim();

  // YouTube
  const yt =
    /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/)([\w-]{6,})/i.exec(
      u
    );
  if (yt?.[1]) {
    return { kind: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}` };
  }

  // Vimeo
  const vm = /^(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/i.exec(u);
  if (vm?.[1]) {
    return { kind: 'iframe', src: `https://player.vimeo.com/video/${vm[1]}` };
  }

  // MP4 diretto
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(u)) {
    return { kind: 'video', src: u };
  }

  return null;
}

export default function VideoPlayer({ url, open, onClose, title }: Props) {
  if (!open) return null;

  const resolved = resolvePlayer(url);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-lg border border-neutral-700 bg-black p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">{title ?? 'Video esecuzione'}</h3>
          <button
            className="rounded border border-neutral-600 px-3 py-1 hover:bg-neutral-800"
            onClick={onClose}
          >
            Chiudi
          </button>
        </div>

        {!resolved ? (
          <div className="rounded border border-neutral-700 p-4 text-sm">
            URL non riconosciuto per embed.
            {url ? (
              <>
                {' '}
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  Apri in nuova scheda
                </a>
                .
              </>
            ) : null}
          </div>
        ) : resolved.kind === 'iframe' ? (
          <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
            <iframe
              title={title ?? 'Video'}
              src={resolved.src}
              className="absolute left-0 top-0 h-full w-full rounded"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <video
            className="h-auto w-full rounded"
            controls
            playsInline
            preload="metadata"
            src={resolved.src}
          />
        )}
      </div>
    </div>
  );
}
