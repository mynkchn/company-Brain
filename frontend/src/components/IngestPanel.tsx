import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label, Textarea } from '@/components/ui/primitives';
import { ingestService } from '@/services/api';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

interface IngestPanelProps {
  playgroundId: number;
  initialContext?: string;
  onClose?: () => void;
}

function FileIcon({ name }: { name: string }) {
  if (name.endsWith('.pdf')) return <FileText className="h-4 w-4 text-destructive" />;
  return <FileText className="h-4 w-4 text-primary" />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function IngestPanel({ playgroundId, initialContext = '', onClose }: IngestPanelProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [context, setContext] = useState(initialContext);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const allowed = Array.from(incoming).filter((f) =>
      f.name.endsWith('.pdf') || f.name.endsWith('.txt') || f.name.endsWith('.md')
    );
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      return [...prev, ...allowed.filter((f) => !existing.has(f.name))];
    });
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.length && !context.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const result = await ingestService.ingest(playgroundId, context, files);
      setSuccess(true);
      toast(`Ingested ${result.ingested} document${result.ingested !== 1 ? 's' : ''}`, 'success');
      if (result.ingested > 0) setFiles([]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ingest failed';
      setError(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="h-full flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="font-mono font-semibold text-sm">Ingest Documents</h2>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Drop zone */}
        <div>
          <Label className="mb-2 block">Documents (PDF, TXT, MD)</Label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-8 cursor-pointer transition-all',
              dragging
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/40 hover:bg-muted/50'
            )}
          >
            <Upload className={cn('h-6 w-6 transition-colors', dragging ? 'text-primary' : 'text-muted-foreground')} />
            <div className="text-center">
              <p className="text-xs font-mono text-muted-foreground">
                Drag & drop or{' '}
                <span className="text-primary hover:underline">browse files</span>
              </p>
              <p className="text-xs font-mono text-muted-foreground/60 mt-1">
                PDF, TXT, MD — max 10 MB each
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.md"
              className="sr-only"
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>
        </div>

        {/* File list */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              {files.map((file, i) => (
                <motion.div
                  key={file.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 rounded-lg bg-muted border border-border p-3"
                >
                  <div className="h-8 w-8 rounded bg-background border border-border flex items-center justify-center shrink-0">
                    <FileIcon name={file.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-medium truncate">{file.name}</p>
                    <p className="text-xs font-mono text-muted-foreground">{formatBytes(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Context text */}
        <div className="space-y-2">
          <Label htmlFor="context-text">Business context</Label>
          <Textarea
            id="context-text"
            placeholder="Describe domain terms, column meanings, or business rules..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={4}
            className="text-xs"
          />
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-xs font-mono text-destructive p-3 rounded-lg border border-destructive/20 bg-destructive/5"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-xs font-mono text-primary p-3 rounded-lg border border-primary/20 bg-primary/5"
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              Documents ingested successfully!
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2">
          {onClose && (
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            className="flex-1 gap-2"
            disabled={loading || (!files.length && !context.trim())}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Ingesting...</>
            ) : (
              <><Upload className="h-4 w-4" />Ingest</>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
