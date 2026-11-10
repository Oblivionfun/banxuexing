"use client";

import { Send } from "lucide-react";
import { ActionButton } from "@/components/admin/buttons";
import { notifyAction } from "../notify-actions";

export function NotifyButton({
  kind,
  id,
  notifiedAt,
}: {
  kind: "lesson" | "set";
  id: number;
  notifiedAt?: Date | null;
}) {
  return (
    <ActionButton action={() => notifyAction(kind, id)} variant="outline" size="sm">
      <Send />
      {notifiedAt ? "再次推送到群" : "推送到企业微信群"}
    </ActionButton>
  );
}
