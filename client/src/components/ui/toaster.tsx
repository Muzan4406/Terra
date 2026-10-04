import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CircleAlert, CircleCheck } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const isDestructive = props.variant === "destructive"
        const StatusIcon = isDestructive ? CircleAlert : CircleCheck
        return (
          <Toast key={id} {...props}>
            <span
              className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                isDestructive ? "bg-white/15 text-white" : "bg-[#e3f2e3] text-[#087c59]"
              }`}
              aria-hidden="true"
            >
              <StatusIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription className={isDestructive ? "text-white/85" : "text-[#5b7468]"}>
                  {description}
                </ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
