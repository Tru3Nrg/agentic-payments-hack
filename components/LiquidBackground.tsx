"use client";

export const LiquidBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Gradient background matching the reference image */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(
              ellipse at top left,
              rgba(79, 70, 229, 0.5) 0%,
              rgba(124, 58, 237, 0.4) 20%,
              rgba(37, 99, 235, 0.3) 40%,
              rgba(0, 0, 0, 0.8) 70%,
              rgba(0, 0, 0, 1) 100%
            )
          `
        }}
      />
      {/* Additional gradient layer for depth */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(
              ellipse at bottom right,
              rgba(37, 99, 235, 0.4) 0%,
              rgba(30, 58, 138, 0.3) 30%,
              transparent 60%
            )
          `
        }}
      />
    </div>
  );
};

