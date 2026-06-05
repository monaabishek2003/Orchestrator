export function DeployReveal() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-[slideUp_0.5s_ease-out]">
      <div className="bg-neutral-900 border-t border-green-500 p-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-green-400 text-2xl">✓</span>
            <h2 className="text-xl font-bold text-white">Your POC is live!</h2>
          </div>

          <a
            href="http://localhost:4000"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg px-8 py-3 transition-colors mb-3"
          >
            http://localhost:4000
          </a>

          <p className="text-neutral-400 text-sm">
            Built from a one-page PRD in under 6 minutes
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
