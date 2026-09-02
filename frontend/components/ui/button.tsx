import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "amber"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]"
    
    const variants = {
      default: "bg-yellow-400 text-zinc-950 shadow-md shadow-yellow-400/20 hover:bg-yellow-300",
      amber: "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20 hover:bg-amber-400",
      destructive: "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20",
      outline: "border border-zinc-800 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-50",
      secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
      ghost: "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100",
      link: "text-yellow-400 underline-offset-4 hover:underline",
    }
    
    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-8 rounded-lg px-3 text-xs",
      lg: "h-12 rounded-2xl px-8 text-base",
      icon: "h-9 w-9",
    }
    
    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
