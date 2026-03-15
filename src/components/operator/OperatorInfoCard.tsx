import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";

interface OperatorInfoCardProps {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  iconColor?: string;
}

export function OperatorInfoCard({ icon: Icon, title, children, iconColor = "text-primary" }: OperatorInfoCardProps) {
  return (
    <Card className="rounded-2xl border-border/60 shadow-sm hover:shadow-md transition-all duration-300 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
