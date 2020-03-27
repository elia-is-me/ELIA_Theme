/// <reference path="../../common/foo_spider_monkey_panel.d.ts" />
/// <reference path="../../common/common.ts" />
/// <reference path="../../common/components.ts" />

// Usage:
// (TODO: documents here)

// ---------------------------
// Elements globally referred;
// ---------------------------

abstract class ScrollView extends Component {
    totalHeight: number;
    scrolling: boolean = false;
    private scroll__: number = 0;
    get scroll_() { return this.scroll__ }
    set scroll_(val: number) {
        this.scroll__ = this._checkScroll(val);
    }
    private timerId: number = -1;

    constructor(attrs: object) {
        super(attrs);
    }

    _checkScroll(val: number) {
        if (val > this.totalHeight - this.height) {
            val = this.totalHeight - this.height;
        }
        if (this.totalHeight < this.height || val < 0) {
            val = 0;
        }
        return val;
    }

    // TODO:
    // private _onTimeout (scroll: number) {
    //     if (Math.abs(scroll - this.scroll_) > 0.4) {
    //         this.scroll_ += (scroll - this.scroll_) /3;
    //         this.scrolling = true;
    //         window.ClearTimeout(this.timerId);
    //         ...
    //     }
    // }

    scrollTo(scroll_?: number) {
        if (scroll_ == null) {
            scroll_ = this._checkScroll(this.scroll_);
        }

        if (scroll_ === this.scroll_) {
            return;
        }

        const onTimeout = () => {
            if (Math.abs(scroll_ - this.scroll_) > 0.4) {
                this.scroll_ += (scroll_ - this.scroll_) / 3;
                this.scrolling = true;
                window.ClearTimeout(this.timerId);
                this.timerId = window.SetTimeout(onTimeout, 15);
            } else {
                window.ClearTimeout(this.timerId);
                this.scroll_ = Math.round(this.scroll_);
                this.scrolling = false;
            }
            if (!this.isVisible()) {
                window.ClearTimeout(this.timerId);
                this.scrolling = false;
            }
            Repaint();
        }

        window.ClearTimeout(this.timerId);
        onTimeout();
    }
}


//
const MIN_CURSOR_HEIGHT = scale(24);
const SCROLLBAR_WIDTH = scale(12);

class Scrollbar extends Component implements ICallbacks {
    private cursorHeight: number;
    private cursorY: number;
    state: number;
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
        let totalHeight = this.parent.totalHeight;
        let parentHeight = this.parent.height;

        if (totalHeight > parentHeight) {
            let scroll_ = this.parent.scroll_;
            this.cursorY = this.y + Math.round(((this.height - this.cursorHeight) * scroll_) / (totalHeight - parentHeight));
            this.cursorHeight = Math.max(Math.round((parentHeight / totalHeight) * this.height), MIN_CURSOR_HEIGHT);
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
            let offset = Math.round(
                (this.parent.totalHeight - this.parent.height) * ratio
            );
            this.parent.scroll_ = offset;
            Repaint();
        } else {
            this.changeState(
                this.traceCursor(x, y) ? ButtonStates.hover : ButtonStates.normal
            );
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
            this.traceCursor(x, y) ? ButtonStates.hover : ButtonStates.down
        );
    }

    on_mouse_leave() {
        this.changeState(ButtonStates.normal);
    }
}

// ------------------------------------------------------------
// Global resources: theme colors, icon codes, command string,
//                    title_format objects;
// ------------------------------------------------------------

// colors;

interface IThemeColors {
    text: number;
    background: number;
    highlight: number;
    background_sel?: number;
    text_sel?: number;
    [name: string]: number;
};

/**
 * Colors for bottom playback bar;
 */
const bottomColors: IThemeColors = {
    text: RGB(180, 182, 184),
    background: RGB(40, 40, 40),
    highlight: RGB(238, 127, 0),
    text_sel: RGB(255, 255, 255),
    heart: RGB(195, 45, 46)
}

/**
 * Colors for sidebar;
 */
const sidebarColors: IThemeColors = {
    text: RGB(180, 182, 184),
    background: RGB(20, 20, 20),
    highlight: RGB(238, 127, 0)
}

/**
 * Colors of main panel area;
 */
const mainColors: IThemeColors = {
    text: RGB(180, 182, 184),
    background: RGB(35, 35, 35),
    highlight: RGB(238, 127, 0)
}


const Material = {
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
    h_dots: '\ue5d3',
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
    // heart_empty: '\ue87e',
    // heart: '\ue87d',
    repeat: '\ue040',
    repeat1: '\ue041',
    // shuffle: '\ue043',
    default_order: '\ue16d',
    // volume: '\ue050',
    // volume_mute: '\ue04f',
    play_arrow: '\ue037',
    pause: '\ue034',
    skip_next: '\ue044',
    skip_prev: '\ue045'
};

/**
 * Google material icons font name;
 */
const MaterialFont = "Material Icons";

const panels: {
    pb_ctrl: Component;
    navigation: Component;
    main: ScrollView;
    playlist: ScrollView;
    album: ScrollView;
    artist: ScrollView;
} = {
    pb_ctrl: null,
    navigation: null,
    main: null,
    playlist: null,
    album: null,
    artist: null
};

// ---------------------
// Playback control bar;
// ---------------------

function pos2vol(pos: number) {
    return (50 * Math.log(0.99 * pos + 0.01)) / Math.LN10;
}

function vol2pos(v: number) {
    return (Math.pow(10, v / 50) - 0.01) / 0.99;
}

function FormatTime(sec: number) {
    if (!isFinite(sec)) return '--:--';
    var seconds = sec % 60 >> 0;
    var minutes = (sec / 60) >> 0;
    var pad = function (num: number) {
        if (num < 10) return '0' + num;
        else return '' + num;
    };
    return pad(minutes) + ":" + pad(seconds);
}

type pbButtonKeys = "playOrPause" | "next" | "prev" | "love" | "repeat" | "shuffle" | "volume";
type pbButtonImageKeys = "pause" | "play" | "next" | "prev" | "heart" | "heart_empty"
    | "repeat_off" | "repeat_on" | "repeat1_on" | "shuffle_off" | "shuffle_on" | "volume"
    | "volume_mute";

const pb_btns2: { [K in pbButtonKeys]: Icon } = {
    playOrPause: null,
    next: null,
    prev: null,
    love: null,
    repeat: null,
    shuffle: null,
    volume: null
}

const createBottomButtons = () => {
    const colors = bottomColors;
    let iconName = MaterialFont;
    let iconFont = gdi.Font(iconName, scale(22));
    let iconFont2 = gdi.Font(iconName, scale(18));
    let bw_1 = scale(32);
    let bw_2 = scale(32);
    let images: { [K in pbButtonImageKeys]: IGdiBitmap } = {
        pause: imageFromCode(Material.pause, iconFont, colors.text, bw_1, bw_1),
        play: imageFromCode(Material.play_arrow, iconFont, colors.text, bw_1, bw_1),
        next: imageFromCode(Material.skip_next, iconFont, colors.text, bw_1, bw_1),
        prev: imageFromCode(Material.skip_prev, iconFont, colors.text, bw_1, bw_1),
        heart: imageFromCode(Material.heart, iconFont2, colors.heart, bw_2, bw_2),
        heart_empty: imageFromCode(Material.heart_empty, iconFont2, colors.text, bw_2, bw_2),
        repeat_off: imageFromCode(Material.repeat, iconFont2, colors.text, bw_2, bw_2),
        repeat_on: imageFromCode(Material.repeat, iconFont2, colors.highlight, bw_2, bw_2),
        repeat1_on: imageFromCode(Material.repeat1, iconFont2, colors.highlight, bw_2, bw_2),
        shuffle_off: imageFromCode(Material.shuffle, iconFont2, colors.text, bw_2, bw_2),
        shuffle_on: imageFromCode(Material.shuffle, iconFont2, colors.highlight, bw_2, bw_2),
        volume: imageFromCode(Material.volume, iconFont2, colors.text, bw_2, bw_2),
        volume_mute: imageFromCode(Material.volume_mute, iconFont2, colors.text, bw_2, bw_2),
    }
    let buttons = pb_btns2;

    //
    const CMD_LOVE = 'Playback Statistics/Rating/5';
    const CMD_UNLOVE = 'Playback Statistics/Rating/<not set>';
    const TF_RATING = fb.TitleFormat('%rating%');

    buttons.playOrPause = new Icon({
        image: images.pause,

        on_click: function () {
            fb.PlayOrPause();
            this.on_init();
            Repaint();
        },

        on_init: function () {
            this.setImage(fb.IsPlaying && !fb.IsPaused ? images.pause : images.play);
        },

        on_playback_new_track: function () {
            this.on_init();
            Repaint();
        },

        on_playback_stop: function (reason: number) {
            this.on_init();
            Repaint();
        },

        on_playback_pause: function () {
            this.on_init();
            Repaint();
        }
    });

    buttons.next = new Icon({
        image: images.next,

        on_click: function () {
            fb.Next();
        }
    });

    buttons.prev = new Icon({
        image: images.prev,

        on_click: function () {
            fb.Prev();
        }
    });

    buttons.love = new Icon({
        image: images.heart_empty,

        on_init: function () {
            var metadb = fb.GetNowPlaying();
            if (!metadb || !fb.IsMetadbInMediaLibrary(metadb)) {
                this.setImage(images.heart_empty);
            } else {
                this.setImage(+TF_RATING.EvalWithMetadb(metadb) == 5 ? images.heart : images.heart_empty);
            }
        },

        on_click: function () {
            var metadb = fb.GetNowPlaying();
            if (metadb && fb.IsMetadbInMediaLibrary(metadb)) {
                var loved_ = +TF_RATING.EvalWithMetadb(metadb) == 5;
                fb.RunContextCommandWithMetadb(loved_ ? CMD_UNLOVE : CMD_LOVE, metadb, 8);
            }
            this.on_init();
            Repaint();
        },

        on_playback_new_track: function () {
            this.on_init();
            Repaint();
        },

        on_playback_stop: function (reason: number) {
            if (reason !== 2) {
                this.on_init();
                Repaint();
            }
        },

        on_playback_edited() {
            this.on_init();
            Repaint();
        }
    });

    buttons.repeat = new Icon({
        image: images.repeat_off,

        on_init() {
            switch (plman.PlaybackOrder) {
                case 1: // repeat
                    this.setImage(images.repeat_on);
                    break;
                case 2: // repeat 1
                    this.setImage(images.repeat1_on);
                    break;
                default:
                    this.setImage(images.repeat_off);
                    break;
            }
        },

        on_click() {
            if (plman.PlaybackOrder < 2) {
                plman.PlaybackOrder += 1;
            } else if (plman.PlaybackOrder === 2) {
                plman.PlaybackOrder = 0;
            } else {
                plman.PlaybackOrder = 1;
            }

            this.on_init();
            Repaint();
        },

        on_playback_order_changed() {
            this.on_init();
            Repaint();
        }
    })

    buttons.shuffle = new Icon({
        image: images.shuffle_off,

        on_init() {
            if (plman.PlaybackOrder === 4) {
                this.setImage(images.shuffle_on);
            } else {
                this.setImage(images.shuffle_off);
            }
        },

        on_click() {
            if (plman.PlaybackOrder === 4) {
                plman.PlaybackOrder = 0; // reset to default
            } else {
                plman.PlaybackOrder = 4;
            }
            this.on_init();
        },

        on_playback_order_changed() {
            this.on_init();
            Repaint();
        }
    });

    buttons.volume = new Icon({
        image: images.volume,

        on_init() {
            this.setImage(
                fb.Volume == -100 ? images.volume_mute : images.volume
            );
        },

        on_click() {
            fb.VolumeMute();
        },

        on_volume_change() {
            this.on_init();
            Repaint();
        }
    });

    return buttons;
}

createBottomButtons();


function createThumbImg(colors: IThemeColors) {
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

    return { thumbImg: thumbImg, downThumbImg: downThumbImg };
}


const thumbImages = createThumbImg(bottomColors);
const progressHeight = scale(3);
const slider_secondaryColor = blendColors(bottomColors.text, bottomColors.background, 0.7);


const seekbar = new Slider({
    progressHeight: progressHeight,
    thumbImg: thumbImages.thumbImg,
    downThumbImg: thumbImages.downThumbImg,
    progressColor: bottomColors.highlight,
    secondaryColor: slider_secondaryColor,
    accentColor: bottomColors.highlight,

    get_progress() {
        return fb.PlaybackTime / fb.PlaybackLength;
    },

    set_progress(val: number) {
        fb.PlaybackTime = fb.PlaybackLength * val;
    }
});

const volumebar = new Slider({
    progressHeight: progressHeight,
    thumbImg: thumbImages.thumbImg,
    downThumbImg: thumbImages.downThumbImg,
    progressColor: bottomColors.highlight,
    secondaryColor: slider_secondaryColor,
    accentColor: bottomColors.highlight,

    get_progress() {
        return vol2pos(fb.Volume);
    },

    set_progress(val: number) {
        fb.Volume = pos2vol(val);
    }
});

const TF_TRACK_TITLE = fb.TitleFormat("%title%");
const TF_ARTIST = fb.TitleFormat("$if2([%artist%],未知艺人)");
const artistFont = gdi.Font("segoe ui", scale(12));

const artistText = new Textlink({
    text: "ARTIST",
    font: artistFont,
    color: bottomColors.text,
    hoverColor: blendColors(bottomColors.text, bottomColors.background, 0.7),
    maxWidth: MeasureString("一二 三四、五六 七八", artistFont).Width,

    on_init() {
        let metadb = fb.GetNowPlaying();
        this.setText(
            metadb ? TF_ARTIST.EvalWithMetadb(metadb) : "ARTIST"
        );
    },

    on_playback_new_track() {
        this.on_init();
        Repaint();
    },

    on_playback_stop(reason: number) {
        if (reason != 2) {
            this.on_init();
            Repaint();
        }
    },

    on_playback_edited() {
        this.on_init();
        Repaint();
    }
});

const albumArt = new AlbumArtView({
    on_init() {
        this.getArt(fb.GetNowPlaying());
    },

    on_playback_new_track() {
        this.on_init();
        Repaint();
    },

    on_playback_stop(reason: number) {
        if (reason != 2) {
            this.on_init();
            Repaint();
        }
    },

    on_playback_edited() {
        this.on_init();
        Repaint();
    }
});

// TODO: class BottomPanelView extends Component;
const bottomPanel = new Component({
    // properties;
    timerId: -1,
    pb_time: "",
    pb_length: "",
    track_title: "",
    title_font: gdi.Font("segoe ui semibold", scale(13)),
    time_font: gdi.Font("segoe ui", scale(12)),
    time_w: 1,
    volume_w: scale(80),
    art_w: scale(55),

    on_init() {
        // Add children;

        // let timerId = -1;
        let on_playback_time_ = () => {
            if (fb.IsPlaying && !fb.IsPaused && fb.PlaybackLength > 0) {
                this.pb_time = FormatTime(fb.PlaybackTime);
                this.pb_length = FormatTime(fb.PlaybackLength);
                Repaint();
            } else {/** */ };
            window.ClearTimeout(this.timerId);
            this.timerId = window.SetTimeout(on_playback_time_, 1000);
        }

        on_playback_time_();

        let np_metadb = fb.GetNowPlaying();
        this.track_title = (
            np_metadb == null ? "NOT PLAYING" : TF_TRACK_TITLE.EvalWithMetadb(np_metadb)
        );
        if (fb.IsPlaying) {
            this.pb_time = FormatTime(fb.PlaybackTime);
            this.pb_length = FormatTime(fb.PlaybackLength);
        }

        this.time_w = MeasureString("+00:00+", this.time_font).Width;
    },

    on_size() {
        let buttons = pb_btns2;
        let UI_x = this.x,
            UI_y = this.y,
            UI_w = this.width,
            UI_h = this.height;

        // play_pause button;
        let bw_1 = buttons.playOrPause.width;
        let by_1 = (UI_y + (scale(50) - bw_1) / 2) >> 0;
        let bx_1 = (UI_x + UI_w / 2 - bw_1 / 2) >> 0;
        let pad_1 = scale(12);
        buttons.playOrPause.setSize(bx_1, by_1);

        // prev
        let bx_2 = bx_1 - bw_1 - pad_1;
        buttons.prev.setSize(bx_2, by_1);

        // next;
        let bx_3 = bx_1 + bw_1 + pad_1;
        buttons.next.setSize(bx_3, by_1);

        // repeat
        let bw_2 = buttons.shuffle.width;
        let by_2 = (UI_y + (scale(50) - bw_2) / 2) >> 0;
        let bx_4 = bx_2 - bw_2 - scale(16);
        buttons.repeat.setSize(bx_4, by_2);

        //shuffle;
        let bx_5 = bx_3 + bw_1 + scale(16);
        buttons.shuffle.setSize(bx_5, by_2);

        // volume bar;
        let vol_h = scale(18)
        let vol_w = scale(80);
        let vol_y = UI_y + (UI_h - vol_h) / 2;
        let vol_x = UI_x + UI_w - vol_w - scale(24);
        volumebar.setSize(vol_x, vol_y, vol_w, vol_h);

        // volume mute button;
        let bx_6 = vol_x - bw_2 - scale(4);
        let by_6 = (UI_y + (UI_h - bw_2) / 2) >> 0;
        buttons.volume.setSize(bx_6, by_6);

        // love;
        buttons.love.setSize(bx_6 - bw_2, by_6);

        // seekbar;
        let seek_max_w = scale(640);
        let seek_min_w = scale(240);
        let ui_min_w = scale(780);
        let seek_w = UI_w * (seek_min_w / ui_min_w);
        if (seek_w < seek_min_w) seek_w = seek_min_w;
        else if (seek_w > seek_max_w) seek_w = seek_max_w;
        let seek_x = UI_x + (UI_w - seek_w) / 2;
        let seek_y = by_1 + bw_1 + scale(8);
        seekbar.setSize(seek_x, seek_y, seek_w, scale(16));

        // art;
        let art_w = scale(48);
        let art_pad = (UI_h - art_w) / 2;
        albumArt.setSize(UI_x + art_pad, UI_y + art_pad, art_w, art_w);


        // artist text;
        let artist_x = UI_x + art_pad + art_w + scale(8);
        let artist_y = this.y + (this.height / 2);
        let artist_w = seek_x - bw_2 - scale(8) - artist_x;
        artistText.setSize(artist_x, artist_y, artist_w, scale(20));
    },

    on_paint(gr: IGdiGraphics) {
        let colors = bottomColors;
        let buttons = pb_btns2;

        // bg
        gr.FillSolidRect(this.x, this.y, this.width, this.height, colors.background);

        // playback time;
        let pb_time_x = seekbar.x - this.time_w - scale(4);
        let pb_time_y = seekbar.y;
        gr.DrawString(this.pb_time, this.time_font, colors.text, pb_time_x, pb_time_y, this.time_w, seekbar.height, StringFormat.Center);

        // playback length;
        let pb_len_x = seekbar.x + seekbar.width + scale(4);
        gr.DrawString(this.pb_length, this.time_font, colors.text, pb_len_x, pb_time_y, this.time_w, seekbar.height, StringFormat.Center);

        // track title;
        let title_x = albumArt.x + albumArt.width + scale(8);
        let title_max_w = pb_time_x - buttons.love.width - scale(8) - title_x;
        let title_y = this.y + this.height / 2 - scale(22) - scale(2);
        gr.DrawString(this.track_title, this.title_font, colors.text, title_x, title_y, title_max_w, scale(22), StringFormat.LeftCenter);

    },

    on_playback_new_track() {
        this.pb_time = "00:00";
        this.pb_length = "--:--"
        this.track_title = TF_TRACK_TITLE.EvalWithMetadb(fb.GetNowPlaying());
        Repaint();
    },

    on_playback_stop(reason: number) {
        if (reason != 2) {
            this.track_title = "NOT PLAYING";
            this.pb_time = "00:00";
            this.pb_length = "--:--"
            Repaint();
        }
    }
});

// Append children elements to playback control bar;
Object.values(pb_btns2).forEach(btn => bottomPanel.addChild(btn));
[volumebar, seekbar, albumArt, artistText].forEach(item => bottomPanel.addChild(item));

// --------------------------
// Manage panels, callbacks;
// --------------------------

const PLAY_CONTROL_HEIGHT = scale(76);

const UI = new Component({
    on_init() {

    },

    on_paint(gr: IGdiGraphics) {
        gr.FillSolidRect(this.x, this.y, this.width, this.height, mainColors.background)
    },

    on_size() {
        bottomPanel.setSize(this.x, this.y + this.height - PLAY_CONTROL_HEIGHT, this.width, PLAY_CONTROL_HEIGHT);
    },
});

// Add children;
UI.addChild(bottomPanel);

let panels_vis: Component[] = [];
let panels_vis_updated = false;

function findVisibleComponents(root: Component) {
    if (!root.isVisible()) return [];

    let children = root.children;
    let visibles = [root];

    for (let i = 0; i < children.length; i++) {
        if (children[i].isVisible()) {
            visibles = visibles.concat(findVisibleComponents(children[i]));
        }
    }

    return visibles;
}

function RefreshPanels() {
    let panelsPrev = panels_vis;
    panels_vis = findVisibleComponents(UI);
    panels_vis
        .filter(p => panelsPrev.indexOf(p) === -1)
        .forEach(p => invoke(p, "on_init"));
}

const useClearType = window.GetProperty('_Global.Font Use ClearType', true);
const useAntiAlias = window.GetProperty('_Global.Font Antialias(Only when useClearType = false', true);
const textRenderingHint = useClearType ? 5 : useAntiAlias ? 4 : 0;

function on_paint(gr: IGdiGraphics) {
    gr.SetTextRenderingHint(textRenderingHint);

    for (let i = 0, len = panels_vis.length; i < len; i++) {
        (<any>panels_vis[i]).on_paint && (<any>panels_vis[i]).on_paint(gr);
    }
}

const winMinWidth = scale(780);

function on_size() {
    let ww = window.Width;
    let wh = window.Height;
    if (!ww || !wh) return;

    UI.setSize(0, 0, Math.max(ww, winMinWidth), wh);
    if (g_panels_changed) {
        RefreshPanels();
        g_panels_changed = false;
    }
}


const g_mouse = { x: -1, y: -1 };
let g_active_index = -1;
let g_down_index = -1;
let g_focus_index = -1;
let g_drag_window = false;

function findActivePanel(visibles: Component[], x: number, y: number) {
    let len = visibles.length;
    let result = -1;

    for (let i = len - 1; i >= 0; --i) {
        if (visibles[i].trace(x, y)) {
            result = i;
            break;
        }
    }

    return result;
}

function Activate(x: number, y: number) {
    let deactiveId = g_active_index;
    g_active_index = findActivePanel(panels_vis, x, y);
    if (g_active_index !== deactiveId) {
        invoke(panels_vis[deactiveId], "on_mouse_leave");
        invoke(panels_vis[g_active_index], "on_mouse_move");
    }
}

function Focus(x: number, y: number) {
    let defocusId = g_focus_index;
    if (g_active_index > -1) {
        g_focus_index = g_active_index;
    }
    if (g_focus_index !== defocusId) {
        invoke(panels_vis[defocusId], "on_focus", false);
        invoke(panels_vis[g_focus_index], "on_focus", true);
    }
}

function on_mouse_move(x: number, y: number) {
    if (x === g_mouse.x && y === g_mouse.y) {
        return;
    }

    g_mouse.x = x;
    g_mouse.y = y;

    if (!g_drag_window) {
        Activate(x, y);
    }

    invoke(panels_vis[g_active_index], "on_mouse_move", x, y);
}

function on_mouse_lbtn_down(x: number, y: number, mask?: number) {
    g_drag_window = true;
    Activate(x, y);
    g_down_index = g_active_index;
    invoke(panels_vis[g_active_index], "on_mouse_lbtn_down", x, y);
}

function on_mouse_lbtn_dblclk(x: number, y: number, mask?: number) {
    invoke(panels_vis[g_active_index], "on_mouse_lbtn_dblclk", x, y);
}

function on_mouse_lbtn_up(x: number, y: number, mask?: number) {
    invoke(panels_vis[g_active_index], "on_mouse_lbtn_up", x, y);

    if (g_drag_window) {
        g_drag_window = false;
        Activate(x, y);
    }
}

function on_mouse_leave() {
    Activate(-1, -1);
}

function on_mouse_rbtn_down(x: number, y: number, mask?: number) {
    invoke(panels_vis[g_active_index], "on_mouse_rbtn_down", x, y);
}

function on_mouse_rbtn_up(x: number, y: number, mask?: number) {
    invoke(panels_vis[g_active_index], "on_mouse_rbtn_up", x, y);
    return true;
}

function on_mouse_wheel(step: number) {
    if (g_active_index === -1) {
        return;
    }
    // else;
    if ((<any>panels_vis[g_active_index])["on_mouse_wheel"]) {
        (<any>panels_vis[g_active_index]).on_mouse_wheel(step);
    } else {
        let tmp = panels_vis[g_active_index];
        while (tmp.parent != null) {
            if ((<any>tmp.parent)["on_mouse_wheel"]) {
                (<any>tmp.parent).on_mouse_wheel(step);
                break;
            }
            tmp = tmp.parent;
        }
    }
}

function on_playback_order_changed(newOrder: number) {
    panels_vis.forEach(p => invoke(p, "on_playback_order_changed"));
}

function on_playback_stop(reason: number) {
    panels_vis.forEach(p => invoke(p, "on_playback_stop"));
}

function on_playback_edited() {
    panels_vis.forEach(p => invoke(p, "on_playback_edited"));
}

function on_playback_pause() {
    panels_vis.forEach(p => invoke(p, "on_playback_pause"));
}

function on_playback_new_track(handle: IFbMetadb) {
    panels_vis.forEach(p => invoke(p, "on_playback_new_track", handle));
}


function on_playlists_changed() {
    panels_vis.forEach(p => invoke(p, "on_playlists_changed"));
}

function on_playlist_switch() {
    panels_vis.forEach(p => invoke(p, "on_playlist_switch"));
}
