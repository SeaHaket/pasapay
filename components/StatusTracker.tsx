"use client";
import { useTranslations } from "next-intl";
import type { BridgeStatus } from "@/hooks/useLifi";

type Props = { status: BridgeStatus; txHash?: string | null; bridge?: string };

const STEPS = [
  { key: "step1", label: (t: any) => t("step1") },
  { key: "step2", label: (t: any) => t("step2") },
  { key: "step3", label: (t: any) => t("step3") },
];

function stepIndex(status: BridgeStatus): number {
  if (status === "approving") return 0;
  if (status === "bridging" || status === "pending") return 1;
  if (status === "success") return 3;
  return 0;
}

export default function StatusTracker({ status, txHash, bridge }: Props) {
  const t = useTranslations("status");
  const current = stepIndex(status);
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <div style={{ textAlign: "center" }}>
      <div className={`status-icon status-icon--${isSuccess ? "success" : isError ? "error" : "pending"}`}>
        {isSuccess ? "✅" : isError ? "❌" : "⏳"}
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
        {isSuccess ? t("success") : isError ? t("error") : t("pending")}
      </h2>
      {bridge && !isSuccess && !isError && (
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{t("via", { bridge })}</p>
      )}

      <div className="steps mt-24">
        {STEPS.map((step, i) => {
          const done = i < current;
          const active = i === current && !isSuccess && !isError;
          return (
            <div key={step.key} className="step">
              <div className="step__connector">
                <div className={`step__dot${done || isSuccess ? " step__dot--done" : active ? " step__dot--active" : ""}`} />
                {i < STEPS.length - 1 && (
                  <div className={`step__line${done || isSuccess ? " step__line--done" : ""}`} />
                )}
              </div>
              <div className={`step__label${done || isSuccess ? " step__label--done" : active ? " step__label--active" : " step__label--pending"}`}>
                {step.label(t)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
