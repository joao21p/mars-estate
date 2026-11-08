import { cn } from "@/lib/utils";
import { STATUS_LABEL, type StatusTerreno } from "@/data/terrenos";

const styles: Record<StatusTerreno, string> = {
  disponivel: "border-success/40 text-success",
  reservado: "border-warning/40 text-warning",
  vendido: "border-border text-muted-foreground",
};

export function StatusBadge({ status, className }: { status: StatusTerreno; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-2.5 py-1 text-xs font-medium backdrop-blur",
        styles[status],
        className,
      )}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}
