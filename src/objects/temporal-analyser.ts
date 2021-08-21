import DefaultAnalyserObject from "./default";
import { TemporalAnalyserNode, Bang, isBang } from "../sdk";
import type { TemporalAnalysis } from "@jspatcher/jspatcher/src/core/worklets/TemporalAnalyserWorklet.types";
import type { IInletsMeta, IOutletsMeta, IPropsMeta } from "@jspatcher/jspatcher/src/core/objects/base/AbstractObject";

export interface P extends Record<keyof TemporalAnalysis, boolean> {
    speedLim: number;
    windowSize: number;
    continuous: boolean;
}
export interface IS {
    node: TemporalAnalyserNode;
    $requestTimer: number;
}
type Outlet0 = Partial<TemporalAnalysis>;
export default class TemporalAnalyser extends DefaultAnalyserObject<{}, IS, [Bang], [Outlet0], [], P> {
    static description = "Temporal feature extractor";
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
        absMax: {
            type: "boolean",
            default: false,
            description: "Getting the absolute Maximum"
        },
        rms: {
            type: "boolean",
            default: false,
            description: "Getting the Root Mean Square"
        },
        zcr: {
            type: "boolean",
            default: false,
            description: "Getting the zero crossing count"
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
                        "rms",
                        "zcr",
                        "absMax"
                    ] as (keyof TemporalAnalysis)[];
                    const gets: (keyof TemporalAnalysis)[] = [];
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
                if (props.windowSize) this.applyBPF(parameters.get("windowSize"), [[props.windowSize]]);
            }
        });
        this.on("postInit", async () => {
            await TemporalAnalyserNode.register(this.audioCtx.audioWorklet);
            this._.node = new TemporalAnalyserNode(this.audioCtx);
            const { parameters } = this._.node;
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
