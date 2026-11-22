// The photo of the scene on screen: shown from the phone's storage, and taken with a file
// field the phone turns into its camera, or into a choice of the camera and its photos.
import { useCallback, useEffect, useRef, useState } from "react";
import { loadPhoto, savePhoto, shrinkPhoto } from "../../lib/photos.ts";

/** A kept photo as a URL the page can show, or null while it loads or when there is none. */
function usePhotoUrl(key: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!key) return;
    let alive = true;
    let made: string | null = null;
    loadPhoto(key)
      .then((blob) => {
        if (!alive || !blob) return;
        made = URL.createObjectURL(blob);
        setUrl(made);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
      setUrl(null);
    };
  }, [key]);
  return url;
}

/** A kept photo. Until it loads, a quiet box of the same kind holds its place. */
export function PhotoView({ photoKey, label, className, holder }: { photoKey: string; label: string; className: string; holder: string }) {
  const url = usePhotoUrl(photoKey);
  return url ? <img src={url} alt={label} className={className} /> : <span role="img" aria-label={label} className={`${holder} block bg-chip`} />;
}

/**
 * A hidden file field that takes a photo, shrinks it and keeps it on the phone. With `camera`, the phone's
 * camera opens straight away; without, the phone offers its camera or its photos. `onCancel`: the camera or
 * the photos closed with nothing taken, which the browser tells a file field with its "cancel" event.
 */
export function usePhotoPicker({
  camera,
  onOpen,
  onPicked,
  onFailed,
  onCancel,
}: {
  camera: boolean;
  onOpen?: () => void;
  onPicked: (key: string) => void;
  onFailed: () => void;
  onCancel?: () => void;
}) {
  const input = useRef<HTMLInputElement | null>(null);
  const cancelled = useRef(onCancel);
  cancelled.current = onCancel;
  // React doesn't pass a file field's "cancel" on, so it is listened to on the field itself, for as long as it's there.
  const attach = useCallback((element: HTMLInputElement | null) => {
    input.current = element;
    if (!element) return;
    const cancel = () => cancelled.current?.();
    element.addEventListener("cancel", cancel);
    return () => element.removeEventListener("cancel", cancel);
  }, []);
  const field = (
    <input
      ref={attach}
      type="file"
      accept="image/*"
      capture={camera ? "environment" : undefined}
      hidden
      onChange={async (event) => {
        const file = event.target.files?.[0];
        // Cleared, so the same photo can be picked again after Remove.
        event.target.value = "";
        if (!file) return;
        try {
          onPicked(await savePhoto(await shrinkPhoto(file)));
        } catch {
          onFailed();
        }
      }}
    />
  );
  const pick = () => {
    onOpen?.();
    input.current?.click();
  };
  return { field, pick };
}
