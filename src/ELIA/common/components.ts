import { throttle, isObject, StringFormat, scale, CropImage, TextRenderingHint } from "./common"

// Generate component id;
const get_cid = (() => {
    let count = 0;
    return () => ++count;
})();

const by_z = (a: Component, b: Component) => a.z - b.z;
export const Repaint = () => window.Repaint();
export const ThrottledRepaint = throttle(Repaint, 15);

interface ICallbacks {
    on_paint?: (gr: IGdiGraphics) => void;
    on_size?: () => void;
    on_mouse_move?: (x: number, y: number) => void;
    on_mouse_lbtn_down?: (x: number, y: number) => void;
    on_mouse_lbtn_up?: (x: number, y: number) => void;
    on_mouse_lbtn_dblclk?: (x: number, y: number) => void;
    on_mouse_rbtn_down?: (x: number, y: number) => void;
    on_mouse_rbtn_up?: (x: number, y: number) => void;
    on_mouse_leave?: () => void;
    on_mouse_wheel?: (step: number) => void;
    on_char?: (code: number) => void;
    on_focus?: (focus: boolean) => void;
    on_key_down?: (vkey: number) => void;
    on_key_up?: (vkey: number) => void;
}

export interface IBox {
    x: number;
    y: number;
    z?: number;
    width: number;
    height: number;
}

interface TEST {
    parent: Component;
    children: Component[];
}

export class Component implements IBox, TEST {
    readonly cid: number = get_cid();
    private _visible: boolean = true;
    private _shouldUpdateOnInit = true;
    x: number = 0;
    y: number = 0;
    z: number = 0;
    width: number = 0;
    height: number = 0;
    parent: Component;
    children: Component[] = [];

    constructor(attrs: object) {
        Object.assign(this, attrs);
    }

    on_paint(gr: IGdiGraphics) { }
    on_size() { }
    on_init() { }

    addChild(node: Component) {
        if (!(node instanceof Component)) {
            throw new Error("Component.addChild: Invalid param.");
        };

        if (node.parent != null) {
            node.parent.removeChild(node);
        }

        node.parent = this;
        this.children.push(node);
        this.children.sort(by_z);
        this.resetUpdateState();
    }

    removeChild(node: Component) {
        if (!(node instanceof Component) || node.parent !== this) {
            return;
        } else {
            node.parent = null;
            this.children = this.children.filter(child => child.parent === this);
        }
        this.resetUpdateState();
    }

    isVisible() {
        return this._visible && this.width > 0 && this.height > 0;
    }

    get visible() {
        return this._visible
    }

    set visible(val: boolean) {
        if (val !== this._visible) {
            this._visible = val;
            this._shouldUpdateOnInit = true;
        }
    }

    trace(x: number, y: number) {
        return this.isVisible()
            && x > this.x && x <= this.x + this.width
            && y > this.y && y <= this.y + this.height;
    }

    setSize(x: number, y: number, width?: number, height?: number) {
        let visibleBefore_ = this.isVisible();
        this.x = x;
        this.y = y;
        if (width != null) {
            this.width = width;
            this.height = height;
        }
        let visibleNow_ = this.isVisible();
        if (visibleNow_) {
            invoke(this, 'on_size');
        }
        if (visibleNow_ !== visibleBefore_) {
            this._shouldUpdateOnInit = true;
        }
    }

    didUpdateOnInit() {
        this._shouldUpdateOnInit = false;
    }

    resetUpdateState() {
        this._shouldUpdateOnInit = true;
    }

    shouldUpdateOnInit() {
        return this._shouldUpdateOnInit;
    }

    onNotifyData(str: string, info: any) { }

    repaint() {
        window.RepaintRect(this.x, this.y, this.width, this.height);
    }
}


export function invoke(obj: object, method: string, ...var_args: any[]) {
    if (!obj) { return }
    let func = (<any>obj)[method];
    return func == null ? null : func.apply(obj, var_args);
}

export enum ButtonStates {
    normal = 0,
    hover = 1,
    down = 2
};

export class Icon extends Component {
    state: ButtonStates = ButtonStates.normal;
    image: IGdiBitmap;
    downImage: IGdiBitmap;
    hoverImage: IGdiBitmap;

    private hoverAlpha = 200;
    private downAlpha = 128;

    constructor(attrs: object) {
        super(attrs);
        if (isObject(attrs)) {
            Object.assign(this, attrs);
        }
        this.setImage(this.image, this.hoverImage, this.downImage);
    }

    setImage(img: IGdiBitmap, hoverImg?: IGdiBitmap, downImg?: IGdiBitmap) {
        this.image = img;
        this.hoverImage = hoverImg;
        this.downImage = downImg;
        this.setSize(this.x, this.y, img.Width, img.Height);
    }

    on_paint(gr: IGdiGraphics) {
        let img = this.image;
        let alpha = 255;

        if (this.state === ButtonStates.hover) {
            if (this.hoverImage) {
                img = this.hoverImage;
            } else {
                alpha = this.hoverAlpha;
            }
        } else if (this.state === ButtonStates.down) {
            if (this.downImage) {
                img = this.downImage;
            } else {
                alpha = this.downAlpha;
            }
        }

        gr.DrawImage(img, this.x, this.y, this.width, this.height, 0, 0, img.Width, img.Height, 0, alpha);
    }

    changeState(state_: number) {
        if (this.state !== state_) {
            this.state = state_;
            Repaint();
        }
    }

    on_mouse_move(x: number, y: number) {
        if (this.state === ButtonStates.normal) {
            this.changeState(ButtonStates.hover);
        }
    }

    on_mouse_lbtn_down(x: number, y: number) {
        this.changeState(ButtonStates.down);
    }

    on_mouse_lbtn_up(x: number, y: number) {
        if (this.state === ButtonStates.down) {
            if (this.trace(x, y)) {
                invoke(this, "on_click", x, y);
            }
        }
        this.changeState(ButtonStates.hover);
    }

    on_mouse_leave() {
        this.changeState(ButtonStates.normal);
    }
}

interface ISliderOptions {
    progressHeight: number;
    thumbImage: IGdiBitmap;
    pressedThumbImage?: IGdiBitmap;
    progressColor: number;
    secondaryColor: number;
    accentColor: number;
    getProgress(): number;
    setProgress(val: number): void;
}

export class Slider extends Component implements ISliderOptions {
    isDrag: boolean = false;
    progress: number = 0;
    thumbImage: IGdiBitmap;
    pressedThumbImage: IGdiBitmap;
    progressColor: number = 0;
    secondaryColor: number = 0;
    accentColor: number = 0;
    progressHeight: number;

    constructor(opts: ISliderOptions) {
        super(opts);

        this.progressHeight = opts.progressHeight;
        this.thumbImage = opts.thumbImage;
        this.pressedThumbImage = (opts.pressedThumbImage && opts.thumbImage);
        this.progressColor = opts.progressColor;
        this.secondaryColor = opts.secondaryColor;
        this.accentColor = opts.accentColor;
        this.getProgress = opts.getProgress;
        this.setProgress = opts.setProgress;
    }

    /** 
     * `getProgress & setProgress` should be over wright when instance created
     * or when extended.
     */
    getProgress(): number { return 0 }
    setProgress(val: number): void { }

    on_size() {
        let minHeight_ = Math.max(this.progressHeight, this.thumbImage.Height, this.pressedThumbImage.Height);
        if (this.height < minHeight_) {
            console.log("ELIA Warn: Slider 's height is not proper.")
        }
    }

    trace(x: number, y: number) {
        if (!this.isVisible()) return false;
        let pad = (this.thumbImage ? (this.thumbImage.Width / 2) >> 0 : 0);
        return x > this.x - pad && x <= this.x + this.width + pad
            && y > this.y && y <= this.y + this.height;
    }

    on_paint(gr: IGdiGraphics) {
        this.progress = this.getProgress();

        if (!isFinite(this.progress)) {
            this.progress = 0;
        }

        let p_y = this.y + (this.height - this.progress) / 2;

        //
        gr.FillSolidRect(this.x, p_y, this.width, this.progressHeight, this.secondaryColor);

        //
        if (this.progress * this.width > 1) {
            gr.FillSolidRect(this.x, p_y, this.width * this.progress, this.progressHeight, this.progressColor);
        }

        if (this.thumbImage) {
            let img = this.thumbImage;
            if (this.isDrag && this.pressedThumbImage) {
                img = this.pressedThumbImage;
            }
            let img_x = this.x + this.width * this.progress - img.Width / 2;
            let img_y = this.y + (this.height - img.Height) / 2;

            gr.DrawImage(img, img_x, img_y, img.Width, img.Height, 0, 0, img.Width, img.Height);
        }
    }

    on_mouse_move(x: number, y: number) {
        if (this.isDrag) {
            x -= this.x;
            let progress_ = x < 0 ? 0 : x > this.width ? 1 : x / this.width;
            this.setProgress(progress_);
            Repaint();
        }
    }

    on_mouse_lbtn_down(x: number, y: number) {
        if (this.trace(x, y)) {
            this.isDrag = true;
            this.on_mouse_move(x, y);
        }
    }

    on_mouse_lbtn_up(x: number, y: number) {
        this.isDrag = false;
        Repaint();
    }
}

export const AlbumArtId = {
    front: 0,
    back: 1,
    disc: 2,
    icon: 3,
    artist: 4
};

export class AlbumArtView extends Component {
    albumArtId: number = AlbumArtId.front;
    tf = fb.TitleFormat("%album artist%^^%album");
    protected trackKey: string = "";
    currentImg: IGdiBitmap;
    defaultImg: IGdiBitmap = this._drawNocoverImg(0xafffffff, 0x0fffffff);
    metadb: IFbMetadb;
    private _rawDefaultImg: IGdiBitmap;

    constructor(attrs: object) {
        super(attrs);

        if (isObject(attrs)) {
            Object.assign(this, attrs);
        }
        this._rawDefaultImg = this.defaultImg;
    }

    _drawNocoverImg(textColor: number, backColor: number) {
        let fontName = "Segoe UI";
        let font1 = gdi.Font(fontName, 270, 1);
        let font2 = gdi.Font(fontName, 120, 1);
        let cc = StringFormat(1, 1);
        let img = gdi.CreateImage(500, 500);
        let g = img.GetGraphics();

        g.SetTextRenderingHint(TextRenderingHint.AntiAlias);
        g.FillSolidRect(0, 0, 500, 500, textColor & 0x20ffffff);
        g.DrawString("NO", font1, textColor & 0x25ffffff, 0, 0, 500, 275, cc);
        g.DrawString("COVER", font2, textColor & 0x25ffffff, 2.5, 175, 500, 275, cc);
        g.FillSolidRect(60, 388, 380, 50, textColor & 0x65ffffff);

        img.ReleaseGraphics(g);
        return img;
    }

    processImage(image: IGdiBitmap) {
        return (image == null) ? null : CropImage(image, this.width, this.height);
    }

    getArtwork(metadb?: IFbMetadb) {
        let trackkey_ = "##@!~";

        if (metadb != null) {
            trackkey_ = this.tf.EvalWithMetadb(metadb);
            this.metadb = metadb;
            let img = utils.GetAlbumArtV2(metadb, this.albumArtId);

            // for tracks download from neteaseCloudMusic which prefer store
            // alum art image at 'disc' slot;
            if (img == null && this.albumArtId === AlbumArtId.front) {
                img = utils.GetAlbumArtV2(metadb, AlbumArtId.disc);
            }

            if (img != null) {
                img = CropImage(img, this.width, this.height)
            }

            this.currentImg = img;
        } else {
            this.currentImg = null;;
        }

        this.trackKey = trackkey_;
    }

    on_paint(gr: IGdiGraphics) {
        let img = this.currentImg || this.defaultImg;
        gr.DrawImage(img, this.x, this.y, this.width, this.height, 0, 0, img.Width, img.Height);
    }

    on_init() {
        this.getArtwork(fb.GetNowPlaying());
    }

    // TODO: debounced function;
    on_size() {
        if (this._rawDefaultImg) {
            if (this.defaultImg && this.defaultImg.Width !== this.width) {
                this.defaultImg = CropImage(this._rawDefaultImg, this.width, this.height);
            }
        }
    }
}

export class Textlink extends Component {
    text: string = "";
    font: IGdiFont = gdi.Font("tahoma", 12);
    _underlinedFont: IGdiFont;
    textColor: number = 0xff555555;
    textHoverColor: number = 0xff000000;
    maxWidth: number = 0;
    state: ButtonStates = ButtonStates.normal;

    constructor(attrs: object) {
        super(attrs);

        if (isObject(attrs)) {
            Object.assign(this, attrs);
        }
        this._underlinedFont = gdi.Font(this.font.Name, this.font.Size, 4);
    }

    setText(text: string) {
        if (text == null) {
            this.text = "";
            Repaint();
            return;
        }
        this.text = text;
        // this.on_size();      
        invoke(this, "on_size");

    }

    on_paint(gr: IGdiGraphics) {
        if (this.text == null || this.text.length === 0) {
            return;
        }

        let font_: IGdiFont;
        let textColor_: number;

        if (this.state === ButtonStates.normal) {
            font_ = this.font;
            textColor_ = this.textColor;
        }
        else {
            font_ = this._underlinedFont;
            textColor_ = this.textHoverColor;
        }

        gr.DrawString(this.text, font_, textColor_, this.x, this.y, this.width, this.height, StringFormat.LeftCenter);
    }

    changeState(newstate: number) {
        if (this.state !== newstate) {
            this.state = newstate;
            Repaint();
        }
    }

    on_mouse_move(x: number, y: number) {
        if (this.state === ButtonStates.normal) {
            this.changeState(ButtonStates.hover);
        }
    }

    on_mouse_lbtn_down(x: number, y: number) {
        this.changeState(ButtonStates.down);
    }

    on_mouse_lbtn_up(x: number, y: number) {
        if (this.state === ButtonStates.down) {
            if (this.trace(x, y)) {
                invoke(this, "on_click", x, y);
            }
        }
        this.changeState(ButtonStates.hover);
    }

    on_mouse_leave() {
        this.changeState(ButtonStates.normal);
    }
}

// ---------------------------
// Elements globally referred;
// ---------------------------

export abstract class ScrollView extends Component {
    totalHeight: number;
    scrolling: boolean = false;
    private scroll_: number = 0;
    get scroll() { return this.scroll_ };
    set scroll(val: number) { this.scroll_ = this.checkscroll(val) }
    private timerId: number = -1;

    constructor(attrs: object) {
        super(attrs);
    }

    checkscroll(val: number) {
        if (val > this.totalHeight - this.height) {
            val = this.totalHeight - this.height;
        }
        if (this.totalHeight < this.height || val < 0) {
            val = 0;
        }
        return val;
    }

    scrollTo(scroll_: number = this.checkscroll(this.scroll)) {
        scroll_ = this.checkscroll(scroll_);
        if (scroll_ === this.scroll) {
            return;
        }

        const onTimeout = () => {
            if (Math.abs(scroll_ - this.scroll) > 0.4) {
                this.scroll += (scroll_ - this.scroll) / 3;
                this.scrolling = true;
                window.ClearTimeout(this.timerId);
                this.timerId = window.SetTimeout(onTimeout, 15);
            } else {
                window.ClearTimeout(this.timerId);
                this.scroll = Math.round(this.scroll);
                this.scrolling = false;
            }
            if (!this.isVisible()) {
                window.ClearTimeout(this.timerId);
                this.scrolling = false;
            }
            this.onScrollStep(this.scroll);
            Repaint();
        }

        window.ClearTimeout(this.timerId);
        onTimeout();
    }

    onScrollStep(scroll_: number = this.scroll) {

    }
}


//
export class Scrollbar extends Component implements ICallbacks {
    static defaultCursorWidth = scale(12);

    private minCursorHeight = scale(24);
    private cursorHeight: number;
    private cursorY: number;
    state: ButtonStates;
    private cursorDelta: number;
    cursorColor: number;
    backgroundColor: number;
    parent: ScrollView;

    constructor(attrs: {
        cursorColor: number;
        backgroundColor: number;
    }) {
        super(attrs);
    }

    on_paint(gr: IGdiGraphics) {
        let minCursorHeight = this.minCursorHeight;
        let totalHeight = this.parent.totalHeight;
        let parentHeight = this.parent.height;

        if (totalHeight > parentHeight) {
            let scroll_ = this.parent.scroll;
            this.cursorHeight = Math.max(Math.round((parentHeight / totalHeight) * this.height), minCursorHeight);
            this.cursorY = this.y + Math.round(((this.height - this.cursorHeight) * scroll_) / (totalHeight - parentHeight));
            // Draw background;
            if (this.backgroundColor) {
                gr.FillSolidRect(this.x, this.y, this.width, this.height, this.backgroundColor);
            }
            // Draw cursor;
            gr.FillSolidRect(this.x + 1, this.cursorY + 1, this.width - 2, this.cursorHeight - 2, this.cursorColor);
        }

    }

    traceCursor(x: number, y: number) {
        return this.trace(x, y)
            && y > this.cursorY && y <= this.cursorY + this.cursorHeight;
    }

    changeState(newstate: number) {
        if (this.state !== newstate) {
            this.state = newstate;
            Repaint();
        }
    }

    on_mouse_move(x: number, y: number) {
        if (this.state === ButtonStates.down) {
            let cursorY = y - this.cursorDelta
            let ratio = (cursorY - this.y) / (this.height - this.cursorHeight);
            let offset = Math.round((this.parent.totalHeight - this.parent.height) * ratio);
            this.parent.scroll = offset;
            Repaint();
        } else {
            this.changeState(this.traceCursor(x, y) ? ButtonStates.hover : ButtonStates.normal);
        }

    }

    on_mouse_lbtn_down(x: number, y: number) {
        if (this.traceCursor(x, y)) {
            this.cursorDelta = y - this.cursorY;
            this.changeState(ButtonStates.down);
        }
    }

    on_mouse_lbtn_up(x: number, y: number) {
        this.changeState(
            this.traceCursor(x, y) ? ButtonStates.hover : ButtonStates.normal
        );
    }

    on_mouse_leave() {
        this.changeState(ButtonStates.normal);
    }
}