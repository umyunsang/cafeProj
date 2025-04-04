import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "neon";
  size?: "sm" | "md" | "lg";
}

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  const baseStyles = "rounded-xl font-medium transition-all duration-200 ease-in-out";
  
  const variants = {
    primary: "bg-gradient-blue text-white hover:shadow-lg hover:shadow-primary/30",
    secondary: "bg-gradient-brown text-white hover:shadow-lg hover:shadow-secondary/30",
    accent: "bg-gradient-neon text-white hover:shadow-lg hover:shadow-accent/30",
    neon: "bg-neon text-white hover:shadow-lg hover:shadow-neon/30",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </motion.button>
  );
}
