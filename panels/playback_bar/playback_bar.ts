/// <reference path="../../common/foo_spider_monkey_panel.d.ts" />
/// <reference path="../../common/common.ts" />
/// <reference path="../../common/components.ts" />
// / <reference path="../common/lastfm.js" />

const colors = {
    text: RGB(180, 182, 184),
    background: RGB(40, 40, 40),
    highlight: RGB(238, 127, 0),
    text_sel: RGB(255, 255, 255),
    heart: RGB(195, 45, 46),
};

const CMD_LOVE = 'Playback Statistics/Rating/5';
const CMD_UNLOVE = 'Playback Statistics/Rating/<not set>';
const TF_RATING = fb.TitleFormat('%rating%');


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


function ToggleLove(metadb: IFbMetadb) {
    if (metadb == null) {
        return;
    }// else

    // SMP Panel needs context menu command to be full path;
    const CMD_LOVE = 'Playback Statistics/Rating/5';
    const CMD_UNLOVE = 'Playback Statistics/Rating/<not set>';
    const TF_RATING = fb.TitleFormat('%rating%');

    if (TF_RATING.EvalWithMetadb(metadb)) {
        fb.RunContextCommandWithMetadb(CMD_UNLOVE, metadb);
    } else {
        fb.RunContextCommandWithMetadb(CMD_LOVE, metadb);
    }
}

// let images 

function CreateButtons() {
    const iconCode = {
        heart_empty: '\ue87e',
        heart: '\ue87d',
        repeat: '\ue040',
        repeat1: '\ue041',
        shuffle: '\ue043',
        default_order: '\ue16d',
        volume: '\ue050',
        volume_mute: '\ue04f',
        play_arrow: '\ue037',
        pause: '\ue034',
        skip_next: '\ue044',
        skip_prev: '\ue045'
    };

    // TODO: Use spotify's icon;
    let iconName = "Material Icons";
    let iconFont = gdi.Font(iconName, scale(22));
    let iconFont2 = gdi.Font(iconName, scale(18));
    let bw_1 = scale(32);
    let bw_2 = scale(32);
    let images: { [propname: string]: IGdiBitmap } = {};

    images.pause = imageFromCode(iconCode.pause, iconFont, colors.text, bw_1, bw_1);
    images.play = imageFromCode(iconCode.play_arrow, iconFont, colors.text, bw_1, bw_1);
    images.next = imageFromCode(iconCode.skip_next, iconFont, colors.text, bw_1, bw_1);
    images.prev = imageFromCode(iconCode.skip_prev, iconFont, colors.text, bw_1, bw_1);
    images.heart = imageFromCode(iconCode.heart, iconFont2, colors.heart, bw_2, bw_2);
    images.heart_empty = imageFromCode(iconCode.heart_empty, iconFont2, colors.text, bw_2, bw_2);
    images.repeat_off = imageFromCode(iconCode.repeat, iconFont2, colors.text, bw_2, bw_2);
    images.repeat_on = imageFromCode(iconCode.repeat, iconFont2, colors.highlight, bw_2, bw_2);
    images.repeat1_on = imageFromCode(iconCode.repeat1, iconFont2, colors.highlight, bw_2, bw_2);
    images.shuffle_off = imageFromCode(iconCode.shuffle, iconFont2, colors.text, bw_2, bw_2);
    images.shuffle_on = imageFromCode(iconCode.shuffle, iconFont2, colors.highlight, bw_2, bw_2);
    images.volume = imageFromCode(iconCode.volume, iconFont2, colors.text, bw_2, bw_2);
    images.volume_mute = imageFromCode(iconCode.volume_mute, iconFont2, colors.text, bw_2, bw_2);

    let buttons: { [name: string]: Icon } = {};

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
            fb.Prev();
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

    buttons.volumn = new Icon({
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


const buttons = CreateButtons();


function createThumbImg(colors: { [name: string]: number }) {
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

const thumbImages = createThumbImg(colors);
const progressHeight = scale(3);
const slider_secondaryColor = blendColors(colors.text, colors.background, 0.7);

const seekbar = new Slider({
    progressHeight: progressHeight,
    thumbImg: thumbImages.thumbImg,
    downThumbImg: thumbImages.downThumbImg,
    progressColor: colors.highlight,
    secondaryColor: slider_secondaryColor,
    accentColor: colors.highlight,

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
    progressColor: colors.highlight,
    secondaryColor: slider_secondaryColor,
    accentColor: colors.highlight,

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
    color: colors.text,
    hoverColor: blendColors(colors.text, colors.background, 0.3),
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

    /** @param {number} reason */
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


const UI = new Component({
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
        buttons.volumn.setSize(bx_6, by_6);

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



/** 
 * store visible panels;
 * @type {Component[]} 
 */
let panels_vis: Component[] = [];
let panels_vis_updated = false;


/**
 * 
 * @param {Component} root 
 * @returns {Component[]}
 */
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

// test;
// var a = new Component();//4
// a.z = 1;
// var b = new Component();//5j
// b.z = 2;;
// var c = new Component(); //6
// c.z = 3
// var d = new Component(); //7
// d.z = 4
// UI.addChild(a);
// UI.addChild(b);
// a.addChild(c);
// a.addChild(d);

// UI.setSize(0, 0, window.Width, window.Height);
// [a, b, c, d].forEach(item => item.setSize(0, 0, 1, 1));

// refreshVisibles();
// console.log([a, b, c, d].map(item=> item.isVisible()));
// console.log(Visibles.map(item => item.cid));

function RefreshPanels() {
    let panels_pre = panels_vis;
    panels_vis = findVisibleComponents(UI);
    panels_vis
        .filter(p => panels_pre.indexOf(p) === -1)
        .forEach(p => invoke(p, "on_init"));
    g_panels_changed = false;
}

// test;
// let __obj = {
//     hello(a, b) {
//         console.log("hell world");
//         if (a != null) console.log("hello a")
//         if (b != null) console.log("hello b");
//     }
// }
// invoke(__obj, "hello");
// invoke(__obj, "hello", 1);
// invoke(__obj, "hello", 1, 2);


const useClearType = window.GetProperty('_Global.Font Use ClearType', true);
const useAntiAlias = window.GetProperty('_Global.Font Antialias(Only when useClearType = false', true);
const textRenderingHint = useClearType ? 5 : useAntiAlias ? 4 : 0;

/**
 * 
 * @param {IGdiGraphics} gr 
 */
function on_paint(gr: IGdiGraphics) {
    gr.SetTextRenderingHint(textRenderingHint);

    for (let i = 0, len = panels_vis.length; i < len; i++) {
        (<any>panels_vis[i]).on_paint && (<any>panels_vis[i]).on_paint(gr);
    }
}

let UI_height = scale(75);
let UI_min_width = scale(780);

function on_size() {
    let ww = window.Width;
    let wh = window.Height;
    if (!ww || !wh) return;

    let UI_width = (ww < UI_min_width ? UI_min_width : ww);
    UI.setSize(0, wh - UI_height, UI_width, UI_height);
    if (g_panels_changed) {
        RefreshPanels();
    }
}

const g_mouse = { x: -1, y: -1 };
let g_active_index = -1;
let g_down_index = -1;
let g_focus_index = -1;
let g_drag_window = false;

/**
 * 
 * @param {Components[]} visibles
 * @param {number} x 
 * @param {number} y 
 * @returns {number}
 */
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

/**
 * 
 * @param {number} x 
 * @param {number} y 
 */
function Activate(x: number, y: number) {
    let deactiveId = g_active_index;
    g_active_index = findActivePanel(panels_vis, x, y);

    if (g_active_index !== deactiveId) {
        invoke(panels_vis[deactiveId], "on_mouse_leave");
        invoke(panels_vis[g_active_index], "on_mouse_move");
    }
}

/**
 * Update focused component.
 * @param {number} x 
 * @param {number} y 
 */
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

/**
 * 
 * @param {number} x 
 * @param {number} y 
 */
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


/**
 * 
 * @param {number} x 
 * @param {number} y 
 * @param {number} mask
 */
function on_mouse_lbtn_down(x: number, y: number, mask?: number) {
    g_drag_window = true;
    Activate(x, y);
    g_down_index = g_active_index;
    invoke(panels_vis[g_active_index], "on_mouse_lbtn_down", x, y);
}

/**
 * @param {number} x
 * @param {number} y
 */
function on_mouse_lbtn_dblclk(x: number, y: number, mask?: number) {
    invoke(panels_vis[g_active_index], "on_mouse_lbtn_dblclk", x, y);
}

/**
 * 
 * @param {number} x 
 * @param {number} y 
 * @param {number} mask 
 */
function on_mouse_lbtn_up(x: number, y: number, mask?:number) {
    invoke(panels_vis[g_active_index], "on_mouse_lbtn_up", x, y);

    if (g_drag_window) {
        g_drag_window = false;
        Activate(x, y);
    }
}


function on_mouse_leave() {
    Activate(-1, -1);
}

/**
 * 
 * @param {number} x 
 * @param {number} y 
 */
function on_mouse_rbtn_down(x: number, y: number, mask?: number) {
    invoke(panels_vis[g_active_index], "on_mouse_rbtn_down", x, y);
}

/**
 * 
 * @param {number} x 
 * @param {number} y 
 */
function on_mouse_rbtn_up(x: number, y: number, mask?: number) {
    invoke(panels_vis[g_active_index], "on_mouse_rbtn_up", x, y);

}

/**
 * 
 * @param {number} step 
 */
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

function on_volume_change(val: number) {
    panels_vis.forEach(p => invoke(p, "on_volume_change"));
}


/**
 * Init;
 */

Object.values(buttons).forEach(btn => { UI.addChild(btn) });
[volumebar, seekbar, albumArt, artistText].forEach(
    item => UI.addChild(item)
);

// set window size;
window.MaxHeight = window.MinHeight = UI_height;
window.MinWidth = UI_min_width;