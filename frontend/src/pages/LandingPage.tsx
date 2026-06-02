import { motion } from 'framer-motion';
import { Github, Terminal, Zap, Database, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authService } from '@/services/api';

const features = [
  {
    icon: Database,
    title: 'Connect Any Database',
    desc: 'PostgreSQL, MySQL, SQLite — just paste your connection URL.',
  },
  {
    icon: Zap,
    title: 'Ask in Plain English',
    desc: 'No SQL needed. Ask questions like you talk to a colleague.',
  },
  {
    icon: FileText,
    title: 'Upload Context Docs',
    desc: 'PDFs and text files help the agent understand your domain.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 h-14 flex items-center">
        <div className="max-w-7xl mx-auto w-full flex items-center gap-2">
          <Terminal className="h-5 w-5 text-primary" />
          <span className="font-mono font-bold text-sm">
            company<span className="text-primary">Brain</span>
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* Terminal badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 border border-primary/30 bg-primary/5 rounded-full px-4 py-1.5"
          >
            <span className="h-1.5 w-1.5 bg-primary rounded-full animate-pulse" />
            <span className="text-xs font-mono text-primary">AI-powered SQL agent</span>
          </motion.div>

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-4xl sm:text-6xl font-mono font-bold leading-tight">
              Talk to your{' '}
              <span className="text-primary text-glow">database</span>
              <br />
              in plain English
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground text-lg max-w-xl mx-auto"
          >
            CompanyBrain connects to your SQL database and lets you ask questions
            naturally. No SQL required — just ask.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              size="lg"
              className="gap-2 text-base px-8"
              onClick={() => window.location.href = authService.getLoginUrl()}
            >
              <Github className="h-5 w-5" />
              Continue with GitHub
            </Button>
          </motion.div>

          {/* Terminal preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12 text-left rounded-lg border border-border bg-card overflow-hidden"
          >
            <div className="border-b border-border px-4 py-2 flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-primary/70" />
              <span className="ml-2 text-xs font-mono text-muted-foreground">companyBrain — bash</span>
            </div>
            <div className="p-4 font-mono text-sm space-y-2">
              <div className="flex gap-2">
                <span className="text-primary">$</span>
                <span className="text-muted-foreground">companyBrain ask</span>
              </div>
              <div className="flex gap-2 ml-2">
                <span className="text-muted-foreground/50">›</span>
                <span className="text-foreground">"Show me top 10 customers by revenue this month"</span>
              </div>
              <div className="mt-3 text-primary/80 text-xs leading-relaxed">
                {'> Running SELECT query on customers table...'}<br />
                {'> Joining with orders and products...'}<br />
                {'> ✓ Found 10 results in 0.24s'}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border px-6 py-16">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="p-5 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors group"
            >
              <Icon className="h-5 w-5 text-primary mb-3 group-hover:text-glow transition-all" />
              <h3 className="font-mono font-semibold text-sm mb-1">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
