"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ButtonProps = React.ComponentProps<typeof Button>;

export function SubmitButton({
  children,
  pendingText = "正在保存…",
  ...props
}: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}

function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

/** 执行一个服务端操作；destructive 时先弹出确认。 */
export function ActionButton({
  action,
  children,
  confirm,
  successMessage,
  variant = "outline",
  size = "sm",
  className,
  "aria-label": ariaLabel,
}: {
  action: () => Promise<{ error?: string; message?: string } | void>;
  children: ReactNode;
  confirm?: { title: string; description: string; confirmText: string };
  successMessage?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  "aria-label"?: string;
}) {
  const [pending, startTransition] = useTransition();

  const run = () =>
    startTransition(async () => {
      try {
        const result = await action();
        if (result && "error" in result && result.error) {
          toast.error(result.error);
          return;
        }
        const message = (result && "message" in result && result.message) || successMessage;
        if (message) toast.success(message);
      } catch (error) {
        if (isRedirectError(error)) throw error;
        toast.error("操作没有完成，请检查网络后重试");
      }
    });

  if (!confirm) {
    return (
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={pending}
        onClick={run}
        aria-label={ariaLabel}
      >
        {children}
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          className={className}
          disabled={pending}
          aria-label={ariaLabel}
        >
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
          <AlertDialogDescription>{confirm.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={run} className="bg-danger text-white hover:bg-danger/90">
            {confirm.confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function CopyButton({ value, label = "复制链接" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const input = document.createElement("textarea");
      input.value = value;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
    toast.success("已复制，可以粘贴到微信群");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {copied ? <Check className="text-success" /> : <Copy />}
      {copied ? "已复制" : label}
    </Button>
  );
}
