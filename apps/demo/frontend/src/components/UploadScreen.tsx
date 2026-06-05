import { useState } from 'react';

export function UploadScreen({ onSubmit }: { onSubmit: (prd: string) => void }) {
  const [prd, setPrd] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    if (!prd.trim() || loading) return;
    setLoading(true);
    onSubmit(prd);
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="max-w-2xl w-full px-6">
        <div className="text-center mb-10">
          <h1
            className="text-5xl font-bold text-white tracking-tight mb-3"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Orchestrator
          </h1>
          <p className="text-neutral-400 text-lg">
            From doc to deployed POC, no engineers needed.
          </p>
        </div>

        <textarea
          value={prd}
          onChange={(e) => setPrd(e.target.value)}
          rows={14}
          placeholder="Paste your PRD here..."
          className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-4 text-white font-mono text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-neutral-500"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        />

        <button
          onClick={handleSubmit}
          disabled={!prd.trim() || loading}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-8 py-3 transition-colors cursor-pointer"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Planning...
            </span>
          ) : (
            'Plan'
          )}
        </button>
      </div>
    </div>
  );
}
