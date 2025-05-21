"use client"

import * as React from "react"

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive",
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variantClasses = 
      variant === "destructive" 
        ? "bg-red-100 text-red-900 border-red-200" 
        : "bg-blue-100 text-blue-900 border-blue-200"

    return (
      <div
        ref={ref}
        role="alert"
        className={`p-4 border rounded-md ${variantClasses} ${className || ""}`}
        {...props}
      />
    )
  }
)
Alert.displayName = "Alert"

export const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={`font-medium mb-1 text-base ${className || ""}`}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={`text-sm font-normal ${className || ""}`}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription" 