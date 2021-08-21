import Oscilloscope from "./objects/oscilloscope";
import SpectralAnalyser from "./objects/spectral-analyser";
import Spectrogram from "./objects/spectrogram";
import Spectroscope from "./objects/spectroscope";
import TemporalAnalyser from "./objects/temporal-analyser";

export default async () => {
    return {
        "temporalAnalyser~": TemporalAnalyser,
        "spectralAnalyser~": SpectralAnalyser,
        "scope~": Oscilloscope,
        "spectroscope~": Spectroscope,
        "spectrogram~": Spectrogram
    }
};