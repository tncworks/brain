import type { Metadata } from "next";
import UnlockForm from "./UnlockForm";

export const metadata: Metadata = { title: "DSA Brain · locked", robots: { index: false, follow: false } };

export default function UnlockPage() {
  return (
    <main className="relative grid h-dvh w-full place-items-center overflow-hidden bg-ink text-mist">
      <div className="backdrop" aria-hidden />
      <div className="grain" aria-hidden />
      <UnlockForm />
    </main>
  );
}
