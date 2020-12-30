
const Language = {
    "en": {
        "Create Playlist": "Create Playlist",
        "Create playlist": "Create playlist",
        "playlist": "playlist",
        "Shuffle All": "Shuffle All",
        "Sort": "Sort",
        "More": "More",
        "Library Search": "Library Search",
        "Media Library": "Media Library",
        "Never Played": "Never Played",
        "Newly Added": "Newly Added",
        "Default": "Default",
        "Liked Songs": "Liked Songs",
        "Playback Queue": "Playback Queue",
        "track": "track",
        "tracks": "tracks",
        "hr": "hr",
        "min": "min",
        "sec": "sec",
        "d": "d",
        "wk": "wk",
        "OK": "OK",
        "Cancel": "Cancel",
        "Edit playlist": "Edit playlist",
        "Play": "Play",
        "Play next": "Play next",
        "Add to queue": "Add to queue",
        "Delete": "Delete",
        "Selection": "Selection",
        "Sort by...": "Sort by...",
        "Randomize": "Randomize",
        "Reverse": "Reverse",
        "Album": "Album",
        "Artist": "Artist",
        "File path": "File path",
        "Title": "Title",
        "Track number": "Track number",
    },
    "zh-cn": {
        "Add to playlist": "&#x6DFB;&#x52A0;&#x5230;&#x64AD;&#x653E;&#x5217;&#x8868;",
        "Add to queue": "&#x6DFB;&#x52A0;&#x5230;&#x961F;&#x5217;",
        "Album": "&#x4E13;&#x8F91;",
        "Artist": "&#x827A;&#x4EBA;",
        "ARTIST": "&#x827A;&#x4EBA;",
        "File path": "&#x6587;&#x4EF6;&#x8DEF;&#x5F84;",
        "Title": "&#x6807;&#x9898;",
        "Copy": "&#x590D;&#x5236;",
        "Copy\tCtrl-C": "&#x590D;&#x5236;\tCtrl-C",
        "Create playlist...": "\u65B0\u5EFA\u64ad\u653e\u5217\u8868...",
        "Create playlist": "\u65B0\u5EFA\u64ad\u653e\u5217\u8868",
        "Create Playlist": "\u65B0\u5EFA\u64ad\u653e\u5217\u8868",
        "Cut": "&#x526A;&#x5207;",
        "Cut\tCtrl-X": "&#x526A;&#x5207;\tCtrl-X",
        "d": "&#x5929;",
        "Default": "\u9ED8\u8BA4\u5217\u8868",
        "Delete": "&#x5220;&#x9664;",
        "Edit autoplaylist...": "&#x7F16;&#x8F91;&#x667A;&#x80FD;&#x5217;&#x8868;",
        "Edit playlist...": "&#x7F16;&#x8F91;&#x64AD;&#x653E;&#x5217;&#x8868;",
        "Go to album": "&#x524D;&#x5F80;&#x4E13;&#x8F91;",
        "Go to artist": "&#x524D;&#x5F80;&#x827A;&#x4EBA;",
        "hr": "&#x5C0F;&#x65F6;",
        "Library Search": "&#x5A92;&#x4F53;&#x5E93;&#x641C;&#x7D22;",
        "min": "&#x5206;&#x949F;",
        "More": "&#x66F4;&#x591A;",
        "NO TITLE": "&#x65E0;&#x6807;&#x9898;",
        "Paste": "&#x7C98;&#x8D34;",
        "Paste\tCtrl-V": "&#x7C98;&#x8D34;\tCtrl-V",
        "Play": "\u64ad\u653e",
        "Play next": "&#x4E0B;&#x4E00;&#x9996;&#x64AD;&#x653E;",
        "Selection": "&#x88AB;&#x9009;&#x62E9;&#x9879;&#x76EE;",
        "playlist": "&#x64AD;&#x653E;&#x5217;&#x8868;",
        "Queue": "&#x64AD;&#x653E;&#x961F;&#x5217;",
        "Remove from playlist": "&#x4ECE;&#x64AD;&#x653E;&#x5217;&#x8868;&#x79FB;&#x9664;",
        "Rename": "&#x91CD;&#x547D;&#x540D;",
        "Randomize": "&#x968F;&#x673A;",
        "Reverse": "&#x5012;&#x5E8F;",
        "sec": "&#x79D2;",
        "Shuffle All": "&#x968F;&#x673A;&#x64AD;&#x653E;&#x6240;&#x6709;",
        "SEARCH RESULTS": "&#x641C;&#x7D22;&#x7ED3;&#x679C;",
        "Sort": "&#x6392;&#x5E8F;",
        "Sort by": "&#x6392;&#x5E8F;&#x6309;",
        "Sort by...": "&#x6392;&#x5E8F;&#x6309;...",
        "Track number": "&#x97F3;&#x8F68;&#x53F7;",
        "tracks": "&#x97F3;&#x8F68;",
        "track": "&#x97F3;&#x8F68;",
        "wk": "&#x661F;&#x671F;",
        "OK": "&#x786E;&#x5B9A;",
        "Cancel": "&#x53D6;&#x6D88;",
        "NOT PLAYING": "&#x505C;&#x6B62;&#x64AD;&#x653E;",
        "Rename playlist": "&#x91CD;&#x547D;&#x540D;&#x64AD;&#x653E;&#x5217;&#x8868;"
    },
}

let langCode = window.GetProperty("Global.GUI Language", "en").toLowerCase();
let langPack = (<any>Language)[langCode];

if (langPack == null) {
    langPack = Language["en"] || {};
}

let UTF_literal = /&#x/;

export function lang(str: string) {
    let str_return: string = langPack[str] || str;
    if (UTF_literal.test(str_return)) {
        return UTFTranslate.toHanzi(str_return);
    } else {
        return str_return;
    }
}

//UTF字符转换
let UTFTranslate = {
    toUTF8: function (pValue: string) {
        return pValue.replace(/[^\u0000-\u00FF]/g, function ($0) {
            return escape($0).replace(/(%u)(\w{4})/gi, "&#x$2;")
        });
    },
    toHanzi: function (pValue: string) {
        return unescape(pValue.replace(/&#x/g, '%u').replace(/\\u/g, '%u').replace(/;/g, ''));
    }
};
