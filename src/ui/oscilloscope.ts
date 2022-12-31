import * as Color from "color-js";
import { CanvasUI } from "../sdk";
import type Oscilloscope from "../objects/oscilloscope";

export interface OscilloscopeUIState {
    continuous: boolean;
    frameRate: number;
    interleaved: boolean;
    stablize: boolean;
    $cursor: number;
    zoom: number;
    zoomOffset: number;
    range: number;
    autoRange: boolean;
    showStats: boolean;
    bgColor: string;
    phosphorColor: string;
    hueOffset: number;
    textColor: string;
    gridColor: string;
    seperatorColor: string;
    paint: {};
}
export default class OscilloscopeUI extends CanvasUI<Oscilloscope, {}, OscilloscopeUIState> {
    static defaultSize = [120, 60] as [number, number];
    componentDidMount() {
        const { bgColor } = this.state;
        const ctx = this.ctx;
        if (!ctx) return;
        const [width, height] = this.fullSize();
        // Background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);
        super.componentDidMount();
    }
    async paint() {
        if (this.state.continuous) this.schedulePaint();
        if (!this.object._.node) return;
        if (this.object._.node.destroyed) return;
        const {
            // width,
            // height,
            // zoom,
            // zoomOffset,
            stablize,
            interleaved,
            // $cursor,
            range,
            autoRange,
            showStats,
            bgColor,
            phosphorColor,
            hueOffset,
            textColor,
            gridColor,
            seperatorColor
        } = this.state;
        const ctx = this.ctx;
        if (!ctx) return;

        const left = 0;
        const bottom = 0;

        const { estimatedFreq, buffer } = await this.object._.node.gets("estimatedFreq", "buffer");
        const l = this.object.getProp("windowSize");
        const { sampleRate } = this.object.audioCtx;

        // Background
        const [width, height] = this.fullSize();
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);

        if (!buffer) return;

        const { $read: $ui32, data: t } = buffer;
        if (!t || !t.length || !t[0].length) return;

        const $ = Atomics.load($ui32, 0);
        const channels = t.length;
        const dl = t[0].length;
        // Vertical Range
        let yMin = -range;
        let yMax = range;
        let yFactor = range;
        if (autoRange) {
            // Fastest way to get min and max to have: 1. max abs value for y scaling, 2. mean value for zero-crossing
            let i = channels;
            let s: number;
            while (i--) {
                let j = l;
                while (j--) {
                    s = t[i][($ + j) % dl];
                    if (s < yMin) yMin = s;
                    else if (s > yMax) yMax = s;
                }
            }
            yFactor = Math.max(1, Math.abs(yMin), Math.abs(yMax))/* * vzoom*/;
        }
        const calcY = (v: number, i: number) => channelHeight * (+interleaved * i + 1 - (v - yMin) / (yMax - yMin));
        // Grids
        ctx.strokeStyle = gridColor;
        let vStep = 0.25;
        while (yFactor / 2 / vStep > 2) vStep *= 2; // Minimum horizontal grids in channel one side = 2
        ctx.beginPath();
        ctx.setLineDash([]);
        const gridChannels = interleaved ? channels : 1;
        const channelHeight = (height - bottom) / gridChannels;
        for (let i = 0; i < gridChannels; i++) {
            let y = calcY(0, i);
            ctx.moveTo(left, y);
            ctx.lineTo(width, y); // 0-line
            for (let j = vStep; j < yFactor; j += vStep) {
                y = calcY(j, i);
                ctx.moveTo(left, y);
                ctx.lineTo(width, y); // below 0
                y = calcY(-j, i);
                ctx.moveTo(left, y);
                ctx.lineTo(width, y); // above 0
            }
        }
        ctx.stroke();

        ctx.beginPath();
        ctx.setLineDash([4, 2]);
        ctx.strokeStyle = seperatorColor;
        for (let i = 1; i < gridChannels; i++) {
            ctx.moveTo(left, i * channelHeight);
            ctx.lineTo(width, i * channelHeight);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 2;
        const channelColor: string[] = [];
        let $zerox = 0; // First Zero-crossing of first channel
        const period = sampleRate / estimatedFreq[0];
        const times = Math.floor(l / period) - 1;
        for (let i = 0; i < channels; i++) {
            // Horizontal Range
            let $0 = 0; // Draw start
            let $1 = l; // Draw End
            let drawL = l; // Length to draw
            if (stablize) { // Stablization
                if (i === 0) {
                    const thresh = (yMin + yMax) * 0.5 + 0.001; // the zero-crossing with "offset"
                    while ($zerox < l && t[i][($ + $zerox++) % dl] > thresh); // Find first raise
                    if ($zerox >= l - 1) { // Found nothing, no stablization
                        $zerox = 0;
                    } else {
                        while ($zerox < l && t[i][($ + $zerox++) % dl] < thresh); // Find first drop
                        $zerox--;
                        if ($zerox >= l - 1 || $zerox < 0) {
                            $zerox = 0;
                        }
                    }
                }
                drawL = times > 0 && isFinite(period) ? ~~Math.min(period * times, l - $zerox) : l - $zerox; // length to draw
            }
            $0 = Math.round($zerox/* + drawL * zoomOffset*/);
            $1 = Math.round($zerox + drawL/* / zoom + drawL * zoomOffset*/);
            const pixelsPerSamp = (width - left) / ($1 - 1 - $0);
            const sampsPerPixel = Math.max(1, Math.round(1 / pixelsPerSamp));

            if (interleaved) {
                ctx.save();
                const clip = new Path2D();
                clip.rect(0, i * channelHeight, width, channelHeight);
                ctx.clip(clip);
            }
            ctx.beginPath();
            channelColor[i] = Color(phosphorColor).shiftHue(i * hueOffset).toHSL();
            ctx.strokeStyle = channelColor[i];
            let maxInStep: number;
            let minInStep: number;
            let $j: number;
            let samp: number;
            let $step: number;
            let x: number;
            let y: number;
            for (let j = $0; j < $1; j++) {
                $j = (j + $) % dl;
                samp = t[i][$j];
                $step = (j - $0) % sampsPerPixel;
                if ($step === 0) {
                    maxInStep = samp;
                    minInStep = samp;
                } else {
                    if (samp > maxInStep) maxInStep = samp;
                    if (samp < minInStep) minInStep = samp;
                }
                if ($step !== sampsPerPixel - 1) continue;
                x = (j - $step - $0) * pixelsPerSamp;
                y = calcY(maxInStep, i);
                if (j === $0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
                if (minInStep !== maxInStep) {
                    y = calcY(minInStep, i);
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
            if (interleaved) ctx.restore();
        }
        // Stats
        if (showStats) {
            ctx.font = "bold 12px Consolas, monospace";
            ctx.fillStyle = textColor;
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText(yFactor.toFixed(2), 2, 2);
            ctx.textBaseline = "bottom";
            ctx.fillText((-yFactor).toFixed(2), 2, height - 2);
            ctx.textAlign = "right";
            const freqStatY = height - 2 - (estimatedFreq.length - 1) * 14;
            for (let i = 0; i < estimatedFreq.length; i++) {
                const freq = estimatedFreq[i];
                ctx.fillStyle = channelColor[i];
                const y = interleaved ? channelHeight * (i + 1) - 2 : freqStatY + 14 * i;
                ctx.fillText(freq.toFixed(2) + "Hz", width - 2, y);
            }
        }
    }
}
