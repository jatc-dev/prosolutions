import React, { useRef } from "react";
import type { PersonalData, ProfileImageSize, ProfileImageStyle } from "../../../../../shared/types";
import { PHOTO_ZOOM_MAX, PHOTO_ZOOM_MIN } from "../../withCustomStyles";

interface PhotoCustomizerProps {
  personal: PersonalData;
  onChange: (updates: Partial<PersonalData>) => void;
}

const STYLES: Array<{ value: ProfileImageStyle; label: string }> = [
  { value: "round", label: "Redonda" },
  { value: "square", label: "Cuadrada" },
  { value: "portrait", label: "Retrato" },
  { value: "oval", label: "Ovalada" },
  { value: "arch", label: "Arco" },
];
const SIZES: Array<{ value: ProfileImageSize; label: string }> = [
  { value: "sm", label: "Pequeña" },
  { value: "md", label: "Mediana" },
  { value: "lg", label: "Grande" },
  { value: "xl", label: "Muy grande" },
];
const FRAME_CLASS: Record<ProfileImageStyle, string> = {
  round: "h-24 w-24 rounded-full",
  square: "h-24 w-24 rounded-xl",
  portrait: "h-28 w-20 rounded-xl",
  oval: "h-28 w-20 rounded-[50%]",
  arch: "h-28 w-20 rounded-t-full rounded-b-md",
};

const select = "block w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";
const checkbox = "rounded border-brand-300 text-brand-800 focus:ring-brand-700";

/**
 * How the photo looks on the CV (the photo itself is uploaded in the form):
 * visibility, border, shape, size and framing. Changes show at once in the
 * preview right below this panel.
 */
export function PhotoCustomizer({ personal, onChange }: PhotoCustomizerProps) {
  const photo = personal.profileImage;
  const style = (personal.profileImageStyle || "round") as ProfileImageStyle;
  const x = typeof personal.profileImagePositionX === "number" ? personal.profileImagePositionX : 50;
  const y = typeof personal.profileImagePositionY === "number" ? personal.profileImagePositionY : 50;
  const zoom = typeof personal.profileImageZoom === "number" ? Math.min(PHOTO_ZOOM_MAX, Math.max(PHOTO_ZOOM_MIN, personal.profileImageZoom)) : 1;
  const pct = (value: number) => Math.round(Math.min(100, Math.max(0, value)));
  const setPosition = (nextX: number, nextY: number) => onChange({ profileImagePositionX: pct(nextX), profileImagePositionY: pct(nextY) });

  const drag = useRef<{ startX: number; startY: number; x: number; y: number; width: number; height: number } | null>(null);
  const onPointerDown = (event: React.PointerEvent<HTMLImageElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    drag.current = { startX: event.clientX, startY: event.clientY, x, y, width: box.width, height: box.height };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLImageElement>) => {
    const current = drag.current;
    if (!current) return;
    // Dragging right reveals more of the left side (lower object-position).
    setPosition(current.x - ((event.clientX - current.startX) / current.width) * 150, current.y - ((event.clientY - current.startY) / current.height) * 150);
  };
  const onPointerUp = () => { drag.current = null; };

  if (!photo) {
    return (
      <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        Aún no tienes foto. Súbela en el formulario, en la pestaña <strong>Personal</strong>; aquí podrás ajustar cómo se ve.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input type="checkbox" className={checkbox} checked={personal.showProfileImage !== false} onChange={(event) => onChange({ showProfileImage: event.target.checked })} />
          Mostrar foto en la hoja de vida
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input type="checkbox" className={checkbox} checked={personal.profileImageBorder !== false} onChange={(event) => onChange({ profileImageBorder: event.target.checked })} />
          Borde
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
          Forma
          <select className={`mt-1 ${select}`} value={style} onChange={(event) => onChange({ profileImageStyle: event.target.value as ProfileImageStyle })}>
            {STYLES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
          Tamaño
          <select className={`mt-1 ${select}`} value={personal.profileImageSize || "md"} onChange={(event) => onChange({ profileImageSize: event.target.value as ProfileImageSize })}>
            {SIZES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Encuadre</p>
        <div className="mt-2 flex items-start gap-4">
          <span className={`${FRAME_CLASS[style]} block shrink-0 overflow-hidden ${personal.profileImageBorder === false ? "" : "border-2 border-slate-200"}`}>
            <img
              src={photo}
              alt="Encuadre de la foto"
              title="Arrastra para encuadrar la foto"
              draggable={false}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              style={{ objectPosition: `${x}% ${y}%`, transform: `scale(${zoom})`, transformOrigin: `${x}% ${y}%`, touchAction: "none" }}
              className="block h-full w-full cursor-move select-none object-cover"
            />
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <label className="block text-xs text-slate-600 dark:text-slate-300">
              Horizontal
              <input type="range" min={0} max={100} value={x} onChange={(event) => setPosition(Number(event.target.value), y)} className="mt-0.5 w-full accent-brand-700" aria-label="Encuadre horizontal de la foto" />
            </label>
            <label className="block text-xs text-slate-600 dark:text-slate-300">
              Vertical
              <input type="range" min={0} max={100} value={y} onChange={(event) => setPosition(x, Number(event.target.value))} className="mt-0.5 w-full accent-brand-700" aria-label="Encuadre vertical de la foto" />
            </label>
            <label className="block text-xs text-slate-600 dark:text-slate-300">
              Zoom <span className="tabular-nums text-slate-500">{Math.round(zoom * 100)} %</span>
              <input type="range" min={PHOTO_ZOOM_MIN} max={PHOTO_ZOOM_MAX} step={0.05} value={zoom} onChange={(event) => onChange({ profileImageZoom: Math.round(Number(event.target.value) * 100) / 100 })} className="mt-0.5 w-full accent-brand-700" aria-label="Acercar o alejar la foto" />
            </label>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">Arrastra la foto o usa los controles; el cambio se ve en la vista previa.</p>
          <button
            type="button"
            onClick={() => onChange({ profileImagePositionX: 50, profileImagePositionY: 50, profileImageZoom: 1 })}
            disabled={x === 50 && y === 50 && zoom === 1}
            className="shrink-0 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
          >
            Restablecer
          </button>
        </div>
      </div>
    </div>
  );
}
