"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Collapsible({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-3"
      >
        <span className="text-base font-medium">{title}</span>
        <span className="text-sm text-gray-500">
          {open ? "Ocultar" : "Mostrar"}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="px-3 pb-3"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
