import * as React from "react";
import { Label as RadixLabel } from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

export type LabelProps = React.ComponentPropsWithoutRef<typeof RadixLabel>;

const Label = React.forwardRef<
  React.ElementRef<typeof RadixLabel>,
  LabelProps
>(({ className, ...props }, ref) => (
  <RadixLabel
    ref={ref}
    className={cn(
      "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className
    )}
    {...props}
  />
));
Label.displayName = RadixLabel.displayName;

export { Label };
