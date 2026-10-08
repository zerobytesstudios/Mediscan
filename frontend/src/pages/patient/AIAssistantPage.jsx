import AIChatPanel from '../../components/AIChatPanel';

export default function AIAssistantPage() {
  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] max-w-4xl flex-col space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">AI Assistant</h1>
        <p className="mt-1 text-sm text-slate-500">
          General health education only - no diagnosis, no prescriptions.
        </p>
      </div>
      <AIChatPanel />
    </div>
  );
}