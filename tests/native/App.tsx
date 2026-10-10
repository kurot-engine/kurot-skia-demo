import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import '../../src/resources/bundled';
import { SkiaRenderer } from '@kurot/skia';
import { runAdapterChecks } from './adapter.test';
import { runResourceChecks } from './resources.test';
import { runTextChecks } from './text.test';
import { runUIChecks } from './ui.test';
import { runGPUNineSliceChecks } from './gpu-nine-slice.test';
import { runNineSliceCacheChecks } from './nine-slice-cache.test';

/**
 * Separate device test entry: runs against Skia JSI, not mocked Node bindings.
 */
export function App(): ReactElement {
    const [result, setResult] = useState('Running native tests…');
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let mounted = true;
        const run = async (): Promise<void> => {
            const renderer = new SkiaRenderer();
            try {
                runAdapterChecks();
                runTextChecks();
                await runResourceChecks();
                await runUIChecks();
                await runGPUNineSliceChecks();
                runNineSliceCacheChecks();
            } finally {
                renderer.dispose();
            }
        };
        void run().then(() => {
            console.info('Kurot Skia: all native tests passed.');
            if (mounted) {
                setFailed(false);
                setResult('PASS\nNative adapter\nNative resources\nNative TextField\nNative UI / original KUI skin\nGPU nine-slice / fractional transforms\nNative nine-slice cache lifecycle');
            }
        }, (error: unknown) => {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`Kurot Skia: native tests failed: ${error instanceof Error ? error.stack ?? message : message}`);
            if (mounted) {
                setFailed(true);
                setResult(`FAIL\n${message}`);
            }
        });
        return () => {
            mounted = false;
        };
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Kurot native tests</Text>
            <Text style={[styles.result, failed && styles.failed]}>{result}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#080e1a', padding: 28, justifyContent: 'center' },
    title: { color: '#f4f7ff', fontSize: 28, fontWeight: '700', marginBottom: 24 },
    result: { color: '#67e3bb', fontSize: 18, lineHeight: 28 },
    failed: { color: '#ffb0b0' },
});
