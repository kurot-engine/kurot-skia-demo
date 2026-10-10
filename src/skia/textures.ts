import { BitmapData, Texture } from '@kurot/core';
import type { SkImage } from 'react-native-skia';

const images = new WeakMap<BitmapData, SkImage>();

/**
 * The caller owns the SkImage. BitmapData carries geometry without a DOM source.
 */
export function createSkiaTexture(image: SkImage, resolution = 1): Texture {
    const data = new BitmapData();
    data.width = image.width();
    data.height = image.height();
    data.deleteSource = false;
    images.set(data, image);
    const texture = new Texture(resolution);
    texture.setBitmapData(data);
    return texture;
}

export function getSkiaImage(data: BitmapData): SkImage | undefined {
    return images.get(data);
}
