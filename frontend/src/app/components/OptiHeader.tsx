import { ImageWithFallback } from "./figma/ImageWithFallback";
import logo from "../../imports/image-3.png";

interface OptiHeaderProps {
  sub?: string;
  right?: React.ReactNode;
}

export function OptiHeader({ sub, right }: OptiHeaderProps) {
  return (
    <header className="flex items-center justify-between px-5 pt-6 pb-3">
      <ImageWithFallback
        src={logo}
        alt="Opti"
        style={{
          height: "64px",
          width: "auto",
          opacity: 0.92,
          mixBlendMode: "lighten",
          filter: "drop-shadow(0 0 16px rgba(76,200,240,0.18))",
          maskImage:
            "linear-gradient(to right, black 75%, transparent 100%), linear-gradient(to bottom, black 88%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, black 75%, transparent 100%), linear-gradient(to bottom, black 88%, transparent 100%)",
          maskComposite: "intersect",
          WebkitMaskComposite: "source-in",
        }}
      />
      {(sub || right) && (
        <div className="flex items-center gap-3">
          {sub && (
            <span style={{ fontSize: "0.75rem", color: "#FFFFFF", fontWeight: 600 }}>
              {sub}
            </span>
          )}
          {right}
        </div>
      )}
    </header>
  );
}
