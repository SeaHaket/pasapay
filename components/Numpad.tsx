"use client";

type Props = {
  value: string;
  onChange: (val: string) => void;
  fiatDisplay?: string;
  tokenSymbol?: string;
  maxDecimals?: number;
};

const KEYS = ["1","2","3","4","5","6","7","8","9",".","0","⌫"];

export default function Numpad({ value, onChange, fiatDisplay, tokenSymbol, maxDecimals = 6 }: Props) {
  function handleKey(key: string) {
    if (key === "⌫") {
      onChange(value.length > 1 ? value.slice(0, -1) : "0");
      return;
    }
    if (key === ".") {
      if (value.includes(".")) return;
      onChange(value + ".");
      return;
    }
    const next = value === "0" ? key : value + key;
    // Guard max decimals
    const dotIdx = next.indexOf(".");
    if (dotIdx !== -1 && next.length - dotIdx - 1 > maxDecimals) return;
    // Guard unreasonably large amounts
    if (next.replace(".", "").length > 10) return;
    onChange(next);
  }

  return (
    <div>
      <div className="numpad-display">
        <div className="numpad-display__amount">
          ${value}
        </div>
        {fiatDisplay && (
          <div className="numpad-display__php">≈ {fiatDisplay}</div>
        )}
        {tokenSymbol && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
            <span className="numpad-display__token">💵 {tokenSymbol}</span>
          </div>
        )}
      </div>

      <div className="numpad">
        {KEYS.map((key) => (
          <button
            key={key}
            className={`numpad-key${key === "⌫" ? " numpad-key--action" : ""}`}
            onClick={() => handleKey(key)}
            aria-label={key === "⌫" ? "backspace" : key}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}
