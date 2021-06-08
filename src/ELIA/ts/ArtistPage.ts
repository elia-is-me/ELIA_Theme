import { Component } from "./BasePart";
import { scale, TextRenderingHint } from "./Common";
import { Material, MaterialFont } from "./Icon";
import { Scrollbar } from "./ScrollBar";
import { ScrollView } from "./ScrollView";
import { StringFormat } from "./String";
import { ui } from "./UserInterface";
import { Button } from "./Buttons";
import { TXT } from "./Lang";
import { formatPlaylistDuration } from "./PlaylistView";
import { GetFont, scrollbarWidth, themeColors } from "./Theme";
import { AlbumArtId, AlbumArtwork } from "./AlbumArt";

const pageColors = {
    text: themeColors.text,
    titleText: themeColors.titleText,
    secondaryText: themeColors.secondaryText,
    background: themeColors.playlistBackground,
    backgroundSelection: themeColors.playlistBackgroundSelection,
    highlight: themeColors.highlight,
    scrollbarCursor: themeColors.scrollbarCursor,
    scrollbarBackground: themeColors.scrollbarBackground,
};

const buttonColors = {
    onPrimary: themeColors.onPrimary,
    primary: themeColors.primary,
    secondary: themeColors.secondary,
    onSecondary: themeColors.onSecondary
}

const iconFont = GetFont(MaterialFont, scale(20));
const itemFont = GetFont("normal, 14");
const titleFont = GetFont("bold, 20");
const groupheaderFont = GetFont("bold, 16");

let paddingLR = scale(24);
let paddingTB = scale(24);
let artworkMarginL = scale(24);
let artworkHeight = 0;
let headerHeight = scale(250);
const minThumbWidth = scale(180);
const thumbGap = scale(24);

const pageWidth = {
    thin: scale(600),
    wide: scale(920),
    extraWide: scale(1120)
};

const TF_SORT_ALBUM = fb.TitleFormat("$year(%date%)|%album%|%disc number%|%track number%");

function queryArtist(artistName: string) {
    let queryString = `%artist% HAS ${artistName} OR %album artist% HAS ${artistName} OR %composer% HAS ${artistName} OR %performer% HAS ${artistName}`;
    let libMetadbs = fb.GetLibraryItems();
    let metadbs: IFbMetadbList;
    try {
        metadbs = fb.GetQueryItems(libMetadbs, queryString);
        metadbs.OrderByFormat(TF_SORT_ALBUM, 0);
    } catch (e) {
        metadbs = plman.GetPlaylistItems(-1);
    }
    return metadbs;
}

// window.SetTimeout(() => {
//     let metadbs = queryArtist("kaji")
//     let pl = plman.FindOrCreatePlaylist("Queue", true);
//     plman.ClearPlaylist(pl);
//     plman.InsertPlaylistItems(pl, 0, metadbs)
// }, 100);


class ThumbItem extends Component {
    constructor(index: number,) {
        super({});
    }
}

class ArtistPageHeader extends Component {

    artwork: AlbumArtwork;
    buttons: Map<string, Button> = new Map();

    // for test;
    artistName: string = "fripSide";
    libraryData: string = "xx tracks, xx hr, yy min";
    genre: string = "J-Pop Anime";
    shortInfo: string = "Years Active: 2002~Present(18 Years)";

    private titleFont = GetFont("bold", scale(32));
    private descriptionFont = GetFont("normal", scale(14));
    private MIN_HEIGHT = scale(240);

    constructor() {
        super({})

        this.artwork = new AlbumArtwork({ artworkType: AlbumArtId.Artist }); // for test now;
        this.addChild(this.artwork);

        let shuffleall = new Button({
            style: "contained",
            text: TXT("Shuffle All"),
            icon: Material.shuffle,
            foreColor: buttonColors.onPrimary,
            backgroundColor: buttonColors.primary
        });
        shuffleall.on_click = () => {
            // shuffle artist's all tracks;
        }
        this.buttons.set("shuffleall", shuffleall);
        this.addChild(shuffleall);

        let sort = new Button({
            style: "text",
            text: TXT("Sort"),
            icon: Material.sort,
            foreColor: buttonColors.secondary
        });
        sort.on_click = (x: number, y: number) => { }
        this.buttons.set("sort", sort);
        this.addChild(sort);

        let context = new Button({
            style: "text",
            icon: Material.more_vert,
            text: TXT("More"),
            foreColor: buttonColors.secondary
        });
        this.buttons.set("context", context);
        this.addChild(context);
    }

    updateArtist(artistName: string) {
        this.artistName = artistName;
    }

    collectFromLibrary() {
        if (!this.artistName) return;

    }

    private getArtworkHeight(pWidth: number): number {
        let thin = pageWidth.thin;
        let wide = pageWidth.wide;
        if (pWidth < thin) return scale(140);
        if (pWidth < wide) return scale(200);
        return scale(220);
    }

    on_size() {
        // let artworkHeight = this.getArtworkHeight(this.width);
        this.artwork.setBoundary(this.x + paddingLR, this.y + paddingTB, artworkHeight, artworkHeight);

        // set btns position;
        let btnX: number;
        let btnY: number;
        let shuffleall = this.buttons.get("shuffleall");
        let sort = this.buttons.get("sort");
        let context = this.buttons.get("context");
        if (this.width < pageWidth.thin) {
            btnX = this.x + paddingLR;
            btnY = this.y + 2 * paddingTB + this.artwork.height;
        } else {
            btnX = this.x + paddingLR + this.artwork.width + artworkMarginL;
            btnY = this.y + this.height - paddingTB - shuffleall.height;
        }
        shuffleall.setPosition(btnX, btnY);
        sort.setPosition(shuffleall.x + shuffleall.width + scale(8), btnY);
        context.setPosition(sort.x + sort.width + scale(4), btnY);
    }

    on_paint(gr: IGdiGraphics) {
        gr.DrawRect(this.x, this.y, this.width - 1, this.height - 1, 1, 0xffffffff);

        let textY = this.y + paddingTB;
        let textX = this.artwork.x + this.artwork.width + artworkMarginL;
        let textW = this.x + this.width - textX - paddingLR;
        let sf = StringFormat.LeftTop;

        let textTotalHeight = 1.1 * this.titleFont.Height + 3 * 1.1 * this.descriptionFont.Height;
        textY += (-this.artwork.y + this.buttons.get("shuffleall").y - textTotalHeight) / 2;

        // ttile;
        gr.SetTextRenderingHint(TextRenderingHint.AntiAliasGridFit);
        gr.DrawString(this.artistName, this.titleFont, pageColors.titleText,
            textX, textY, textW, this.titleFont.Height * 1.2, sf);
        gr.SetTextRenderingHint(ui.textRender);

        textY += this.titleFont.Height * 1.1;
        // artist;
        gr.DrawString(this.libraryData, this.descriptionFont, pageColors.secondaryText,
            textX, textY, textW, this.descriptionFont.Height * 1.3, sf);

        textY += this.descriptionFont.Height * 1.1;

        //
        gr.DrawString(this.genre, this.descriptionFont, pageColors.secondaryText,
            textX, textY, textW, this.descriptionFont.Height * 1.3, sf);
        textY += this.descriptionFont.Height * 1.1;

        gr.DrawString(this.shortInfo, this.descriptionFont, pageColors.secondaryText,
            textX, textY, textW, this.descriptionFont.Height * 1.3, sf);

    }
}

class GridView extends Component {
    scrollview: ScrollView;

    titleText: string = TXT("Discography");
    items: ThumbItem[] = []

    constructor() {
        super({})
    }

    on_size() { }

    on_paint(gr: IGdiGraphics) { }

}

export class ArtistPageView extends ScrollView {

    items: ThumbItem[] = [];

    colors = pageColors;

    private scrollbar: Scrollbar;
    private header: ArtistPageHeader;
    private headerHeight = headerHeight;
    columnCount: number;
    columnWidth: number;
    columnHeight: number;

    constructor() {
        super({})

        this.scrollbar = new Scrollbar({
            cursorColor: this.colors.scrollbarCursor,
            backgroundColor: this.colors.scrollbarBackground
        });
        this.scrollbar.z = 100;
        this.addChild(this.scrollbar);

        this.header = new ArtistPageHeader();
        this.header.z = 10;
        this.addChild(this.header);
    }

    setItems() {

    }

    setColumn() {
        // calculate totalColumns;
        let areaWidth = this.width - 2 * paddingLR;
        let columnCount = Math.floor((areaWidth + thumbGap) / (minThumbWidth + thumbGap));
        let columnWidth = ((areaWidth - thumbGap * (columnCount - 1)) / columnCount) >> 0;
        let columnHeight = (columnWidth + 3 * 1.2 * itemFont.Height) >> 0; // todo;

        this.columnCount = columnCount;
        this.columnWidth = columnWidth;
        this.columnHeight = columnHeight;
    }

    on_size() {

        // update paddings, artwork_height;
        if (this.width < pageWidth.thin) {
            paddingTB = scale(16);
            paddingLR = scale(16);
            artworkHeight = scale(140);
        } else if (this.width < pageWidth.wide) {
            paddingTB = scale(24);
            paddingLR = scale(40);
            artworkHeight = scale(200);
        }
        else {
            paddingLR = scale(40);
            paddingTB = scale(40);
            artworkHeight = scale(220);
        }

        // update headerHeight;
        let minHeight = artworkHeight + paddingTB * 2;
        if (this.width < pageWidth.thin) {
            minHeight += this.header.buttons.get("shuffleall").height + paddingTB;
        }
        headerHeight = minHeight;

        this.setColumn();

        // set children' boundary;
        this.scrollbar.setBoundary(this.x + this.width - scrollbarWidth, this.y, scrollbarWidth, this.height);
        this.header.setBoundary(this.x, this.y - this.scroll, this.width, headerHeight);
    }

    on_paint(gr: IGdiGraphics) {
        let colors = this.colors;

        // update header position;
        this.header.setPosition(null, this.y - this.scroll);
        let itemY = this.y + this.header.height - this.scroll;

        // background;
        gr.FillSolidRect(this.x, this.y, this.width, this.height, colors.background);

        // draw group header;
        let groupheaderY = itemY + scale(24);
        let groupheaderHeight = Math.ceil(groupheaderFont.Height);
        gr.DrawString(TXT("Dicography"), groupheaderFont, colors.titleText, this.x + paddingLR, groupheaderY, this.width - 2 * paddingLR, groupheaderHeight, StringFormat.LeftTop);

        // draw thumbs;
        let firstY = groupheaderY + groupheaderHeight + scale(16);

        for (let i = 0; i < 10; i++) {
            let ci = (i % this.columnCount);
            let ri = (i / this.columnCount) >> 0;
            let thumbX = this.x + paddingLR + ci * this.columnWidth;
            if (ci > 0) thumbX += (ci) * thumbGap;
            let thumbY = firstY + ri * this.columnHeight;
            if (ri > 0) thumbY += (ri) * thumbGap;

            gr.FillSolidRect(thumbX, thumbY, this.columnWidth, this.columnHeight, 0x0fffffff);
        }
    }

    setArtist(artistName: string) {
        let metadbs = queryArtist(artistName);

        // set header artist info;
        this.header.artistName = artistName;
        this.header.libraryData = metadbs.Count + " tracks, " + formatPlaylistDuration(metadbs.CalcTotalDuration());

        //
        this.repaint();
    }


}