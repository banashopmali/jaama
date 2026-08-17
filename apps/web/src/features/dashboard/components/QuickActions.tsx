import React from "react";
import Link from "next/link";
import { PlusCircle, PackagePlus, FileText, WalletCards, ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@jaama/ui";
import { QuickActionItem } from "../dashboard.types";

export interface QuickActionsProps {
  actions: QuickActionItem[];
}

export const QuickActions: React.FC<QuickActionsProps> = ({ actions }) => {
  const getIcon = (iconName: QuickActionItem["iconName"]) => {
    switch (iconName) {
      case "plus-circle":
        return <PlusCircle className="w-5 h-5 text-content-brand" />;
      case "package-plus":
        return <PackagePlus className="w-5 h-5 text-content-brand" />;
      case "file-text":
        return <FileText className="w-5 h-5 text-content-brand" />;
      case "wallet-cards":
        return <WalletCards className="w-5 h-5 text-content-brand" />;
      default:
        return <PlusCircle className="w-5 h-5 text-content-brand" />;
    }
  };

  return (
    <Card variant="default" className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-content-primary">
          Actions rapides
        </CardTitle>
        <CardDescription className="text-xs text-content-secondary">
          Raccourcis vers vos tâches fréquentes
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {actions.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className="group p-4 rounded-xl border border-border-subtle bg-surface-default hover:bg-surface-hover hover:border-border-brand-subtle transition-all duration-200 shadow-xs flex flex-col justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="p-2 rounded-lg bg-surface-brand-subtle border border-border-brand-subtle shrink-0">
                  {getIcon(action.iconName)}
                </div>
                <ArrowUpRight className="w-4 h-4 text-content-muted group-hover:text-content-brand transition-colors" />
              </div>

              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-content-primary group-hover:text-content-brand transition-colors">
                  {action.label}
                </h4>
                <p className="text-[11px] text-content-secondary leading-snug">
                  {action.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
