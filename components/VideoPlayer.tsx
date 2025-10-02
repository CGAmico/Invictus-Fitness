'use client';

import React from 'react';

type Props = {
  url: string;
  className?: string;
  title?: string;
  onError?: () => void;
};

/** Riconoscitori molto semplici */
const isYouTube = (u: string) => /youtu\.?be/.test(u);
const isVimeo = (u: string) => /vimeo\.com/.test(u);
const isMp4 = (u: string) => /\.mp4($|\?)/i.test(u);

const toYouTubeEmbed = (u: string) => {
  // supporta youtu.be/<id> e youtube.com/watch?v=<id>
  const short = u.match(/youtu\.be\/([^?&]+)/)?.[1];
  const qs = u.match(/[?&]v=([^?&]+)/)?.[1];
  const id = short || qs;
  return id ? `https://www.youtube.com/embed/${id}` : null;
};

const toVimeoEmbed = (u: string) => {
  const id = u.match(/vimeo\.com\/(\d+)/)?.[1];
  return id ? `https://player.vimeo.com/video/${id}` : null;
};

export default function VideoPlayer({ url, className, title = 'Video', onError }: Props) {
  if (!url) return null;

  // YouTube/Vimeo -> iframe
  if (isYouTube(url)) {
    const src = toYouTubeEmbed(url);
    if (!src) return (
      <div className={className}>
        <p className="text-sm opacity-80">URL YouTube non riconosciuto. <a href={url} target="_blank" rel="noreferrer" className="underline">Apri in nuova scheda</a></p>
      </div>
    );
    return (
      <div className={className}>
        <iframe
          title={title}
          src={src}
          width="100%"
          height="315"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="rounded w-full"
        />
      </div>
    );
  }

  if (isVimeo(url)) {
    const src = toVimeoEmbed(url);
    if (!src) return (
      <div className={className}>
        <p className="text-sm opacity-80">URL Vimeo non riconosciuto. <a href={url} target="_blank" rel="noreferrer" className="underline">Apri in nuova scheda</a></p>
      </div>
    );
    return (
      <div className={className}>
        <iframe
          title={title}
          src={src}
          width="100%"
          height="315"
          allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
          allowFullScreen
          className="rounded w-full"
        />
      </div>
    );
  }

  // File locale o remoto .mp4 -> <video>
  if (isMp4(url)) {
    return (
      <div className={className}>
        <video
          controls
          className="rounded w-full"
          onError={onError}
        >
          <source src={url} type="video/mp4" />
          Il tuo browser non supporta il tag video.
        </video>
      </div>
    );
  }

  // Fallback: link esterno
  return (
    <div className={className}>
      <p className="text-sm opacity-80">
        URL non riconosciuto per embed.{' '}
        <a href={url} target="_blank" rel="noreferrer" className="underline">Apri in nuova scheda</a>
      </p>
    </div>
  );
}
