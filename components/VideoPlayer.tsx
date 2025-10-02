'use client';
import React from 'react';

type Props = { url: string; className?: string };

export default function VideoPlayer({ url, className }: Props) {
  if (!url) return null;

  const isYT = /youtu\.?be/.test(url);
  const isVimeo = /vimeo\.com/.test(url);
  const isMp4 = /\.mp4($|\?)/i.test(url);

  // YouTube
  if (isYT) {
    const mShort = url.match(/youtu\.be\/([^?&]+)/);
    const mQuery = url.match(/[?&]v=([^?&]+)/);
    const id = (mShort && mShort[1]) || (mQuery && mQuery[1]) || '';
    if (id) {
      const src = 'https://www.youtube.com/embed/' + id;
      return (
        <div className={className}>
          <iframe
            title="Video"
            src={src}
            width="100%"
            height={315}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="rounded w-full"
          />
        </div>
      );
    }
  }

  // Vimeo
  if (isVimeo) {
    const m = url.match(/vimeo\.com\/(\d+)/);
    const id = m && m[1] ? m[1] : '';
    if (id) {
      const src = 'https://player.vimeo.com/video/' + id;
      return (
        <div className={className}>
          <iframe
            title="Video"
            src={src}
            width="100%"
            height={315}
            allow="autoplay; fullscreen; picture-in-picture; clipboard-write"
            allowFullScreen
            className="rounded w-full"
          />
        </div>
      );
    }
  }

  // MP4 diretto
  if (isMp4) {
    return (
      <div className={className}>
        <video controls className="rounded w-full">
          <source src={url} type="video/mp4" />
        </video>
      </div>
    );
  }

  // Fallback: link esterno
  return (
    <div className={className}>
      <a href={url} target="_blank" rel="noreferrer" className="underline text-sm">
        Apri video in nuova scheda
      </a>
    </div>
  );
}
