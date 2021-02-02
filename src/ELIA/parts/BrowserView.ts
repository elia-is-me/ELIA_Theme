import { Component } from "../common/BasePart";
import { CursorName, scale } from "../common/Common";
import { MaterialFont } from "../common/Icon";
import { TXT } from "../common/Lang";
import { Scrollbar } from "../common/Scrollbar";
import { ScrollView } from "../common/ScrollView";
import { MeasureString, StringFormat, StringFormatFlags, StringTrimming } from "../common/String";
import { GdiFont, scrollbarWidth, themeColors } from "../common/Theme";


const colors = {
    text: themeColors.text,
    titleText: themeColors.titleText,
    secondaryText: themeColors.secondaryText,
    background: themeColors.playlistBackground,
    backgroundSelection: themeColors.playlistBackgroundSelection,
    splitLine: themeColors.playlistSplitLine,
    highlight: themeColors.highlight,
    scrollbarCursor: themeColors.scrollbarCursor,
    scrollbarBackground: themeColors.scrollbarBackground,
    moodRed: themeColors.mood,
    headerBackground: themeColors.topbarBackground,
}

const buttonColors = {
    onPrimary: themeColors.onPrimary,
    primary: themeColors.primary,
    secondary: themeColors.secondary,
    onSecondary: themeColors.onSecondary,
}

const itemFont = GdiFont("semibold,14");
const smallItemFont = GdiFont("normal,14");
const btnFont = GdiFont(MaterialFont, scale(20));
const tabFont = GdiFont("normal, 14");

let paddingLR = 0;
let paddingTB = 0;

const pageWidth = {
    thin: scale(600),
    wide: scale(920),
    extraWide: scale(1120),
};

/**
 * View paddings will change when width of view changed;
 */
function updatePaddings(ww: number, wh?: number) {
    let { thin, wide, extraWide } = pageWidth;
    if (ww < thin) {
        paddingLR = scale(16);
        paddingTB = scale(16);
    } else if (ww < wide) {
        paddingLR = scale(40);
        paddingTB = scale(24);
    } else {
        paddingLR = scale(40);
        paddingTB = scale(40);
    }
}

const tabHeight = scale(52);
const toolbarHeight = scale(72);
// const headerHeight = tabHeight + toolbarHeight;

const itemMinWidth = scale(180);
const itemMarginR = scale(16);
const itemMarginB = scale(32);


// View state;

let currentPage = 0;

const enum GroupTypes {
    Albums,
    Artists,
    Genres,
}
const enum SourceTypes {
    Library,
    CurrentPlaylist,
    AllPlaylists,
}

const TF_ORDER_ALBUM = fb.TitleFormat("%album%[%date%]%discnumber%%tracknumber%");

// const _album = "%album%"
const TF_ALBUM_TAGS = fb.TitleFormat("%album%|||[%date%]^^%album artist%^^%discnumber%^^%tracknumber%");
const TF_ARTIST_TAGS = fb.TitleFormat("%artist%");


// const TF_ORDER_ARTIST =
// const TF_ORDER_GENRE = fb.tit

export interface BrowserOptionType {
    sourceType: number;
    viewType: number;
    metadbs?: IFbMetadbList;
}

// Classes
// ------------------------------------------------



/**
 * Tab item,click it to change page;
 */
class TabItem extends Component {
    static getCount = (() => { let count = 0; return () => count++ })();

    text: string;
    index: number = TabItem.getCount();

    private pad = scale(16);
    private _state = 0;
    set state(val: number) {
        if (this._state !== val) {
            this._state = val;
        }
    }
    get state() { return this._state; }

    // tab item;
    constructor(txt: string, options?: { isCurrent: () => void }) {
        super({})
        this.text = txt;
        let txtWidth = MeasureString(this.text, tabFont).Width;
        this.setSize((2 * this.pad + txtWidth) >> 0, tabHeight);

        if (options) {
            Object.assign(this, options);
        }
    }

    // tab item;
    on_paint(gr: IGdiGraphics) {
        let { pad, text } = this;
        let tabFont_ = tabFont;
        let color = this.isCurrent() ? colors.titleText : colors.secondaryText;

        // text;
        gr.DrawString(text, tabFont_, color, this.x + pad, this.y, this.width, this.height, StringFormat.LeftCenter);

        // line;
        if (this.isCurrent()) {
            gr.DrawLine(this.x + pad, this.y + this.height - scale(2), this.x + this.width - pad, this.y + this.height - scale(2), scale(2), color);
        }
    }

    // Change it when creating instances;
    isCurrent(): boolean {
        return false;
    }

    private traceText(x: number, y: number) {
        return x > this.x + this.pad && x <= this.x + this.width - this.pad
            && y > this.y && y <= this.y + this.height;
    }

    repaint() {
        this.parent.repaint();
    }

    on_mouse_move(x: number, y: number) {
        if (this.state == 0) {
            this.state = 1;
        }
        window.SetCursor(this.traceText(x, y) ? CursorName.IDC_HAND : CursorName.IDC_ARROW);
    }

    on_mouse_lbtn_down(x: number, y: number) {
        this.state = 2;
        window.SetCursor(CursorName.IDC_HAND);
    }

    on_mouse_lbtn_up(x: number, y: number) {
        if (this.state === 2) {
            if (this.trace(x, y)) {
                this.on_click && this.on_click(x, y);
            }
        }
        this.state = 1;
    }

    on_mouse_leave() {
        this.state = 0;
        window.SetCursor(CursorName.IDC_ARROW);
    }
}

/**
 * Browser header;
 */
class LibraryBrowserHeader extends Component {

    tabItems: TabItem[] = [];

    // browser header;
    constructor() {
        super({})

        // init tabitems;
        let tabContents = [TXT("ALBUMS"), TXT("ARTISTS"), TXT("GENRES")];
        this.tabItems = tabContents.map(txt => {
            let tab = new TabItem(txt)
            this.addChild(tab);
            return tab;
        });

        // dropdown buttons;
        // todo...
    };

    // browser header;
    on_size() {
        // 字与页面边缘对齐
        let tabX = this.x + paddingLR - scale(16);
        let tabY = this.y;
        for (let i = 0; i < this.tabItems.length; i++) {
            this.tabItems[i].setPosition(tabX, tabY);
            tabX += this.tabItems[i].width;
        }
    }

    // browser header;
    on_paint(gr: IGdiGraphics) {
        // background;
        gr.FillSolidRect(this.x, this.y, this.width, this.height, colors.headerBackground);

        //tab underline;
        gr.DrawLine(this.x + paddingLR, this.y + tabHeight - 1, this.x + this.width - paddingLR, this.y + tabHeight - 1, 1, colors.titleText & 0x25ffffff);
    }
}

class ArtistDetailHeader extends Component { }

class DefaultDetailHeader extends Component { }



/**
 * Grid browser thumb item:
 *  - Artwork,
 *  - Title, line1
 *  - subtitle, line2
 *  - btn1, btn2, ...
 *  - focus, hover
 */
class BrowserItem extends Component {

    yOffset: number = 0;
    xOffset: number = 0;

    private itemType: number = 0;

    // origin artwork get
    artwork: IGdiBitmap;
    // changed when item size changed;
    private artwork_draw: IGdiBitmap;

    // first metadb contained in metadbs list, for get item info like 'album
    // name', 'artist name', 'artwork'...;
    metadb: IFbMetadb;

    // track metadbs that contained in this item;
    metadbs: IFbMetadbList;

    albumName: string;
    artistName: string;
    year: string;
    private line1Text: string;
    private line2Text: string;

    constructor() {
        super({})

    }

    // browser item;
    on_paint(gr: IGdiGraphics) {
        // gr.FillSolidRect(this.x, this.y, this.width, this.height, 0x30000000);
        gr.FillSolidRect(this.x, this.y, this.width, this.width, 0x50000000);

        let font1 = itemFont;
        let font2 = smallItemFont;

        let textY = this.y + this.width + scale(8);
        let line1Width = gr.MeasureString(this.albumName, font1, 0, 0, 10000, 100).Width;

        gr.DrawString(this.albumName, font1, colors.text,
            this.x, textY, this.width, 2.5 * font1.Height,
            StringFormat(0, 0, StringTrimming.EllipsisCharacter, StringFormatFlags.LineLimit));

        if (line1Width > this.width) {
            textY += 2.2 * font1.Height;
        } else {
            textY += 1.2 * font1.Height;
        }

        gr.DrawString(this.artistName, font2, colors.secondaryText,
            this.x, textY, this.width, this.height, StringFormat.LeftTop);
    }

}

export class BrowserView extends ScrollView {

    private sourceType: number = 0;
    // private groupType: number = 0;
    private viewType: number = 0

    items: BrowserItem[] = [];
    visibleItems: BrowserItem[] = [];
    metadbs: IFbMetadbList;

    itemWidth: number;
    itemHeight: number;
    columnCount: number;
    rowCount: number;
    rowHeight: number;

    scrollbar: Scrollbar;

    constructor() {
        super({});

        this.scrollbar = new Scrollbar({ cursorColor: colors.scrollbarCursor, backgroundColor: colors.scrollbarBackground });
        this.scrollbar.z = 500;
        this.addChild(this.scrollbar);
    }

    private getAllMetadbs() {
        let metadbs: IFbMetadbList;

        // get metaddbs;
        switch (this.sourceType) {
            case SourceTypes.Library:
                metadbs = fb.IsLibraryEnabled() ? fb.GetLibraryItems() : plman.GetPlaylistItems(-1);
                break;
            case SourceTypes.CurrentPlaylist:
                metadbs = plman.GetPlaylistItems(plman.ActivePlaylist);
                break;
            case SourceTypes.AllPlaylists:
                metadbs = plman.GetPlaylistItems(-1);
                for (let i = 0; i < plman.PlaylistCount; i++) {
                    metadbs.Sort();
                    let list_metadbs = plman.GetPlaylistItems(i);
                    list_metadbs.Sort();
                    metadbs.MakeUnion(list_metadbs);
                }
                break;
            default:
                throw new Error("ELIA THEME - Browser: " + "Invalid sourceType!");
                break;
        }

        // order by format;
        if (this.viewType === GroupTypes.Albums) {
            metadbs.OrderByFormat(TF_ORDER_ALBUM, 1);
        }

        return metadbs;
    }

    // Calculate thumb item width;
    private setMetrics() {
        // gridview calculate metrics;
        // itemWidth * columnCount + marginR * (columnCount - 1) = areaWidth;
        // --------
        let areaWidth = this.width - 2 * paddingLR;
        let columnCount = ((areaWidth + itemMarginR) / (itemMinWidth + itemMarginR)) >> 0;
        if (columnCount < 1) {
            columnCount = 1;
        }
        let itemWidth = ((areaWidth - itemMarginR * (columnCount - 1)) / columnCount) >> 0;
        let itemHeight = itemWidth + scale(12) + (2.2 * itemFont.Height + smallItemFont.Height) >> 0;
        let rowCount = Math.ceil(this.items.length / this.columnCount);

        this.columnCount = columnCount;
        this.rowCount = rowCount;
        this.itemWidth = itemWidth;
        this.itemHeight = itemHeight;
        this.rowHeight = itemHeight + itemMarginB;
    }

    private setItems() {

        let tf_diff: IFbTitleFormat;
        let metadbs = this.metadbs;
        let compare = "#@!";

        if (this.viewType == 0) {
            tf_diff = TF_ALBUM_TAGS;
        } else {
            tf_diff = TF_ARTIST_TAGS;
        }

        if (this.metadbs == null) {
            return;
        }

        let d1 = (new Date()).getTime();

        for (let i = 0, len = metadbs.Count; i < len; i++) {
            let metadb = metadbs[i];
            let tags = tf_diff.EvalWithMetadb(metadb).split("|||");
            let current = tags[0];

            if (current !== compare) {
                compare = current;
                let item = new BrowserItem();
                item.metadb = metadb;
                item.metadbs = new FbMetadbHandleList(metadb);
                item.albumName = tags[0];
                let tag2_arr = tags[1].split("^^");
                item.artistName = tag2_arr[1]
                this.items.push(item);
            } else {
                let item = this.items[this.items.length - 1];
                item.metadbs.Add(metadb);
            }
        }

        console.log(this.items.length);
        let d2 = (new Date()).getTime();
        console.log("init in: ", d2 - d1, " ms");

    }

    initWithOptions(options: BrowserOptionType) {
        this.sourceType = options.sourceType;
        this.viewType = options.viewType;

        // --> Debug;
        this.sourceType = SourceTypes.Library;
        this.viewType = 0;
        // <-- debug;

        this.metadbs = this.getAllMetadbs();

        this.setItems();

        this.on_size();
    }

    //browser;
    on_init() {
        this.initWithOptions({
            sourceType: SourceTypes.Library,
            viewType: 0
        });
        this.repaint();
    }

    // browser;
    on_size() {
        //
        updatePaddings(this.width, this.height);

        // calculate grid item size;
        this.setMetrics();

        let itemYOffset = 0;

        // update items' yOffset;
        for (let i = 0, len = this.items.length; i < len; i++) {
            let rowIndex = Math.floor(i / this.columnCount);
            let columnIndex = i % this.columnCount;

            this.items[i].xOffset = ((this.itemWidth + itemMarginR) * columnIndex);
            this.items[i].yOffset = ((this.itemHeight + itemMarginB) * rowIndex);
            this.items[i].setSize(this.itemWidth, this.itemHeight);
        }

        if (this.items.length > 0) {
            this.totalHeight = this.items[this.items.length - 1].yOffset + this.itemHeight + 2 * paddingLR;
        }

        //
        console.log("on_size, browser");

        this.scrollbar.setBoundary(this.x + this.width - scrollbarWidth, this.y, scrollbarWidth, this.height);

    }

    // browesr;
    on_paint(gr: IGdiGraphics) {
        let backgroundColor = colors.background;
        let px = this.x;
        let py = this.y;
        let pw = this.width;
        let ph = this.height;

        let items = this.items;

        // background;
        gr.FillSolidRect(px, py, pw, ph, backgroundColor);

        let offsetTop = 0;


        this.visibleItems.length = 0;

        for (let i = 0, len = items.length; i < len; i++) {
            let item = items[i];
            item.setPosition(this.x + paddingLR + item.xOffset, this.y + paddingTB + offsetTop + item.yOffset - this.scroll);

            if (item.y + item.height > this.y + offsetTop && item.y < this.y + this.height) {
                // draw visib
                this.visibleItems.push(item);

                item.on_paint(gr);

            }

        }

        // console.log(this.visibleItems.length);

    }

    on_mouse_wheel(step: number) {
        this.scrollTo(this.scroll - step * this.rowHeight);
    }

}