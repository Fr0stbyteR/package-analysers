import DefaultAnalyserObject from "./default";
import { SpectralAnalyserNode, Bang, isBang } from "../sdk";
import type { SpectralAnalysis, TWindowFunction } from "@jspatcher/jspatcher/src/core/worklets/SpectralAnalyserWorklet.types";
import type { IInletsMeta, IOutletsMeta, IPropsMeta } from "@jspatcher/jspatcher/src/core/objects/base/AbstractObject";

export interface P extends Record<keyof SpectralAnalysis, boolean> {
    speedLim: number;
    windowSize: number;
    fftSize: number;
    fftOverlap: number;
    windowFunction: TWindowFunction;
    continuous: boolean;
}
export interface IS {
    node: SpectralAnalyserNode;
    $requestTimer: number;
}
type Outlet0 = Partial<SpectralAnalysis>;
export default class SpectralAnalyser extends DefaultAnalyserObject<{}, {}, [Bang], [Outlet0], [], P> {
    static description = "Spectral feature extractor";
    static inlets: IInletsMeta = [{
        isHot: true,
        type: "signal",
        description: "Signal, bang to extract features"
    }];
    static outlets: IOutletsMeta = [{
        type: "object",
        description: "Features chosen as object"
    }];
    static props: IPropsMeta<P> = {
        speedLim: {
            type: "number",
            default: 16,
            description: "If continuous, value output speed limit in ms"
        },
        windowSize: {
            type: "number",
            default: 1024,
            description: "Buffer window size"
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
            default: false,
            description: "Whether output is continuous"
        },
        buffer: {
            type: "boolean",
            default: false,
            description: "Getting the signal buffer"
        },
        lastAmplitudes: {
            type: "boolean",
            default: false,
            description: "Getting the last amplitudes frame"
        },
        allAmplitudes: {
            type: "boolean",
            default: false,
            description: "Getting all the amplitudes frame"
        },
        amplitude: {
            type: "boolean",
            default: false,
            description: "Getting the sum of the last amplitude frame"
        },
        estimatedFreq: {
            type: "boolean",
            default: false,
            description: "Getting the estimated frequency"
        },
        centroid: {
            type: "boolean",
            default: false,
            description: "Getting the spectral centroid"
        },
        flatness: {
            type: "boolean",
            default: false,
            description: "Getting the spectral flatness"
        },
        flux: {
            type: "boolean",
            default: false,
            description: "Getting the spectral flux"
        },
        kurtosis: {
            type: "boolean",
            default: false,
            description: "Getting the spectral kurtosis"
        },
        skewness: {
            type: "boolean",
            default: false,
            description: "Getting the spectral skewness"
        },
        rolloff: {
            type: "boolean",
            default: false,
            description: "Getting the spectral rolloff"
        },
        slope: {
            type: "boolean",
            default: false,
            description: "Getting the spectral slope"
        },
        spread: {
            type: "boolean",
            default: false,
            description: "Getting the spectral spread"
        }
    };
    _: IS = { node: undefined, $requestTimer: -1 };
    subscribe() {
        super.subscribe();
        const startRequest = () => {
            const request = async () => {
                if (this._.node && !this._.node.destroyed) {
                    const extractorKeys = [
                        "buffer",
                        "lastAmplitudes",
                        "allAmplitudes",
                        "amplitude",
                        "estimatedFreq",
                        "centroid",
                        "flatness",
                        "flux",
                        "kurtosis",
                        "skewness",
                        "rolloff",
                        "slope",
                        "spread"
                    ] as (keyof SpectralAnalysis)[];
                    const gets: (keyof SpectralAnalysis)[] = [];
                    extractorKeys.forEach((key) => {
                        if (this.getProp(key)) gets.push(key);
                    });
                    const got = await this._.node.gets(...gets);
                    this.outlet(0, got);
                }
                if (this.getProp("continuous")) scheduleRequest();
            };
            const scheduleRequest = () => {
                this._.$requestTimer = window.setTimeout(request, this.getProp("speedLim"));
            };
            request();
        };
        this.on("preInit", () => {
            this.inlets = 1;
            this.outlets = 1;
        });
        this.on("updateProps", (props) => {
            if (this._.node) {
                const { parameters } = this._.node;
                if (props.continuous) startRequest();
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
            if (this.getProp("continuous")) startRequest();
            this.on("inlet", (e) => {
                if (e.inlet === 0) {
                    if (isBang(e.data)) startRequest();
                }
            });
        });
        this.on("destroy", () => {
            window.clearTimeout(this._.$requestTimer);
            if (this._.node) this._.node.destroy();
        });
    }
}
