"use client";

import React from "react";
import { Bell } from "lucide-react";
import { IconButton } from "@jaama/ui";
import { shellMockData } from "@/config/shell-mock.data";

export const NotificationsButton: React.FC = () => {
  const hasUnread = shellMockData.unreadNotificationsCount > 0;

  return (
    <div className="relative">
      <IconButton
        variant="ghost"
        size="sm"
        aria-label={`Notifications systeme (${shellMockData.unreadNotificationsCount} non lues)`}
        icon={<Bell className="w-5 h-5 text-content-secondary" />}
      />
      {hasUnread && (
        <span
          className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-status-danger ring-2 ring-surface-default"
          aria-hidden="true"
        />
      )}
    </div>
  );
};
