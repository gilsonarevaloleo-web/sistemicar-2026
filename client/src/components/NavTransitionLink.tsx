import { Link } from "wouter";
import type { ReactNode } from "react";
import { beginViewTransition } from "@/lib/viewTransitionShield";

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
        beginViewTransition();
        onClick?.();
      }}
    >
      {children}
    </Link>
  );
}
