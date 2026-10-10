import { Resource } from '@kurot/core';
import type { Stage } from '@kurot/core';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { View } from 'react-native';

import './src/resources/bundled';
import { resourceConfigURL, resourceRoot } from './src/generated/kurot/assets';
import { UIShowcase } from './src/game/UIShowcase';
import { KurotView } from '@kurot/skia';
import type { NativeScene } from '@kurot/skia';

function reportError(message: string): void {
    console.error(`Kurot native: ${message}`);
}

export function App(): ReactElement {
    const [resources, setResources] = useState<Resource>();
    useEffect(() => {
        StatusBar.setHidden(true);
        const manager = new Resource();
        let mounted = true;
        const loading = (async (): Promise<void> => {
            await manager.loadConfig(resourceConfigURL, resourceRoot);
            await manager.loadGroup('preload');
            if (mounted) {
                setResources(manager);
            }
        })().catch((failure: unknown) => {
            manager.destroyAll();
            if (mounted) {
                reportError(failure instanceof Error ? failure.message : String(failure));
            }
        });
        return () => {
            mounted = false;
            StatusBar.setHidden(false);
            // Core has no group abort: release after any pending decode has finished.
            void loading.then(() => manager.destroyAll());
        };
    }, []);
    const createScene = useCallback((stage: Stage): NativeScene => {
        if (!resources) {
            throw new Error('Kurot resources have not loaded.');
        }
        return new UIShowcase(stage, resources);
    }, [resources]);

    return resources
        ? <KurotView width={360} createScene={createScene} onError={reportError} />
        : <View style={{ flex: 1, backgroundColor: '#10192b' }} />;
}
