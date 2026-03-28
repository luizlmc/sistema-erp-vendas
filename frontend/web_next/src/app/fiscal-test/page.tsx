"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FiscalTestPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/fiscal");
  }, [router]);

  return null;
}

