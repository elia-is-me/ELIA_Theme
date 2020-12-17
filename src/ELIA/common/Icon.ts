import { StringFormat, TextRenderingHint } from "./common";
import { ui } from "./UserInterface";

export const Material = {
    sort: '\ue0c3',
    edit: '\ue254',
    circle_add: '\ue3ba',
    add: '\ue145',
    shuffle: '\ue043',
    gear: '\ue8b8',
    heart: '\ue87d',
    heart_empty: '\ue87e',
    play: '\ue037',
    circle_play: '\ue039',
    volume: '\ue050',
    volume_mute: '\ue04e',
    volume_off: '\ue04f',
    more_horiz: '\ue5d3',
    music_note: '\ue3a1',
    star_border: '\ue83a',
    queue_music: '\ue03d',
    event: '\ue8df',
    add_circle_outline: '\ue3ba',
    search: '\ue8b6',
    settings: '\ue8b8',
    menu: '\ue5d2',
    history: '\ue8b3',
    close: '\ue14c',
    repeat: '\ue040',
    repeat1: '\ue041',
    default_order: '\ue16d',
    play_arrow: '\ue037',
    pause: '\ue034',
    skip_next: '\ue044',
    skip_prev: '\ue045',
    arrow_drop_down: '\ue5c5',
    apps: '\ue5c3',
    "more_vert": '\ue5d4'
};

export const MaterialFont = "Material Icons";


const defaultRenderingHint = ui.textRender;
const _iconFontCache: Map<string, IGdiFont> = new Map();

export class IconObject {
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

    get iconFont() {
        return this._iconFont;
    }

    draw(gr: IGdiGraphics, foreColor: number, x: number, y: number, width: number, height: number, sf = StringFormat.Center) {
        gr.SetTextRenderingHint(TextRenderingHint.AntiAlias);
        gr.DrawString(this.code, this._iconFont, foreColor, x, y, width, height, sf);
        gr.SetTextRenderingHint(defaultRenderingHint);
    }
}