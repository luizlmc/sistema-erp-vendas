"use client";

import * as React from "react";
import { createPortal } from "react-dom";

type AlertDialogContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const AlertDialogContext = React.createContext<AlertDialogContextValue | null>(null);

function useAlertDialogContext() {
  const context = React.useContext(AlertDialogContext);
  if (!context) {
    throw new Error("AlertDialog components must be used inside <AlertDialog />");
  }
  return context;
}

type AlertDialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = typeof open === "boolean";
  const resolvedOpen = isControlled ? open : internalOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  return <AlertDialogContext.Provider value={{ open: resolvedOpen, setOpen }}>{children}</AlertDialogContext.Provider>;
}

type TriggerProps = {
  asChild?: boolean;
  children: React.ReactElement<any>;
};

export function AlertDialogTrigger({ asChild, children }: TriggerProps) {
  const { setOpen } = useAlertDialogContext();
  return React.cloneElement(children, {
    onClick: (event: React.MouseEvent) => {
      (children.props as any).onClick?.(event);
      setOpen(true);
    },
  });
}

export function AlertDialogPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

export function AlertDialogOverlay({ className = "" }: { className?: string }) {
  return <div className={`fixed inset-0 z-[85] bg-black/60 backdrop-blur-[1px] ${className}`.trim()} />;
}

export function AlertDialogContent({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const { open } = useAlertDialogContext();
  if (!open) return null;
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <div className="fixed inset-0 z-[86] grid place-items-center p-4">
        <div className={`w-full max-w-[460px] rounded-md border border-[#2a3045] bg-[#0f1117] p-5 shadow-2xl ${className}`.trim()}>
          {children}
        </div>
      </div>
    </AlertDialogPortal>
  );
}

export function AlertDialogHeader({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`space-y-2 ${className}`.trim()}>{children}</div>;
}

export function AlertDialogFooter({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`mt-5 flex justify-end gap-2 ${className}`.trim()}>{children}</div>;
}

export function AlertDialogTitle({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={`text-[18px] font-semibold text-[#e2e8f0] ${className}`.trim()}>{children}</h3>;
}

export function AlertDialogDescription({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <p className={`text-sm text-[#94a3b8] ${className}`.trim()}>{children}</p>;
}

type ActionProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean };

export function AlertDialogCancel({ asChild, children, onClick, ...props }: ActionProps) {
  const { setOpen } = useAlertDialogContext();
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (event: React.MouseEvent) => {
        (children as React.ReactElement<any>).props.onClick?.(event);
        onClick?.(event as unknown as React.MouseEvent<HTMLButtonElement>);
        setOpen(false);
      },
    } as any);
  }
  return (
    <button
      onClick={(event) => {
        onClick?.(event);
        setOpen(false);
      }}
      {...props}
      type={props.type ?? "button"}
    >
      {children}
    </button>
  );
}

export function AlertDialogAction({ asChild, children, onClick, ...props }: ActionProps) {
  const { setOpen } = useAlertDialogContext();
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (event: React.MouseEvent) => {
        (children as React.ReactElement<any>).props.onClick?.(event);
        onClick?.(event as unknown as React.MouseEvent<HTMLButtonElement>);
        setOpen(false);
      },
    } as any);
  }
  return (
    <button
      onClick={(event) => {
        onClick?.(event);
        setOpen(false);
      }}
      {...props}
      type={props.type ?? "button"}
    >
      {children}
    </button>
  );
}
