import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Database, Trash2, MessageSquare, AlertCircle, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/primitives';
import TetrisLoading from '@/components/TetrisLoading';
import { usePlaygrounds } from '@/hooks/usePlaygrounds';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const { playgrounds, loading, error, remove } = usePlaygrounds();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    e.preventDefault();
    setDeletingId(id);
    try {
      await remove(id);
      toast('Playground deleted', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <TetrisLoading size="md" speed="fast" loadingText="Loading playgrounds..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-mono font-bold">Playgrounds</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            {playgrounds.length} database{playgrounds.length !== 1 ? 's' : ''} connected
          </p>
        </div>
        <Button asChild size="sm" className="gap-2">
          <Link to="/new">
            <Plus className="h-4 w-4" />
            New Playground
          </Link>
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm font-mono mb-6">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Empty state */}
      {!error && playgrounds.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 gap-6"
        >
          <div className="grid-bg h-48 w-full rounded-xl border border-border flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <Terminal className="h-10 w-10 text-primary/40" />
              <p className="font-mono text-muted-foreground text-sm">No playgrounds yet</p>
              <p className="font-mono text-muted-foreground/60 text-xs">Connect a database to get started</p>
            </div>
          </div>
          <Button asChild className="gap-2">
            <Link to="/new">
              <Plus className="h-4 w-4" />
              Create your first playground
            </Link>
          </Button>
        </motion.div>
      )}

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {playgrounds.map((pg, i) => (
            <motion.div
              key={pg.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.05 }}
              layout
            >
              <Card
                className="group hover:border-primary/30 transition-all cursor-pointer hover:shadow-[0_0_20px_hsl(var(--primary)/0.05)]"
                onClick={() => navigate(`/playground/${pg.id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Database className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-mono font-semibold text-sm truncate">{pg.name}</h3>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {formatDate(pg.created_at)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, pg.id)}
                      disabled={deletingId === pg.id}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    >
                      {deletingId === pg.id
                        ? <span className="text-xs font-mono">...</span>
                        : <Trash2 className="h-3.5 w-3.5" />
                      }
                    </button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                      <span className="h-1.5 w-1.5 bg-primary rounded-full" />
                      Ready
                    </span>
                    <span className="flex items-center gap-1 text-xs font-mono text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <MessageSquare className="h-3 w-3" />
                      Open chat
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
