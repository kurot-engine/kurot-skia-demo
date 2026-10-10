import type { Stage } from '@kurot/core';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useImage } from 'react-native-skia';

import { Playground } from './src/game/Playground';
import { KurotView } from './src/skia/KurotView';
import type { NativeScene } from './src/skia/KurotView';

export function App(): ReactElement {
    const [error, setError] = useState('');
    const [stats, setStats] = useState({ fps: 0, draws: 0, frames: 0 });
    const [interaction, setInteraction] = useState({ taps: 0, drags: 0 });
    const onImageError = useCallback((failure: Error) => setError(failure.message), []);
    const image = useImage(require('./assets/kurot-logo.png'), onImageError);
    const createScene = useCallback((stage: Stage): NativeScene => {
        if (!image) {
            throw new Error('Kurot image has not loaded.');
        }
        setInteraction({ taps: 0, drags: 0 });
        return new Playground(stage, image, setInteraction);
    }, [image]);

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <View style={styles.header}>
                <Text style={styles.eyebrow}>NATIVE PLAYGROUND / 01</Text>
                <Text style={styles.title}>Kurot × Skia</Text>
                <Text style={styles.subtitle}>轻触画布，拖动中间的小家伙。</Text>
            </View>
            <View style={styles.stage}>
                {image && <KurotView width={360} height={500} createScene={createScene}
                    onStats={setStats} onError={setError} />}
                {!image && <Text style={styles.subtitle}>正在加载场景…</Text>}
            </View>
            <View style={styles.stats}>
                <Text style={styles.metric}>{stats.fps} FPS</Text>
                <Text style={styles.metric}>{stats.draws} draws</Text>
                <Text style={styles.metric}>点击 {interaction.taps} · 拖动 {interaction.drags}</Text>
            </View>
            <Text style={styles.footer}>Core 2.5.3 · Skia 3.3 · 原生 GPU 画布</Text>
            {!!error && <Text style={styles.error}>{error}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#080e1a', paddingTop: 48, paddingBottom: 28, paddingHorizontal: 20 },
    header: { marginBottom: 24 },
    eyebrow: { color: '#67e3bb', fontSize: 11, letterSpacing: 2, marginBottom: 10, fontWeight: '600' },
    title: { color: '#f4f7ff', fontSize: 34, fontWeight: '700', letterSpacing: -1 },
    subtitle: { color: '#94a5c4', fontSize: 13, marginTop: 10 },
    stage: { flex: 1, borderRadius: 24, borderWidth: 1, borderColor: '#23344f', overflow: 'hidden' },
    stats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
    metric: { color: '#d6e2f5', fontSize: 12, fontVariant: ['tabular-nums'] },
    footer: { color: '#617494', fontSize: 11, marginTop: 12 },
    error: { color: '#ffb0b0', fontSize: 12, marginTop: 12 },
});
