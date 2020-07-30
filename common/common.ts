// last modified: 2020年5月24日

let doc = new ActiveXObject('htmlfile');
let app = new ActiveXObject('Shell.Application');
let WshShell = new ActiveXObject('WScript.Shell');
let fso = new ActiveXObject('Scripting.FileSystemObject');

let folders_home = fb.ProfilePath + "data_elia\\";
let folders_data = fb.ProfilePath + "js_data\\";
let folders = {
    home: folders_home,
    images: folders_home + "images\\",
    data: folders_data,
    artists: folders_data + "artists\\",
    lastfm: folders_data + "lastfm\\"
};

function RGB(r: number, g: number, b: number) {
    return (0xff000000 | (r << 16) | (g << 8) | (b));
};

function RGBA(r: number, g: number, b: number, a: number) {
    return ((a << 24) | (r << 16) | (g << 8) | (b));
};

function toRGB(color: number) { // returns an array like [192, 0, 0]
    var a = color - 0xFF000000;
    return [a >> 16, a >> 8 & 0xFF, a & 0xFF];
}

function getAlpha(colour: number) {
    return ((colour >> 24) & 0xff);
}

function blendColors(c1: number, c2: number, factor: number) {
    // When factor is 0, result is 100% color1, when factor is 1, result is 100% color2.
    var c1_ = toRGB(c1);
    var c2_ = toRGB(c2);
    var r = Math.round(c1_[0] + factor * (c2_[0] - c1_[0]));
    var g = Math.round(c1_[1] + factor * (c2_[1] - c1_[1]));
    var b = Math.round(c1_[2] + factor * (c2_[2] - c1_[2]));
    //fb.trace("R = " + r + " G = " + g + " B = " + b);
    return (0xff000000 | (r << 16) | (g << 8) | (b));
};

interface IRGBA_Color {
    r: number; // [0, 255];
    g: number; // [0, 255];
    b: number; // [0, 255];
    a: number; // [0, 255];
}

interface IHSLA_Color {
    h: number; // Hue: integer in [0, 360];
    s: number; // Saturation: float in [0, 1];
    l: number; // Luminosity: float in [0, 1];
    a: number; // Alpha: float in [0, 1];
}

function rgba2hsla(rgba: IRGBA_Color): IHSLA_Color {
    const r = rgba.a / 255;
    const g = rgba.g / 255;
    const b = rgba.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.max(r, g, b);
    let h = 0;
    let s = 0;
    const l = (min + max) / 2;
    const chroma = max - min;

    if (chroma > 0) {
        s = Math.min((l <= 0.5 ? chroma / (2 * l) : chroma / (2 - (2 * l))), 1);

        switch (max) {
            case r: h = (g - b) / chroma + (g < b ? 6 : 0); break;
            case g: h = (b - r) / chroma + 2; break;
            case b: h = (r - g) / chroma + 4; break;
        }

        h *= 60;
        h = Math.round(h);
    }
    return { h: h, s: s, l: l, a: rgba.a };
}

function hslToRgb(hue: number, sat: number, light: number) {
    var t1, t2, r, g, b;
    hue = hue / 60;
    if (light <= 0.5) {
        t2 = light * (sat + 1);
    } else {
        t2 = light + sat - (light * sat);
    }
    t1 = light * 2 - t2;
    r = hueToRgb(t1, t2, hue + 2) * 255;
    g = hueToRgb(t1, t2, hue) * 255;
    b = hueToRgb(t1, t2, hue - 2) * 255;
    return { r: r, g: g, b: b };
}

function hueToRgb(t1: number, t2: number, hue: number) {
    if (hue < 0) hue += 6;
    if (hue >= 6) hue -= 6;
    if (hue < 1) return (t2 - t1) * hue + t1;
    else if (hue < 3) return t2;
    else if (hue < 4) return (t2 - t1) * (4 - hue) + t1;
    else return t1;
}

function lighten(color: number, factor: number): number {
    let rgb_ = toRGB(color);
    let alpha = getAlpha(color);
    let hsla: IHSLA_Color = rgba2hsla({ r: rgb_[0], g: rgb_[1], b: rgb_[2], a: alpha });
    hsla.l = hsla.l * (1 + factor);
    let rgb__ = hslToRgb(hsla.h, hsla.s, hsla.l);
    return RGBA(rgb__.r, rgb__.g, rgb__.b, alpha);
}

function darken(color: number, factor: number): number {
    let rgb_ = toRGB(color);
    let alpha = getAlpha(color);
    let hsla: IHSLA_Color = rgba2hsla({ r: rgb_[0], g: rgb_[1], b: rgb_[2], a: alpha });
    hsla.l = hsla.l * (1 - factor);
    let rgb__ = hslToRgb(hsla.h, hsla.s, hsla.l);
    return RGBA(rgb__.r, rgb__.g, rgb__.b, alpha);
}
// dpi scale
const scale = (function () {
    var factor = window.GetProperty("_Global.Zoom Factor(%, 0 = default)", 0) / 100;
    var round = Math.round;
    if (factor === 0) {
        try {
            var ws = new ActiveXObject("WScript.Shell");
            var dpiVal = ws.RegRead("HKEY_CURRENT_USER\\Control Panel\\Desktop\\WindowMetrics\\AppliedDPI");
            factor = Math.round((dpiVal / 96) * 100) / 100;
        } catch (e) {
            factor = 1;
        }
    } else { };
    return function (value: number) {
        return round(value * factor * 100) / 100;
    }
})();

function isFunction(obj: any) {
    return Object.prototype.toString.call(obj) === "[object Function]"
}

// Array
function isArray(item: any) {
    return Object.prototype.toString.call(item) === '[object Array]';
}

// OBJECT
function isObject(item: any) {
    return typeof item === 'object' && item !== null && !isArray(item);
}

function isString(x: any) {
    return Object.prototype.toString.call(x) === "[object String]"
}

function _tagged(value: string) {
    return value != '' && value != '?';
}

function _q(value: string) {
    return '"' + value + '"';
}

function _jsonParse(value: string) {
    try {
        let data = JSON.parse(value);
        return data;
    } catch (e) {
        return [];
    }
}

function _run() {
    try {
        WshShell.Run([].slice.call(arguments).map(_q).join(' '));
        return true;
    } catch (e) {
        return false;
    }
}

function _createFolder(folder: string) {
    if (!_isFolder(folder)) {
        fso.CreateFolder(folder);
    }
}

function _isFolder(folder: string) {
    return isString(folder) ? fso.FolderExists(folder) : false;
}

// https://github.com/robinvdvleuten/shvl
function _get(object: any, path: string | string[], default_val: any) {
    return (object = (<string[]>((<any>path).split ? (<string>path).split('.') : path)).reduce(function (obj: any, p: string) {
        return obj && obj[p]
    }, object)) === undefined ? default_val : object;
};

let popup = {
    ok: 0,
    yes_no: 4,
    yes: 6,
    no: 7,
    stop: 16,
    question: 32,
    info: 64
};

var StringTrimming = {
    None: 0,
    Character: 1,
    Word: 2,
    EllipsisCharacter: 3,
    EllipsisWord: 4,
    EllipsisPath: 5
};

// flags, can be combined of:
// http://msdn.microsoft.com/en-us/library/ms534181(VS.85).aspx
var StringFormatFlags = {
    DirectionRightToLeft: 0x00000001,
    DirectionVertical: 0x00000002,
    NoFitBlackBox: 0x00000004,
    DisplayFormatControl: 0x00000020,
    NoFontFallback: 0x00000400,
    MeasureTrailingSpaces: 0x00000800,
    NoWrap: 0x00001000,
    LineLimit: 0x00002000,
    NoClip: 0x00004000
};

// Used in SetSmoothingMode()
// For more information, see: http://msdn.microsoft.com/en-us/library/ms534173(VS.85).aspx
var SmoothingMode = {

    Invalid: -1,
    Default: 0,
    HighSpeed: 1,
    HighQuality: 2,
    None: 3,
    AntiAlias: 4
};

// Used in SetInterpolationMode()
// For more information, see: http://msdn.microsoft.com/en-us/library/ms534141(VS.85).aspx
var InterpolationMode = {
    Invalid: -1,
    Default: 0,
    LowQuality: 1,
    HighQuality: 2,
    Bilinear: 3,
    Bicubic: 4,
    NearestNeighbor: 5,
    HighQualityBilinear: 6,
    HighQualityBicubic: 7
};

var TextRenderingHint = {
    SystemDefault: 0,
    SingleBitPerPixelGridFit: 1,
    SingleBitPerPixel: 2,
    AntiAliasGridFit: 3,
    AntiAlias: 4,
    ClearTypeGridFit: 5
};

const PlaybackOrder = {
    normal: 0,
    repeat_playlist: 1,
    repeat_track: 2,
    random: 3,
    shuffle_tracks: 4,
    shuffle_albums: 5,
    shuffle_folders: 6
};

// Helper function for DrawString() and MeasureString()
// args: h_align, v_align, trimming, flags
function StringFormat(h_align = 0, v_align = 0, trimming = 0, flags = 0) {
    return ((h_align << 28) | (v_align << 24) | (trimming << 20) | flags);
}
StringFormat.LeftCenter = StringFormat(0, 1, StringTrimming.EllipsisCharacter, StringFormatFlags.NoWrap);
StringFormat.Center = StringFormat(1, 1, StringTrimming.Character, StringFormatFlags.NoWrap);

function debounce(fn: Function, delay: number) {
    var timer: number = null;
    delay = delay || 250;
    return function () {
        var context = this,
            args = arguments;
        timer && window.ClearTimeout(timer);
        timer = window.SetTimeout(function () {
            fn.apply(context, args);
        }, delay);
    };
}

function throttle(fn: Function, threshhold: number, scope?: any) {
    threshhold || (threshhold = 250);
    var last: number,
        deferTimer: number;
    return function () {
        var context = scope || this;

        var now = +new Date(),
            args = arguments;
        if (last && now < last + threshhold) {
            // hold on to it
            window.ClearTimeout(deferTimer);
            deferTimer = window.SetTimeout(function () {
                last = now;
                fn.apply(context, args);
            }, threshhold);
        } else {
            last = now;
            fn.apply(context, args);
        }
    };
}

// Localization function, not impl yet;
function l18n(text: string | number) {
    return text;
}

/**
 * 
 * @param {IGdiBitmap} image 
 * @param {number} width 
 * @param {number} height 
 * @param {number?} itp 
 */
function CropImage(image: IGdiBitmap, width: number, height?: number, itp: number = 0) {
    if (height == null) {
        height = width;
    }
    var sc = width / height;
    var src_w = image.Width;
    var src_h = image.Height;
    var src_sc = src_w / src_h;
    var tmp_w, tmp_h, crop, tmp_img;
    if (src_sc > sc) {
        tmp_w = src_h * sc;
        crop = Math.round((src_w - tmp_w) / 2);
        tmp_img = image.Clone(crop, 0, tmp_w, src_h);
    }
    else {
        tmp_h = src_w / sc;
        crop = Math.round((src_h - tmp_h) / 2);
        tmp_img = image.Clone(0, crop, src_w, tmp_h);
    }
    return tmp_img.Resize(width, height, itp);
}

function imageFromCode(code: string, font: IGdiFont, color: number, width: number, height: number, fmt = StringFormat(1, 1)): IGdiBitmap {
    var img = gdi.CreateImage(width, height);
    var g = img.GetGraphics();
    g.SetTextRenderingHint(TextRenderingHint.AntiAlias);
    g.DrawString(code, font, color, 0, 0, width, height, fmt);
    img.ReleaseGraphics(g);
    return img;
}

/**
 * @param {string} str
 * @param {IGdiFont} str
 */
const MeasureString = (() => {
    let g = gdi.CreateImage(1, 1).GetGraphics();
    return (str: string | number, font: IGdiFont) => g.MeasureString(str, font, 0, 0, 99999, 999, StringFormat.LeftCenter);
})();

const MF_STRING = 0x00000000;
const MF_GRAYED = 0x00000001;

const VK_CONTROL = 0x11;
const VK_SHIFT = 0x10;
const VK_BACK = 0x08;
const VK_MENU = 0x12; // Alt key
const VK_ALT = 0x12;
const VK_PAUSE = 0x13;
const VK_ESCAPE = 0x1b;
const VK_SPACE = 0x20;
const VK_DELETE = 0x2e;
const VK_PRIOR = 0x21; // PAGE UP key
const VK_NEXT = 0x22; // PAGE DOWN key
const VK_PGUP = 0x21;
const VK_PGDN = 0x22;
const VK_END = 0x23;
const VK_HOME = 0x24;
const VK_LEFT = 0x25;
const VK_UP = 0x26;
const VK_RIGHT = 0x27;
const VK_DOWN = 0x28;
const VK_INSERT = 0x2d;
const VK_SPACEBAR = 0x20;
const VK_RETURN = 0x0d; // Enter
const VK_LSHIFT = 0xa0; // Left SHIFT key
const VK_RSHIFT = 0xa1; // Right SHIFT key
const VK_LCONTROL = 0xa2; // Left CONTROL key
const VK_RCONTROL = 0xa3; // Right CONTROL key
const VK_LMENU = 0xa4; // Left MENU key
const VK_RMENU = 0xa5; // Right MENU key
