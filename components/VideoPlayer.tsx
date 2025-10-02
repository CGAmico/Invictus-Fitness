'use client';
import React from 'react';

type Props = {
  url: string;
  className?: string;
};

export default function VideoPlayer({ url, className }: Props) {
  if (!url) return null;

  return (
    <div className={className}>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="underline text-sm"
      >
        Apri video in nuova scheda
      </a>
    </div>
  );
}
