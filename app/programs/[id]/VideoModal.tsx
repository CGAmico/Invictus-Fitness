'use client';

import React from 'react';
import { btnGhost } from '@/components/ui';

// --- Helpers --------------------------------------------------------------
function getYouTubeId(raw: string): string | null {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, '');
    // youtu.be/<id>
    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      return id || null;
    }
    // youtube.com, m.youtube.com
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      const path = u.pathname;
      // /watch?v=<id>
      const v = u.searchParams.get('v');
      if (v) return v;
      // /embed/<id>
      const em = path.match(/^\/embed\/([^/?#]+)/)?.[1];
      if (em) return em;
      // /shorts/<id>
      const sh = path.match(/^\/shorts\/([^/?#]+)/)?.[1];
      if (sh) return sh;
    }
  } catch {}
  return null;
}

function getVimeoId(raw: string): string | null {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      // vimeo.com/123456789  | player.vimeo.com/video/123456789
      const parts = u.pathname.split('/').filter(Boolean);
      const last = parts[parts.length - 1] || '';
      return /^\d+$/.test(last) ? last : null;
    }
  } catch {}
  return null;
}

function fileKind(raw: string): 'mp4' | 'webm' | null {
  try {
    const u = new URL(raw);
    const base = u.pathname.toLowerCase();
    if (base.endsWith('.mp4')) return 'mp4';
    if (base.endsWith('.webm')) return 'webm';
  } catch {}
  // fallback banale se non è URL assoluto
  const path = raw.split('?')[0].toLowerCase();
  if (path.endsWith('.mp4')) return 'mp4';
  if (path.endsWith('.webm')) return 'webm';
  return null;
}

// --- Component ------------------------------------------------------------
export default function VideoModal({
  url,
  open,
  onClose,
}: {
  url: string | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  const u = (url ?? '').trim();
  const ytId = getYouTubeId(u);
  const vmId = getVimeoId(u);
  const kind = fileKind(u);

  // Embed URLs (evitiamo m.youtube.com e usiamo nocookie)
  const youTubeEmbed = ytId
    ? `https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1&playsinline=1`
    : null;
  const vimeoEmbed = vmId ? `https://player.vimeo.com/video/${vmId}` : null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Video esecuzione"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800">
          <div className="text-sm opacity-80">Video esecuzione</div>
          <button className={btnGhost} onClick={onClose} aria-label="Chiudi modale">
            Chiudi
          </button>
        </div>

        <div className="p-0">
          {youTubeEmbed ? (
            <div className="aspect-video w-full">
              <iframe
                src={youTubeEmbed}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="origin-when-cross-origin"
              />
            </div>
          ) : vimeoEmbed ? (
            <div className="aspect-video w-full">
              <iframe
                src={vimeoEmbed}
                className="w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : kind ? (
            <video className="w-full" controls playsInline preload="metadata">
              <source src={u} type={kind === 'mp4' ? 'video/mp4' : 'video/webm'} />
              Il tuo browser non supporta il tag video.
            </video>
          ) : u ? (
            <div className="p-4 text-sm">
              URL non riconosciuto per l’embed.{' '}
              <a className="underline" href={u} target="_blank" rel="noreferrer">
                Apri in nuova scheda
              </a>.
            </div>
          ) : (
            <div className="p-4 text-sm">Nessun video disponibile.</div>
          )}
        </div>
      </div>
    </div>
  );
}
