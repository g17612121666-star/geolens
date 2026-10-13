import sources from '../../scripts/verified-photo-sources.json' with { type: 'json' };

/** Only sources reviewed against their original page and the downloaded image. */
export const VERIFIED_PHOTOS = Object.fromEntries(sources.map(({ id, url: _download, ...record }) => [
  id, { ...record, kind: record.kind as 'photo' | 'scientific-image', src: `/photos/verified/${id}.jpg` },
]));
