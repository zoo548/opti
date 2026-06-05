import { OPTI } from "../optiTheme";

interface RouteHeaderProps {
  from: string;
  to: string;
  onBack: () => void;
  onEdit?: () => void;
  editLabel?: string;
}

export function RouteHeader({ from, to, onBack, onEdit, editLabel = "수정" }: RouteHeaderProps) {
  return (
    <div className="bg-white px-4 pt-3 pb-3" style={{ boxShadow: OPTI.headerShadow }}>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} className="p-1 -ml-1" aria-label="뒤로">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke={OPTI.text} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1 flex items-center gap-1.5 text-[13px] min-w-0">
          <span className="font-semibold truncate max-w-[120px]" style={{ color: OPTI.text }}>{from}</span>
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none" className="flex-shrink-0">
            <path d="M1 5h12M9 1l4 4-4 4" stroke="#aaa" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-semibold truncate max-w-[120px]" style={{ color: OPTI.text }}>{to}</span>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-[12px] font-medium px-2.5 py-1 rounded-lg flex-shrink-0"
            style={{ background: OPTI.primaryLight, color: OPTI.primary }}
          >
            {editLabel}
          </button>
        )}
      </div>
    </div>
  );
}
