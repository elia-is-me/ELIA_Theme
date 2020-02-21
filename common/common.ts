// last modified: 2020-02-20;

/// <reference path="./foo_spider_monkey_panel.d.ts" />

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

// test;

function toRGB(d: number) { // convert back to RGB values
    var d = d - 0xff000000;
    var r = d >> 16;
    var g = d >> 8 & 0xFF;
    var b = d & 0xFF;
    return [r, g, b];
};

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
    } else {
        //
    }

    return function (value: number) {
        return round(value * factor * 100) / 100;
    }
})();

// if (typeof Object.assign != 'function') {
//     // Must be writable: true, enumerable: false, configurable: true
//     Object.defineProperty(Object, "assign", {
//         value: function assign(target, varArgs) { // .length of function is 2
//             'use strict';
//             if (target == null) { // TypeError if undefined or null
//                 throw new TypeError('Cannot convert undefined or null to object');
//             }

//             let to = Object(target);

//             for (var index = 1; index < arguments.length; index++) {
//                 var nextSource = arguments[index];

//                 if (nextSource != null) { // Skip over if undefined or null
//                     for (let nextKey in nextSource) {
//                         // Avoid bugs when hasOwnProperty is shadowed
//                         if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
//                             to[nextKey] = nextSource[nextKey];
//                         }
//                     }
//                 }
//             }
//             return to;
//         },
//         writable: true,
//         configurable: true
//     });
// }

// if (!Array.prototype.filter) {
//     Array.prototype.filter = function (func, thisArg) {
//         'use strict';
//         if (!((typeof func === 'Function' || typeof func === 'function') && this))
//             throw new TypeError();

//         var len = this.length >>> 0,
//             res = new Array(len), // preallocate array
//             t = this, c = 0, i = -1;
//         if (thisArg === undefined) {
//             while (++i !== len) {
//                 // checks to see if the key was set
//                 if (i in this) {
//                     if (func(t[i], i, t)) {
//                         res[c++] = t[i];
//                     }
//                 }
//             }
//         }
//         else {
//             while (++i !== len) {
//                 // checks to see if the key was set
//                 if (i in this) {
//                     if (func.call(thisArg, t[i], i, t)) {
//                         res[c++] = t[i];
//                     }
//                 }
//             }
//         }

//         res.length = c; // shrink down array to proper size
//         return res;
//     };
// }

// Array.prototype.diff = function (a) {
//     return this.filter(function (i) { return a.indexOf(i) < 0; });
// };

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

// function goog_inherits(childCtor, parentCtor) {
//     /** @constructor */
//     function tempCtor() { }
//     tempCtor.prototype = parentCtor.prototype;
//     childCtor.superClass_ = parentCtor.prototype;
//     childCtor.prototype = new tempCtor();
//     /** @override */
//     childCtor.prototype.constructor = childCtor;

//     childCtor.base = function (me, methodName, var_args) {
//         // Copying using loop to avoid deop due to passing arguments object to
//         // function. This is faster in many JS engines as of late 2014.
//         var args = new Array(arguments.length - 2);
//         for (var i = 2; i < arguments.length; i++) {
//             args[i - 2] = arguments[i];
//         }
//         return parentCtor.prototype[methodName].apply(me, args);
//     };
// }

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
function _get(object: any, path: string|string[], default_val: any) {
    return (object = (<string[]>((<any>path).split ? (<string>path).split('.') : path)).reduce(function (obj: any, p: string) {
        return obj && obj[p]
    }, object)) === undefined ? default_val : object;
};


// let __test_obj = {
//     b: [0, 2, 2]
// }
// console.log("hello common js");
// console.log(_get(__test_obj, 'b'));

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

// Helper function for DrawString() and MeasureString()
// args: h_align, v_align, trimming, flags
function StringFormat(h_align = 0, v_align = 0, trimming = 0, flags = 0) {
    // var h_align = 0, v_align = 0, trimming = 0, flags = 0;
    // switch (arguments.length) {
    //     // fall-thru
    //     case 4:
    //         flags = arguments[3];
    //     case 3:
    //         trimming = arguments[2];
    //     case 2:
    //         v_align = arguments[1];
    //     case 1:
    //         h_align = arguments[0];
    //         break;
    //     default:
    //         return 0;
    // }
    return ((h_align << 28) | (v_align << 24) | (trimming << 20) | flags);
}
StringFormat.LeftCenter = StringFormat(0, 1, StringTrimming.EllipsisCharacter, StringFormatFlags.NoWrap);
StringFormat.Center = StringFormat(1, 1, StringTrimming.Character, StringFormatFlags.NoWrap);



function debounce(fn: Function, delay: number) {
    var timer : number= null;
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

function throttle(fn: Function, threshhold:number, scope?: any) {
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

// Image

/**
 * 
 * @param {IGdiBitmap} image 
 * @param {number} width 
 * @param {number} height 
 * @param {number?} itp 
 */
function CropImage(image: IGdiBitmap, width: number, height?: number, itp: number =0) {
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

function imageFromCode(
    code: string, font: IGdiFont, color: number, width: number, height: number, fmt = StringFormat(1, 1)
    ) : IGdiBitmap{
    var img = gdi.CreateImage(width, height);
    var g = img.GetGraphics();

    g.SetTextRenderingHint(TextRenderingHint.AntiAlias);
    // for test;
    // g.SetSmoothingMode(0);
    // g.DrawRect(0, 0, width - 1, height - 1, 1, RGB(127, 127, 127));
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
    return (str: string|number, font: IGdiFont) => g.MeasureString(str, font, 0, 0, 99999, 999, StringFormat.LeftCenter);
})();

// TEST,
// console.log(MeasureString("text", gdi.Font("tahoma", 12)).Width);

const MF_STRING = 0x00000000;
const MF_GRAYED = 0x00000001;