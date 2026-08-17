import React from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@jaama/ui";
import { AttentionItemData } from "../dashboard.types";
import { AttentionItem } from "./AttentionItem";

export interface AttentionPanelProps {
  items: AttentionItemData[];
}

export const AttentionPanel: React.FC<AttentionPanelProps> = ({ items }) => {
  return (
    <Card variant="default" className="h-full flex flex-col justify-between">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-status-warning-subtle text-status-warning border border-status-warning/20">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-content-primary">
              À surveiller
            </CardTitle>
            <CardDescription className="text-xs text-content-secondary">
              Éléments nécessitant votre attention
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2 flex-1 space-y-3">
        {items.length > 0 ? (
          items.map((item) => <AttentionItem key={item.id} item={item} />)
        ) : (
          <div className="p-6 text-center text-xs text-content-secondary border border-dashed border-border-subtle rounded-xl space-y-1">
            <p className="font-semibold text-content-primary">Tout est sous contrôle 👍</p>
            <p>Aucun problème ou alerte en attente d’intervention.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
