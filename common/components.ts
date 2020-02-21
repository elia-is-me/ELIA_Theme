/// <reference path="./foo_spider_monkey_panel.d.ts" />
/// <reference path="./common.ts" />

'use strict'


// Generate component id;
const get_cid = (() => {
    let count = 0;
    return () => ++count;
})();

const by_z = (a: Component, b: Component) => a.z - b.z;
const Repaint = () => window.Repaint();
const ThrottledRepaint = throttle(Repaint, 15);
let g_panels_changed = false;

class Component {
    readonly cid: number = get_cid();
    x: number = 0;
    y: number = 0;
    z: number = 0;
    width: number = 0;
    height: number = 0;
    private visible: boolean = true;
    parent: Component;
    children: Component[] = [];


    constructor(attrs: object) {
        Object.assign(this, attrs);
    }

    // on_paint?: Function
    // on_size?: () => void;

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

        g_panels_changed = true;
    }

    removeChild(node: Component) {
        if (!(node instanceof Component) || node.parent !== this) {
            return;
        } else {
            node.parent = null;
            this.children = this.children.filter(child => child.parent === this);
        }
        g_panels_changed = true;
    }

    isVisible() {
        return this.visible && this.width > 0 && this.height > 0;
    }

    trace(x: number, y: number) {
        return this.isVisible()
            && x > this.x && x <= this.x + this.width
            && y > this.y && y <= this.y + this.height;
    }

    setSize(x: number, y: number, width?: number, height?: number) {
        let pre_vis = this.isVisible();
        //
        this.x = x;
        this.y = y;
        if (width != null && height != null) {
            this.width = width;
            this.height = height;
        }
        let is_vis = this.isVisible();

        if (is_vis) invoke(this, 'on_size');
        if (is_vis !== pre_vis) g_panels_changed = true;

    }


}


function invoke(obj: object, method: string, ...var_args: any[]) {
    if (!obj) { return }
    let func = (<any>obj)[method];
    return func == null ? null : func.apply(obj, var_args);
}

const ButtonStates = {
    normal: 0,
    hover: 1,
    down: 2
};

class Icon extends Component {
    state = ButtonStates.normal;
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

class Slider extends Component {
    isDrag: boolean = false;
    progress: number = 0;
    thumbImg: IGdiBitmap;
    thumbDownImg?: IGdiBitmap;
    progressColor: number = 0;
    secondaryColor: number = 0;
    accentColor: number = 0;
    progressHeight: number;

    constructor(attrs: object) {
        super(attrs);

        if (isObject(attrs)) {
            Object.assign(this, attrs);
        }

        // let min_h = Math.max(this.progress)
    }

    on_size() {
        let pre_vis = this.isVisible();
        let min_h = Math.max(this.progressHeight,
            this.thumbImg ? this.thumbImg.Height : 0,
            this.thumbDownImg ? this.thumbDownImg.Height : 0,
            this.height);
        this.height = min_h;

        if (pre_vis !== this.isVisible()) {
            g_panels_changed = true;
        }
    }

    trace(x: number, y: number) {
        if (!this.isVisible()) return false;
        let pad = (this.thumbImg ? (this.thumbImg.Width / 2) >> 0 : 0);
        return x > this.x - pad && x <= this.x + this.width + pad
            && y > this.y && y <= this.y + this.height;
    }

    on_paint(gr: IGdiGraphics) {
        this.progress = invoke(this, "get_progress");

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

        if (this.thumbImg) {
            let img = this.thumbImg;
            if (this.isDrag && this.thumbDownImg) {
                img = this.thumbDownImg;
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
            invoke(this, "set_progress", progress_);
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

const AlbumArtId = {
    front: 0,
    back: 1,
    disc: 2,
    icon: 3,
    artist: 4
};

class AlbumArtView extends Component {
    currentArtId: number = AlbumArtId.front;
    tf = fb.TitleFormat("%album artist%^^%album");
    trackkey: string = "";
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

        // g.SetSmoothingMode(SmoothingMode.HighQuality);
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

    getArt(metadb?: IFbMetadb) {
        let trackkey_ = "##@!~";

        if (metadb != null) {
            trackkey_ = this.tf.EvalWithMetadb(metadb);
            this.metadb = metadb;
            let img = utils.GetAlbumArtV2(metadb, this.currentArtId);

            // for tracks download from neteaseCloudMusic which prefer store
            // alum art image at 'disc' slot;
            if (img == null && this.currentArtId === AlbumArtId.front) {
                img = utils.GetAlbumArtV2(metadb, AlbumArtId.disc);
            }

            if (img != null) {
                img = CropImage(img, this.width, this.height)
            }

            this.currentImg = img;
        } else {
            this.currentImg = null;;
        }

        this.trackkey = trackkey_;
    }

    on_paint(gr: IGdiGraphics) {
        let img = this.currentImg || this.defaultImg;

        if (img == null) {
            gr.FillSolidRect(this.x, this.y, this.width, this.height, 0xff00FFFF);
        }
        else {
            gr.DrawImage(img, this.x, this.y, this.width, this.height, 0, 0, img.Width, img.Height);
        }
    }

    on_init() {
        this.getArt(fb.GetNowPlaying());
    }

    // TODO: debounced function;
    on_size() {
        if (this._rawDefaultImg) {
            if (this.defaultImg && this.defaultImg.Width !== this.width) {
                this.defaultImg = CropImage(this._rawDefaultImg, this.width, this.height);
            }
        }
    }

    on_playback_new_track() {
        this.getArt(fb.GetNowPlaying());
        Repaint();
    }

    on_playback_stop(reason: number) {
        if (reason !== 2) {
            this.getArt();
            Repaint();
        }
    }
}

class Textlink extends Component {
    text: string = "";
    font: IGdiFont = gdi.Font("tahoma", 12);
    fontUnderlined: IGdiFont;
    textColor: number = 0xff555555;
    textHoverColor: number = 0xff000000;
    maxWidth: number = 0;
    state: number = ButtonStates.normal;


    constructor(attrs: object) {
        super(attrs);

        if (isObject(attrs)) {
            Object.assign(this, attrs);
        }
        this.fontUnderlined = gdi.Font(this.font.Name, this.font.Size, 4);
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

        let font: IGdiFont, color: number;

        if (this.state === ButtonStates.normal) {
            font = this.font;
            color = this.textColor;
        }
        else {
            font = this.fontUnderlined;
            color = this.textHoverColor;
        }

        gr.DrawString(this.text, font, color, this.x, this.y, this.width, this.height, StringFormat.LeftCenter);
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