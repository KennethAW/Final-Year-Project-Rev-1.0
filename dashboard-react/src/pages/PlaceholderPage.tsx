import { Card } from "@/components/ui/Card";

interface PlaceholderPageProps {
  title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="text-center max-w-md">
        <span className="material-symbols-outlined text-5xl text-text-secondary/40 mb-3 block">
          construction
        </span>
        <h1 className="text-xl font-bold text-text-primary mb-2">{title}</h1>
        <p className="text-sm text-text-secondary">
          This module is currently under development and will be available in a
          future release.
        </p>
        <span className="inline-block mt-4 rounded-full bg-surface-container px-3 py-1 text-xs font-medium text-text-secondary">
          Coming Soon
        </span>
      </Card>
    </div>
  );
}
