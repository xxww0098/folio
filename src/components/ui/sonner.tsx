import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTheme } from "@/lib/theme/provider";

function Toaster(props: ToasterProps) {
  const { resolved } = useTheme();
  return (
    <Sonner
      theme={resolved}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "bg-card text-card-foreground border-border shadow-[var(--shadow-border)]",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
