function objectMap(object: { [key: string]: any }, mapFn: Function) {
    return Object.keys(object).reduce(function (result: { [key: string]: any }, key) {
        result[key] = mapFn(object[key])
        return result
    }, {})
}

let objectKeysToLowerCase = function (origObj: { [key: string]: any }) {
    return Object.keys(origObj).reduce(function (newObj: { [key: string]: any }, key) {
        let val = origObj[key];
        let newVal = (typeof val === 'object') ? objectKeysToLowerCase(val) : val;
        newObj[key.toLowerCase()] = newVal;
        return newObj;
    }, {});
}

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
let LanguageRaw = {
    "en": {},
    "zh-cn": {
        "[UNKNOWN FUNCTION]": "[&#x672A;&#x77E5;&#x51FD;&#x6570;]",
        "Add to playlist": "&#x6DFB;&#x52A0;&#x5230;&#x64AD;&#x653E;&#x5217;&#x8868;",
        "Add to queue": "&#x6DFB;&#x52A0;&#x5230;&#x961F;&#x5217;",
        "Album": "&#x4E13;&#x8F91;",
        "Artist": "&#x827A;&#x4EBA;",
        "ARTIST": "&#x827A;&#x4EBA;",
        "Cancel": "&#x53D6;&#x6D88;",
        "Copy": "&#x590D;&#x5236;",
        "Copy\tCtrl-C": "&#x590D;&#x5236;\tCtrl-C",
        "Create playlist...": "\u65B0\u5EFA\u64ad\u653e\u5217\u8868...",
        "Create playlist": "\u65B0\u5EFA\u64ad\u653e\u5217\u8868",
        "Create Playlist": "\u65B0\u5EFA\u64ad\u653e\u5217\u8868",
        "Cut": "&#x526A;&#x5207;",
        "Cut\tCtrl-X": "&#x526A;&#x5207;\tCtrl-X",
        "d": "&#x5929;",
        "Default": "\u9ED8\u8BA4\u5217\u8868",
        "Delete playlist": "&#x5220;&#x9664;&#x64AD;&#x653E;&#x5217;&#x8868;",
        "Delete": "&#x5220;&#x9664;",
        "Edit autoplaylist...": "&#x7F16;&#x8F91;&#x667A;&#x80FD;&#x5217;&#x8868;",
        "Edit playlist...": "&#x7F16;&#x8F91;&#x64AD;&#x653E;&#x5217;&#x8868;",
        "Edit": "&#x7F16;&#x8F91;",
        "File path": "&#x6587;&#x4EF6;&#x8DEF;&#x5F84;",
        "File": "&#x6587;&#x4EF6;",
        "Go to album": "&#x524D;&#x5F80;&#x4E13;&#x8F91;",
        "Go to artist": "&#x524D;&#x5F80;&#x827A;&#x4EBA;",
        "Help": "&#x5E2E;&#x52A9;",
        "hr": "&#x5C0F;&#x65F6;",
        "Library Search": "&#x5A92;&#x4F53;&#x5E93;&#x641C;&#x7D22;",
        "Library": "&#x5A92;&#x4F53;&#x5E93;",
        "min": "&#x5206;&#x949F;",
        "More": "&#x66F4;&#x591A;",
        "NO TITLE": "&#x65E0;&#x6807;&#x9898;",
        "NOT PLAYING": "&#x505C;&#x6B62;&#x64AD;&#x653E;",
        "OK": "&#x786E;&#x5B9A;",
        "Paste": "&#x7C98;&#x8D34;",
        "Paste\tCtrl-V": "&#x7C98;&#x8D34;\tCtrl-V",
        "Play next": "&#x4E0B;&#x4E00;&#x9996;&#x64AD;&#x653E;",
        "Play": "\u64ad\u653e",
        "Playback": "&#x64AD;&#x653E;",
        "playlist": "&#x64AD;&#x653E;&#x5217;&#x8868;",
        "Queue": "&#x64AD;&#x653E;&#x961F;&#x5217;",
        "Randomize": "&#x968F;&#x673A;",
        "Remove from playlist": "&#x4ECE;&#x64AD;&#x653E;&#x5217;&#x8868;&#x79FB;&#x9664;",
        "Rename playlist": "&#x91CD;&#x547D;&#x540D;&#x64AD;&#x653E;&#x5217;&#x8868;",
        "Rename": "&#x91CD;&#x547D;&#x540D;",
        "Reverse": "&#x5012;&#x5E8F;",
        "SEARCH RESULTS": "&#x641C;&#x7D22;&#x7ED3;&#x679C;",
        "sec": "&#x79D2;",
        "Selection": "&#x88AB;&#x9009;&#x62E9;&#x9879;&#x76EE;",
        "Shuffle All": "&#x968F;&#x673A;&#x64AD;&#x653E;&#x6240;&#x6709;",
        "Sort by...": "&#x6392;&#x5E8F;&#x6309;...",
        "Sort by": "&#x6392;&#x5E8F;&#x6309;",
        "Sort": "&#x6392;&#x5E8F;",
        "Title": "&#x6807;&#x9898;",
        "Track number": "&#x97F3;&#x8F68;&#x53F7;",
        "track": "&#x97F3;&#x8F68;",
        "tracks": "&#x97F3;&#x8F68;",
        "UNKNOWN ARTIST": "&#x672A;&#x77E5;&#x827A;&#x4EBA;",
        "View": "&#x89C6;&#x56FE;",
        "wk": "&#x661F;&#x671F;",
        "Not playing": "&#x64AD;&#x653E;&#x505C;&#x6B62;",
        "Show now playing": "&#x663E;&#x793A;&#x6B63;&#x5728;&#x64AD;&#x653E;&#x9879;&#x76EE;",
        "Settings": "&#x8BBE;&#x7F6E;",
        "Theme settings": "&#x4E3B;&#x9898;&#x8BBE;&#x7F6E;",
        "Playlist is empty": "&#x64AD;&#x653E;&#x5217;&#x8868;&#x6CA1;&#x6709;&#x97F3;&#x4E50;",
        "Plays": "&#x64AD;&#x653E;&#x6B21;&#x6570;",
        "Play count": "&#x64AD;&#x653E;&#x6B21;&#x6570;",
        "Playcount": "&#x64AD;&#x653E;&#x6B21;&#x6570;",
        "Rating": "&#x8BC4;&#x7EA7;",
        "Index": "&#x7D22;&#x5F15;&#x53F7;",
        "Mood": "&#x5FC3;&#x60C5;",
        "Columns": "&#x5217;",
        "DUration": "&#x65F6;&#x95F4;",
        "New playlist": "&#x65B0;&#x5EFA;&#x64AD;&#x653E;&#x5217;&#x8868;",
    },
};

let Language = objectMap(LanguageRaw, (obj: object) => objectKeysToLowerCase(obj));
Language["zh-cn"] = objectMap(Language["zh-cn"], (str: string) => UTFTranslate.toHanzi(str));

const Commands: { [propName: string]: { [propName: string]: string } } = {
    "en": {},
    "zh-cn": {
        "Edit/Sort/Sort by...": "&#x7F16;&#x8F91;/&#x6392;&#x5E8F;/&#x6392;&#x5E8F;&#x6309;...",
        "Edit/Selection/Sort/Sort by...": "&#x7F16;&#x8F91;/&#x9009;&#x62E9;/&#x6392;&#x5E8F;/&#x6392;&#x5E8F;&#x6309;...",
        "Edit/Sort/Reverse": "&#x7F16;&#x8F91;/&#x6392;&#x5E8F;/&#x98A0;&#x5012;",
        "Edit/Selection/Sort/Reverse": "&#x7F16;&#x8F91;/&#x9009;&#x62E9;/&#x6392;&#x5E8F;/&#x98A0;&#x5012;",
        "Playback Statistics/Rating/5": "&#x64AD;&#x653E;&#x7EDF;&#x8BA1;&#x4FE1;&#x606F;/&#x7B49;&#x7EA7;/5",
        "Playback Statistics/Rating/4": "&#x64AD;&#x653E;&#x7EDF;&#x8BA1;&#x4FE1;&#x606F;/&#x7B49;&#x7EA7;/4",
        "Playback Statistics/Rating/3": "&#x64AD;&#x653E;&#x7EDF;&#x8BA1;&#x4FE1;&#x606F;/&#x7B49;&#x7EA7;/3",
        "Playback Statistics/Rating/2": "&#x64AD;&#x653E;&#x7EDF;&#x8BA1;&#x4FE1;&#x606F;/&#x7B49;&#x7EA7;/2",
        "Playback Statistics/Rating/1": "&#x64AD;&#x653E;&#x7EDF;&#x8BA1;&#x4FE1;&#x606F;/&#x7B49;&#x7EA7;/1",
        "Playback Statistics/Rating/<not set>": "&#x64AD;&#x653E;&#x7EDF;&#x8BA1;&#x4FE1;&#x606F;/&#x7B49;&#x7EA7;/<&#x4E0D;&#x8BBE;&#x7F6E;>",
    }
};

Commands["zh-cn"] = objectMap(Commands["zh-cn"], (str: string) => UTFTranslate.toHanzi(str));


/**
 * Detect if fb2k executable file has been translated to CN language;
 */
function isCN() {
    let msg = fb.TitleFormat("$meta()").Eval(true);
    let cnMsg = UTFTranslate.toHanzi("[&#x672A;&#x77E5;&#x51FD;&#x6570;]");
    return msg === cnMsg;
}

// foobar2000 binary exectuable language;
const fbLangCode = (isCN() ? "zh-cn" : "en");
const langCode = window.GetProperty("Global.GUI Language(en,zh-cn,<auto>)", "<auto>").toLowerCase();
const langPack = (<any>Language)[langCode] || (<any>Language)[fbLangCode] || {};

export function TXT(str: string) {
    return (langPack[str.toLowerCase()] || str) as string;
}

/**
 * @param {string} `command` in English;
 */
export function RunContextCommandWithMetadb(command: string, handle_or_handle_list: IFbMetadb | IFbMetadbList, flags?: number): boolean {
    let commandPack = Commands[fbLangCode] || {};
    let command_2 = commandPack[command] || command;
    return fb.RunContextCommandWithMetadb(command, handle_or_handle_list, flags)
        || fb.RunContextCommandWithMetadb(command_2, handle_or_handle_list, flags);
}

/**
 * @param {string} `command` in English;
 */
export function RunMainMenuCommand(command: string): boolean {
    let commandPack = Commands[fbLangCode] || {};
    let command_2 = commandPack[command] || command;
    return fb.RunMainMenuCommand(command) || fb.RunMainMenuCommand(command_2);
}