import type { SiteViewerProps } from '@/types';

export default function SiteViewer({ siteId }: SiteViewerProps) {
  const src = `/s/${siteId}/index.html`;

  return (
    <iframe
      src={src}
      title={`site-${siteId}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        border: 'none',
      }}
    />
  );
}
