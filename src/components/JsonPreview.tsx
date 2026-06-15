interface JsonPreviewProps {
  value: unknown;
}

export function JsonPreview({ value }: JsonPreviewProps) {
  return (
    <pre className="max-h-72 overflow-auto rounded-md border border-line bg-[#080c12] p-3 font-mono text-xs leading-relaxed text-acid">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
