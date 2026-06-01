"use client";
import { useTranslations } from "next-intl";
import type { BridgeStatus } from "@/hooks/useLifi";

type Props = { 
  status: BridgeStatus; 
  txHash?: string | null; 
  bridge?: string;
  route?: string;
};

function stepIndex(status: BridgeStatus): number {
  if (status === "approving") return 0;
  if (status === "bridging" || status === "pending") return 1;
  if (status === "success") return 3;
  return 0;
}

export default function StatusTracker({ status, txHash, bridge, route }: Props) {
  const t = useTranslations("status");
  const current = stepIndex(status);
  const isSuccess = status === "success";
  const isError = status === "error";

  const isBridge = route === "localcrypto";

  const steps = isBridge
    ? [
        { key: "step1", label: t("step1") },
        { key: "step2", label: t("step2") },
        { key: "step3", label: t("step3") },
      ]
    : [
        { key: "stepMinipay1", label: t("stepMinipay1") },
        { key: "stepMinipay2", label: t("stepMinipay2") },
        { key: "stepMinipay3", label: t("stepMinipay3") },
      ];

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
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current && !isSuccess && !isError;
          return (
            <div key={step.key} className="step">
              <div className="step__connector">
                <div className={`step__dot${done || isSuccess ? " step__dot--done" : active ? " step__dot--active" : ""}`} />
                {i < steps.length - 1 && (
                  <div className={`step__line${done || isSuccess ? " step__line--done" : ""}`} />
                )}
              </div>
              <div className={`step__label${done || isSuccess ? " step__label--done" : active ? " step__label--active" : " step__label--pending"}`}>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
