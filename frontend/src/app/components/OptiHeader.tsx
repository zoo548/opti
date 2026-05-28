import { ImageWithFallback } from "./figma/ImageWithFallback";
import logo from "../../imports/image-3.png";

interface OptiHeaderProps {
  sub?: string;
  right?: React.ReactNode;
}

export function OptiHeader({ sub, right }: OptiHeaderProps) {
  return (
    <div className="relative pt-12 pb-4">
      {/* Right slot — absolute so logo stays centered */}
      {(sub || right) && (
        <div className="absolute right-5 top-12 flex items-center gap-3">
          {sub && <span style={{ fontSize: "0.75rem", color: "#5A6A8A" }}>{sub}</span>}
          {right}
        </div>
      )}

      {/* Centered logo */}
      <div className="flex justify-center">
        <ImageWithFallback
          src={logo}
          alt="Opti — Optimal Route Finder"
          style={{
            height: "100px",
            width: "auto",
            maskImage: "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
            maskComposite: "intersect",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)",
            WebkitMaskComposite: "source-in",
          }}
        />
      </div>
    </div>
  );
}
