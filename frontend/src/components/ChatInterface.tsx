import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SendIcon, LoaderIcon, Terminal, Copy, Check, Paperclip } from 'lucide-react';
import { queryService } from '@/services/api';
import { useToast } from '@/components/ui/toast';
import { cn, generateId } from '@/lib/utils';
import type { ChatMessage } from '@/types';

interface ChatInterfaceProps {
  playgroundId: number;
  playgroundName: string;
  onIngestClick?: () => void;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 ml-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 bg-primary rounded-full"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-foreground transition-all"
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

const EXAMPLE_QUESTIONS = [
  'What tables are in this database?',
  'Show me the top 10 rows from the largest table',
  'How many records are there in total?',
  'What are the column names and types?',
];

export default function ChatInterface({ playgroundId, playgroundName, onIngestClick }: ChatInterfaceProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [value, setValue] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);


  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '60px';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim()) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: question.trim(),
      timestamp: new Date(),
    };
    const loadingMsg: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setIsQuerying(true);
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = '60px';
    setMessages((prev) => [...prev, userMsg, loadingMsg]);

    try {
      const res = await queryService.ask({ question: question.trim(), playground_id: playgroundId });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? { ...m, content: res.answer, isLoading: false }
            : m
        )
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Query failed';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? { ...m, content: `Error: ${errMsg}`, isLoading: false }
            : m
        )
      );
      toast(errMsg, 'error');
    } finally {
      setIsQuerying(false);
    }
  }, [playgroundId, toast]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isQuerying) sendMessage(value);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Welcome */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center min-h-[50vh] gap-6 text-center"
          >
            <div className="relative">
              <div className="h-14 w-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Terminal className="h-7 w-7 text-primary" />
              </div>
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-pulse" />
            </div>
            <div>
              <h2 className="font-mono font-bold text-lg">{playgroundName}</h2>
              <p className="text-sm text-muted-foreground font-mono mt-1">
                Ask anything about your database
              </p>
            </div>
            {/* Example questions */}
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="px-3 py-2 rounded-lg border border-border bg-card hover:border-primary/30 hover:bg-primary/5 text-xs font-mono text-muted-foreground hover:text-foreground transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Messages */}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'flex gap-3 group',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.role === 'assistant' && (
                <div className="h-7 w-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Terminal className="h-3.5 w-3.5 text-primary" />
                </div>
              )}

              <div
                className={cn(
                  'max-w-[80%] rounded-lg px-4 py-3 text-sm font-mono relative',
                  msg.role === 'user'
                    ? 'bg-primary/10 border border-primary/20 text-foreground'
                    : 'bg-card border border-border text-foreground'
                )}
              >
                {msg.isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-xs">Querying database</span>
                    <TypingDots />
                  </div>
                ) : (
                  <>
                    <div className="absolute top-2 right-2">
                      <CopyButton text={msg.content} />
                    </div>
                    <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed pr-6">
                      {msg.content}
                    </pre>
                  </>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="h-7 w-7 rounded-md bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5 text-xs font-mono font-bold text-muted-foreground">
                  U
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input area — inspired by AnimatedAIChat */}
      <div className="border-t border-border bg-background/80 backdrop-blur-sm p-4">
        <div className="relative backdrop-blur-2xl bg-card rounded-xl border border-border shadow-lg">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => { setValue(e.target.value); adjustHeight(); }}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${playgroundName}...`}
            className={cn(
              'w-full bg-transparent px-4 py-3 text-sm font-mono resize-none',
              'placeholder:text-muted-foreground/50',
              'focus:outline-none',
              'min-h-[60px]'
            )}
            style={{ overflow: 'hidden' }}
            disabled={isQuerying}
          />

          <div className="px-3 pb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {onIngestClick && (
                <motion.button
                  type="button"
                  onClick={onIngestClick}
                  whileTap={{ scale: 0.94 }}
                  className="flex items-center gap-1.5 p-2 text-muted-foreground hover:text-foreground rounded-md transition-colors hover:bg-muted text-xs font-mono"
                  title="Upload documents"
                >
                  <Paperclip className="h-4 w-4" />
                  <span className="hidden sm:inline">Ingest docs</span>
                </motion.button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground/50 hidden sm:block">
                {isQuerying ? 'Thinking...' : 'Enter to send'}
              </span>
              <motion.button
                type="button"
                onClick={() => value.trim() && !isQuerying && sendMessage(value)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                disabled={isQuerying || !value.trim()}
                className={cn(
                  'px-3 py-2 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-2',
                  value.trim() && !isQuerying
                    ? 'bg-primary text-primary-foreground shadow-[0_0_10px_hsl(var(--primary)/0.3)]'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {isQuerying
                  ? <LoaderIcon className="h-3.5 w-3.5 animate-spin" />
                  : <SendIcon className="h-3.5 w-3.5" />
                }
                {isQuerying ? 'Running' : 'Send'}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Keyboard hint */}
        <p className="text-center text-xs font-mono text-muted-foreground/40 mt-2">
          Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
