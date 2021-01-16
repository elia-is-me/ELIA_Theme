import { AlbumArtwork, NowplayingArtwork } from "../common/AlbumArt";
import { Component } from "../common/BasePart";
import { MeasureString, scale, shuffleArray, spaceEnd, spaceStart, spaceStartEnd, StringFormat, TextRenderingHint } from "../common/common";
import { Material, MaterialFont } from "../common/Icon";
import { Scrollbar } from "../common/Scrollbar";
import { ScrollView } from "../common/ScrollView";
import { ui } from "../common/UserInterface";
import { Button } from "./Buttons";
import { lang } from "./Lang";
import { getYear } from "./PlaybackControlView";
import { formatPlaylistDuration } from "./PlaylistView";
import { SendToQueueListPlay } from "./SearchResultView";
import { GdiFont, scrollbarWidth, themeColors } from "./Theme";

const pageColors = {
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
};

const buttonColors = {
    onPrimary: themeColors.onPrimary,
    primary: themeColors.primary,
    secondary: themeColors.secondary,
    onSecondary: themeColors.onSecondary,
};


const iconFont = GdiFont(MaterialFont, scale(18));
const itemFont = GdiFont("normal, 14");
const semiItemFont = GdiFont("semibold, 14");
const smallItemFont = GdiFont("normal, 13");
const descriptionFont = GdiFont("normal, 14");
let subtitleFont = GdiFont("normal, 32");
const titleFont = GdiFont("bold, 32");

let titleLineHeight = titleFont.Height * 1.1;
let descriptionLineHeight = descriptionFont.Height * 1.1;
let subtitleLineHeight = subtitleFont.Height * 1.2;

let paddingLR = scale(24);
let paddingTB = scale(24);
let artworkHeight = 0;
let artworkMarginL = scale(24);
let headerHeight = scale(250);
let headbarHeight = scale(40);
let rowHeight = scale(52);
let durationWidth = scale(16) + MeasureString("0:00:00", itemFont).Width;

const pageWidth = {
    thin: scale(600),
    wide: scale(920),
    extraWide: scale(1120),
};

const TF_SORT_ALBUM = fb.TitleFormat("$year(%date%)|%album%|%disc number%|%track number%");
const TF_TRACK_INFO = fb.TitleFormat([
    "%title%", // 0
    "%album artist%", //1
    "[%track artist%]", //2
    "%rating%",  //3
    "%length%", //4
    "%track number%", //5
    "%disc number%", //6
    "%play_count%",//7
    "$date(%added%)",// 8
].join("^^"));
const TF_ALBUM_ARTIST = fb.TitleFormat("%album artist%");
const TF_ALBUM = fb.TitleFormat("%album%");
const TF_DATE = fb.TitleFormat("%date%");
const TF_DISCNUMBER = fb.TitleFormat("[%disc number%]");

class AlbumHeaderView extends Component {
    artwork: AlbumArtwork;
    buttons: Map<string, Button> = new Map;

    //
    albumArtistText: string = "";
    albumText: string = "";
    albumTracksInfo: string = "";
    metadbs: IFbMetadbList;

    constructor() {
        super({});

        this.artwork = new AlbumArtwork();
        this.addChild(this.artwork);

        let shuffleall = new Button({
            style: "contained",
            text: lang("Shuffle All"),
            icon: Material.shuffle,
            foreColor: buttonColors.onPrimary,
            backgroundColor: buttonColors.primary
        });
        shuffleall.on_click = () => {
            // shuffle artist's all tracks;
            SendToQueueListPlay(this.metadbs);
        }
        this.buttons.set("shuffleall", shuffleall);
        this.addChild(shuffleall);

        let sort = new Button({
            style: "text",
            text: lang("Sort"),
            icon: Material.sort,
            foreColor: buttonColors.secondary
        });
        sort.on_click = (x: number, y: number) => { }
        this.buttons.set("sort", sort);
        this.addChild(sort);

        let context = new Button({
            style: "text",
            icon: Material.more_vert,
            text: lang("More"),
            foreColor: buttonColors.secondary
        });
        this.buttons.set("context", context);
        this.addChild(context);
    }

    on_size() {
        this.artwork.setBoundary(this.x + paddingLR, this.y + paddingTB, artworkHeight, artworkHeight);

        // set btns positon;
        let btnX: number, btnY: number;
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
        // background;;
        gr.FillSolidRect(this.x, this.y, this.width, this.height, pageColors.background);

        // text info;
        // ----
        let textX = this.artwork.x + this.artwork.width + artworkMarginL;
        let textWidth = this.x + this.width - textX - paddingLR;
        let _buttonY = this.buttons.get("shuffleall").y;
        let textTotalHeight = titleLineHeight + descriptionLineHeight + subtitleLineHeight;
        let textY = this.y + paddingTB + (-this.artwork.y + _buttonY - textTotalHeight) / 2;
        let sf = StringFormat.LeftTop;

        // title;
        gr.SetTextRenderingHint(TextRenderingHint.AntiAliasGridFit);
        gr.DrawString(this.albumText, titleFont, pageColors.titleText, textX, textY, textWidth, titleLineHeight, sf);
        gr.SetTextRenderingHint(ui.textRender);

        // album artist;
        textY += titleLineHeight;
        gr.DrawString(this.albumArtistText, subtitleFont, pageColors.secondaryText,
            textX, textY, textWidth, subtitleLineHeight, sf);

        // album track info;
        textY += subtitleLineHeight;
        gr.DrawString(this.albumTracksInfo, descriptionFont, pageColors.secondaryText,
            textX, textY, textWidth, descriptionLineHeight, sf);
    }
}

class TrackItem extends Component {
    type: number = 0; // 0: track, 1: disc
    yOffset: number = 0;
    //
    metadb: IFbMetadb;
    rowIndex: number;
    trackTitle: string;
    trackArtist: string;
    albumArtist: string;
    trackNumber: string;
    discNumber: string;
    duration: string;
    playcount: string;
    addTime: string;
    rating: number;

    constructor() {
        super({});
    }

    getTags() {
        if (!this.metadb) {
            console.log("null metadb");
            return;
        }
        if (this.trackTitle) return;
        let infoArray = TF_TRACK_INFO.EvalWithMetadb(this.metadb).split("^^").map(s => s.trim());
        this.trackTitle = infoArray[0];
        this.trackArtist = infoArray[2];
        this.albumArtist = infoArray[1];
        this.duration = infoArray[4];
        this.trackNumber = infoArray[5];
        this.discNumber = infoArray[6];
        this.playcount = infoArray[7];
        this.rating = +infoArray[3];
        this.addTime = infoArray[8];
    }
}

class ColumnItem extends Component {
    constructor() {
        super({})
        this.visible = false;
    }
}

export class AlbumPageView extends ScrollView {
    items: TrackItem[] = [];
    private itemsTotalHeight: number = 0;
    visibleItems: TrackItem[] = [];
    metadbs: IFbMetadbList;
    columns: Map<string, ColumnItem> = new Map();

    header: AlbumHeaderView;
    scrollbar: Scrollbar;

    constructor() {
        super({});

        this.scrollbar = new Scrollbar({
            cursorColor: pageColors.scrollbarCursor,
            backgroundColor: themeColors.scrollbarBackground,
        });
        this.scrollbar.z = 100;
        this.addChild(this.scrollbar);

        this.header = new AlbumHeaderView();
        this.addChild(this.header);

        this.initColumns();
    }

    setAlbum(albumName: string) {
        let libMetadbs = fb.GetLibraryItems();
        let metadbs: IFbMetadbList;
        let metadb: IFbMetadb;
        try {
            metadbs = fb.GetQueryItems(libMetadbs, "%album% IS " + albumName);
            if (metadbs && metadbs.Count > 1) {
                metadbs.OrderByFormat(TF_SORT_ALBUM, 1);
            }
        } catch (e) { }

        this.metadbs = metadbs;
        metadb = metadbs[0];
        this.setList();

        //  change header;
        this.header.metadbs = metadbs;
        this.header.albumText = albumName;
        this.header.albumTracksInfo = lang("Album")
            + spaceStartEnd("\u2022") + formatTrackCount(metadbs.Count)
            + spaceStartEnd("\u2022") + formatPlaylistDuration(this.metadbs.CalcTotalDuration());
        this.header.albumArtistText = TF_ALBUM_ARTIST.EvalWithMetadb(metadb);
        let year = getYear(TF_DATE.EvalWithMetadb(metadb));
        if (year) {
            this.header.albumArtistText += " \u2022 " + year;
        }
        // update header album art;
        this.header.artwork.image = null;
        this.header.artwork.getArtwork(metadb);

        this.repaint();
    }

    setList() {
        this.items = [];
        this.visibleItems = [];
        this.totalHeight = 0;
        this.scroll = 0;
        if (!this.metadbs) {
            return;
        }
        let itemYOffset = 0;
        let itemCount = this.metadbs.Count;
        let compare = "##@!"

        this.metadbs.OrderByFormat(TF_SORT_ALBUM, 1);

        for (let i = 0; i < itemCount; i++) {
            let discnumber = TF_DISCNUMBER.EvalWithMetadb(this.metadbs[i]);
            if (discnumber && discnumber !== compare) {
                let discitem = new TrackItem();
                discitem.type = 1;
                discitem.rowIndex = i;
                discitem.yOffset = itemYOffset;
                discitem.height = rowHeight;
                discitem.metadb = this.metadbs[i];
                this.items.push(discitem);
                itemYOffset += discitem.height;
                compare = discnumber;
            }
            let rowitem = new TrackItem();
            rowitem.rowIndex = i;
            rowitem.metadb = this.metadbs[i];
            rowitem.yOffset = itemYOffset;
            rowitem.height = rowHeight;
            //
            this.items.push(rowitem);
            itemYOffset += rowHeight;
        }

        this.itemsTotalHeight = rowHeight * (this.items.length + 1);
        this.totalHeight = this.itemsTotalHeight + headerHeight;
        this.scroll = this.checkscroll(this.scroll);
    }


    private initColumns() {
        let columns = ["tracknumber", "title", "trackartist", "playcount", "addedtime", "liked", "duration"];
        columns.forEach(i => this.columns.set(i, new ColumnItem()));
    }

    setColumns() {
        let columns = this.columns;
        let tracknumber = columns.get("tracknumber");
        let title = columns.get("title");
        let trackartist = columns.get("trackartist");
        let playcount = columns.get("playcount");
        let addedtime = columns.get("addedtime");
        let liked = columns.get("liked");
        let duration = columns.get("duration");

        tracknumber.visible = true;
        tracknumber.width = scale(40);
        duration.visible = true;
        duration.width = durationWidth;
        liked.visible = true;
        liked.width = scale(36);

        let whitespace = this.width - 2 * paddingLR;
        let reservedwidth = scale(16);
        whitespace -= reservedwidth;
        whitespace -= (tracknumber.width + duration.width + liked.width);

        let titleWidth = (whitespace * .7) >> 0;
        let otherWidth = (whitespace - titleWidth);

        tracknumber.x = this.x + paddingLR;
        liked.x = tracknumber.x + tracknumber.width;

        title.x = liked.x + liked.width;
        title.width = titleWidth;

        playcount.x = title.x + title.width;
        playcount.width = otherWidth;

        duration.x = playcount.x + playcount.width;
    }

    on_init() {
        //
        if (!this.metadbs) {
            return;
        }
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

        this.setColumns();
        this.scrollbar.setBoundary(this.x + this.width - scrollbarWidth, this.y, scrollbarWidth, this.height);
        this.header.setBoundary(this.x, this.y - this.scroll, this.width, headerHeight);
    }

    on_paint(gr: IGdiGraphics) {
        // update header position;
        this.header.setPosition(null, this.y - this.scroll);

        // background;
        gr.FillSolidRect(this.x, this.y, this.width, this.height, pageColors.background);

        // 
        this.visibleItems.length = 0;

        // draw items;
        let items = this.items;
        let rowX = this.x + paddingLR;
        let rowWidth = this.width - 2 * paddingLR;
        let listOffsetToTop = headerHeight + headbarHeight;
        // let rowY: number;
        // let rowHeight = this.rowHeight;

        let tracknumber = this.columns.get("tracknumber");
        let liked = this.columns.get("liked");
        let title = this.columns.get("title");
        let playcount = this.columns.get("playcount");
        let duration = this.columns.get("duration");

        let textColor = pageColors.text;
        let secondaryText = pageColors.secondaryText;

        // draw headbar;
        let headbarY = this.y + this.header.height - this.scroll;
        let lineY = headbarY + headbarHeight - 1;
        gr.DrawLine(rowX, lineY, rowX + rowWidth, lineY, 1, pageColors.splitLine);

        // track number;
        gr.DrawString("#", semiItemFont, secondaryText,
            tracknumber.x, headbarY, tracknumber.width, headbarHeight, StringFormat.Center);

        // title/artist;
        gr.DrawString(lang("TITLE") + "/" + lang("ARTIST"), semiItemFont, secondaryText,
            title.x, headbarY, title.width, headbarHeight, StringFormat.LeftCenter);

        // playcount;
        gr.DrawString(lang("PLAYS"), semiItemFont, secondaryText,
            playcount.x, headbarY, playcount.width, headbarHeight, StringFormat.LeftCenter);

        // duration;
        gr.DrawString(Material.time, iconFont, secondaryText,
            duration.x, headbarY, duration.width - scale(8), headbarHeight, StringFormat.RightCenter);


        for (let i = 0, len = items.length; i < len; i++) {
            let row = items[i];
            row.x = rowX;
            row.width = rowWidth;
            row.y = this.y + row.yOffset - this.scroll + listOffsetToTop;

            // row items visible;
            if (row.y + rowHeight >= this.y && row.y < this.y + this.height) {
                this.visibleItems.push(row);
                row.getTags();

                // selcted row;

                // focused row;

                // split line;
                let lineY = row.y + row.height - 1;
                gr.DrawLine(row.x, lineY, row.x + row.width, lineY, 1, pageColors.splitLine);

                if (row.type === 1) {
                    // disc icon;
                    gr.DrawString(Material.disc, iconFont, secondaryText,
                        tracknumber.x, row.y, tracknumber.width, row.height, StringFormat.Center);

                    // disc number
                    let discText = spaceEnd(lang("Disc")) + row.discNumber;
                    let discTextX = tracknumber.x + tracknumber.width;
                    gr.DrawString(discText, semiItemFont, secondaryText,
                        discTextX, row.y, this.width, row.height, StringFormat.LeftCenter);

                } else {
                    // tracknumber;
                    gr.DrawString(row.trackNumber, itemFont, secondaryText,
                        tracknumber.x, row.y, tracknumber.width, row.height, StringFormat.Center);

                    // liked;
                    let likedIcon = row.rating === 5 ? Material.heart : Material.heart_empty;
                    let iconColor = row.rating === 5 ? pageColors.moodRed : secondaryText;
                    gr.DrawString(likedIcon, iconFont, iconColor,
                        liked.x, row.y, liked.width, row.height, StringFormat.Center);

                    // title
                    let titleRowY = row.y + row.height / 2 - itemFont.Height;
                    gr.DrawString(row.trackTitle, itemFont, textColor,
                        title.x, titleRowY, title.width - scale(4), row.height, StringFormat.LeftTop);
                    let artist = row.trackArtist || row.albumArtist;
                    gr.DrawString(artist, smallItemFont, secondaryText,
                        title.x, row.y + row.height / 2, title.width - scale(8), row.height, StringFormat.LeftTop);

                    // playcount;
                    gr.DrawString(row.playcount, itemFont, secondaryText,
                        playcount.x, row.y, playcount.width - scale(4), row.height, StringFormat.LeftCenter);

                    // duration;
                    gr.DrawString(row.duration, itemFont, secondaryText,
                        duration.x, row.y, duration.width - scale(8), row.height, StringFormat(2, 1));
                }
            }
        }
    }

}

function formatTrackCount(count: number) {
    return count + spaceStart((count > 1 ? lang("tracks") : lang("track")));
}
