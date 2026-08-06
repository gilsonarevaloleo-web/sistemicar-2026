import { Link } from "wouter";
import type { ReactNode } from "react";
import { beginViewTransition } from "@/lib/viewTransitionShield";
import { armDualKernelExitSoftStart } from "@/lib/dualKernelQuiet";
import { isJornada4Path, isJornada4WindowPath } from "@/lib/jornadaBrand";

type Props = {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
};

/** Link de navegación con escudo de transición modular (500 ms). */
export function NavTransitionLink({ href, children, className, onClick }: Props) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        // Soft-start ANTES del cambio de ruta: el latch compartido debe
        // estar armado cuando Admin/Espejo/Hub montan en el mismo commit.
        if (isJornada4WindowPath() && !isJornada4Path(href)) {
          armDualKernelExitSoftStart({ href });
        }
        beginViewTransition();
        onClick?.();
      }}
    >
      {children}
    </Link>
  );
}
