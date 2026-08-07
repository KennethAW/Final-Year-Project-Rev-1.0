import { Card } from "@/components/ui/Card";

function StatusDot({ color }: { color: string }) {
  return <span className={`h-2 w-2 rounded-full ${color}`} />;
}

export function SystemHealth() {
  const cards = [
    {
      title: "System Latency",
      value: "14ms",
      badge: "Optimal",
      badgeColor: "bg-positive/10 text-positive",
      icon: "speed",
      decoration: (
        <div className="flex items-end gap-0.5 h-6">
          {[3, 5, 2, 6, 4, 7, 3, 5].map((h, i) => (
            <div
              key={i}
              className="w-1.5 rounded-sm bg-primary/20"
              style={{ height: `${h * 3}px` }}
            />
          ))}
        </div>
      ),
    },
    {
      title: "API Health",
      value: "99.98%",
      badge: "Stable",
      badgeColor: "bg-positive/10 text-positive",
      icon: "dns",
      decoration: (
        <div className="flex items-center gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <StatusDot key={i} color="bg-positive" />
          ))}
        </div>
      ),
    },
    {
      title: "Data Integrity",
      value: "Verified",
      badge: "Checksum OK",
      badgeColor: "bg-primary/10 text-primary",
      icon: "verified_user",
      decoration: (
        <span className="material-symbols-outlined text-positive text-2xl">
          check_circle
        </span>
      ),
    },
  ];

  return (
    <div className="col-span-full grid grid-cols-3 gap-4">
      {cards.map((c) => (
        <Card key={c.title} className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-text-secondary text-lg">
                {c.icon}
              </span>
              <span className="text-xs font-medium text-text-secondary">
                {c.title}
              </span>
            </div>
            <span className="text-xl font-semibold text-text-primary">
              {c.value}
            </span>
            <span
              className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-medium ${c.badgeColor}`}
            >
              {c.badge}
            </span>
          </div>
          <div className="shrink-0">{c.decoration}</div>
        </Card>
      ))}
    </div>
  );
}
