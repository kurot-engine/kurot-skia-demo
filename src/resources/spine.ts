import { AtlasAttachmentLoader, KurotAssetManager, SkeletonBinary } from '@kurot/spine-4.2';
import type { SkeletonData, TextureAtlas } from '@kurot/spine-4.2';

export interface SpineAssets {
    data: SkeletonData;
    dispose(): void;
}

/**
 * Uses the original SDK loader against the generated bundled resource map.
 * Call dispose only after all live actors and sampled caches are released.
 */
export async function loadSpineAssets(): Promise<SpineAssets> {
    const manager = new KurotAssetManager('resource/spine/4.2/');
    try {
        const [atlas, bytes] = await Promise.all([
            new Promise<TextureAtlas>((resolve, reject) => {
                manager.loadTextureAtlas('spineboy.atlas', (_, value) => resolve(value),
                    (_, message) => reject(new Error(message)));
            }),
            new Promise<Uint8Array>((resolve, reject) => {
                manager.loadBinary('spineboy-pro.skel', (_, value) => resolve(value),
                    (_, message) => reject(new Error(message)));
            }),
        ]);
        const data = new SkeletonBinary(new AtlasAttachmentLoader(atlas)).readSkeletonData(bytes);
        return { data, dispose: () => manager.dispose() };
    } catch (error) {
        manager.dispose();
        throw error;
    }
}
