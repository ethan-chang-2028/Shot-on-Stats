import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Activity,
  Check,
  CircleAlert,
  Database,
  RefreshCw,
  Server,
} from 'lucide-react';
import { useHealthCheck } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Home() {
  const health = useHealthCheck();
  const isDatabaseReachable = Boolean(
    health.data?.db &&
      ['connected', 'ok', 'healthy', 'reachable', 'up', 'ready'].includes(
        health.data.db.toLowerCase(),
      ),
  );
  const isReady = health.isSuccess && isDatabaseReachable;
  const isChecking = health.isLoading || health.isFetching;

  const statusLabel = health.isLoading
    ? 'Checking foundation'
    : health.isError
      ? 'Connection interrupted'
      : isReady
        ? 'Foundation online'
        : 'Database attention needed';

  return (
    <main
      className="status-shell min-h-[100dvh] w-full px-5 py-6 text-foreground sm:px-8 sm:py-8"
      aria-busy={isChecking}
    >
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3" data-testid="brand-shot-on-stats">
            <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-[11px] bg-foreground">
              <span className="absolute h-3.5 w-3.5 rounded-full border-2 border-primary" />
              <span className="absolute h-8 w-px rotate-45 bg-primary/70" />
              <span className="absolute h-8 w-px -rotate-45 bg-primary/70" />
            </span>
            <span className="font-display text-[15px] font-semibold tracking-[-0.02em]">
              Shot on Stats
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <Activity className="h-3.5 w-3.5" strokeWidth={1.8} />
            <span data-testid="text-health-endpoint">GET /api/health</span>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(390px,0.72fr)] lg:gap-20 lg:py-20">
          <section className="reveal-up max-w-2xl">
            <p className="mb-6 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <span className="h-px w-8 bg-primary" />
              Technical foundation
            </p>
            <h1 className="font-display max-w-xl text-[clamp(3.4rem,8vw,7.25rem)] font-semibold leading-[0.88] tracking-[-0.075em] text-foreground">
              The first
              <br />
              <span className="text-primary">signal</span> is clear.
            </h1>
            <p className="mt-8 max-w-md text-[15px] leading-7 text-muted-foreground sm:text-base">
              A quiet starting point for football analytics. Confirm the service
              and its data connection are alive before the product takes the
              field.
            </p>
            <div className="mt-12 flex items-center gap-3">
              <span
                className={`h-2.5 w-2.5 rounded-full ${isChecking ? 'pulse-dot bg-primary' : isReady ? 'bg-primary' : 'bg-destructive'}`}
              />
              <span
                className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground"
                data-testid="status-overall"
              >
                {statusLabel}
              </span>
            </div>
          </section>

          <section className="reveal-up-delay">
            <div className="status-card overflow-hidden rounded-2xl border border-card-border bg-card/85 backdrop-blur-sm">
              <div className="flex items-start justify-between border-b border-border px-6 py-5 sm:px-7">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Readiness check
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em]">
                    System health
                  </h2>
                </div>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${isReady ? 'bg-primary text-primary-foreground' : health.isError ? 'bg-destructive/12 text-destructive' : 'bg-secondary text-muted-foreground'}`}
                  aria-hidden="true"
                >
                  {isReady ? (
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  ) : health.isError ? (
                    <CircleAlert className="h-4 w-4" strokeWidth={2} />
                  ) : (
                    <Activity className="h-4 w-4" strokeWidth={2} />
                  )}
                </div>
              </div>

              <div className="divide-y divide-border px-6 sm:px-7">
                <ConnectionRow
                  icon={<Server className="h-4 w-4" strokeWidth={1.8} />}
                  label="API server"
                  detail="Express health endpoint"
                  state={health.isLoading ? 'loading' : health.isError ? 'error' : 'success'}
                  value={health.isLoading ? 'Checking' : health.isError ? 'Unreachable' : 'Reachable'}
                  testId="status-api-server"
                />
                <ConnectionRow
                  icon={<Database className="h-4 w-4" strokeWidth={1.8} />}
                  label="External MySQL"
                  detail="Database connection"
                  state={health.isLoading ? 'loading' : isDatabaseReachable ? 'success' : 'error'}
                  value={
                    health.isLoading
                      ? 'Checking'
                      : health.isError
                        ? 'No response'
                        : isDatabaseReachable
                          ? 'Reachable'
                          : health.data?.db
                            ? 'Unavailable'
                            : 'No response'
                  }
                  testId="status-mysql"
                />
              </div>

              {health.isError && (
                <div
                  className="mx-6 mb-5 mt-5 flex gap-3 rounded-xl border border-destructive/20 bg-destructive/8 p-4 sm:mx-7"
                  role="alert"
                  data-testid="status-error"
                >
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" strokeWidth={2} />
                  <p className="text-sm leading-5 text-foreground">
                    The health endpoint did not respond. Check the API server and try again.
                  </p>
                </div>
              )}

              {!health.isLoading && !health.isError && !isDatabaseReachable && (
                <div
                  className="mx-6 mb-5 mt-5 rounded-xl border border-border bg-secondary/60 p-4 sm:mx-7"
                  role="status"
                  data-testid="status-database-warning"
                >
                  <p className="text-sm leading-5 text-foreground">
                    The API is reachable, but the database has not confirmed a connection.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-border bg-secondary/45 px-6 py-4 sm:px-7">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {health.isSuccess ? 'Last response received' : 'Waiting for response'}
                </p>
                <button
                  type="button"
                  onClick={() => void health.refetch()}
                  disabled={isChecking}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-card disabled:cursor-wait disabled:opacity-50"
                  data-testid="button-refresh-health"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`} strokeWidth={1.8} />
                  Recheck
                </button>
              </div>
            </div>
            <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Connection status only
            </p>
          </section>
        </div>

        <footer className="flex items-center justify-between border-t border-border/70 pt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <span>Build 001 / Foundation</span>
          <span>Awaiting the first match</span>
        </footer>
      </div>
    </main>
  );
}

function ConnectionRow({
  icon,
  label,
  detail,
  state,
  value,
  testId,
}: {
  icon: ReactNode;
  label: string;
  detail: string;
  state: 'loading' | 'success' | 'error';
  value: string;
  testId: string;
}) {
  const isLoading = state === 'loading';
  const isSuccess = state === 'success';

  return (
    <div className="flex items-center justify-between gap-4 py-6" data-testid={testId}>
      <div className="flex min-w-0 items-center gap-4">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isSuccess ? 'bg-primary/22 text-foreground' : state === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground'}`}
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{label}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isLoading ? (
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
        ) : (
          <span className={`h-2 w-2 rounded-full ${isSuccess ? 'bg-primary' : 'bg-destructive'}`} />
        )}
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.12em] ${isSuccess ? 'text-foreground' : state === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}
          data-testid={`${testId}-value`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
