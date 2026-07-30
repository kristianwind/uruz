"use client";

import { useOrientationLock } from "@/lib/hooks/useOrientationLock";
import { useT } from "@/components/app/I18nProvider";
import { cn } from "@/lib/utils";

/**
 * A switch for keeping the screen in portrait — shown only where it can work.
 *
 * On a device that cannot do it (an iPhone, or a browser tab that is not an
 * installed app) this shows the reason and where the real switch is, instead
 * of a toggle that flips and changes nothing.
 *
 * The setting is stored on the device, not on the account: it is a property of
 * the phone in your hand, not of you.
 */
export function RotationLock() {
  const t = useT();
  const { state, supported, toggle } = useOrientationLock();

  if (state === "unsupported" || !supported) {
    return (
      <div className="flex flex-col gap-1 py-1">
        <span className="text-sm font-medium text-muted">{t("me.rotationLock")}</span>
        <p className="text-xs text-faint">{t("me.rotationUnsupported")}</p>
      </div>
    );
  }

  const locked = state === "locked";
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm font-medium text-muted">{t("me.rotationLock")}</span>
      <button
        type="button"
        role="switch"
        aria-checked={locked}
        onClick={toggle}
        className={cn(
          "min-h-9 rounded-lg px-3 text-sm font-medium transition-colors",
          locked
            ? "bg-accent text-on-accent"
            : "border border-border-strong text-muted hover:text-text",
        )}
      >
        {locked ? t("me.rotationLocked") : t("me.rotationUnlocked")}
      </button>
    </div>
  );
}
