import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { checkSiteExists } from '../lib/firestore';
import SiteViewer from '../components/SiteViewer';
import NotFound from '../components/NotFound';
import { Loader2 } from 'lucide-react';

export default function ViewPage() {
  const { siteId } = useParams();
  const [state, setState] = useState<'loading' | 'found' | 'notfound'>('loading');

  useEffect(() => {
    checkSiteExists(siteId!).then((exists) => {
      setState(exists ? 'found' : 'notfound');
    });
  }, [siteId]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state === 'notfound') return <NotFound />;

  return <SiteViewer siteId={siteId!} />;
}
