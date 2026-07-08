import * as React from "react";
import { cn } from "@/lib/utils";

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("rounded-lg border border-zinc-200 bg-white shadow-sm", props.className)} />;
}

export function Badge(props: React.HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} className={cn("inline-flex h-6 items-center rounded-md px-2 text-xs font-medium", props.className)} />;
}
