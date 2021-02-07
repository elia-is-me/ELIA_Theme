import { AlbumArtId } from "../common/AlbumArt";
import { Component } from "../common/BasePart";
import { CropImage, CursorName, debounce, debugTrace, createImage, InterpolationMode, RGB, scale, SmoothingMode, tail, TextRenderingHint, VKeyCode } from "../common/Common";
import { MaterialFont } from "../common/Icon";
import { TXT } from "../common/Lang";
import { Scrollbar } from "../common/Scrollbar";
import { ScrollView } from "../common/ScrollView";
import { MeasureString, StringFormat, StringFormatFlags, StringTrimming } from "../common/String";
import { GdiFont, scrollbarWidth, themeColors } from "../common/Theme";
import { mouseCursor } from "../common/UserInterface";
import { DropdownButton } from "./Buttons";
import { getYear } from "./PlaybackControlView";
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

const itemFont = GdiFont("semibold,14");
const smallItemFont = GdiFont("normal,14");
const btnFont = GdiFont(MaterialFont, scale(20));
const tabFont = GdiFont("semibold, 14");

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


// View state;

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

const TF_ORDER_ALBUM = fb.TitleFormat("%album%^^[%date%]^^%discnumber%^^%tracknumber%");

// const _album = "%album%"
const TF_ALBUM_TAGS = fb.TitleFormat("%album%|||[%date%]^^%album artist%^^%discnumber%^^%tracknumber%");
const TF_ARTIST_TAGS = fb.TitleFormat("%artist%");


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

    sourceBtn: DropdownButton;
    sortBtn: DropdownButton;

    // browser header;
    constructor() {
        super({})

        // init tabitems;
        let tabContents = [TXT("ALBUMS"), TXT("ARTISTS"), TXT("GENRES")];
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
        this.sourceBtn = new DropdownButton({ text: "Library" });
        this.sourceBtn.on_click = () => { }
        this.addChild(this.sourceBtn);

        this.sortBtn = new DropdownButton({ text: "Sort by: A to Z" });
        this.sortBtn.on_click = () => { }
        this.addChild(this.sortBtn);
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

        let btnY = this.y + tabHeight + (toolbarHeight - this.sourceBtn.height) / 2;
        let btnX = this.x + paddingLR + scale(4);

        this.sourceBtn.setPosition(btnX, btnY);
        btnX += this.sourceBtn.width + scale(16);

        this.sortBtn.setPosition(btnX, btnY);
    }

    // browser header;
    on_paint(gr: IGdiGraphics) {
        // background;
        gr.FillSolidRect(this.x, this.y, this.width, this.height, colors.background);

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
    // list index;
    index: number;
    isHover: boolean = false;
    isFocus: boolean = false;
    isSelect: boolean = false;

    private itemType: number = 0;

    // origin artwork get
    artwork: IGdiBitmap;
    // changed when item size changed;
    private artwork_draw: IGdiBitmap;
    load_request: number = 0;

    // first metadb contained in metadbs list, for get item info like 'album
    // name', 'artist name', 'artwork'...;
    metadb: IFbMetadb;

    // track metadbs that contained in this item;
    metadbs: IFbMetadbList;

    albumName: string;
    artistName: string;
    year: string;

    constructor() {
        super({})
    }

    setArtwork(artworkImage: IGdiBitmap | null) {
        // this.load_request = false;
        this.artwork = artworkImage;//|| imageCache.noCover;
        this.adjustImageSize();
        // this.artwork_draw = this.artwork//this.adjustImageSize(this.artwork);

    }

    adjustImageSize = debounce(() => {
        // if (!this.artwork) return;
        // if (!this.artwork_draw) this.artwork_draw = this.artwork;
        // if (this.artwork_draw && this.artwork_draw.Width !== this.width) {
        //     debugTrace(this.width, this.artwork.Width, this.artwork_draw.Width);
        //     this.artwork_draw = this.artwork.Resize(this.width, this.width, InterpolationMode.HighQuality);
        // }
        // browser.repaint();
    }, 150);

    // browser item;
    on_paint(gr: IGdiGraphics) {
        // gr.FillSolidRect(this.x, this.y, this.width, this.width, 0x50000000);

        if (this.load_request === 0) {
            this.artwork = imageCache.cacheHit(this, AlbumArtId.Front);
        }
        // if (this.artwork_draw && this.artwork_draw.Width !== this.width) {
        //     this.adjustImageSize();
        // }
        let img_draw = this.artwork || imageCache.noCover;

        // resize image or set interpolation to high quality;
        gr.DrawImage(img_draw, this.x, this.y, this.width, this.width,
            0, 0, img_draw.Width, img_draw.Height)

        // draw hover mask;
        if (this.isHover) {
            gr.FillGradRect(this.x, this.y, this.width, this.height / 2, 90, colors.text, 0, 1.0);
        }

        let rectLineWidth = scale(2);

        if (this.isSelect) {
            gr.DrawRect(this.x - rectLineWidth, this.y - rectLineWidth, this.width + 2 * rectLineWidth, this.width + 2 * rectLineWidth, scale(2), RGB(0, 90, 158));
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
    private sourceType: number = 0;

    // Albums, Artist, Genres
    private groupType: number = GroupTypes.Albums;

    items: BrowserItem[] = [];
    visibleItems: BrowserItem[] = [];
    selectedIndexes: number[] = [];
    metadbs: IFbMetadbList;

    itemWidth: number;
    itemHeight: number;
    columnCount: number;
    rowCount: number;
    rowHeight: number;

    scrollbar: Scrollbar;
    detailHeader: LibraryBrowserHeader;
    imageCache: ImageCache;

    constructor() {
        super({});

        this.scrollbar = new Scrollbar({ cursorColor: colors.scrollbarCursor, backgroundColor: colors.scrollbarBackground });
        this.scrollbar.z = 500;
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
                break;
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
        let rowCount = Math.ceil(this.items.length / this.columnCount);

        this.columnCount = columnCount;
        this.rowCount = rowCount;
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

        let d1 = Date.now();
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

        let tf_diff: IFbTitleFormat;
        let metadbs = this.metadbs;
        let compare = "#@!";

        if (this.groupType == 0) {
            tf_diff = TF_ALBUM_TAGS;
        } else {
            tf_diff = TF_ARTIST_TAGS;
        }

        if (this.metadbs == null) {
            return;
        }

        this.selectedIndexes = [];

        let d1 = Date.now();
        this.items = this.createItemsFromMetadbs(this.metadbs);
        debugTrace(Date.now() - d1);
        return;

        // let d1 = (new Date()).getTime();

        let groupIndex = 0;

        for (let i = 0, len = metadbs.Count; i < len; i++) {
            let metadb = metadbs[i];
            let tags = tf_diff.EvalWithMetadb(metadb).split("|||");
            let current = tags[0];

            if (current !== compare) {
                compare = current;
                let item = new BrowserItem();
                item.index = groupIndex;
                item.metadb = metadb;
                item.metadbs = new FbMetadbHandleList(metadb);
                item.albumName = tags[0];
                let tag2_arr = tags[1].split("^^");
                item.artistName = tag2_arr[1]
                item.year = getYear(tag2_arr[0]);
                this.items.push(item);
                groupIndex++;
            } else {
                let item = this.items[this.items.length - 1];
                item.metadbs.Add(metadb);
            }
        }

        // let d2 = (new Date()).getTime();
        // debugTrace("init in: ", d2 - d1, " ms", "total items: ", this.items.length);

    }

    initWithOptions(options: BrowserOptionType) {
        this.sourceType = options.sourceType;
        this.groupType = options.viewType;

        // --> Debug;
        this.sourceType = SourceTypes.Library;
        this.groupType = 0;
        // <-- debug;

        this.metadbs = this.getAllMetadbs();

        this.setItems();

        // Reset scroll;
        this.scroll = 0;

    }

    //browser;
    on_init() {
        this.initWithOptions({
            sourceType: SourceTypes.Library,
            viewType: 0
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
        imageCache.debounce_resizeCovers(this.itemWidth);

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
                // draw visib
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
        }

    }

    on_mouse_lbtn_up(x: number, y: number) { }

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
        // console.log(mouseCursor.x, mouseCursor.y, item ? item.index : -1);
        // debugTrace("area y: ", this.y + this.detailHeader.height)
        this.changeHoverIndex(item ? item.index : -1);
    }

    on_get_album_art_done(metadb: IFbMetadb, art_id: number, image: IGdiBitmap | null, image_path: string) {
        let items = this.items;
        let len = items.length;
        let visStart = this.visibleItems[0].index;
        let visEnd = tail(this.visibleItems)?.index;

        for (let i = 0; i < len; i++) {
            let item = items[i];

            if (item.metadb && item.metadb.Compare(metadb)) {
                // muzik download from NeteaseCloudMusic put album artwork in
                // 'Disc' tag.
                if (!image && art_id === AlbumArtId.Front) {
                    item.load_request = 0;
                    this.imageCache.cacheHit(item, AlbumArtId.Disc);
                    break;
                }

                let artworkImage = image;
                let cacheImgWidth = (2 * itemMinWidth) >> 0;
                if (image && image.Width > cacheImgWidth && image.Height > cacheImgWidth) {
                    // TODO: process image according to cover type;
                    // console.log("image raw width, height, ", image.Width, image.Height);
                    artworkImage = CropImage(image, cacheImgWidth, cacheImgWidth, InterpolationMode.HighQuality);
                };

                // item.setArtwork(artworkImage);
                item.artwork = artworkImage;
                item.load_request = 1;
                this.imageCache.cacheIt(item.albumName, artworkImage);


                if (i >= visStart && i <= visEnd) {
                    if (!timerCoverDone) {
                        timerCoverDone = window.SetTimeout(() => {
                            this.repaint();
                            timerCoverDone && window.ClearTimeout(timerCoverDone);
                            timerCoverDone = null;
                        }, 5);
                    }
                }
                break;
            }
        }
    }

    on_library_items_added(metadbsAdded: IFbMetadbList) {

    }

    on_library_items_changed(metadbsChanged: IFbMetadbList) {
        // let removedItems = this.createItemsFromMetadbs(metadbsChanged);
    }

    on_library_items_removed(metadbsRemoved: IFbMetadbList) { }

}

class ImageCache {

    private _cache: Map<string, IGdiBitmap> = new Map();
    private _stubImages: IGdiBitmap[];
    noCover: IGdiBitmap;
    noPhoto: IGdiBitmap;
    noArt: IGdiBitmap;

    constructor() {
        this._createStubImages();
        this.noCover = this._stubImages[0];
        this.noPhoto = this._stubImages[1];
        this.noArt = this._stubImages[2];
    }

    cacheIt(key: string, image: IGdiBitmap, force: boolean = false): IGdiBitmap | null {
        if (!image || key === "?") return;
        if (!this._cache.get(key) || force) {
            this._cache.set(key, image);
        }
        // save  to cache;
        if (enableDiskCache) {
            // todo;
        }
        return;
    }

    // hit(metadb: IFbMetadb, key: string, art_id = AlbumArtId.Front): IGdiBitmap | null {
    cacheHit(item: BrowserItem, art_id = AlbumArtId.Front): IGdiBitmap | null {
        let img = this._cache.get(item.albumName);
        if (img == null) {
            if (enableDiskCache) {
                // try to load image in cache;
            }
            if (!timerCoverLoad && !item.load_request) {
                timerCoverLoad = window.SetTimeout(() => {
                    utils.GetAlbumArtAsync(window.ID, item.metadb, art_id, false, false);
                    timerCoverLoad && window.ClearTimeout(timerCoverLoad);
                    timerCoverLoad = null;
                }, (browser.isScrolling() ? 60 : 5));
            }
        }
        return img;
    }

    private _createStubImages() {
        let stubImages: IGdiBitmap[] = [];
        let font1 = gdi.Font("Segoe UI", 230, 1);
        let font2 = gdi.Font("Segoe UI", 120, 1);
        let foreColor = themeColors.titleText;
        for (let i = 0; i < 3; i++) {
            stubImages[i] = createImage(500, 500, true, g => {
                g.SetSmoothingMode(SmoothingMode.HighQuality);
                g.FillRoundRect(0, 0, 500, 500, 8, 8, foreColor & 0x0fffffff);
                g.SetTextRenderingHint(TextRenderingHint.AntiAlias);
                g.DrawString("NO", font1, 0x25ffffff & foreColor, 0, 0, 500, 275, StringFormat.Center);
                g.DrawString(
                    ["COVER", "PHOTO", "ART"][i],
                    font2,
                    0x20ffffff & foreColor,
                    2.5,
                    175,
                    500,
                    275,
                    StringFormat.Center
                );
                g.FillSolidRect(60, 400, 380, 20, 0x15fffffff & foreColor);
            });
        }
        this._stubImages = stubImages;
    }

    debounce_resizeCovers = debounce((img_width: number) => {
        if (this.noCover.Width !== img_width) {
            this.noCover = this._stubImages[0]
                .Resize(img_width, img_width, InterpolationMode.HighQuality);
        }
    }, 150);


}


let imageCache = new ImageCache();
let timerCoverLoad: number | null;
let timerCoverDone: number | null;
let enableDiskCache = false;


export const browser = new BrowserView();
