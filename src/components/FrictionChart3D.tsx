'use client';

import { useEffect, useRef } from 'react';

interface BarData {
    label: string;
    frictionScore: number;
    avgTime: number;
    dropOff: number;
    color: string;
}

interface FrictionChart3DProps {
    data: BarData[];
}

const BAR_DEPTH = 18;
const BAR_GAP = 14;

function getColor(score: number) {
    if (score >= 0.75) return { top: '#ef4444', side: '#991b1b', front: '#f87171' };
    if (score >= 0.5) return { top: '#f97316', side: '#c2410c', front: '#fb923c' };
    if (score >= 0.3) return { top: '#eab308', side: '#a16207', front: '#facc15' };
    return { top: '#22c55e', side: '#15803d', front: '#4ade80' };
}

export function FrictionChart3D({ data }: FrictionChart3DProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const W = canvas.offsetWidth;
        const H = canvas.offsetHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.scale(dpr, dpr);

        const n = data.length;
        const padL = 48, padR = 20, padT = 30, padB = 60;
        const chartW = W - padL - padR;
        const chartH = H - padT - padB;

        const barW = Math.floor((chartW - BAR_GAP * (n - 1)) / n);
        const skewX = BAR_DEPTH * 0.7;
        const skewY = BAR_DEPTH * 0.4;
        const maxScore = 1;

        // dark bg clear
        ctx.clearRect(0, 0, W, H);

        // Grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const yy = padT + chartH - (i / 5) * chartH;
            ctx.beginPath();
            ctx.moveTo(padL, yy);
            ctx.lineTo(padL + chartW, yy);
            ctx.stroke();
            // Y labels
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`${(i * 20)}`, padL - 6, yy + 4);
        }

        // Draw 3D bars
        data.forEach((d, i) => {
            const normH = (d.frictionScore / maxScore) * chartH;
            const x = padL + i * (barW + BAR_GAP);
            const y = padT + chartH - normH;
            const colors = getColor(d.frictionScore);

            // FRONT face
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + barW, y);
            ctx.lineTo(x + barW, padT + chartH);
            ctx.lineTo(x, padT + chartH);
            ctx.closePath();
            const gradFront = ctx.createLinearGradient(x, y, x, padT + chartH);
            gradFront.addColorStop(0, colors.front + 'ee');
            gradFront.addColorStop(1, colors.front + '66');
            ctx.fillStyle = gradFront;
            ctx.fill();

            // TOP face (parallelogram)
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + skewX, y - skewY);
            ctx.lineTo(x + barW + skewX, y - skewY);
            ctx.lineTo(x + barW, y);
            ctx.closePath();
            ctx.fillStyle = colors.top + 'ee';
            ctx.fill();

            // RIGHT/SIDE face
            ctx.beginPath();
            ctx.moveTo(x + barW, y);
            ctx.lineTo(x + barW + skewX, y - skewY);
            ctx.lineTo(x + barW + skewX, padT + chartH - skewY);
            ctx.lineTo(x + barW, padT + chartH);
            ctx.closePath();
            const gradSide = ctx.createLinearGradient(x + barW, y, x + barW + skewX, y);
            gradSide.addColorStop(0, colors.side + 'cc');
            gradSide.addColorStop(1, colors.side + '66');
            ctx.fillStyle = gradSide;
            ctx.fill();

            // Score label on top
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(
                `${(d.frictionScore * 100).toFixed(0)}`,
                x + barW / 2 + skewX / 2,
                y - skewY - 6
            );

            // X-axis label
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            // Wrap long labels
            const parts = d.label.split(' ');
            if (parts.length > 2) {
                ctx.fillText(parts.slice(0, 2).join(' '), x + barW / 2, padT + chartH + 16);
                ctx.fillText(parts.slice(2).join(' '), x + barW / 2, padT + chartH + 28);
            } else {
                ctx.fillText(d.label, x + barW / 2, padT + chartH + 16);
            }
        });

        // Title
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Friction Score (%) per step', padL, padT - 10);
    }, [data]);

    return (
        <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
        />
    );
}
