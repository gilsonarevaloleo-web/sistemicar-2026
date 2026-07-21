import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SCAN_LINES = [
  "SCANNING_ANCLAJES...",
  "DECODING_HARDWARE...",
  "FILTERING_SHADOW...",
  "MAPPING_INTERFERENCIA...",
  "TRACE_NEURONAL_PATH...",
  "CALIBRATING_FREQUENCY...",
  "RESOLVING_PATTERN...",
  "SYNC_BIOMETRICS...",
];

interface TerminalConsoleProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  testId?: string;
}

export default function TerminalConsole({
  value,
  onChange,
  placeholder = "Escribe aquí tu respuesta...",
  testId = "terminal-console",
}: TerminalConsoleProps) {
  const [scanLines, setScanLines] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scanIndexRef = useRef(0);

  useEffect(() => {
    if (value.length > 0 && value.length % 12 === 0) {
      const line = SCAN_LINES[scanIndexRef.current % SCAN_LINES.length];
      setScanLines((prev) => [...prev.slice(-5), line]);
      scanIndexRef.current++;
    }
  }, [value]);

  return (
    <div
      data-testid={testId}
      style={{
        position: "relative",
        background: "#0A0A0A",
        border: "1px solid #00FFC3",
        borderRadius: "6px",
        padding: "0",
        fontFamily: "'Courier New', 'Fira Code', monospace",
        overflow: "hidden",
        boxShadow: "0 0 15px rgba(0, 255, 195, 0.08), inset 0 0 30px rgba(0, 0, 0, 0.5)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          background: "rgba(0, 255, 195, 0.05)",
          borderBottom: "1px solid rgba(0, 255, 195, 0.15)",
          fontSize: "11px",
          color: "rgba(0, 255, 195, 0.5)",
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF3131" }} />
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#D4AF37" }} />
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#00FFC3" }} />
        <span style={{ marginLeft: "8px" }}>sistemicar@espejo:~$</span>
      </div>

      <div
        style={{
          position: "relative",
          padding: "12px",
          display: "flex",
          alignItems: "flex-start",
          gap: "8px",
        }}
        onClick={() => textareaRef.current?.focus()}
      >
        <span
          aria-hidden="true"
          style={{
            color: "#00FFC3",
            fontFamily: "'Courier New', 'Fira Code', monospace",
            fontSize: "14px",
            lineHeight: "1.6",
            userSelect: "none",
            flexShrink: 0,
            paddingTop: "1px",
          }}
        >
          &gt;
        </span>
        <textarea
          ref={textareaRef}
          data-testid={`${testId}-input`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          rows={5}
          style={{
            flex: 1,
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#00FFC3",
            fontFamily: "'Courier New', 'Fira Code', monospace",
            fontSize: "14px",
            lineHeight: "1.6",
            resize: "vertical",
            caretColor: "#00FFC3",
          }}
        />

        {!value && !isFocused && (
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: "32px",
              color: "rgba(0, 255, 195, 0.25)",
              fontFamily: "'Courier New', 'Fira Code', monospace",
              fontSize: "14px",
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              gap: "2px",
            }}
          >
            <span>{placeholder}</span>
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.53, repeat: Infinity, repeatType: "reverse" }}
              style={{
                display: "inline-block",
                width: "8px",
                height: "16px",
                background: "rgba(0, 255, 195, 0.4)",
                marginLeft: "2px",
              }}
            />
          </div>
        )}
      </div>

      <AnimatePresence>
        {scanLines.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            style={{
              borderTop: "1px solid rgba(0, 255, 195, 0.1)",
              padding: "8px 12px",
              maxHeight: "120px",
              overflowY: "auto",
            }}
          >
            {scanLines.map((line, i) => (
              <motion.div
                key={`${line}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  fontSize: "11px",
                  color: i === scanLines.length - 1 ? "#D4AF37" : "rgba(0, 255, 195, 0.3)",
                  fontFamily: "'Courier New', monospace",
                  lineHeight: "1.8",
                }}
              >
                [{String(i).padStart(2, "0")}] {line}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
