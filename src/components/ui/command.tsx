import * as React from "react";
import { Search } from "lucide-react";
import {
  Command as CommandPrimitive,
  CommandEmpty as CommandEmptyPrimitive,
  CommandGroup as CommandGroupPrimitive,
  CommandInput as CommandInputPrimitive,
  CommandItem as CommandItemPrimitive,
  CommandList as CommandListPrimitive,
  CommandSeparator as CommandSeparatorPrimitive,
} from "cmdk";
import { cn } from "@/lib/utils";

function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-xl bg-card text-card-foreground",
        className,
      )}
      {...props}
    />
  );
}

function CommandInput({ className, ...props }: React.ComponentProps<typeof CommandInputPrimitive>) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-3" data-slot="command-input">
      <Search className="size-4 shrink-0 text-muted-foreground" />
      <CommandInputPrimitive
        className={cn(
          "flex h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground",
          className,
        )}
        {...props}
      />
    </div>
  );
}

function CommandList({ className, ...props }: React.ComponentProps<typeof CommandListPrimitive>) {
  return (
    <CommandListPrimitive
      className={cn("max-h-80 overflow-y-auto overflow-x-hidden p-1", className)}
      {...props}
    />
  );
}

function CommandEmpty({ className, ...props }: React.ComponentProps<typeof CommandEmptyPrimitive>) {
  return (
    <CommandEmptyPrimitive
      className={cn("py-8 text-center text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function CommandGroup({ className, ...props }: React.ComponentProps<typeof CommandGroupPrimitive>) {
  return (
    <CommandGroupPrimitive
      className={cn(
        "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function CommandSeparator({ className, ...props }: React.ComponentProps<typeof CommandSeparatorPrimitive>) {
  return <CommandSeparatorPrimitive className={cn("-mx-1 h-px bg-border", className)} {...props} />;
}

function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandItemPrimitive>) {
  return (
    <CommandItemPrimitive
      className={cn(
        "relative flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-secondary data-[selected=true]:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
};
