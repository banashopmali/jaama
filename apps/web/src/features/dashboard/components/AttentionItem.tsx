import React from "react";
import Link from "next/link";
import { Wallet, AlertTriangle, Clock, ArrowRight } from "lucide-react";
import { AttentionItemData } from "../dashboard.types";

export interface AttentionItemProps {
  item: AttentionItemData;
}

export const AttentionItem: React.FC<AttentionItemProps> = ({ item }) => {
  const getIcon = () => {
    switch (item.category) {
      case "payment":
        return <Wallet className="w-4 h-4 text-status-warning" />;
      case "inventory":
        return <AlertTriangle className="w-4 h-4 text-status-danger" />;
      case "invoice":
        return <Clock className="w-4 h-4 text-status-danger" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-status-warning" />;
    }
  };

  const getSeverityBadgeClass = () => {
    switch (item.severity) {
      case "danger":
        return "border-status-danger/30 bg-status-danger-subtle/50";
      case "warning":
        return "border-status-warning/30 bg-status-warning-subtle/50";
      default:
        return "border-border-subtle bg-surface-subtle";
    }
  };

  return (
    <div className={`p-3.5 rounded-xl border ${getSeverityBadgeClass()} transition-colors flex flex-col justify-between gap-3`}>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-surface-default border border-border-subtle shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="space-y-0.5 min-w-0 flex-1">
          <h4 className="text-xs font-bold text-content-primary tracking-tight">
            {item.title}
          </h4>
          <p className="text-xs text-content-secondary leading-snug">
            {item.description}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Link
          href={item.actionHref}
          className="inline-flex items-center gap-1 text-xs font-bold text-content-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-md px-1 py-0.5"
        >
          <span>{item.actionLabel}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
