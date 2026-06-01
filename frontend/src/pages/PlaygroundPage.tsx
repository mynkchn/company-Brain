import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, ArrowLeft, AlertCircle, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TetrisLoading from '@/components/TetrisLoading';
import ChatInterface from '@/components/ChatInterface';
import IngestPanel from '@/components/IngestPanel';
import { playgroundService } from '@/services/api';
import type { PlaygroundDetail } from '@/types';

export default function PlaygroundPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [playground, setPlayground] = useState<PlaygroundDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showIngest, setShowIngest] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    playgroundService
      .get(Number(id))
      .then(setPlayground)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <TetrisLoading size="sm" speed="fast" loadingText="Connecting to database..." />
      </div>
    );
  }

  if (error || !playground) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="flex items-center justify-center gap-3 text-destructive font-mono text-sm">
          <AlertCircle className="h-5 w-5" />
          {error ?? 'Playground not found'}
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Sub-header */}
      <div className="border-b border-border px-4 py-2 flex items-center justify-between bg-background/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <span className="font-mono font-semibold text-sm">{playground.name}</span>
            <span className="ml-2 text-xs font-mono text-muted-foreground">SQL Agent</span>
          </div>
          <span className="flex items-center gap-1 text-xs font-mono text-primary">
            <span className="h-1.5 w-1.5 bg-primary rounded-full animate-pulse" />
            Live
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={() => setShowIngest((v) => !v)}
          >
            {showIngest ? (
              <><SlidersHorizontal className="h-3.5 w-3.5" />Chat</>
            ) : (
              <><Upload className="h-3.5 w-3.5" />Ingest Docs</>
            )}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat */}
        <motion.div
          className="flex-1 overflow-hidden"
          animate={{ width: showIngest ? '60%' : '100%' }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        >
          <ChatInterface
            playgroundId={playground.id}
            playgroundName={playground.name}
            onIngestClick={() => setShowIngest(true)}
          />
        </motion.div>

        {/* Ingest panel */}
        <AnimatePresence>
          {showIngest && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '40%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className="border-l border-border bg-card overflow-hidden"
            >
              <IngestPanel
                playgroundId={playground.id}
                initialContext={playground.context}
                onClose={() => setShowIngest(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
