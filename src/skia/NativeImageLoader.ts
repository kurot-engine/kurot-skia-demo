import { loadImage } from 'react-native-skia';

import { Event } from '../../node_modules/@kurot/core/dist/kurot/events/Event.js';
import { EventDispatcher } from '../../node_modules/@kurot/core/dist/kurot/events/EventDispatcher.js';
import { IOErrorEvent } from '../../node_modules/@kurot/core/dist/kurot/events/IOErrorEvent.js';
import type { BitmapData } from '../../node_modules/@kurot/core/dist/kurot/display/texture/BitmapData.js';
import type { ImageLoaderEvents } from '../../node_modules/@kurot/core/dist/kurot/net/ImageLoader.js';

import { getNativeAsset, isNativeURI } from './native-assets';
import { createSkiaBitmapData } from './textures';

/**
 * Core ImageLoader contract backed by Skia's native asynchronous decoder.
 */
export class ImageLoader extends EventDispatcher<ImageLoaderEvents> {
    public static crossOrigin?: string;

    public data?: BitmapData;
    public crossOrigin?: string = ImageLoader.crossOrigin;
    private generation = 0;

    public load(url: string): void {
        this.close();
        void this.decode(url, this.generation);
    }

    public close(): void {
        this.generation++;
    }

    private async decode(url: string, generation: number): Promise<void> {
        let bitmapData: BitmapData;
        try {
            const asset = getNativeAsset(url);
            if (asset && asset.kind !== 'image') {
                throw new Error(`Expected an image asset: ${url}`);
            }
            if (!asset && !isNativeURI(url)) {
                throw new Error(`Image is absent from the Metro asset map: ${url}`);
            }
            const image = await loadImage(asset?.source ?? url);
            if (!image) {
                throw new Error(`Unable to decode image: ${url}`);
            }
            if (generation !== this.generation) {
                image.dispose();
                return;
            }
            bitmapData = createSkiaBitmapData(image);
        } catch {
            if (generation === this.generation) {
                IOErrorEvent.dispatchIOErrorEvent(this);
            }
            return;
        }
        this.data = bitmapData;
        this.dispatchEventWith(Event.COMPLETE);
    }
}
