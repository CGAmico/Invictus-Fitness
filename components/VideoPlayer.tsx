'use client';

import { useEffect } from 'react';

export default function VideoPlayer({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  // chiudi con ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // very small helper: se è YouTube, embeddiamo in iframe
  const toYouTubeEmbed = (u: string): string | null => {
    try {
      const url = new URL(u);
      if (url.hostname.includes('youtube.com')) {
        const id = url.searchParams.get('v');
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (url.hostname === 'youtu.be') {
        const id = url.pathname.slice(1);
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      return null;
    } catch {
      return null;
    }
  };

  const yt = toYouTubeEmbed(url);
  const isVideoFile = /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-3xl aspect-video bg-black rounded-lg overflow-hidden border border-neutral-700">
        {/* pulsante chiudi */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 px-3 py-1.5 text-sm rounded border border-neutral-600 bg-black/60 hover:bg-neutral-800"
        >
          Chiudi ✕
        </button>

        {/* player */}
        {yt ? (
          <iframe
            className="w-full h-full"
            src={yt}
            title="Video esercizio"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : isVideoFile ? (
          <video className="w-full h-full" src={url} controls preload="metadata
