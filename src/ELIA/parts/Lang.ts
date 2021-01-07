let UTF_literal = /&#x/;

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

// Lang pack;
const Language = {
    "en": {},
    "zh-cn": {
        "[UNKNOWN FUNCTION]": "[&#x672A;&#x77E5;&#x51FD;&#x6570;]",
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
        "Rename playlist": "&#x91CD;&#x547D;&#x540D;&#x64AD;&#x653E;&#x5217;&#x8868;",
        "File": "&#x6587;&#x4EF6;",
        "Edit": "&#x7F16;&#x8F91;",
        "View": "&#x89C6;&#x56FE;",
        "Playback": "&#x64AD;&#x653E;",
        "Library": "&#x5A92;&#x4F53;&#x5E93;",
        "Help": "&#x5E2E;&#x52A9;",
    },
};

const Commands: { [propName: string]: { [propName: string]: string } } = {
    "en": {},
    "zh-cn": {
        "Edit/Sort/Sort by...": "&#x7F16;&#x8F91;/&#x6392;&#x5E8F;/&#x6392;&#x5E8F;&#x6309;...",
        "Edit/Sort/Reverse": "&#x7F16;&#x8F91;/&#x6392;&#x5E8F;/&#x98A0;&#x5012;",
        "Playback Statistics/Rating/5": "&#x64AD;&#x653E;&#x7EDF;&#x8BA1;&#x4FE1;&#x606F;/&#x7B49;&#x7EA7;/5",
        "Playback Statistics/Rating/<not set>": "&#x64AD;&#x653E;&#x7EDF;&#x8BA1;&#x4FE1;&#x606F;/&#x7B49;&#x7EA7;/<&#x4E0D;&#x8BBE;&#x7F6E;>",
    }
};

// foobar2000 binary exectuable language;
const fbLangCode = (fb.TitleFormat("$meta()").Eval(true) == UTFTranslate.toHanzi(Language["zh-cn"]["[UNKNOWN FUNCTION]"]) ? "zh-cn" : "en");
const langCode = window.GetProperty("Global.GUI Language", "<auto>").toLowerCase();
let langPack = (<any>Language)[langCode] || (<any>Language)[fbLangCode];

if (langPack == null) {
    langPack = Language["en"] || {};
}

export function lang(str: string) {
    let str_return: string = langPack[str] || str;
    if (UTF_literal.test(str_return)) {
        return UTFTranslate.toHanzi(str_return);
    } else {
        return str_return;
    }
}

// `command` in English;
export function RunContextCommandWithMetadb(command: string, handle_or_handle_list: IFbMetadb | IFbMetadbList, flags?: number): boolean {
    let commandPack = Commands[fbLangCode] || {};
    let command_2 = commandPack[command] || command;
    if (UTF_literal.test(command_2)) {
        command_2 = UTFTranslate.toHanzi(command_2);
        return fb.RunContextCommandWithMetadb(command, handle_or_handle_list, flags) || fb.RunContextCommandWithMetadb(command_2, handle_or_handle_list, flags);
    } else {
        return fb.RunContextCommandWithMetadb(command, handle_or_handle_list, flags);
    }
}
