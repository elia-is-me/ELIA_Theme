import { TextRenderingHint } from "./common";
import { StringFormat } from "./String";
import { ui } from "./UserInterface";

export const Material = {
    add_circle_outline: '\ue3ba',
    add: '\ue145',
    apps: '\ue5c3',
    arrow_drop_down: '\ue5c5',
    circle_add: '\ue3ba',
    circle_play: '\ue039',
    close: '\ue14c',
    default_order: '\ue16d',
    disc: '\ue39e',
    edit: '\ue254',
    event: '\ue8df',
    gear: '\ue8b8',
    heart_empty: '\ue87e',
    heart: '\ue87d',
    history: '\ue8b3',
    menu: '\ue5d2',
    more_horiz: '\ue5d3',
    more_vert: '\ue5d4',
    music_note: '\ue3a1',
    pause: '\ue034',
    play_arrow: '\ue037',
    play: '\ue037',
    queue_music: '\ue03d',
    repeat: '\ue040',
    repeat1: '\ue041',
    search: '\ue8b6',
    settings: '\ue8b8',
    shuffle: '\ue043',
    skip_next: '\ue044',
    skip_prev: '\ue045',
    sort: '\ue0c3',
    star_border: '\ue83a',
    volume_mute: '\ue04e',
    volume_off: '\ue04f',
    volume: '\ue050',
    time: '\ue192',
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