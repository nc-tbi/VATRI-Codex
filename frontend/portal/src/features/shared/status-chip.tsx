type Tone = "neutral" | "info" | "warning" | "success" | "danger";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  info: "bg-blue-100 text-blue-700",
  warning: "bg-amber-100 text-amber-700",
  success: "bg-green-100 text-green-700",
  danger: "bg-red-100 text-red-700",
};

export function StatusChip({ text, tone = "neutral" }: { text: string; tone?: Tone }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${TONE_CLASS[tone]}`}>{text}</span>;
}
