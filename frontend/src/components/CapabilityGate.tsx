import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/auth';
import { hasCapability, type AccessCapability } from '@/lib/accessControl';

interface CapabilityGateProps {
  capability: AccessCapability;
  children: ReactNode;
  fallback?: ReactNode;
}

export default function CapabilityGate({ capability, children, fallback = null }: CapabilityGateProps) {
  const { accessStatus } = useAuthStore();

  if (!hasCapability(accessStatus, capability)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
