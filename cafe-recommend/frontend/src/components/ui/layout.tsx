import { motion } from "framer-motion";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-8"
      >
        <div className="backdrop-blur-sm bg-white/10 dark:bg-black/10 rounded-2xl shadow-xl p-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
} 