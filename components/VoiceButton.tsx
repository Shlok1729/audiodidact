"use client";

import React, { useState, useEffect, useRef } from "react";

interface VoiceButtonProps {
  onUtterance: (text: string) => void;
  disabled?: boolean;
}

export default function VoiceButton({
  onUtterance,
  disabled = false,
}: VoiceButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [typedInput, setTypedInput] = useState("");
  const [browserSupport, setBrowserSupport] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check Web Speech API support
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setBrowserSupport(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onUtterance(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    // Keyboard shortcut 'V' to focus input or toggle voice
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onUtterance]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch {
        // Recognition already active
      }
    }
  };

  const handleTypedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedInput.trim()) return;
    onUtterance(typedInput.trim());
    setTypedInput("");
  };

  return (
    <section
      aria-label="Voice Commands and Question Input"
      className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl"
    >
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
        <h3 className="text-sm font-bold text-white tracking-wide uppercase">
          Voice & Query Interface
        </h3>
        <span className="text-xs text-slate-400">
          Press <kbd className="bg-slate-800 px-1 py-0.5 rounded text-slate-300 font-mono">V</kbd> to focus query
        </span>
      </div>

      <div className="space-y-3">
        {/* Typed Input Fallback Box */}
        <form onSubmit={handleTypedSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={typedInput}
            onChange={(e) => setTypedInput(e.target.value)}
            disabled={disabled}
            placeholder='e.g., "drill down into database" or "what connects to api-gateway"'
            aria-label="Type a voice command or architecture question"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={disabled || !typedInput.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Ask
          </button>
        </form>

        {/* Voice Push-to-Talk button */}
        {browserSupport ? (
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={toggleListening}
              disabled={disabled}
              aria-label={
                isListening
                  ? "Stop listening"
                  : "Start listening with microphone"
              }
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                isListening
                  ? "bg-rose-600 text-white animate-pulse"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              }`}
            >
              <span>{isListening ? "🎙️ Listening..." : "🎤 Speak Command"}</span>
            </button>
            <span className="text-xs text-slate-400">
              Web Speech enabled
            </span>
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            Web Speech microphone not available in this browser. Use the typed query box above.
          </p>
        )}
      </div>
    </section>
  );
}
