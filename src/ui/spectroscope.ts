import * as Color from "color-js";
import Spectroscope from "../objects/spectroscope";
import { CanvasUI, MathUtils } from "../sdk";

export interface SpectroscopeUIState {
    continuous: boolean;
    frameRate: number;
    $cursor: number;
    zoom: number;
    zoomOffset: number;
    bgColor: string;
    fgColor: string;
    hueOffset: number;
    gridColor: string;
    seperatorColor: string;
    paint: {};
}
export default class SpectroscopeUI extends CanvasUI<Spectroscope, {}, SpectroscopeUIState> {
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
            // $cursor,
            bgColor,
            fgColor,
            hueOffset,
            gridColor,
            seperatorColor
        } = this.state;
        const ctx = this.ctx;
        if (!ctx) return;

        const left = 0;
        const bottom = 0;

        const lastAmplitudes = await this.object._.node.getLastAmplitudes();

        // Background
        const [width, height] = this.fullSize();
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);

        if (!lastAmplitudes) return;
        const { data: f } = lastAmplitudes;
        if (!f || !f.length || !f[0].length) return;
        const l = f[0].length;
        const channels = f.length;

        // Grids
        ctx.strokeStyle = gridColor;
        const vStep = 0.25;
        const hStep = 0.25;
        ctx.beginPath();
        ctx.setLineDash([]);
        const gridChannels = channels;
        const channelHeight = (height - bottom) / gridChannels;
        for (let i = 0; i < gridChannels; i++) {
            for (let j = vStep; j < 1; j += vStep) { // Horizontal lines
                const y = (i + j) * channelHeight;
                ctx.moveTo(left, y);
                ctx.lineTo(width, y);
            }
        }
        for (let i = hStep; i < 1; i += hStep) {
            const x = left + (width - left) * i;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, bottom);
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
        // Horizontal Range
        const $0 = 0; // Draw start
        const $1 = l; // Draw End
        const gridX = (width - left) / ($1 - $0);
        const step = Math.max(1, Math.round(1 / gridX));
        for (let i = 0; i < f.length; i++) {
            ctx.beginPath();
            channelColor[i] = Color(fgColor).shiftHue(i * hueOffset).toHSL();
            ctx.fillStyle = channelColor[i];
            let maxInStep;
            for (let j = $0; j < $1; j++) {
                const samp = MathUtils.atodb(f[i][j]);
                const $step = (j - $0) % step;
                if ($step === 0) maxInStep = samp;
                if ($step !== step - 1) {
                    if ($step !== 0 && samp > maxInStep) maxInStep = samp;
                    continue;
                }
                const x = (j - $0) * gridX + left;
                const y = channelHeight * (i + 1 - Math.min(1, Math.max(0, maxInStep / 100 + 1)));
                if (j === $0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.lineTo(width, channelHeight * (i + 1));
            ctx.lineTo(left, channelHeight * (i + 1));
            ctx.closePath();
            ctx.fill();
        }
    }
}
