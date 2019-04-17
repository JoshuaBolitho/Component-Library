// animations
import MasterClock from './animation/MasterClock';
import SpriteSheetPlayer from './animation/SpriteSheetPlayer';

// audio
import MasterAudio from './audio/MasterAudio';
import MultiTrackCrossFader from './audio/MultiTrackCrossFader';

// effects
import TextFade from './effects/TextFade';

// interaction
import Button from './interaction/Button';

// loaders
import ImageCache from './loader/ImageCache';
import JSONLoader from './loader/JSONLoader';

// math
import DeviceDetect from './device/DeviceDetect';

// noise 
import NoiseSmoothing from './noise/NoiseSmoothing';
import OneDimensionalNoise from './noise/OneDimensionalNoise';

// video
import VideoPlayerVimeo from './video/VideoPlayerVimeo';
import WebcamStream from './video/WebcamStream';


export default {
    MasterClock: MasterClock,
    SpriteSheetPlayer: SpriteSheetPlayer,
    MasterAudio: MasterAudio,
    MultiTrackCrossFade: MultiTrackCrossFade,
    TextFade: TextFade,
    Button: Button,
    ImageCache: ImageCache,
    JSONLoader: JSONLoader,
    DeviceDetect: DeviceDetect,
    NoiseSmoothing: NoiseSmoothing,
    OneDimensionalNoise: OneDimensionalNoise,
    VideoPlayerVimeo: VideoPlayerVimeo,
    WebcamStream: WebcamStream
};