"use client";
import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

// Transaction execution was moved directly into the send/review step.
// This page is no longer part of the flow — redirect anyone who lands here.
export default function ConfirmPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/send"); }, []);
  return null;
}
