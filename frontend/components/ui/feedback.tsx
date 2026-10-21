"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

type Kind = "success" | "error" | "info";
type Toast = { id: number; kind: Kind; message: string };
type ConfirmRequest = { message: string; resolve: (ok: boolean) => void };

let toastSeq = 0;
const toastListeners = new Set<(t: Toast) => void>();
let confirmListener: ((r: ConfirmRequest) => void) | null = null;

function inferKind(message: string): Kind {
  return /sucesso|registrad[ao]|confirmad[ao]|salv[ao]/i.test(message) ? "success" : "error";
}

/** Substitui window.alert: aviso não bloqueante, anunciado a leitores de tela. */
export function notify(message: unknown, kind?: Kind) {
  const text = typeof message === "string" ? message : JSON.stringify(message);
  const toast = { id: ++toastSeq, kind: kind ?? inferKind(text), message: text };
  toastListeners.forEach((fn) => fn(toast));
}

/** Substitui window.confirm: devolve true se a pessoa confirmar. */
export function askConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!confirmListener) {
      resolve(window.confirm(message));
      return;
    }
    confirmListener({ message, resolve });
  });
}

const styles: Record<Kind, { icon: typeof Info; cls: string }> = {
  success: { icon: CheckCircle2, cls: "border-emerald-500/40 text-emerald-300" },
  error: { icon: XCircle, cls: "border-red-500/40 text-red-300" },
  info: { icon: Info, cls: "border-zinc-600 text-zinc-200" },
};

export function FeedbackHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<ConfirmRequest | null>(null);
  const confirmBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onToast = (t: Toast) => {
      setToasts((list) => [...list.slice(-3), t]);
      window.setTimeout(() => setToasts((list) => list.filter((x) => x.id !== t.id)), 6000);
    };
    toastListeners.add(onToast);
    confirmListener = (r) => setPending(r);
    return () => {
      toastListeners.delete(onToast);
      confirmListener = null;
    };
  }, []);

  useEffect(() => {
    if (pending) confirmBtn.current?.focus();
  }, [pending]);

  const answer = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const { icon: Icon, cls } = styles[t.kind];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-zinc-900 px-4 py-3 text-sm shadow-lg sm:w-auto ${cls}`}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span className="text-zinc-100">{t.message}</span>
            </div>
          );
        })}
      </div>

      {pending && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4"
          onKeyDown={(e) => e.key === "Escape" && answer(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="Confirmação"
            className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden />
              <p className="text-sm text-zinc-100">{pending.message}</p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => answer(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
              >
                Cancelar
              </button>
              <button
                ref={confirmBtn}
                type="button"
                onClick={() => answer(true)}
                className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
