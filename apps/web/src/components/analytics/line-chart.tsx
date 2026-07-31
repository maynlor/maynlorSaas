"use client";

import { useState } from "react";

interface DailyPoint {
  date: string;
  count: number;
}

interface LineChartProps {
  title: string;
  data: DailyPoint[];
}

const WIDTH = 600;
const HEIGHT = 160;
const PADDING_X = 8;
const PADDING_Y = 16;

/**
 * Línea de una sola serie, sin librería externa: trazo fino, extremo
 * redondeado, grilla recesiva, y un crosshair con tooltip al pasar el mouse.
 * Un solo eje (Y = cantidad, X = tiempo implícito por posición) — nunca dos
 * escalas en el mismo gráfico.
 */
export function LineChart({ title, data }: LineChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const max = Math.max(1, ...data.map((d) => d.count));
  const stepX = data.length > 1 ? (WIDTH - PADDING_X * 2) / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = PADDING_X + i * stepX;
    const y = HEIGHT - PADDING_Y - (d.count / max) * (HEIGHT - PADDING_Y * 2);
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const firstX = points[0]?.x ?? 0;
  const lastX = points[points.length - 1]?.x ?? 0;
  const areaPath = `${linePath} L ${lastX} ${HEIGHT - PADDING_Y} L ${firstX} ${HEIGHT - PADDING_Y} Z`;

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <span className="text-sm font-semibold">{total.toLocaleString("es-AR")}</span>
      </div>

      <div className="relative">
        {hovered && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-border bg-surface-raised px-2 py-1 text-xs shadow-card"
            style={{ left: `${(hovered.x / WIDTH) * 100}%`, top: "-4px" }}
          >
            <span className="font-medium text-foreground">{hovered.count}</span>{" "}
            {new Date(hovered.date).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
          </div>
        )}

        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full overflow-visible"
          role="img"
          aria-label={`${title}: ${total} en total durante el período`}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Grilla recesiva: solo la línea base, sin marcas de eje que compitan con los datos. */}
          <line
            x1={PADDING_X}
            x2={WIDTH - PADDING_X}
            y1={HEIGHT - PADDING_Y}
            y2={HEIGHT - PADDING_Y}
            stroke="hsl(230 20% 18%)"
            strokeWidth={1}
          />

          <path d={areaPath} fill="hsl(262 83% 62%)" fillOpacity={0.14} stroke="none" />
          <path d={linePath} fill="none" stroke="hsl(262 83% 62%)" strokeWidth={2} strokeLinecap="round" />

          {hovered && (
            <>
              <line
                x1={hovered.x}
                x2={hovered.x}
                y1={PADDING_Y / 2}
                y2={HEIGHT - PADDING_Y}
                stroke="hsl(225 16% 72%)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <circle
                cx={hovered.x}
                cy={hovered.y}
                r={4}
                fill="hsl(262 83% 62%)"
                stroke="hsl(230 35% 5%)"
                strokeWidth={2}
              />
            </>
          )}

          {/* Objetivos de hover más anchos que la marca real, uno por punto. */}
          {points.map((p, i) => (
            <rect
              key={p.date}
              x={p.x - stepX / 2}
              y={0}
              width={Math.max(stepX, 1)}
              height={HEIGHT}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
