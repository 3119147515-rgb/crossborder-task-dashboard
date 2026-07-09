import * as React from "react";
import { cn } from "@/lib/utils";

export function Card(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("rounded-xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.06)]", props.className)} />;
}

export function Badge(props: React.HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} className={cn("badge-nowrap inline-flex h-6 items-center rounded-md px-2 text-xs font-medium leading-none", props.className)} />;
}
