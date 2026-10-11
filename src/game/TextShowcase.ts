import { HorizontalAlign, TextField, VerticalAlign } from "@kurot/core";
import type { Stage } from "@kurot/core";

function field(stage: Stage, y: number, height: number): TextField {
    const text = new TextField();
    text.x = 28;
    text.y = y;
    text.width = 304;
    text.height = height;
    text.fontFamily = "sans-serif";
    text.textAlign = HorizontalAlign.CENTER;
    stage.addChild(text);
    return text;
}

export class TextShowcase {
    private readonly counter: TextField;

    public constructor(stage: Stage) {
        const title = field(stage, 25, 34);
        title.multiline = false;
        title.stroke = 0.8;
        title.strokeColor = 0x080e1a;
        title.textFlow = [
            {
                text: "Kurot ",
                style: { size: 24, bold: true, textColor: 0x67e3bb },
            },
            { text: "TextField", style: { size: 20, textColor: 0xd6e2f5 } },
        ];
        const subtitle = field(stage, 64, 18);
        subtitle.size = 12;
        subtitle.textColor = 0x94a5c4;
        subtitle.text = "中文 · ABC 123 · 系统字体回退";

        const paragraph = field(stage, 330, 48);
        paragraph.size = 15;
        paragraph.lineSpacing = 5;
        paragraph.wordWrap = true;
        paragraph.multiline = true;
        paragraph.verticalAlign = VerticalAlign.TOP;
        paragraph.textColor = 0x94a5c4;
        paragraph.text =
            "文字跟随 Kurot 场景树一起绘制。改变宽度，就能自动换行。";

        this.counter = field(stage, 461, 24);
        this.counter.size = 14;
        this.counter.bold = true;
        this.counter.textColor = 0x67e3bb;
        this.counter.multiline = false;
        this.update(0, 0);
    }

    public update(taps: number, drags: number): void {
        this.counter.text = `点击 ${taps} · 拖动 ${drags}`;
    }
}
