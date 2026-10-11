import { Resource } from '@kurot/core';
import type { Stage } from '@kurot/core';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { View } from 'react-native';

import './src/resources/bundled';
import { resourceConfigURL, resourceRoot } from './src/generated/kurot/assets';
import { UIShowcase } from './src/game/UIShowcase';
import { SpineShowcase } from './src/game/SpineShowcase';
import { KurotView } from '@kurot/skia';
import type { NativeScene } from '@kurot/skia';

function reportError(message: string): void {
    console.error(`Kurot native: ${message}`);
}

export function App(): ReactElement {
    const [resources, setResources] = useState<Resource>();
    const [scene, setScene] = useState<'spine' | 'ui'>('spine');
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
        return scene === 'spine'
            ? new SpineShowcase(stage, resources, () => setScene('ui'), reportError)
            : new UIShowcase(stage, resources, () => setScene('spine'));
    }, [resources, scene]);

    return resources
        ? <KurotView width={360} createScene={createScene} onError={reportError} />
        : <View style={{ flex: 1, backgroundColor: '#10192b' }} />;
}
