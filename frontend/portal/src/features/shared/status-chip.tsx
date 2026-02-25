export function StatusChip({ text }: { text: string }): JSX.Element {
  return <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">{text}</span>;
}

