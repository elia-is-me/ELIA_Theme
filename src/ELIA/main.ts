import { RGB, scale, blendColors } from "./common/common"
import { imageFromCode } from "./common/common";
import { SmoothingMode, } from "./common/common"
import { Component, invoke } from "./common/components";
import { Icon, Slider, ScrollView, Scrollbar, AlbumArtView, Textlink } from "./common/components"
import { Repaint, ThrottledRepaint } from "./common/components"
import { PlaybackOrder } from "./common/common"
import { MeasureString, StringFormat } from "./common/common"
import { MenuFlag } from "./common/common"
import { KeyCode } from "./common/keyCodes"

// ------------------------------------------------------------
// Global resources: theme colors, icon codes, command string,
//                    title_format objects;
// ------------------------------------------------------------

// Colors;
// TODO: 参考 ANTD 颜色，命名等
//       Scrollbar 颜色主题规范

interface IThemeColors {
    text: number;
    secondaryText?: number;
    text2?: number;
    background: number;
    highlight: number;
    background_sel?: number;
    text_sel?: number;
    [name: string]: number;
};

/**
 * Colors of main panel area;
 */
const mainColors: IThemeColors = {
    text: RGB(235, 235, 235),
    secondaryText: RGB(217, 217, 217),
    background: RGB(35, 35, 35),
    highlight: RGB(247, 217, 76)
}

/**
 * Colors for bottom playback bar;
 */
const bottomColors: IThemeColors = {
    text: mainColors.text,
    background: RGB(17, 17, 17),
    highlight: RGB(251, 114, 153),
    text_sel: RGB(255, 255, 255),
    heart: RGB(195, 45, 46)
}

/**
 * Colors for sidebar like playlist manager;
 */
const sidebarColors: IThemeColors = {
    text: mainColors.text,
    secondaryText: mainColors.secondaryText,
    background: RGB(24, 24, 24),
    highlight: RGB(247, 217, 76),
    HEART_RED: RGB(221, 0, 27) // Color for mood;
}

/**
 * Scrollbar color;
 */
const scrollbarColor = {
    cursor: 0x50ffffff & mainColors.text,
    background: 0, // opacity
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
    repeat: '\ue040',
    repeat1: '\ue041',
    default_order: '\ue16d',
    play_arrow: '\ue037',
    pause: '\ue034',
    skip_next: '\ue044',
    skip_prev: '\ue045'
};

/**
 * Google material icons font name;
 */
const MaterialFont = "Material Icons";
const globalFontName = "Microsoft YaHei";
const logfont = gdi.Font("Microsoft YaHei", scale(14));
const scrollbarWidth = scale(14);

// Global Messages
const Messages = {
    topbarSwitchTab: "topbar.switchtab",
    showArtistPage: "show_artist_page",
}

const Prevent = {
    on_item_focus_change: false,
}

// ---------------------
// Playback control bar;
// ---------------------

function pos2vol(pos: number) {
    return (50 * Math.log(0.99 * pos + 0.01)) / Math.LN10;
}

function vol2pos(v: number) {
    return (Math.pow(10, v / 50) - 0.01) / 0.99;
}

function formatPlaybackTime(sec: number) {
    if (!isFinite(sec)) return '--:--';
    var seconds = sec % 60 >> 0;
    var minutes = (sec / 60) >> 0;
    var pad = function (num: number) {
        if (num < 10) return '0' + num;
        else return '' + num;
    };
    return pad(minutes) + ":" + pad(seconds);
}

type ButtonKeys = "playOrPause" | "next" | "prev" | "love" | "repeat" | "shuffle" | "volume";
type ImageKeys = "pause" | "play" | "next" | "prev" | "heart" | "heart_empty"
    | "repeat_off" | "repeat_on" | "repeat1_on" | "shuffle_off" | "shuffle_on"
    | "volume" | "volume_mute";
type TPlaybackButtons = { [K in ButtonKeys]: Icon };



const createBottomButtons = (themeColors?: IThemeColors) => {
    const colors = bottomColors;
    let iconName = MaterialFont;
    let iconFont = gdi.Font(iconName, scale(22));
    let iconFont2 = gdi.Font(iconName, scale(18));
    let bw_1 = scale(32);
    let bw_2 = scale(32);
    let images: { [K in ImageKeys]: IGdiBitmap } = {
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
    let buttons: TPlaybackButtons = {
        playOrPause: null,
        next: null,
        prev: null,
        love: null,
        repeat: null,
        shuffle: null,
        volume: null
    }

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
                case PlaybackOrder.repeat_playlist:
                    this.setImage(images.repeat_on);
                    break;
                case PlaybackOrder.repeat_track:
                    this.setImage(images.repeat1_on);
                    break;
                default: // repeat off
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

interface SliderThumbImage {
    normal: IGdiBitmap;
    down: IGdiBitmap;
}

function createThumbImg(colors: IThemeColors): SliderThumbImage {
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

const thumbImages = createThumbImg(bottomColors);
const progressHeight = scale(3);
const slider_secondaryColor = blendColors(bottomColors.text, bottomColors.background, 0.7);
const seekbar = new Slider({
    progressHeight: progressHeight,
    thumbImage: thumbImages.normal,
    pressedThumbImage: thumbImages.down,
    progressColor: bottomColors.highlight,
    secondaryColor: slider_secondaryColor,
    accentColor: bottomColors.highlight,
    getProgress() {
        return fb.PlaybackTime / fb.PlaybackLength;
    },
    setProgress(val: number) {
        fb.PlaybackTime = fb.PlaybackLength * val;
    }
});

const volumebar = new Slider({
    progressHeight: progressHeight,
    thumbImage: thumbImages.normal,
    pressedThumbImage: thumbImages.down,
    progressColor: bottomColors.highlight,
    secondaryColor: slider_secondaryColor,
    accentColor: bottomColors.highlight,
    getProgress() {
        return vol2pos(fb.Volume);
    },
    setProgress(val: number) {
        fb.Volume = pos2vol(val);
    }
});

const TF_TRACK_TITLE = fb.TitleFormat("%title%");
// \u30fb: Middle dot char code.
const TF_ARTIST = fb.TitleFormat("$if2([%artist%],未知艺人)[\u30fb$year(%date%)]");
const artistFont = gdi.Font("Microsoft YaHei", scale(12));

const artistText = new Textlink({
    text: "ARTIST",
    font: artistFont,
    textColor: blendColors(bottomColors.text, bottomColors.background, 0.2),
    // mbottomColors.text,
    textHoverColor: blendColors(bottomColors.text, bottomColors.background, 0.2),
    maxWidth: MeasureString("一二 三四、五六 七八" + "\u30fb0000", artistFont).Width,

    on_init() {
        let metadb = fb.GetNowPlaying();
        this.setText(
            metadb ? TF_ARTIST.EvalWithMetadb(metadb) : "ARTIST"
        );
    },

    on_click() {
        // Show artist page: artistName;
        NotifyOtherPanels(Messages.showArtistPage, "");
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

class PlaybackControlPanel extends Component {
    private timerId: number = -1;
    playbackTime: string = "";
    playbackLength: string = "";
    trackTitle: string = "";
    titleFont = gdi.Font("Segoe UI Semibold", scale(13));
    timeFont = gdi.Font("Segoe UI", scale(12));
    timeWidth = 1;
    volumeWidth = scale(80);
    artworkWidth = scale(55);
    colors: IThemeColors;

    // children;
    volume: Slider;
    seekbar: Slider;
    artwork: AlbumArtView;
    artist: Textlink;
    buttons: TPlaybackButtons;

    constructor(attrs: {
        colors: IThemeColors;
        z?: number;
    }) {
        super(attrs);
        this.colors = attrs.colors;
        this.setChildPanels();
    }

    on_init() {
        let panelRefreshInterval = 1000; // ms;
        let onPlaybackTimer_ = () => {
            if (fb.IsPlaying && !fb.IsPaused && fb.PlaybackLength > 0) {
                this.playbackTime = formatPlaybackTime(fb.PlaybackTime);
                this.playbackLength = formatPlaybackTime(fb.PlaybackLength);
                Repaint();
            } else { }
            window.ClearTimeout(this.timerId);
            this.timerId = window.SetTimeout(onPlaybackTimer_, panelRefreshInterval);
        }

        onPlaybackTimer_();

        let npMetadb = fb.GetNowPlaying();
        this.trackTitle = (
            npMetadb == null ? "NOT PLAYING" : TF_TRACK_TITLE.EvalWithMetadb(npMetadb)
        );
        if (fb.IsPlaying) {
            this.playbackTime = formatPlaybackTime(fb.PlaybackTime);
            this.playbackLength = formatPlaybackTime(fb.PlaybackLength);
        }
        this.timeWidth = MeasureString("+00:00+", this.timeFont).Width;
    }

    setChildPanels() {
        this.buttons = createBottomButtons();
        this.seekbar = seekbar;
        this.volume = volumebar;
        this.artist = artistText;
        this.artwork = albumArt;

        this.addChild(this.seekbar);
        this.addChild(this.volume);
        this.addChild(this.artist);
        this.addChild(this.artwork);
        Object.values(this.buttons).forEach(btn => this.addChild(btn));
    }

    on_size() {
        let { seekbar, volume, buttons, artwork, artist } = this;
        // let buttons = pb_btns2;
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
        volume.setSize(vol_x, vol_y, vol_w, vol_h);

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
        artwork.setSize(UI_x + art_pad, UI_y + art_pad, art_w, art_w);

        // artist text;
        let artist_x = UI_x + art_pad + art_w + scale(8);
        let artist_y = this.y + (this.height / 2);
        let artist_w = seek_x - bw_2 - scale(8) - artist_x;
        artist.setSize(artist_x, artist_y, artist_w, scale(20));
    }

    on_paint(gr: IGdiGraphics) {
        //let colors = bottomColors;
        //let buttons = this.buttons;
        let { colors, buttons } = this;

        // bg
        gr.FillSolidRect(this.x, this.y, this.width, this.height, colors.background);

        // playback time;
        let pb_time_x = seekbar.x - this.timeWidth - scale(4);
        let pb_time_y = seekbar.y;
        gr.DrawString(this.playbackTime, this.timeFont, colors.text, pb_time_x, pb_time_y, this.timeWidth, seekbar.height, StringFormat.Center);

        // playback length;
        let pb_len_x = seekbar.x + seekbar.width + scale(4);
        gr.DrawString(this.playbackLength, this.timeFont, colors.text, pb_len_x, pb_time_y, this.timeWidth, seekbar.height, StringFormat.Center);

        // track title;
        let title_x = albumArt.x + albumArt.width + scale(8);
        let title_max_w = pb_time_x - buttons.love.width - scale(8) - title_x;
        let title_y = this.y + this.height / 2 - scale(22) - scale(2);
        gr.DrawString(this.trackTitle, this.titleFont, colors.text, title_x, title_y, title_max_w, scale(22), StringFormat.LeftCenter);

    }

    on_playback_new_track() {
        this.playbackTime = "00:00";
        this.playbackLength = "--:--"
        this.trackTitle = TF_TRACK_TITLE.EvalWithMetadb(fb.GetNowPlaying());
        Repaint();
    }

    on_playback_stop(reason: number) {
        if (reason != 2) {
            this.playbackTime = "00:00";
            this.playbackLength = "--:--"
            this.trackTitle = "NOT PLAYING";
            Repaint();
        }
    }

}

const bottomPanel = new PlaybackControlPanel({
    colors: bottomColors,
    z: 1000
});

const AD_properties = {
    marginLR: scale(48), // Move to global
    marginTB: scale(40), // Move to global;
    imageExts: 'jpg|jpeg|png'
}

function getFiles(folder: string, exts: string, newestFirst: boolean) {

}

class ArtDisplay extends Component {

    objTF = fb.TitleFormat("%album artist%^^%album%");
    trackKey: string = "";
    currentImage: IGdiBitmap;
    defaultImage: IGdiBitmap;

    on_init() { }

    on_size() { }

    on_paint(gr: IGdiGraphics) {
        gr.FillSolidRect(this.x, this.y, this.width, this.height, RGB(145, 85, 47));
        gr.DrawString("Cover Art", logfont, 0xffffffff, this.x, this.y, this.width, this.height, StringFormat.Center);
    }

    on_metadb_changed(metadb: IFbMetadb, fromhook?: boolean) {
    }

    getImages(metadb?: IFbMetadb) {

    }
}

const bigArt = new ArtDisplay({})

class TabItem {
    private defaultPadding = scale(4);
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    padding: number;
    constructor(attr: {
        text: string;
        padding?: number;
    }) {
        this.text = attr.text;
        if (attr.padding != null) {
            this.padding = attr.padding | 0;
        } else {
            this.padding = this.defaultPadding;
        }
    }

    trace(x: number, y: number) {
        return (x > this.x && x <= this.x + this.width
            && y > this.y && y <= this.y + this.height);
    }
}


// Switch tabs;
class SwitchTab extends Component {
    font: IGdiFont;
    gapWdith = scale(36);
    tabItems: TabItem[];
    private focusTabIndex: number;
    private hoverTabIndex: number;

    constructor(attr: {
        font: IGdiFont
        items: string[],
        focusTab?: number
    }) {
        super(attr);

        this.font = attr.font;
        const itemPaddingLR = scale(4);
        this.tabItems = attr.items.map(item => new TabItem({ text: item, padding: itemPaddingLR }));
        this.focusTabIndex = (attr.focusTab == null ? 0 : attr.focusTab);
    }

    calcTotalWidth() {
        return (this.tabItems.length - 1) * this.gapWdith + this.tabItems
            .map(item => MeasureString(item.text, this.font).Width + 2 * item.padding)
            .reduce((prevResult, item, index, array) => { return prevResult += item });
    }

    on_paint(gr: IGdiGraphics) {
        let itemX = this.x;
        let itemColor: number = RGB(150, 150, 150);
        let itemColorFocus: number = RGB(225, 225, 225);
        let lineHeight = scale(2);
        let lineY = this.y + this.height - lineHeight;

        for (let i = 0; i < this.tabItems.length; i++) {
            let itemPaddingLR = this.tabItems[i].padding;
            let itemWidth = gr.MeasureString(
                this.tabItems[i].text, this.font, 0, 0, 999, 9999, StringFormat.LeftCenter).Width
                + 2 * itemPaddingLR;
            gr.DrawString(this.tabItems[i].text, this.font,
                (i == this.focusTabIndex || i === this.hoverTabIndex) ? itemColorFocus : itemColor,
                itemX + itemPaddingLR, this.y,
                itemWidth, this.height, StringFormat.LeftCenter);
            if (i == this.focusTabIndex) {
                gr.DrawLine(itemX, lineY, itemX + itemWidth, lineY, lineHeight, itemColorFocus);
            }

            this.tabItems[i].x = itemX;
            this.tabItems[i].width = itemWidth;
            this.tabItems[i].y = this.y;
            this.tabItems[i].height = this.height;

            itemX += (itemWidth + this.gapWdith)
        }
    }

    on_mouse_move(x: number, y: number) {
        const hotItemIndex = this.tabItems.findIndex(item => item.trace(x, y));
        if (this.hoverTabIndex !== hotItemIndex) {
            this.hoverTabIndex = hotItemIndex;
            ThrottledRepaint();
        }
    }

    on_mouse_lbtn_down(x: number, y: number) {
        const hotItemIndex = this.tabItems.findIndex(item => item.trace(x, y));
        if (hotItemIndex !== -1 && this.focusTabIndex !== hotItemIndex) {
            this.focusTabIndex = hotItemIndex;
            this.onTabChange(this.focusTabIndex);
            ThrottledRepaint();
        }
    }

    onTabChange(to: number) { }

    on_mouse_leave() {
        this.hoverTabIndex = -1;
        ThrottledRepaint();
    }
}


/* TODO */
const Topbar_Properties = {
    height: scale(56),
    tabFont: gdi.Font(globalFontName, scale(14)),
    focusTabIndex: +window.GetProperty("Topbar.focusTab", 0),
}

const Topbar_Colors: IThemeColors = {
    text: mainColors.text,
    background: RGB(37, 37, 37),
    highlight: mainColors.highlight
};

class TopBar extends Component {

    colors: IThemeColors;
    logoIcon: IGdiBitmap;
    searchInput: any;
    searchButton: any;
    backButton: Icon;

    constructor(attr: object) {
        super(attr);

        this.colors = Topbar_Colors;
    }

    on_init() {

    }

    on_size() {
    }

    on_paint(gr: IGdiGraphics) {
        gr.FillSolidRect(this.x, this.y, this.width, this.height, this.colors.background);
    }
}

const topbar = new TopBar({})
topbar.z = 1100;

//====================================
// Simple Playlist View
//====================================

const PL_Properties = {
    rowHeight: scale(40),
    headerHeight: scale(24),
    tfTrackInfo: fb.TitleFormat("%tracknumber%^^%artist%^^%title%^^%length%^^%rating%^^[%album%]^^[%artist%]"),
    itemFont: gdi.Font("Microsoft YaHei", scale(14), 0),
    itemFont_2: gdi.Font("Microsoft YaHei", scale(12), 0),
    iconFont: gdi.Font("Material Icons", scale(16))
}

const PL_Colors: IThemeColors = {
    text: mainColors.text,
    background: mainColors.background,
    highlight: mainColors.highlight,
    HEART_RED: RGB(221, 0, 27)
}

interface IPlaylistHeader {
    getParentOffsetY(): number;
}


enum ListHeaderType {
    album,
    artist,
    playlist
}

/**
 * Flow with list items;
 */
class PL_Header extends Component {
    type: ListHeaderType;
    titleText: string = "";
    parentOffsetY: number;
    subtitleText: string = "";
    descriptionText: string = "";
    artworkImage: IGdiBitmap;
    _stubImage: IGdiBitmap;
    imageWidth: number;
    titleFont: IGdiFont;
    subtitleFont: IGdiFont;
    descriptionFont: IGdiFont;

    constructor(options: {
        type: ListHeaderType,
        titleText?: string;
        subtitleText?: string;
        discriptionText: string;
    }) {
        super({})
        this.type = options.type;
        this.titleText = (options.titleText || "");
        this.subtitleText = (options.subtitleText || "");
        this.descriptionText = (options.discriptionText || "");

        let fontName_ = "Segoe UI Semibold";
        this.titleFont = gdi.Font(fontName_, scale(28));
        this.subtitleFont = gdi.Font(fontName_, scale(22));
        this.descriptionFont = gdi.Font(fontName_, scale(12));
    }

    on_paint(gr: IGdiGraphics) {
    }
}

const createColumn = (visible: boolean, x: number, width: number) => {
    return { visible: visible, x: x, width: width }
}
const PL_Columns = {
    index: createColumn(false, 0, scale(150)),
    trackNo: createColumn(true, 0, scale(60)),
    title: createColumn(true, 0, 0),
    artist: createColumn(true, 0, 0),
    album: createColumn(false, 0, 0),
    trackLen: createColumn(true, 0, scale(16) + MeasureString("00:00", PL_Properties.itemFont).Width),
    mood: createColumn(true, 0, scale(48))
}

const PL_Select = {

}

const PL_Dragdrop = {

}

class Pl_Item {
    x: number = 0;
    y: number = 0;
    width: number = 0;
    height: number = 0;
    yOffset: number = 0;

    // info
    metadb: IFbMetadb;
    index: number;
    playlistIndex: number;
    playlistItemIndex: number;
    title: string = "";
    artist: string = "";
    album: string = "";
    playbackTime: string = "";
    playbackLength: string = "";
    trackNo: string = "";
    rating: string = "";

    isSelect: boolean = false;

    trace(x: number, y: number) {
        return x > this.x && y > this.y && x <= this.x + this.width && y <= this.y + this.height;
    }
}

function isEmptyString(str: string) {
    return !str || 0 === str.length;
}

function isValidPlaylist(playlistIndex: number) {
    return (playlistIndex >= 0 && playlistIndex < plman.PlaylistCount);
}

class PlaybackQueue extends ScrollView {

    items: Pl_Item[] = [];
    visibleItems: Pl_Item[] = [];
    selectedIndexes: number[] = [];

    playingItemIndex: number = -1;
    hoverIndex: number = -1;
    focusIndex: number = -1;

    scrollbar: Scrollbar ;
    headerView: PL_Header;

    constructor(attrs: object) {
        super(attrs);

        //
        this.scrollbar = new Scrollbar({
            cursorColor: scrollbarColor.cursor,
            backgroundColor: 0,
        });
        this.addChild(this.scrollbar);
        this.scrollbar.z = 100;
        //
        this.headerView = new PL_Header({});
        this.addChild(this.headerView);
    }


    initList() {
        const pl_metadbs = plman.GetPlaylistItems(plman.ActivePlaylist);
        const pl_items: Pl_Item[] = [];
        const pl_itemCount = plman.PlaylistItemCount(plman.ActivePlaylist);
        const rowHeight = PL_Properties.rowHeight;
        let itemYOffset = 0;

        for (let playlistItemIndex = 0; playlistItemIndex < pl_itemCount; playlistItemIndex++) {
            let trackItem = new Pl_Item();
            trackItem.height = rowHeight;
            trackItem.index = playlistItemIndex;
            trackItem.metadb = pl_metadbs[playlistItemIndex];
            trackItem.playlistItemIndex = playlistItemIndex;
            trackItem.yOffset = itemYOffset;
            trackItem.isSelect = plman.IsPlaylistItemSelected(plman.ActivePlaylist, playlistItemIndex);

            pl_items.push(trackItem);
            itemYOffset += rowHeight;
        }
        this.items = pl_items;
        this.totalHeight = rowHeight * (pl_items.length + 1) + PL_Properties.headerHeight;

        if (fb.IsPlaying) {
            let ItemLocation = plman.GetPlayingItemLocation();
            if (ItemLocation.IsValid && ItemLocation.PlaylistIndex === plman.ActivePlaylist) {
                this.playingItemIndex = ItemLocation.PlaylistItemIndex;
            } else {
                this.playingItemIndex = -1;
            }
        } else {
            this.playingItemIndex = -1;
        }

        plman.SetActivePlaylistContext();
    }

    setColumnSize() {
        const padLeft = scale(4);
        const padRight = this.scrollbar.width + scale(4);
        const { index, trackNo, trackLen, mood, title, album, artist } = PL_Columns;

        let whitespace_ = this.width - padLeft - padRight;
        whitespace_ -= mood.width;
        whitespace_ -= trackLen.width;
        whitespace_ -= trackNo.width;
        whitespace_ -= index.width;

        // init width;
        let titleWidth_ = scale(215);
        let artistWidth_ = scale(100);
        let albumWidth_ = scale(100);
        //
        let artistVis = (artist.visible && whitespace_ > titleWidth_);
        let albumVis = (album.visible
            && whitespace_ > titleWidth_ + artistWidth_ + albumWidth_ / 2);
        let widthToAdd_ = whitespace_ - titleWidth_;
        let floor_ = Math.floor;
        //
        if (artistVis) {
            widthToAdd_ = floor_((whitespace_ - titleWidth_ - artistWidth_) / 2);
        }
        if (albumVis) {
            widthToAdd_ = floor_((whitespace_ - titleWidth_ - artistWidth_ - albumWidth_) / 3);
        }

        index.x = this.x + padLeft;
        index.width = (index.visible ? index.width : 0);
        trackNo.x = index.x + index.width;
        title.x = trackNo.x + trackNo.width;
        title.width = titleWidth_ + widthToAdd_;
        artist.x = title.x + title.width;
        artist.width = (artistVis ? artistWidth_ + widthToAdd_ : 0);
        album.x = artist.x + artist.width;
        album.width = (albumVis ? albumWidth_ + widthToAdd_ : 0);
        mood.x = album.x + album.width;
        trackLen.x = mood.x + mood.width;
    }

    on_init() {
        // TODO: try to cache playlist items;
        this.initList();

    }
    on_size() {
        let rowHeight = PL_Properties.rowHeight;
        let items = this.items;

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            let thisItem = items[itemIndex];
            thisItem.x = this.x;
            thisItem.width = this.width;
        }

        this.setColumnSize();

        this.scrollbar.setSize(
            this.x + this.width - scale(14),
            this.y + PL_Properties.headerHeight,
            scrollbarWidth,
            this.height - PL_Properties.headerHeight);

        this.headerView.setSize(this.x, this.y, this.width, PL_Properties.headerHeight);
    }
    on_paint(gr: IGdiGraphics) {

        let rowHeight = PL_Properties.rowHeight;
        let headerHeight = PL_Properties.headerHeight;
        let tf_TrackInfo = PL_Properties.tfTrackInfo;
        let items = this.items;
        let itemFont = PL_Properties.itemFont;
        let iconFont = PL_Properties.iconFont;
        let colors = PL_Colors;;
        let columns = PL_Columns;

        // Draw background;
        gr.FillSolidRect(this.x, this.y, this.width, this.height, colors.background);

        //
        this.visibleItems.length = 0;

        // Draw Items;
        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            let thisItem = items[itemIndex];
            thisItem.x = this.x;
            thisItem.width = this.width;
            thisItem.y = this.y + thisItem.yOffset - this.scroll + headerHeight;

            // Visible items;
            if (thisItem.y + rowHeight >= this.y + headerHeight && thisItem.y < this.y + this.height) {

                this.visibleItems.push(thisItem);

                // Set item columns' value;
                if (isEmptyString(thisItem.title)) {
                    let infostrings = tf_TrackInfo.EvalWithMetadb(thisItem.metadb).split("^^");
                    thisItem.trackNo = infostrings[0];
                    thisItem.title = infostrings[2];
                    thisItem.artist = infostrings[1];
                    thisItem.playbackLength = infostrings[3];
                    thisItem.rating = infostrings[4];
                    thisItem.album = infostrings[5];
                    thisItem.artist = infostrings[6];
                }

                // Draw items;

                if (thisItem.isSelect) {
                    gr.FillSolidRect(this.x, thisItem.y, this.width, rowHeight, RGB(26, 26, 26));
                }

                if (this.focusIndex === itemIndex) {
                    gr.DrawRect(this.x, thisItem.y, this.width - 1, rowHeight - 1, scale(1),
                        RGB(127, 127, 127));
                }

                let columnArray = [
                    columns.index,
                    columns.trackNo,
                    columns.title,
                    columns.artist,
                    columns.album, columns.mood,
                    columns.trackLen];

                // draw columns;

                if (columns.index.visible && columns.index.width > 0) {
                    gr.DrawString(itemIndex, itemFont, colors.text,
                        columns.index.x, thisItem.y, columns.index.width, rowHeight, StringFormat.Center)
                }

                if (this.playingItemIndex === itemIndex) {
                    gr.DrawString(fb.IsPaused ? Material.volume_mute : Material.volume, iconFont, colors.highlight,
                        columns.trackNo.x, thisItem.y, columns.trackNo.width, rowHeight, StringFormat.Center);
                } else {
                    gr.DrawString(thisItem.trackNo, itemFont, colors.text, columns.trackNo.x, thisItem.y, columns.trackNo.width, rowHeight, StringFormat.Center);
                }

                gr.DrawString(thisItem.title, itemFont, colors.text, columns.title.x, thisItem.y, columns.title.width, rowHeight, StringFormat.LeftCenter);
                if (columns.artist.visible && columns.artist.width > 0) {
                    gr.DrawString(thisItem.artist, itemFont, colors.text,
                        columns.artist.x, thisItem.y, columns.artist.width, rowHeight, StringFormat.LeftCenter);
                }
                if (columns.album.visible && columns.album.width > 0) {
                    gr.DrawString(thisItem.album, itemFont, colors.text,
                        columns.album.x, thisItem.y, columns.album.width, rowHeight, StringFormat.LeftCenter);
                }
                gr.DrawString(thisItem.playbackLength, itemFont, colors.text, columns.trackLen.x, thisItem.y, columns.trackLen.width, rowHeight, StringFormat.Center);

                if (thisItem.rating === "5") {
                    gr.DrawString(Material.heart, iconFont, colors.HEART_RED,
                        columns.mood.x, thisItem.y, columns.mood.width, rowHeight, StringFormat.Center);
                } else {
                    gr.DrawString(Material.heart_empty, iconFont, colors.text,
                        columns.mood.x, thisItem.y, columns.mood.width, rowHeight, StringFormat.Center);
                }

            }

        }
    }

    on_playlists_changed() {
        if (!isValidPlaylist(plman.ActivePlaylist)) {
            if (!isValidPlaylist(0)) {
                plman.CreatePlaylist(0, "");
            }
            plman.ActivePlaylist = 0;
        }
        this.scroll = 0;
        this.initList();
        ThrottledRepaint();
    }

    on_playlist_items_added(playlistIndex: number) {
        this.initList();
        ThrottledRepaint();
    }

    on_playlist_items_removed(playlistIndex: number, newCount: number) {
        this.initList();
        ThrottledRepaint();
    }

    on_playlist_items_reordered(playlistIndex: number) {
        this.initList();
        ThrottledRepaint();
    }

    on_selection_changed() {
        let plItemCount = this.items.length;
        for (let plIndex = 0; plIndex < plItemCount; plIndex++) {
            this.items[plIndex].isSelect = plman.IsPlaylistItemSelected(
                plman.ActivePlaylist,
                this.items[plIndex].playlistItemIndex);
        }
        ThrottledRepaint();
        // Repaint();
    }

    on_item_focus_change(playlistIndex: number, from?: number, to?: number) {
        if (playlistIndex !== plman.ActivePlaylist) {
            return;
        }
        ThrottledRepaint();
    }

    on_playlist_switch() {
        this.initList();
        this.scroll = 0;
        ThrottledRepaint();
    }

    on_playback_stop(reason: number) {
        if (reason !== 2) {
            this.playingItemIndex = -1;
            ThrottledRepaint();
        }
    }

    on_playback_new_track(metadb: IFbMetadb) {
        if (fb.IsPlaying) {
            let ItemLocation = plman.GetPlayingItemLocation();
            if (ItemLocation.IsValid && ItemLocation.PlaylistIndex === plman.ActivePlaylist) {
                this.playingItemIndex = ItemLocation.PlaylistItemIndex;
            } else {
                this.playingItemIndex = -1;
            }
        } else {
            this.playingItemIndex = -1;
        }

        ThrottledRepaint();
    }

    on_metadb_changed(handleList: IFbMetadbList, fromhook: boolean) {
        this.initList();
        ThrottledRepaint();
    }

    private _findHoverIndex(x: number, y: number) {
        if (!this.trace(x, y)) { return - 1; }
        let hoverItem_ = this.visibleItems.find(item => item.trace(x, y));
        return (hoverItem_ ? hoverItem_.index : -1);
    }

    private _setFocus(index: number) {
        if (this.items[index] == null) return;
        plman.SetPlaylistFocusItem(
            plman.ActivePlaylist,
            this.items[index].playlistItemIndex);
        this.focusIndex = index;
    }

    private _setSelection(from?: number, to?: number) {
        // Clear playlist selection;
        if (from == null) {
            plman.ClearPlaylistSelection(plman.ActivePlaylist);
            this.selectedIndexes = [];
        } else {
            // Set Selection from - to;
            if (to == null) to = from;
            let c = from;
            if (from > to) { from = to; to = c; }
            let indexes: number[] = [];

            for (let index = from; index <= to; index++) {
                this.items[index]
                    && indexes.push(this.items[index].playlistItemIndex);
            }

            if (indexes.toString() !== this.selectedIndexes.toString()) {
                this.selectedIndexes = indexes;
                plman.ClearPlaylistSelection(plman.ActivePlaylist);
                plman.SetPlaylistSelection(plman.ActivePlaylist, indexes, true);
            }
        }

        this.on_selection_changed();
    }

    private drag_is_active = false;
    private click_on_selection = false;
    private clicked_index = -1;
    private drag_timer = -1;
    private shift_start_index = -1;

    on_mouse_wheel(step: number) {
        this.scrollTo(this.scroll - step * PL_Properties.rowHeight * 3);
    }

    on_mouse_lbtn_dblclk(x: number, y: number, mask: number) {
        let hoverIndex_ = this._findHoverIndex(x, y);
        if (hoverIndex_ > -1) {
            plman.ExecutePlaylistDefaultAction(plman.ActivePlaylist, this.items[hoverIndex_].playlistItemIndex);
        }
    }

    on_mouse_lbtn_down(x: number, y: number, mask: number) {
        let hoverIndex_ = this._findHoverIndex(x, y);
        let hoverItem_ = this.items[hoverIndex_];
        let hoverItemSel_ = (
            hoverItem_ &&
            plman.IsPlaylistItemSelected(plman.ActivePlaylist, hoverItem_.playlistItemIndex));
        // console.log("hover item selected?", hoverItemSel_);
        let holdCtrl_ = utils.IsKeyPressed(KeyCode.Ctrl);
        let holdShift_ = utils.IsKeyPressed(KeyCode.Shift);

        // Set focus;
        hoverItem_ && this._setFocus(hoverIndex_);

        // Set selection;
        if (hoverItem_ && !holdShift_) {
            this.shift_start_index = this.focusIndex;
        }

        // TODO: Reset selecting & dragging;
        if (hoverItem_ == null) {
            if (!holdCtrl_ && !holdShift_) {
                // TODO:Set selecting
                this.drag_is_active = true;
                this._setSelection();
            }
            this.shift_start_index = -1;
        } else {
            if (!holdShift_) {
                this.shift_start_index = this.focusIndex;
            }
            // set selecting;
            switch (true) {
                case holdCtrl_:
                    plman.SetPlaylistSelectionSingle(
                        plman.ActivePlaylist,
                        hoverItem_.playlistItemIndex,
                        !hoverItemSel_
                    );
                    this.on_selection_changed();
                    break;
                case holdShift_:
                    this._setSelection(
                        // this.selection.SHIFT_startId,
                        this.shift_start_index,
                        hoverIndex_
                    );
                    break;
                default:
                    if (hoverItemSel_) {
                        this.click_on_selection = true;
                    } else {
                        this._setSelection(hoverIndex_);
                        this.drag_is_active = true;
                    }
                    break;
            }
        }
    }

    on_mouse_lbtn_up(x: number, y: number, mask?: number) {
        let hoverIndex_ = this._findHoverIndex(x, y);
        let hoverItem_ = this.items[hoverIndex_];
        let holdCtrl_ = utils.IsKeyPressed(KeyCode.Ctrl);
        let holdShift_ = utils.IsKeyPressed(KeyCode.Shift);

        if (this.drag_is_active) {
        } else {
            if (hoverItem_ && !holdCtrl_ && !holdShift_) {
                this._setSelection(hoverIndex_);
            }
        }

        clearTimeout(this.drag_timer);
        this.drag_is_active = false;
        this.clicked_index = -1;
        this.click_on_selection = false;
        Repaint();
    }

    on_mouse_rbtn_down(x: number, y: number) {
        let hoverIndex_ = this._findHoverIndex(x, y);
        let hoverItem_ = this.items[hoverIndex_];

        if (hoverItem_ == null) {
            this._setSelection();
        } else {
            if (!plman.IsPlaylistItemSelected(
                plman.ActivePlaylist,
                hoverItem_.playlistItemIndex)
            ) {
                this._setSelection(hoverIndex_);
                this._setFocus(hoverIndex_);
            }
        }
    }

    on_mouse_rbtn_up(x: number, y: number) {
        try {
            // Context Menu
            PL_TrackContextMenu(plman.ActivePlaylist,
                plman.GetPlaylistSelectedItems(plman.ActivePlaylist),
                x, y);
        } catch (e) { }
    }

    private selection = {
        SHIFT_startId: -1,
    }
}

function PL_TrackContextMenu(playlistIndex: number, metadbs: IFbMetadbList, x: number, y: number) {
    if (!metadbs || metadbs.Count === 0) return;

    const isAutoPlaylist = plman.IsAutoPlaylist(playlistIndex);
    const menuRoot = window.CreatePopupMenu();

    //
    const menuAddTo = window.CreatePopupMenu();
    menuAddTo.AppendTo(menuRoot, MenuFlag.STRING, "Add to playlist");
    menuAddTo.AppendMenuItem(MenuFlag.STRING, 2000, 'New playlist...');
    if (plman.PlaylistCount > 0) {
        menuAddTo.AppendMenuSeparator();
    }
    for (let index = 0; index < plman.PlaylistCount; index++) {
        menuAddTo.AppendMenuItem(
            (plman.IsAutoPlaylist(index) || index === playlistIndex) ? MenuFlag.GRAYED : MenuFlag.STRING,
            2001 + index, plman.GetPlaylistName(index));
    }

    //
    menuRoot.AppendMenuItem(isAutoPlaylist ? MenuFlag.GRAYED : MenuFlag.STRING, 1, "Remove from playlist");
    menuRoot.AppendMenuSeparator();

    // TODO: Navigate artist | album;

    // Context menu;
    const Context = fb.CreateContextMenuManager();
    const BaseID = 1000;
    Context.InitContext(metadbs);
    Context.BuildMenu(menuRoot, BaseID, -1);

    const ret = menuRoot.TrackPopupMenu(x, y);
    let targetId: number;

    switch (true) {
        // "Remove from playlist"
        case ret === 1:
            plman.RemovePlaylistSelection(plman.ActivePlaylist, false);
            break;

        // "Go to Album"
        case ret === 10:
            break;

        // "Go to Artist";
        case ret >= 3000 && ret < 3100:
            break;

        // "Add to... (a newly created playlist)";
        case ret === 2000:
            targetId = plman.CreatePlaylist(plman.PlaylistCount, "");
            plman.InsertPlaylistItems(targetId, 0, metadbs, false);
            break;

        case ret > 2000 && ret < 3000:
            targetId = ret - 2001;
            plman.InsertPlaylistItems(targetId, plman.PlaylistItemCount(targetId), metadbs, true);
            break;

        // Execute context command;
        case ret >= BaseID && ret < 2000:
            Context.ExecuteByID(ret - BaseID);
            break;
    }
}


const playback_queue = new PlaybackQueue({})
//playback_queue.addChild(playback_queue.scrollbar);
//playback_queue.addChild(playlistHeader);

class PlaylistHeader extends Component {
    type: number;
    title: string;
    subtitle: string;
    description: string;
    artwork: IGdiBitmap;
    defaultArtwork: IGdiBitmap;
    imageWidth_: number;
}

class PlaylistToolbar extends Component { }

class PlaylistView extends ScrollView {
    scrollbar: Scrollbar;
    header: PlaylistHeader;
    toolbar: PlaylistToolbar;

    constructor(obj: object) {
        super(obj);
    }

    on_init() { };


}

class LibraryView extends Component {
    on_init() { }

    on_size() { }

    on_paint(gr: IGdiGraphics) {
        gr.FillSolidRect(this.x, this.y, this.width, this.height, RGB(107, 95, 112));
        gr.DrawString("Library View Panel", logfont, 0xffffffff, this.x, this.y, this.width, this.height, StringFormat.Center);
    }
}

const library_view = new LibraryView({})

// -------------------------
// Playlist Manager
// -------------------------

const PLM_Properties = {
    minWidth: scale(256),
    rowHeight: scale(40),
    itemFont: gdi.Font(globalFontName, scale(14)),
    iconFont: gdi.Font(MaterialFont, scale(20)),
    headerHeight: scale(22),
    headerFont: gdi.Font("Segoe UI Semibold", scale(12)),
}

const PLM_Colors: IThemeColors = {
    text: blendColors(mainColors.text, mainColors.background, 0.3),
    textActive: mainColors.text,
    background: sidebarColors.background,
    highlight: mainColors.highlight,
    background_sel: RGB(20, 20, 20),
    background_hover: RGB(10, 10, 10)
}

class PLM_Header extends Component {
    label: string = "PLAYLISTS";

    on_paint(gr: IGdiGraphics) {
        // gr.FillSolidRect(this.x, this.y, this.width, this.height,
        //     mainColors.background);
        gr.DrawString(this.label, PLM_Properties.headerFont,
            mainColors.text,
            this.x + scale(8), this.y, this.width - scale(16), this.height,
            StringFormat.LeftCenter);
    }
}

class PLM_Item {
    metadb: IFbMetadb; // First track in playlist;
    index: number;
    x: number = 0;
    y: number = 0;
    width: number = 0;
    height: number = 0;
    yOffset: number = 0;
    //
    listName: string = "";
    isSelect: boolean = false;
    isAuto: boolean = false;

    trace(x: number, y: number) {
        return x > this.x && x <= this.x + this.width
            && y > this.y && y <= this.y + this.height;
    }
}

class PLM_View extends ScrollView {
    items: PLM_Item[] = [];
    scrollbar: Scrollbar = new Scrollbar({
        cursorColor: scrollbarColor.cursor,
        backgroundColor: 0,
    });
    header: PLM_Header = new PLM_Header({});

    constructor(attrs: object) {
        super(attrs);
        this.addChild(this.scrollbar);
        this.addChild(this.header);
    }

    initList() {
        const rowHeight = PLM_Properties.rowHeight;
        const items: PLM_Item[] = [];
        const itemCount = plman.PlaylistCount;
        let itemYOffset = 0;

        for (let playlistIndex = 0; playlistIndex < itemCount; playlistIndex++) {
            let rowItem = new PLM_Item();
            let playlistMetadbs = plman.GetPlaylistItems(playlistIndex);
            items.push(rowItem);
            rowItem.index = playlistIndex;
            rowItem.height = rowHeight;
            rowItem.metadb = (playlistMetadbs.Count === 0 ? null : playlistMetadbs[0]);
            rowItem.listName = plman.GetPlaylistName(playlistIndex)
            // FIXIT: isAuto 不能在foobar启动时被设置，force reload script 之后正常.
            rowItem.isAuto = plman.IsAutoPlaylist(playlistIndex);
            rowItem.yOffset = itemYOffset;
            itemYOffset += rowHeight;
        }

        this.items = items;
        this.totalHeight = rowHeight * itemCount + PLM_Properties.headerHeight;
    }

    on_init() {
        this.initList();
    }

    on_size() {
        if (this.items.length > 0) {
            let items_ = this.items;

            for (let playlistId = 0; playlistId < plman.PlaylistCount; playlistId++) {
                let rowItem = items_[playlistId];
                rowItem.x = this.x;
                rowItem.width = this.width;
            }
        }

        this.scrollbar.setSize(
            this.x + this.width - scale(14),
            this.y + PL_Properties.headerHeight,
            scrollbarWidth,
            this.height - PL_Properties.headerHeight
        );

        this.header.setSize(
            this.x, this.y, this.width, PL_Properties.headerHeight
        );
    }

    on_paint(gr: IGdiGraphics) {
        let rowHeight = PLM_Properties.rowHeight;
        let items_ = this.items;
        let colors = PLM_Colors;
        let itemFont = PLM_Properties.itemFont;
        let iconFont = PLM_Properties.iconFont;
        let headerHeight = PLM_Properties.headerHeight;
        let paddingL = scale(16);
        let paddingR = scale(4);

        // draw background
        gr.FillSolidRect(this.x, this.y, this.width, this.height, colors.background);

        // draw items;
        for (let itemIndex = 0; itemIndex < items_.length; itemIndex++) {
            let rowItem = items_[itemIndex];
            rowItem.x = this.x;
            rowItem.width = this.width;
            rowItem.y = this.y + headerHeight
                + rowItem.yOffset - this.scroll;

            // items in visible area;
            if (rowItem.y + rowHeight >= this.y + headerHeight
                && rowItem.y < this.y + this.height) {

                let isActive = rowItem.index === plman.ActivePlaylist;
                let textColor = (isActive ? colors.textActive : colors.text);
                let indicateWidth = scale(4);

                if (isActive) {
                    gr.FillSolidRect(rowItem.x, rowItem.y, rowItem.width, rowItem.height,
                        colors.text & 0x1fffffff);
                }

                // draw icon;
                let icon_ = (rowItem.isAuto ? Material.settings : Material.queue_music);
                gr.DrawString(icon_, iconFont, textColor,
                    rowItem.x + paddingL, rowItem.y, rowHeight, rowHeight, StringFormat.Center);

                // draw list name;
                gr.DrawString(rowItem.listName, itemFont, textColor,
                    rowItem.x + paddingL + rowHeight,
                    rowItem.y,
                    rowItem.width - paddingL - paddingR - rowHeight,
                    rowHeight,
                    StringFormat.LeftCenter);


            }
        }
    }

    on_mouse_wheel(step: number) {
        this.scrollTo(this.scroll - step * PLM_Properties.rowHeight * 3);
    }
}

const plm_pane = new PLM_View({});


// --------------------------
// Manage panels, callbacks;
// --------------------------

const PLAY_CONTROL_HEIGHT = scale(76);
const TOP_H = scale(48);

// TODO:
// UI = {
//         root: root,
//         controller: controller
//       }

class UILayout extends Component {

	playbackControlView: BottomPanelView;
	bigArtworkView: ArtDisplay;
	topbarView: TopBar;
	playlistView: PlaybackQueue;
	libraryView: LibraryView; // 
	playlistManagerView: PLM_View;


	constructor(attrs: object){
		super(attrs);
	}

    on_init() { }

    on_paint(gr: IGdiGraphics) {
        gr.FillSolidRect(this.x, this.y, this.width, this.height, 0xff000000);
    }
}

const UI = new Component({
    on_init() { },
});

// Add children;
UI.addChild(bottomPanel);
UI.addChild(bigArt);
UI.addChild(topbar);
UI.addChild(playback_queue);
UI.addChild(library_view);
UI.addChild(plm_pane);

// 0: now_playing_view
// 1: media libary view
// 2: playlist_view
let main_page_stat = 0;

// TODO : page id 与 tabs index 相关了，解除才好。
const PanelPageIDs = {
    playlists: 0,
    albums: 1,
    songs: 2,
    artists: 3,
    album_tracks: 4,
    artist_tracks: 5
}

function ShowPage(pageId: number) {
    main_page_stat = pageId;

    switch (pageId) {
        case 0:
            playback_queue.visible = true;
            plm_pane.visible = true;
            bigArt.visible = false;
            library_view.visible = false;
            break;
        case 1:
            playback_queue.visible = false;
            plm_pane.visible = false;
            bigArt.visible = false;
            library_view.visible = true;
            break;
        case 2:
            library_view.visible = false;
            plm_pane.visible = false;
            bigArt.visible = false;
            playback_queue.visible = true;
            break;
        case 3:
            library_view.visible = false;
            plm_pane.visible = false;
            bigArt.visible = false;
            playback_queue.visible = false;
            break;
        case 4:
            library_view.visible = false;
            plm_pane.visible = false;
            bigArt.visible = false;
            playback_queue.visible = false;
            break;
        case 5:
            library_view.visible = false;
            plm_pane.visible = false;
            bigArt.visible = false;
            playback_queue.visible = false;
            break;
    }

    RefreshPanels();
    UI.on_size();
}

function ArrangeLayout(pageId: number) {
    const areaY = UI.y + TOP_H;
    const areaHeight = UI.height - TOP_H - PLAY_CONTROL_HEIGHT;
    const gap = scale(0);

    switch (pageId) {
        case PanelPageIDs.playlists:
            plm_pane.setSize(UI.x, areaY, PLM_Properties.minWidth, areaHeight);
            playback_queue.setSize(
                plm_pane.x + plm_pane.width + gap,
                areaY,
                UI.width - plm_pane.width - gap,
                areaHeight
            );
            break;

        case PanelPageIDs.albums:
            library_view.setSize(UI.x, areaY, UI.width, areaHeight);
            break;

        case PanelPageIDs.songs:
            bigArt.setSize(UI.x, areaY, UI.width * 4 / 7, areaHeight);
            playback_queue.setSize(
                bigArt.x + bigArt.width + gap,
                areaY, UI.width - bigArt.width - gap,
                areaHeight);
            break;
    }
}

UI.onNotifyData = function (message: string, data: any) {
    if (message === Messages.topbarSwitchTab) {
        ShowPage(data)
    }
}


/**
 * UI.on_init be executed only once at start up .
 */
UI.on_init = function () {
    console.log("UI init, should only once");
    NotifyOtherPanels(Messages.topbarSwitchTab, Topbar_Properties.focusTabIndex);
}

UI.on_paint = function (gr: IGdiGraphics) {
    gr.FillSolidRect(this.x, this.y, this.width, this.height, 0xff000000);
}

UI.on_size = function () {
    bottomPanel.setSize(this.x, this.y + this.height - PLAY_CONTROL_HEIGHT, this.width, PLAY_CONTROL_HEIGHT);
    topbar.setSize(this.x, this.y, this.width, TOP_H);

    // Arrange others' layout;
    ArrangeLayout(main_page_stat);
}

// =============================
//=============================
// =============================

let panels: Component[] = [];
let panels_vis: Component[] = [];
// TODO

function flatternPanels(root: Component) {
    if (root == null) return [];
    let children = root.children;
    let results = [root];
    for (let i = 0; i < children.length; i++) {
        results = results.concat(flatternPanels(children[i]));
    }
    return results;
}

function findVisiblePanels(root: Component) {
    if (!root.isVisible()) return [];

    let children = root.children;
    let visibles = [root];

    for (let i = 0; i < children.length; i++) {
        if (children[i].isVisible()) {
            visibles = visibles.concat(findVisiblePanels(children[i]));
        }
    }

    return visibles;
}

function RefreshPanels() {
    let panelsPrev = panels_vis;
    panels_vis = findVisiblePanels(UI);
    //
    panels_vis
        .filter(p => panelsPrev.indexOf(p) === -1)
        .forEach(p => {
            invoke(p, "on_init")
            p.didUpdateOnInit();
        });
    panelsPrev
        .filter(p => panels_vis.indexOf(p) === -1)
        .forEach(p => p.resetUpdateState());
}

/**
 * Will notify all panels and all will try to respond, so do nt use it too
 * often.
 */
function NotifyOtherPanels(message: string, data: any) {
    panels = flatternPanels(UI);
    panels.map(panel =>
        panel.onNotifyData && panel.onNotifyData.call(panel, message, data))
}

const useClearType = window.GetProperty('_Global.Font Use ClearType', true);
const useAntiAlias = window.GetProperty('_Global.Font Antialias(Only when useClearType = false', true);
const textRenderingHint = useClearType ? 5 : useAntiAlias ? 4 : 0;
const windowMinWidth = scale(780);

function on_paint(gr: IGdiGraphics) {
    gr.SetTextRenderingHint(textRenderingHint);

    for (let i = 0, len = panels_vis.length; i < len; i++) {
        (<any>panels_vis[i]).on_paint && (<any>panels_vis[i]).on_paint(gr);
    }
}

function on_size() {
    let ww = window.Width;
    let wh = window.Height;
    if (!ww || !wh) return;

    UI.setSize(0, 0, Math.max(ww, windowMinWidth), wh);
    RefreshPanels();
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
        invoke(panels_vis[g_active_index], "on_mouse_move", x, y);
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
    Activate(x, y);
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

function on_selection_changed() {
    panels_vis.forEach(p => invoke(p, "on_selection_changed"));
}

function on_playlist_selection_changed() {
    panels_vis.forEach(p => invoke(p, "on_selection_changed"));
}

function on_playlist_items_added(playlistIndex?: number) {
    panels_vis.forEach(p => invoke(p, "on_playlist_items_added", playlistIndex));
}

function on_playlist_items_removed(playlistIndex?: number, newCount?: number) {
    panels_vis.forEach(p => invoke(p, "on_playlist_items_removed", playlistIndex, newCount));
}

function on_playlist_items_reordered(playlistIndex?: number) {
    panels_vis.forEach(p => invoke(p, "on_playlist_items_reordered", playlistIndex));
}

function on_playlists_changed() {
    panels_vis.forEach(p => invoke(p, "on_playlists_changed"));
}

function on_playlist_switch() {
    panels_vis.forEach(p => invoke(p, "on_playlist_switch"));
}

function on_item_focus_change(playlistIndex: number, from: number, to: number) {
    panels_vis.forEach(p => invoke(p, "on_item_focus_change", playlistIndex, from, to));
}

function on_metadb_changed(metadbs: IFbMetadbList, fromhook: boolean) {
    panels_vis.forEach(p => invoke(p, "on_metadb_changed"));
}

/**
 * foo_spider_monkey_panel.dll does not provide a globalThis var and the
 * `window` object is readonly that none new properties  & methods can be assin
 * to it.  
 * It's commonly used way to create a `globalThis`
 */
const globalThis_ = Function("return this")();

/**
 * These callback functions will automatically triggered by fb on various
 * events. since I do not know how to create global vars & functions, I decide
 * to assign them to a globalThis variable.
 */
let systemCallbacks = {
    "on_paint": on_paint,
    "on_size": on_size,
    "on_mouse_move": on_mouse_move,
    "on_mouse_lbtn_down": on_mouse_lbtn_down,
    "on_mouse_lbtn_up": on_mouse_lbtn_up,
    "on_mouse_lbtn_dblclk": on_mouse_lbtn_dblclk,
    "on_mouse_leave": on_mouse_leave,
    "on_mouse_rbtn_down": on_mouse_rbtn_down,
    "on_mouse_rbtn_up": on_mouse_rbtn_up,
    "on_mouse_wheel": on_mouse_wheel,
    "on_playback_order_changed": on_playback_order_changed,
    "on_playback_stop": on_playback_stop,
    "on_playback_edited": on_playback_edited,
    "on_playback_pause": on_playback_pause,
    "on_playback_new_track": on_playback_new_track,
    "on_selection_changed": on_selection_changed,
    "on_playlist_selection_changed": on_playlist_selection_changed,
    "on_playlist_items_added": on_playlist_items_added,
    "on_playlsit_items_removed": on_playlist_items_removed,
    "on_playlist_items_reordered": on_playlist_items_reordered,
    "on_playlists_changed": on_playlists_changed,
    "on_playlist_switch": on_playlist_switch,
    "on_item_focus_change": on_item_focus_change,
    "on_metadb_changed": on_metadb_changed,
};

Object.assign(globalThis_, systemCallbacks);

// vim: set fileencoding=utf-8 bomb et:/
