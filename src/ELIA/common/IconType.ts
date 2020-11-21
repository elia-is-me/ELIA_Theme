import { StringFormat, TextRenderingHint } from "./common";
import { ui } from "./UserInterface";

const defaultRenderingHint = ui.textRender;
const _iconFontCache: Map<string, IGdiFont> = new Map();

export class SerializableIcon {
    fontName: string;
    code: string;
    fontSize: number;
    private _iconFont: IGdiFont;

    constructor(code: string, fontName: string, fontSize: number) {
        this.code = code;
        this.fontName = fontName;
        this.fontSize = fontSize;
        this._iconFont = _iconFontCache.get(`${fontName},${fontSize}`);
        if (this._iconFont == null) {
            this._iconFont = gdi.Font(fontName, fontSize);
            _iconFontCache.set(`${fontName},${fontSize}`, this._iconFont);
        }
    }

    draw(gr: IGdiGraphics, foreColor: number, x: number, y: number, width: number, height: number, sf = StringFormat.Center) {
        gr.SetTextRenderingHint(TextRenderingHint.AntiAlias);
        gr.DrawString(this.code, this._iconFont, foreColor, x, y, width, height, sf);
        gr.SetTextRenderingHint(defaultRenderingHint);
    }
}
