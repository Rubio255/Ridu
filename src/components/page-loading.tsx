// Rodoma iškart paspaudus skiltį, kol serveris ruošia duomenis
export function PageLoading() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Įkeliama">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-[var(--surface-2)]" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="card">
          <div className="h-5 w-40 animate-pulse rounded bg-[var(--surface-2)]" />
          <div className="h-4 w-full animate-pulse rounded bg-[var(--surface-2)]" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--surface-2)]" />
        </div>
      ))}
    </div>
  );
}
