import { AlbumArtId, CacheObj, ImageCache, sanitize } from "../common/AlbumArt";
import { Component } from "../common/BasePart";
import { CropImage, CursorName, debounce, debugTrace, InterpolationMode, RGB, scale, SmoothingMode, tail, TextRenderingHint, VKeyCode, getYear, getOrDefault, BuildFullPath, throttle, ThrottledRepaint, fso, MenuFlag } from "../common/Common";
import { Material } from "../common/Icon";
import { InputBox } from "../common/Inputbox";
import { TXT } from "../common/Lang";
import { Scrollbar } from "../common/ScrollBar";
import { ScrollView } from "../common/ScrollView";
import { MeasureString, StringFormat, StringFormatFlags, StringTrimming } from "../common/String";
import { GetFont, scrollbarWidth, themeColors } from "../common/Theme";
import { mouseCursor, notifyOthers } from "../common/UserInterface";
import { DropdownButton, IconButton } from "./Buttons";
import { showTrackContextMenu } from "./PlaylistView";


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

const itemFont = GetFont("semibold,14");
const smallItemFont = GetFont("normal,14");
const tabFont = GetFont("semibold, 14");
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
const itemMinWidth = scale(160); // make it config able;
const itemMarginR = scale(16);
const itemMarginB = scale(32);

export const enum GroupTypes {
    Albums,
    Artists,
    Genres,
}
export const enum SourceTypes {
    Library,
    CurrentPlaylist, // preserved
    AllPlaylists,// preserved
}

export const enum SortTypes {
    AZ, // Album-album name, Artist-artist name;
    Year,
    AddTime, // foo_playcount
    Artist,
}

const TF_ORDER_ALBUM = fb.TitleFormat("%album%^^[%date%]^^%discnumber%^^%tracknumber%");
const TF_ALBUM_TAGS = fb.TitleFormat("%album%|||[%date%]^^%album artist%^^%discnumber%^^%tracknumber%^^%added%");
const TF_ARTIST_TAGS = fb.TitleFormat("%artist%");

export interface BrowserOptionType {
    sourceType: number;
    viewType: number;
    sortType: number;
    metadbs?: IFbMetadbList;
    scroll?: number;
}

const browserProp = window.GetProperty("Browser.Props", `${SourceTypes.Library},${GroupTypes.Albums},${SortTypes.AZ}`)
    .split(",")
    .map(a => Number(a));

// Classes
// ------------------------------------------------

const filterBoxWidth = scale(200);
const filterBoxHeight = scale(32);

class FilterBox extends Component {
    inputbox: InputBox;
    inputbox_h: number;
    clearBtn: IconButton;
    filterBtn: IconButton;

    constructor() {
        super({});
        this.grabFocus = false;
        this.inputbox = new InputBox({
            font: GetFont("normal,14"),
            foreColor: colors.text,
            backgroundColor: colors.background,
            backgroundActiveColor: colors.background,
            backgroundSelectionColor: RGB(28, 98, 185),
            empty_text: TXT("Filter..."),
            autovalidation: true,
            func: () => { }
        })
        this.inputbox_h = MeasureString("ABCD", this.inputbox.font).Height + scale(4);
        this.clearBtn = new IconButton({
            icon: Material.close,
            fontSize: scale(20),
            colors: [colors.titleText],
        });
        this.clearBtn.on_click = () => {
            if (this.inputbox.text.length > 0) {
                this.inputbox.text = "";
                this.inputbox.offset = 0;
                this.repaint();
            }
        }
        this.clearBtn.visible = this.inputbox.text.length > 0;
        this.filterBtn = new IconButton({
            icon: Material.filter,
            fontSize: scale(20),
            colors: [colors.titleText]
        })
        this.addChild(this.inputbox);
        this.addChild(this.clearBtn);
        this.addChild(this.filterBtn);
        this.setSize(filterBoxWidth, filterBoxHeight);
    }

    on_size() {
        let offsetY = ((this.height - this.inputbox_h) / 2);
        this.inputbox.setBoundary(
            this.x + scale(32),
            this.y + offsetY,
            this.width - scale(32) - scale(32),
            this.inputbox_h
        );
        this.clearBtn.setBoundary(
            this.inputbox.x + this.inputbox.width,
            this.y,
            scale(24),
            this.height
        );
        this.filterBtn.setBoundary(
            this.x, this.y, scale(32), this.height
        );
    }

    on_paint(gr: IGdiGraphics) {
        gr.DrawRect(this.x, this.y, this.width - scale(1), this.height - scale(1), scale(1), colors.titleText & 0x25ffffff);
        if (this.inputbox.edit) {
            gr.DrawRect(this.x, this.y, this.width - scale(1), this.height - scale(1), scale(1), RGB(28, 98, 185));
        }
        this.clearBtn.visible = (this.inputbox.edit && this.inputbox.text.length > 0);
    }

    repaint() {
        this.parent.repaint();
    }
}


/**
 * Tab item,click it to change page;
 */
class TabItem extends Component {
    static getCount = (() => { let count = 0; return () => count++ })();

    text: string;
    index: number = TabItem.getCount();
    isHighlight: boolean = false;

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

    isCurrent() {
        return false;
    }

    // tab item;
    on_paint(gr: IGdiGraphics) {
        let { pad, text } = this;
        let tabFont_ = tabFont;
        let color = this.isHighlight ? colors.titleText : colors.secondaryText;

        // text;
        gr.DrawString(text, tabFont_, color, this.x + pad, this.y, this.width, this.height, StringFormat.LeftCenter);

        // line;
        if (this.isHighlight) {
            gr.DrawLine(this.x + pad, this.y + this.height - scale(2), this.x + this.width - pad, this.y + this.height - scale(2), scale(2), color);
        }
    }

    // Change it when creating instances;

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
    highlightTabIndex = -1;
    // sourceBtn: DropdownButton;
    sortBtn: DropdownButton;
    filterBox: FilterBox;

    // browser header;
    constructor() {
        super({})

        // init tabitems;
        let tabContents = [TXT("ALBUMS"), TXT("ARTISTS")];
        this.tabItems = tabContents.map((txt, i) => {
            let tab = new TabItem(txt)
            tab.on_click = (x: number, y: number) => {
                this.onClickTab(i)
            }
            this.addChild(tab);
            return tab;
        });

        // dropdown buttons;
        // todo...
        this.sortBtn = new DropdownButton({ text: "Sort by: A to Z" });
        this.sortBtn.on_click = (x: number, y: number) => {
            showSortMenu(x, y, GroupTypes.Albums)
        }
        this.addChild(this.sortBtn);
        this.filterBox = new FilterBox();
        this.filterBox.z = 1000;
        this.addChild(this.filterBox);
    };

    getGroupType() {
        return -1;
    }

    getHighlightTabIndex() {
        switch (this.getGroupType()) {
            case GroupTypes.Albums:
                return 0;
            case GroupTypes.Artists:
                return 1;
            case GroupTypes.Genres:
                return 2;
        }
    }

    onClickTab(tabIndex: number) {
        //
    }

    // browser header on init;
    on_init() {
        // init highlighted tab;
        this.tabItems.forEach((item, i) => {
            item.isHighlight = (this.getHighlightTabIndex() === i);
        });

        this.repaint();
    }

    // browser header;
    on_size() {
        // 字与页面边缘对齐
        let tabX = this.x + paddingLR - scale(16);
        let tabY = this.y;
        for (let i = 0; i < this.tabItems.length; i++) {
            this.tabItems[i].setPosition(tabX, tabY);
            tabX += this.tabItems[i].width;
        }
        let btnY = this.y + tabHeight + (toolbarHeight - this.sortBtn.height) / 2;
        let btnX = this.x + paddingLR;

        this.filterBox.setPosition(btnX, btnY)
        this.sortBtn.setPosition(this.filterBox.x + this.filterBox.width + scale(16), btnY);
    }

    // browser header;
    on_paint(gr: IGdiGraphics) {
        // background;
        gr.FillSolidRect(this.x, this.y, this.width, this.height, colors.background);

        //tab underline;
        gr.DrawLine(this.x + paddingLR, this.y + tabHeight - 1, this.x + this.width - paddingLR, this.y + tabHeight - 1, 1, colors.titleText & 0x25ffffff);
    }
}

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
    // list index;
    index: number;
    isHover: boolean = false;
    isFocus: boolean = false;
    isSelect: boolean = false;
    // first metadb contained in metadbs list, for get item info like 'album
    // name', 'artist name', 'artwork'...;
    metadb: IFbMetadb;
    // track metadbs that contained in this item;
    metadbs: IFbMetadbList;
    albumName: string;
    artistName: string;
    year: string;
    addTime: string;
    cacheKey: string = "";

    constructor() {
        super({})
    }

    // browser item;
    on_paint(gr: IGdiGraphics) {
        let rectLineWidth = scale(2);
        if (this.isSelect) {
            gr.FillSolidRect(this.x - rectLineWidth, this.y - rectLineWidth, this.width + 2 * rectLineWidth, this.width + 2 * rectLineWidth, RGB(0, 90, 158));
        }
        // draw image;
        let img_draw = imageCache.hit(this);
        img_draw && gr.DrawImage(img_draw, this.x, this.y, this.width, this.width,
            0, 0, img_draw.Width, img_draw.Height)
        // draw hover mask;
        if (this.isHover) {
            gr.FillGradRect(this.x, this.y, this.width, this.height / 2, 90, colors.text, 0, 1.0);
        }
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

    // Library, Playlist, AllPlaylists, SendTo
    sourceType: number = 0;
    // Albums, Artist, Genres
    groupType: number = GroupTypes.Albums;
    sortType: number = SortTypes.AddTime;
    items: BrowserItem[] = [];
    // groups: BrowserItem[][] = [];
    visibleItems: BrowserItem[] = [];
    selectedIndexes: number[] = [];
    metadbs: IFbMetadbList;
    itemWidth: number;
    itemHeight: number;
    columnCount: number;
    rowHeight: number;
    scrollbar: Scrollbar;
    detailHeader: LibraryBrowserHeader;
    imageCache: BrowserImageCache;

    constructor() {
        super({});

        this.scrollbar = new Scrollbar({
            cursorColor: colors.scrollbarCursor,
            backgroundColor: colors.scrollbarBackground
        });
        this.addChild(this.scrollbar);

        this.detailHeader = new LibraryBrowserHeader();
        this.addChild(this.detailHeader);
        this.detailHeader.getGroupType = () => {
            return this.groupType;
        }

        this.imageCache = imageCache;
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
        }

        // order by format;
        if (this.groupType === GroupTypes.Albums) {
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
        // let rowCount = Math.ceil(this.items.length / this.columnCount);
        this.columnCount = columnCount;
        // this.rowCount = rowCount;
        this.itemWidth = itemWidth;
        this.itemHeight = itemHeight;
        this.rowHeight = itemHeight + itemMarginB;
    }

    private createItemsFromMetadbs(sourceMetadbs: IFbMetadbList): BrowserItem[] {
        let tf_diff: IFbTitleFormat;
        let compare = "#@!";

        if (this.groupType === GroupTypes.Albums) {
            tf_diff = TF_ALBUM_TAGS;
        } else if (this.groupType === GroupTypes.Artists) {
            tf_diff = TF_ARTIST_TAGS;
        } else {
            // todo;
        }

        if (sourceMetadbs == null || sourceMetadbs.Count === 0) {
            return [];
        }

        let groupIndex = 0;
        let items: BrowserItem[] = [];

        for (let i = 0, len = sourceMetadbs.Count; i < len; i++) {
            let currMetadb = sourceMetadbs[i];
            let tags = tf_diff.EvalWithMetadb(currMetadb).split("|||");
            let current = tags[0];

            if (current !== compare) {
                compare = current;

                let currItem = new BrowserItem();
                currItem.index = groupIndex;
                currItem.metadb = currMetadb;
                currItem.metadbs = new FbMetadbHandleList(currMetadb);
                currItem.albumName = tags[0];
                let tag1_arr = tags[1].split("^^");
                currItem.artistName = tag1_arr[1];
                currItem.year = getYear(tag1_arr[0]);
                currItem.addTime = tag1_arr[4];
                currItem.cacheKey = sanitize((currItem.artistName ? currItem.artistName + " - " : "") + currItem.albumName)
                    .replace(
                        /CD(\s*\d|\.0\d)|CD\s*(One|Two|Three)|Disc\s*\d|Disc\s*(III|II|I|One|Two|Three)\b/gi,
                        ""
                    )
                    .replace(/\(\s*\)|\[\s*\]/g, " ")
                    .replace(/\s\s+/g, " ")
                    .replace(/-\s*$/g, " ")
                    .trim();
                items.push(currItem);
                groupIndex++;
            } else {
                let currItem = tail(items);
                currItem.metadbs.Add(currMetadb);
            }
        } // EOFor

        return items;
    }

    // browser set items;
    private setItems() {
        this.selectedIndexes = [];
        if (this.metadbs == null) {
            this.items = [];
            return;
        }
        // debugTrace("browser metadb count: ", this.metadbs.Count)
        // let d1 = Date.now();
        this.items = this.createItemsFromMetadbs(this.metadbs);
        // debugTrace(Date.now() - d1);
        return;
    }

    initWithOptions(options: BrowserOptionType) {
        this.sourceType = getOrDefault(options, o => o.sourceType, SourceTypes.Library);
        this.groupType = getOrDefault(options, o => o.viewType, 0);
        this.sortType = getOrDefault(options, o => o.sortType, SortTypes.AddTime);
        this.metadbs = getOrDefault(options, o => o.metadbs, this.getAllMetadbs());
        this.setItems();
        this.scroll = getOrDefault(options, o => o.scroll, 0);;
    }

    private debounce_update = debounce((opts?: BrowserOptionType) => {
        this.initWithOptions({
            sourceType: this.sourceType,
            viewType: this.groupType,
            sortType: this.sortType,
            scroll: this.scroll,
        });
        this.on_size();
        this.repaint();
    }, 250);

    //browser;
    on_init() {
        this.initWithOptions({
            sourceType: browserProp[0],
            viewType: browserProp[1],
            sortType: browserProp[2],
        });
        this.on_size();
        this.repaint();
    }

    // browser;
    on_size() {
        //
        updatePaddings(this.width, this.height);

        // calculate grid item size;
        this.setMetrics();

        // scrollbar;
        this.scrollbar.setBoundary(this.x + this.width - scrollbarWidth, this.y, scrollbarWidth, this.height);

        // set detailHeader;
        this.detailHeader.setBoundary(this.x, this.y, this.width, tabHeight + toolbarHeight);

        // update items' yOffset;
        for (let i = 0, len = this.items.length; i < len; i++) {
            let rowIndex = Math.floor(i / this.columnCount);
            let columnIndex = i % this.columnCount;

            this.items[i].xOffset = ((this.itemWidth + itemMarginR) * columnIndex);
            this.items[i].yOffset = ((this.itemHeight + itemMarginB) * rowIndex);
            this.items[i].setSize(this.itemWidth, this.itemHeight);
        }

        if (this.items.length > 0) {
            this.totalHeight = this.items[this.items.length - 1].yOffset + this.itemHeight + paddingTB + this.detailHeader.height;
        }

        // check scroll;
        this.scrollTo();

        // resize noCover image;
        this.db_resizeImage();
    }

    private db_resizeImage = debounce(() => {
        this.imageCache.changeImageSize(this.itemWidth);
    }, 250);

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

        let offsetTop = this.detailHeader.height;

        // show top split line when this.scroll > 0;
        if (this.scroll > 0) {
            gr.DrawLine(this.x, this.y + offsetTop, this.x + this.width - this.scrollbar.width, this.y + offsetTop, scale(2), colors.splitLine);
        }

        this.visibleItems.length = 0;

        for (let i = 0, len = items.length; i < len; i++) {
            let item = items[i];
            item.setPosition(this.x + paddingLR + item.xOffset, this.y + offsetTop + item.yOffset - this.scroll);
            if (item.y + item.height > this.y + offsetTop && item.y < this.y + this.height) {
                this.visibleItems.push(item);
                item.on_paint(gr);
            }
        }

    }

    private getHoverItem(x: number, y: number) {
        return y > this.y + this.detailHeader.height
            && y < this.y + this.height
            && this.visibleItems.find(item => item.trace(x, y));
    }

    private setSelection(): void;
    private setSelection(target: number): void;
    private setSelection(from?: number, to?: number): void {
        if (from == null && to == null) {
            this.selectedIndexes = [];
            this.applySelection();
            return;
        } else if (to == null) {
            to = from;
        }

        let indexes: number[] = [];
        if (from > to) {
            [from, to] = [to, from];
        }

        for (let i = from; i <= to; i++) {
            this.items[i] && indexes.push(i);
        }

        if (indexes.toString() !== this.selectedIndexes.toString()) {
            this.selectedIndexes = indexes;
            this.applySelection();
        }
    }

    private applySelection() {
        this.items.forEach((item, i) =>
            item.isSelect = (this.selectedIndexes.indexOf(i) > -1));
    }

    private hoverIndex: number = -1;
    private downIndex: number = -1;

    changeHoverIndex(index: number) {
        if (index !== this.hoverIndex) {
            this.items[this.hoverIndex] && (this.items[this.hoverIndex].isHover = false);
            this.hoverIndex = index;
            this.items[this.hoverIndex] && (this.items[this.hoverIndex].isHover = true);
            this.repaint();
        }
    }

    on_mouse_wheel(step: number) {
        this.scrollTo(this.scroll - step * this.rowHeight);
    }

    on_mouse_move(x: number, y: number) {
        let hoverItem = this.getHoverItem(x, y);

        if (this.downIndex > -1) {

        } else {
            this.changeHoverIndex(hoverItem ? hoverItem.index : -1);
        }

    }

    on_mouse_lbtn_down(x: number, y: number) {
        let hoverItem = this.getHoverItem(x, y);
        let hoverIndex = hoverItem ? hoverItem.index : -1;

        // set selection;
        let shiftPressed = utils.IsKeyPressed(VKeyCode.Shift);
        let controlPressed = utils.IsKeyPressed(VKeyCode.Control);

        if (controlPressed) {
            if (hoverItem) {
                let isselected = hoverItem.isSelect;
                hoverItem.isSelect = !isselected;
                isselected ? this.selectedIndexes.splice(this.selectedIndexes.indexOf(hoverItem.index), 1) : this.selectedIndexes.push(hoverItem.index);
                this.repaint();
            }
        } else if (shiftPressed) {

        } else {
            this.downIndex = hoverIndex;
        }

    }

    on_mouse_lbtn_up(x: number, y: number) {
        let hoverItem = this.getHoverItem(x, y);
        let hoverIndex = hoverItem ? hoverItem.index : -1;
        if (hoverItem && hoverIndex === this.downIndex) {
            notifyOthers("Show.AlbumPage", {
                albumName: hoverItem.albumName,
            });
        }
        this.downIndex = -1;
        this.repaint();
    }

    on_mouse_rbtn_down(x: number, y: number) {
        let hoverItem = this.getHoverItem(x, y);
        let hoverIndex = hoverItem ? hoverItem.index : -1;
        this.changeHoverIndex(hoverIndex);
        this.downIndex = hoverIndex;

        if (hoverItem) {
            this.setSelection(hoverIndex);
        } else {
            this.setSelection();
        }
    }

    on_mouse_rbtn_up(x: number, y: number) {
        let hoverItem = this.getHoverItem(x, y);
        let hoverIndex = hoverItem ? hoverItem.index : -1;
        this.changeHoverIndex(hoverIndex);

        if (hoverIndex === this.downIndex && hoverIndex > -1) {
            showTrackContextMenu(null, hoverItem.metadbs, x, y);
        }


        this.downIndex = -1;
        this.repaint();
    }

    on_mouse_leave() {
        let item = this.getHoverItem(mouseCursor.x, mouseCursor.y);
        this.changeHoverIndex(item ? item.index : -1);
    }

    on_load_image_done(tid: number, image: IGdiBitmap, imgPath: string) {
        this.imageCache.loadImageDone(tid, image, imgPath);
    }

    on_get_album_art_done(metadb: IFbMetadb, art_id: number, image: IGdiBitmap | null, image_path: string) {
        this.imageCache.getAlbumArtDone(metadb, art_id, image, image_path);
    }

    on_library_items_added(metadbsAdded: IFbMetadbList) {
        this.debounce_update();
    }

    on_library_items_changed(metadbsChanged: IFbMetadbList) {
        this.debounce_update();
    }

    on_library_items_removed(metadbsRemoved: IFbMetadbList) {
        this.debounce_update();
    }
}

function showSortMenu(x: number, y: number, viewType: number) {
    let menu = window.CreatePopupMenu();

    if (viewType === GroupTypes.Albums) {
        menu.AppendMenuItem(MenuFlag.STRING, 10, TXT("Add time"));
    }
    menu.AppendMenuItem(MenuFlag.STRING, 11, TXT("A to Z"));
    if (viewType === GroupTypes.Albums) {
        menu.AppendMenuItem(MenuFlag.STRING, 12, TXT("Artists"));
        // menu.AppendMenuItem(MenuFlag.STRING, 14, TXT("Album"));
        menu.AppendMenuItem(MenuFlag.STRING, 13, TXT("Release year"));
    }
    menu.AppendMenuSeparator();
    menu.AppendMenuItem(MenuFlag.STRING, 20, TXT("Reverse"));

    let ret = menu.TrackPopupMenu(x, y);

    switch (true) {
        case ret === 10:
            browser.items.sort((a, b) => +a.addTime - (+b.addTime));
            browser.on_size();
            browser.repaint();
            break;
        case ret === 11:
            debugTrace("sort by az")
            // debugTrace()
            let a1 = browser.items[0];
            let a2 = browser.items[1];
            debugTrace(a1.albumName.localeCompare(a2.albumName));
            browser.items.sort((a, b) => b.albumName.localeCompare(a.albumName));
            browser.on_size();
            browser.repaint();
            break;

    }

}

interface BCacheObj {
    tid: number;
    image: IGdiBitmap;
    image_path?: string;
    load_request: number;
}

class BrowserImageCache {

    private cacheMap: Map<string, BCacheObj> = new Map();
    private cacheType: number = AlbumArtId.Front;
    private enableDiskCache: boolean = false;
    private cacheFolder = fb.ProfilePath + "IMG_Cache\\";
    private imgFolder = "";
    private stubImg: IGdiBitmap;
    private loadingImg: IGdiBitmap;
    private imgSize: number = 250;

    constructor(op?: { enableDiskCache?: boolean; cacheType?: number }) {
        this.enableDiskCache = getOrDefault(op, o => o.enableDiskCache, false);
        if (this.enableDiskCache) {
            this.imgFolder = this.cacheFolder + "600" + "\\";
            BuildFullPath(this.imgFolder);
        }
        this.cacheType = getOrDefault(op, o => this.cacheType, AlbumArtId.Front);
        this.getStubImg();

    }

    private getStubImg() {
        let stubImg: IGdiBitmap;
        switch (this.cacheType) {
            case AlbumArtId.Front:
                stubImg = ImageCache.stubImgs[0];
                break;
            case AlbumArtId.Artist:
                stubImg = ImageCache.stubImgs[1];
                break;
            default:
                stubImg = ImageCache.stubImgs[2];
                break;
        }
        this.stubImg = stubImg.Resize(this.imgSize, this.imgSize)
        this.loadingImg = ImageCache.stubImgs[3].Resize(this.imgSize, this.imgSize);
    }

    clear() {
        this.cacheMap.clear();
    }

    hit(item: BrowserItem, art_id = AlbumArtId.Front): IGdiBitmap | null {
        let cacheKey = item.cacheKey;
        if (!cacheKey) {
            return this.stubImg;
        }
        let cacheObj = this.cacheMap.get(cacheKey);
        if (!cacheObj) {
            cacheObj = {
                tid: -1,
                image: null,
                load_request: 0,
            }
            this.cacheMap.set(cacheKey, cacheObj);
        } else if (cacheObj.image) {
            return cacheObj.image;
        }
        if (this.enableDiskCache && cacheObj.load_request === 0) {
            (!timerCoverLoad) && (timerCoverLoad = window.SetTimeout(() => {
                cacheObj.tid = gdi.LoadImageAsync(window.ID, this.imgFolder + cacheKey);
                cacheObj.load_request = 1;
                timerCoverLoad && window.ClearTimeout(timerCoverLoad);
                timerCoverLoad = null;
            }, 30));
        }
        if (!this.enableDiskCache || cacheObj.load_request === 2) {
            (!timerCoverLoad) && (timerCoverLoad = window.SetTimeout(() => {
                utils.GetAlbumArtAsync(window.ID, item.metadb, AlbumArtId.Front, false);
                cacheObj.load_request = 3;
                timerCoverLoad && window.ClearTimeout(timerCoverLoad);
                timerCoverLoad = null;
            }, 30));
        }
        return this.loadingImg;
    }

    changeImageSize(size_px: number) {
        if (size_px !== this.imgSize) {
            this.imgSize = size_px;
            this.getStubImg();
            // this.clear();
            // this.cacheMap.entries()
            for (let obj of this.cacheMap.values()) {
                obj.load_request = 0;
            }
        }
    }

    private formatImage(img: IGdiBitmap) {
        if (!img || Number.isNaN(this.imgSize) || this.imgSize < 1) return;
        return CropImage(img, this.imgSize, this.imgSize);
    }

    loadImageDone(tid: number, image: IGdiBitmap | null, imgPath: string) {
        if (Number.isNaN(this.imgSize) || this.imgSize < 1) return;
        let cacheObj: CacheObj;
        for (let [key, obj] of this.cacheMap) {
            if (obj.tid === tid) {
                cacheObj = obj;
                cacheObj.tid = -1;
                if (image) {
                    cacheObj.image = this.formatImage(image);
                }
                if (cacheObj.load_request >= 2) { }
                cacheObj.load_request = 2;
                cacheObj.image_path = imgPath;
                break;
            }
        }
        ThrottledRepaint();
    }

    getAlbumArtDone(metadb: IFbMetadb, artId: number, image: IGdiBitmap | null, imgPath: string) {
        if (!metadb) {
            return;
        }
        if (!image && artId === AlbumArtId.Front) {
            if (!timerCoverLoad) {
                timerCoverLoad = window.SetTimeout(() => {
                    utils.GetAlbumArtAsync(window.ID, metadb, AlbumArtId.Disc, false);
                    timerCoverLoad && window.ClearTimeout(timerCoverLoad);
                    timerCoverLoad = null;
                }, 5);
            }
        } else {
            // TODO: 这里的响应要是混起来怎么办？
            let cacheKey = sanitize(tf_album.EvalWithMetadb(metadb))
                .replace(
                    /CD(\s*\d|\.0\d)|CD\s*(One|Two|Three)|Disc\s*\d|Disc\s*(III|II|I|One|Two|Three)\b/gi,
                    ""
                )
                .replace(/\(\s*\)|\[\s*\]/g, " ")
                .replace(/\s\s+/g, " ")
                .replace(/-\s*$/g, " ")
                .trim();
            let cacheObj = this.cacheMap.get(cacheKey);
            if (cacheObj == null || cacheObj.load_request === 4) {
                return;
            }
            cacheObj.load_request = 4;
            cacheObj.image = (image ? this.formatImage(image) : this.stubImg);
            cacheObj.image_path = imgPath;
            ThrottledRepaint();
            // 
            window.SetTimeout(() => {
                if (fso.FileExists(this.imgFolder + cacheKey)) {

                } else {
                    if (image && (image.Width > 1000 && image.Height > 1000)) {
                        let img = CropImage(image, 600, 600, InterpolationMode.HighQuality);
                        img.SaveAs(this.imgFolder + cacheKey);
                    }
                };
            }, 5);
        }
    }

}


let imageCache = new BrowserImageCache({
    enableDiskCache: true,
    cacheType: AlbumArtId.Front,
});
let timerCoverLoad: number | null;
let timerCoverDone: number | null;
let tf_album = fb.TitleFormat("[%album artist% - ]%album%")


export const browser = new BrowserView();

function process_string(str: string) {
    str = str.toLowerCase();
    let str_ = [];
    let temp: string;
    while (str != (temp = str.replace("  ", " ")))
        str = temp;
    let str__ = str.split(" ").sort();
    for (var i in str__) {
        if (str__[i] != "")
            str_[str_.length] = str__[i];
    };
    return str_;
}

function match(input: string, str: string[]) {
    var temp = "";
    input = input.toLowerCase();
    for (var j in str) {
        if (input.indexOf(str[j]) < 0)
            return false;
    };
    return true;
}