import BaseAnalyserObject from "./base";
import OscilloscopeUI from "../ui/oscilloscope";
import { SpectralAnalyserNode, Bang, isBang } from "../sdk";
import type { OscilloscopeUIState } from "../ui/oscilloscope";
import type { TWindowFunction } from "@jspatcher/jspatcher/src/core/worklets/SpectralAnalyserWorklet.types";
import type { IInletsMeta, IPropsMeta } from "@jspatcher/jspatcher/src/core/objects/base/AbstractObject";

export interface IS {
    node: SpectralAnalyserNode;
}
export interface P extends Omit<OscilloscopeUIState, "$cursor" | "zoom" | "zoomOffset" | "paint"> {
    windowSize: number;
    fftSize: number;
    fftOverlap: number;
    windowFunction: TWindowFunction;
}
export default class Oscilloscope extends BaseAnalyserObject<{}, {}, [Bang], [], [], P, OscilloscopeUIState> {
    static description = "Oscilloscope";
    static inlets: IInletsMeta = [{
        isHot: true,
        type: "signal",
        description: "Signal"
    }];
    static props: IPropsMeta<P> = {
        windowSize: {
            type: "number",
            default: 1024,
            description: "Signal window size"
        },
        fftSize: {
            type: "number",
            default: 1024,
            description: "FFT Size for analysis"
        },
        fftOverlap: {
            type: "number",
            default: 2,
            description: "FFT overlap count (integer)"
        },
        windowFunction: {
            type: "enum",
            enums: ["blackman", "hamming", "hann", "triangular"],
            default: "blackman",
            description: "Window Function aoolied for FFT analysis window"
        },
        continuous: {
            type: "boolean",
            default: true,
            description: "Continuous drawing",
            isUIState: true
        },
        frameRate: {
            type: "number",
            default: 60,
            description: "UI refresh rate",
            isUIState: true
        },
        interleaved: {
            type: "boolean",
            default: false,
            description: "Draw channels seperately",
            isUIState: true
        },
        stablize: {
            type: "boolean",
            default: true,
            description: "Stablize",
            isUIState: true
        },
        range: {
            type: "number",
            default: 1,
            description: "Vertical range",
            isUIState: true
        },
        autoRange: {
            type: "boolean",
            default: true,
            description: "Auto adjust range if > 1",
            isUIState: true
        },
        showStats: {
            type: "boolean",
            default: true,
            description: "Show stats texts",
            isUIState: true
        },
        bgColor: {
            type: "color",
            default: "rgb(40, 40, 40)",
            description: "Background color",
            isUIState: true
        },
        phosphorColor: {
            type: "color",
            default: "hsl(0, 100%, 85%)",
            description: "Phosphor color",
            isUIState: true
        },
        hueOffset: {
            type: "number",
            default: 60,
            description: "Channel Color Hue offset",
            isUIState: true
        },
        textColor: {
            type: "color",
            default: "#DDDD99",
            description: "Info text color",
            isUIState: true
        },
        gridColor: {
            type: "color",
            default: "#404040",
            description: "Grid color",
            isUIState: true
        },
        seperatorColor: {
            type: "color",
            default: "white",
            description: "Channel seperator color",
            isUIState: true
        }
    };
    static UI = OscilloscopeUI;
    _: IS = { node: undefined };
    subscribe() {
        super.subscribe();
        this.on("preInit", () => {
            this.inlets = 1;
            this.outlets = 0;
        });
        this.on("updateProps", (props) => {
            if (this._.node) {
                const { parameters } = this._.node;
                if (props.windowFunction) this.applyBPF(parameters.get("windowFunction"), [[["blackman", "hamming", "hann", "triangular"].indexOf(props.windowFunction)]]);
                if (props.fftSize) this.applyBPF(parameters.get("fftSize"), [[props.fftSize]]);
                if (props.fftOverlap) this.applyBPF(parameters.get("fftOverlap"), [[props.fftOverlap]]);
                if (props.windowSize) this.applyBPF(parameters.get("windowSize"), [[props.windowSize]]);
            }
        });
        this.on("postInit", async () => {
            await SpectralAnalyserNode.register(this.audioCtx.audioWorklet);
            this._.node = new SpectralAnalyserNode(this.audioCtx);
            const { parameters } = this._.node;
            this.applyBPF(parameters.get("windowFunction"), [[["blackman", "hamming", "hann", "triangular"].indexOf(this.getProp("windowFunction"))]]);
            this.applyBPF(parameters.get("fftSize"), [[this.getProp("fftSize")]]);
            this.applyBPF(parameters.get("fftOverlap"), [[this.getProp("fftOverlap")]]);
            this.applyBPF(parameters.get("windowSize"), [[this.getProp("windowSize")]]);
            this.disconnectAudioInlet();
            this.inletAudioConnections[0] = { node: this._.node, index: 0 };
            this.connectAudioInlet();
        });
        this.on("inlet", ({ data, inlet }) => {
            if (inlet === 0) {
                if (isBang(data)) this.updateUI({ paint: {} });
            }
        });
        this.on("destroy", () => {
            if (this._.node) this._.node.destroy();
        });
    }
}
