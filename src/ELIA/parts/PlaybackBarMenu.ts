import { PlaybackOrder, pos2vol, RGB, RGBA, scale, setAlpha, SmoothingMode, TextRenderingHint, vol2pos } from "../common/Common";
import { Component } from "../common/BasePart";
import { Material, MaterialFont } from "../common/Icon";
import { IconButton } from "./Buttons";
import { Slider } from "../common/Slider";
import { GdiFont, themeColors } from "./Theme";
import { notifyOthers, ui } from "../common/UserInterface";
import { lang } from "./Lang";
import { ButtonStates, Clickable } from "../common/Button";
import { getShuffleOrder } from "./PlaybackControlView";
import { StringFormat } from "../common/String";

const MENU_ITEM_HEIGHT = scale(40);
const MENU_WIDTH = scale(164);
const MENU_FONT = GdiFont("semi,14");
const menuColors = {
    text: RGB(200, 200, 200),
    background: RGB(40, 40, 40),
    backgroundHover: RGB(62, 62, 62),
    highlight: themeColors.highlight,
    progress: themeColors.text,
    progressSecondary: setAlpha(themeColors.text, 76),
}
const paddingLR = scale(8);
const paddingTB = scale(8);

class Icon extends Component {
    code: string;
    font: IGdiFont;
    color: number;

    constructor(code: string, font: IGdiFont, color: number) {
        super({});
        this.code = code;
        this.font = font;
        this.color = color;
    }

    setColor(color: number) {
        this.color = color;
    }

    on_paint(gr: IGdiGraphics) {
        gr.SetTextRenderingHint(TextRenderingHint.AntiAlias);
        gr.DrawString(this.code, this.font, this.color, this.x, this.y, this.width, this.height, StringFormat.Center);
        gr.SetTextRenderingHint(ui.textRender);
    }
}

class MenuItem extends Clickable {

    icon: Icon;
    text: string = "";
    textFont: IGdiFont = MENU_FONT;
    textColor: number = menuColors.text;

    constructor(icon?: Icon, text?: string) {
        super({});
        this.icon = icon;
        this.text = text;
        this.icon && this.addChild(this.icon);
    }

    on_size() {
        this.icon.setBoundary(this.x + paddingLR, this.y, this.icon.font.Height, this.height);
    }

    on_paint(gr: IGdiGraphics) {
        let { icon, text, textFont, textColor } = this;
        let textX = icon.x + icon.width + scale(8);
        let textW = this.x + this.width - textX - scale(8);
        let sf = StringFormat.LeftCenter;

        let backgroundColor = menuColors.background;
        if (this.state !== ButtonStates.Normal) {
            backgroundColor = menuColors.backgroundHover;
        }
        gr.SetSmoothingMode(SmoothingMode.AntiAlias);
        let r = scale(2);
        gr.FillRoundRect(this.x, this.y, this.width, this.height, r, r, backgroundColor);
        gr.DrawString(text, textFont, textColor, textX, this.y, textW, this.height, sf);
        gr.SetSmoothingMode(SmoothingMode.Default);
    }
}


interface SliderThumbImage {
    normal: IGdiBitmap;
    down: IGdiBitmap;
}
interface ThemeColors {
    background: number;
    highlight: number;
    [name: string]: number;
}

function createThumbImg(colors: ThemeColors): SliderThumbImage {
    let tw = scale(14);
    let thumbImg = gdi.CreateImage(tw, tw);
    let g = thumbImg.GetGraphics();

    g.SetSmoothingMode(SmoothingMode.AntiAlias);
    g.FillEllipse(1, 1, tw - 3, tw - 3, colors.highlight);
    g.FillEllipse(scale(3), scale(3), tw - scale(6) - 1, tw - scale(6) - 1, colors.background);
    thumbImg.ReleaseGraphics(g);

    let downThumbImg = gdi.CreateImage(tw, tw);
    let g2 = downThumbImg.GetGraphics();

    g2.SetSmoothingMode(SmoothingMode.AntiAlias);
    g2.FillEllipse(0, 0, tw - 1, tw - 1, colors.highlight);
    downThumbImg.ReleaseGraphics(g2);

    return { normal: thumbImg, down: downThumbImg };
}

class VolumeMenuItem extends MenuItem {
    volumnBtn: IconButton;
    volumnBar: Slider;
    constructor() {
        super();

        // create volume slider;
        const thumbImages = createThumbImg(menuColors);
        const progressHeight = scale(4);
        const volumebar = new Slider({
            progressHeight: progressHeight,
            thumbImage: thumbImages.normal,
            pressedThumbImage: thumbImages.down,
            progressColor: menuColors.highlight,
            secondaryColor: menuColors.progressSecondary,
            accentColor: menuColors.highlight,
            getProgress() {
                return vol2pos(fb.Volume);
            },
            setProgress(val: number) {
                fb.Volume = pos2vol(val);
            }
        });
        this.volumnBar = volumebar;
        this.addChild(this.volumnBar);

        // create volume mute button;
        const btn = new IconButton({
            icon: Material.volume,
            fontName: MaterialFont,
            fontSize: scale(20),
            colors: [menuColors.text]
        });
        btn.on_init = () => {
            btn.setIcon(fb.Volume === -100 ? Material.volume_off : Material.volume);
        }
        btn.on_click = () => {
            fb.VolumeMute();
        }
        Object.assign(btn, {
            on_volume_change: () => {
                btn.on_init();
                btn.repaint();
            }
        });
        this.volumnBtn = btn;
        this.addChild(this.volumnBtn);
    }

    on_size() {
        this.volumnBtn.setBoundary(this.x, this.y, scale(40), this.height);

        let barH = scale(20);
        let barY = this.y + (this.height - barH) / 2;
        this.volumnBar.setBoundary(this.x + scale(40), barY, this.width - scale(40) - scale(8), barH);
    }
    on_paint(gr: IGdiGraphics) { }
}


export class PlaybackBarMenu extends Component {
    type = 2;
    textFont: IGdiFont = MENU_FONT;
    textColor: number = menuColors.text;
    backgroundColor: number = menuColors.background;
    highlightColor: number = menuColors.highlight;
    items: MenuItem[] = [];
    itemHeight: number = MENU_ITEM_HEIGHT;
    totalHeight: number;

    constructor() {
        super({})

        this.createMenuItems();
    }

    private createMenuItems() {
        let iconFont = GdiFont(MaterialFont, scale(20));
        let shuffle_on = new Icon(Material.shuffle, iconFont, menuColors.highlight);
        let shuffle_off = new Icon(Material.shuffle, iconFont, menuColors.text);
        let repeat_off = new Icon(Material.repeat, iconFont, menuColors.text);
        let repeat_on = new Icon(Material.repeat, iconFont, menuColors.highlight);
        let repeat_track = new Icon(Material.repeat1, iconFont, menuColors.highlight);

        let repeat_off_cp: [Icon, string] = [repeat_off, lang("Repeat off")];
        let repeat_playlist_cp: [Icon, string] = [repeat_on, lang("Repeat playlist")]
        let repeat_track_cp: [Icon, string] = [repeat_track, lang("Repeat track")]
        let shuffle_off_cp: [Icon, string] = [shuffle_off, lang("Shuffle off")];
        let shuffle_on_cp: [Icon, string] = [shuffle_on, lang("Shuffle on")];

        let repeat_menu_item = new MenuItem(repeat_off, "");
        Object.assign(repeat_menu_item, {
            on_init() {
                let cp: [Icon, string] = repeat_off_cp;
                switch (plman.PlaybackOrder) {
                    case PlaybackOrder.RepeatPlaylist:
                        cp = repeat_playlist_cp;
                        break;
                    case PlaybackOrder.RepeatTrack:
                        cp = repeat_track_cp;
                        break;
                    default:
                        cp = repeat_off_cp;
                        break;
                }
                repeat_menu_item.text = cp[1];
                repeat_menu_item.removeChild(repeat_menu_item.icon);
                repeat_menu_item.icon = cp[0];
                repeat_menu_item.addChild(repeat_menu_item.icon);

            },
            on_click() {
                if (plman.PlaybackOrder < 2) {
                    plman.PlaybackOrder += 1;
                } else if (plman.PlaybackOrder === 2) {
                    plman.PlaybackOrder = 0;
                } else {
                    plman.PlaybackOrder = 1;
                }
            },
            on_playback_order_changed() {
                this.on_init();
                this.on_size();
                this.repaint();
            }
        });

        let shuffle_menu_item = new MenuItem(shuffle_off, "");
        Object.assign(shuffle_menu_item, {
            on_init() {
                let cp = shuffle_off_cp;
                if (plman.PlaybackOrder === getShuffleOrder()) {
                    cp = shuffle_on_cp;
                } else {
                    cp = shuffle_off_cp;
                }
                shuffle_menu_item.removeChild(shuffle_menu_item.icon);
                shuffle_menu_item.icon = cp[0];
                shuffle_menu_item.addChild(shuffle_menu_item.icon);
                shuffle_menu_item.text = cp[1];
                shuffle_menu_item.on_size();
            },
            on_click() {
                if (plman.PlaybackOrder === getShuffleOrder()) {
                    plman.PlaybackOrder = 0;
                } else {
                    plman.PlaybackOrder = getShuffleOrder();
                }
            },
            on_playback_order_changed() {
                this.on_init();
                this.on_size();
                this.repaint();
            }
        });

        let menu_item_volume = new VolumeMenuItem();


        let items = [
            repeat_menu_item,
            shuffle_menu_item,
            menu_item_volume
        ];
        this.items = items;

        items.forEach(item => this.addChild(item));
        this.totalHeight = this.itemHeight * this.items.length + 2 * paddingTB;
    }

    on_size() {
        let itemY = this.y + paddingTB;
        for (let i = 0; i < this.items.length; i++) {
            this.items[i].setBoundary(this.x + scale(4), itemY, this.width - scale(8), this.itemHeight);
            itemY += this.itemHeight;
        }
    }

    on_paint(gr: IGdiGraphics) {
        // draw background;
        let r = scale(2);
        gr.SetTextRenderingHint(SmoothingMode.AntiAlias);
        gr.FillRoundRect(this.x, this.y, this.width, this.height, r, r, this.backgroundColor);
        gr.SetTextRenderingHint(SmoothingMode.Default);
    }

    on_mouse_lbtn_up(x: number, y: number) {
        if (!this.trace(x, y)) {
            notifyOthers("Show.Playbackbar Menu");
        }
    }
}