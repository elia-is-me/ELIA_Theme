import { MeasureString, StringFormat, spaceStartEnd, spaceEnd, spaceStart } from "../common/String";
import { AlbumArtId, AlbumArtwork } from "../common/AlbumArt";
import { Component } from "../common/BasePart";
import { clamp, CursorName, foo_playcount, getYear, KMask, MenuFlag, ReadMood, RGB, scale, StopReason, TextRenderingHint, ToggleMood, VKeyCode } from "../common/Common";
import { Material, MaterialFont } from "../common/Icon";
import { Scrollbar } from "../common/ScrollBar";
import { ScrollView } from "../common/ScrollView";
import { notifyOthers, ui } from "../common/UserInterface";
import { Button, IconButton } from "./Buttons";
import { TXT } from "../common/Lang";
import { formatPlaylistDuration, showTrackContextMenu } from "./PlaylistView";
import { SendToQueueListPlay } from "./SearchResultView";
import { GetFont, scrollbarWidth, themeColors } from "../common/Theme";
import { GotoPlaylist } from "./Layout";
import { RatingBar } from "./Rating";

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

let rowHeight = scale(48);
const iconFont = GetFont(MaterialFont, scale(18));
const itemFont = GetFont("normal, 14");
const semiItemFont = GetFont("semibold, 14");
const smallItemFont = GetFont("normal, 13");
const descriptionFont = GetFont("normal, 14");
let subtitleFont = GetFont("normal, 24");
const titleFont = GetFont("bold, 24");
let timeFont = GetFont("Trebuchet MS", itemFont.Size);

let titleLineHeight = titleFont.Height * 1.1;
let descriptionLineHeight = descriptionFont.Height * 1.1;
let subtitleLineHeight = subtitleFont.Height * 1.2;
let moodWidth = MeasureString(Material.heart, iconFont).Width;

let paddingLR = scale(24);
let paddingTB = scale(24);
let artworkHeight = 0;
let artworkMarginL = scale(24);
let headerHeight = scale(250);
let listHeaderHeight = scale(36);
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
    "[%play_count%]",//7
    "$date(%added%)",// 8
].join("^^"));
const TF_ALBUM_ARTIST = fb.TitleFormat("%album artist%");
const TF_ALBUM = fb.TitleFormat("%album%");
const TF_DATE = fb.TitleFormat("%date%");
const TF_DISCNUMBER = fb.TitleFormat("[%disc number%]");

// const foo_playcount = utils.CheckComponent("foo_playcount", true);


class DragDropHelper {
    isActive: boolean = false;
    dropTargetRowIndex: number = -1;
    private _timerId: number = -1;

    reset() {
        this.isActive = false;
        this.dropTargetRowIndex = -1;
        this.clearInterval();
    }

    setInterval(func: () => void, interval: number, context?: Component) {
        if (this._timerId == -1) {
            if (context != null) {
                func.bind(context);
            }
            this._timerId = window.SetInterval(func, interval);
        }
    }

    clearInterval() {
        this._timerId > -1 && window.ClearInterval(this._timerId);
        this._timerId = -1;
    }
}

let dnd = new DragDropHelper();

/**
 * @class
 */
class SelectionHelper {
    isActive: boolean = false;
    pageX1: number = -1;
    pageX2: number = -1;
    pageY1: number = -1;
    pageY2: number = -1;
    private _timerId: number = -1;

    setInterval(func: () => void, interval: number, context?: Component) {
        if (this._timerId == -1) {
            if (context != null) {
                func.bind(context);
            }
            this._timerId = window.SetInterval(func, interval);
        }
    }

    clearInterval() {
        this._timerId > -1 && window.ClearInterval(this._timerId);
        this._timerId = -1;
    }

    reset() {
        this.isActive = false;
        this.clearInterval();
    }
}

let selecting = new SelectionHelper();

class AlbumHeaderView extends Component {
    artwork: AlbumArtwork;
    buttons: Map<string, Button | IconButton> = new Map;

    //
    albumArtistText: string = "";
    albumText: string = "";
    albumTracksInfo: string = "";
    metadbs: IFbMetadbList;

    constructor() {
        super({});

        this.artwork = new AlbumArtwork({ artworkType: AlbumArtId.Front });
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
            SendToQueueListPlay(this.metadbs);
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
        // this.addChild(sort);

        let context = new Button({
            style: "text",
            icon: Material.more_vert,
            text: TXT("More"),
            foreColor: buttonColors.secondary
        });
        this.buttons.set("context", context);
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

    // header;
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
    metadbIndex: number;
    trackTitle: string;
    trackArtist: string;
    albumArtist: string;
    trackNumber: string;
    discNumber: string;
    duration: string;
    playcount: string;
    addTime: string;
    rating: number;
    mood: number;
    ratingbar: RatingBar = new RatingBar();
    moodbtn = new IconButton({
        icon: "",
        fontName: iconFont.Name,
        fontSize: iconFont.Size,
        colors: [0]
    });

    private _isselect: boolean = false;

    get isselect() {
        return this._isselect;
    }

    set isselect(val: boolean) {
        if (this.type === 0) {
            this._isselect = val;
        }
    }

    constructor() {
        super({});
        this.moodbtn.on_init = () => {
            if (this.mood > 0) {
                this.moodbtn.setColors(pageColors.moodRed);
                this.moodbtn.setIcon(Material.heart);
            } else {
                this.moodbtn.setColors(pageColors.secondaryText);
                this.moodbtn.setIcon(Material.heart_empty);
            }
        }
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
        this.mood = ReadMood(this.metadb);

        // init ratingbar;
        this.ratingbar.setMetadb(this.metadb);

        // init mood btn;
        // this.moodbtn.setColors(this.mood > 0 ? pageColors.moodRed : pageColors.secondaryText);
        // this.moodbtn.setIcon(this.mood > 0 ? Material.heart : Material.heart_empty);
        this.moodbtn.on_init();
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

    private playingIndex: number = -1;
    private _selectedIndexes: number[] = [];
    private hoverIndex: number = -1;
    private focusIndex: number = -1;
    private clickedMoodId: number = -1;
    private mulselstartId: number = -1;
    private clickonsel: boolean = false;


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
        this.header.albumTracksInfo = TXT("Album")
            + spaceStartEnd("\u2022") + formatTrackCount(metadbs.Count)
            + spaceStartEnd("\u2022") + formatPlaylistDuration(this.metadbs.CalcTotalDuration());
        this.header.albumArtistText = TF_ALBUM_ARTIST.EvalWithMetadb(metadb);
        let year = getYear(TF_DATE.EvalWithMetadb(metadb));
        if (year) {
            this.header.albumArtistText += " \u2022 " + year;
        }
        this.header.artwork.getArtwork(metadb);
        this.on_playback_new_track();

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
        let metadbCount = this.metadbs.Count;
        let compare = "##@!"
        let itemIndex = 0;

        this.metadbs.OrderByFormat(TF_SORT_ALBUM, 1);

        for (let i = 0; i < metadbCount; i++) {
            let discnumber = TF_DISCNUMBER.EvalWithMetadb(this.metadbs[i]);
            if (discnumber && discnumber !== compare) {
                let discitem = new TrackItem();
                discitem.type = 1;
                discitem.rowIndex = itemIndex;
                discitem.yOffset = itemYOffset;
                discitem.height = rowHeight;
                discitem.metadb = this.metadbs[i];
                discitem.metadbIndex = i;
                this.items.push(discitem);
                itemYOffset += discitem.height;
                itemIndex++;
                compare = discnumber;
            }
            let rowitem = new TrackItem();
            rowitem.rowIndex = itemIndex;
            rowitem.metadb = this.metadbs[i];
            rowitem.metadbIndex = i;
            rowitem.yOffset = itemYOffset;
            rowitem.height = rowHeight;
            //
            this.items.push(rowitem);
            itemYOffset += rowHeight;
            itemIndex++;
        }

        this.itemsTotalHeight = rowHeight * (this.items.length + 1);
        this.totalHeight = this.itemsTotalHeight + headerHeight + listHeaderHeight;
        this.scroll = this.checkscroll(this.scroll);
    }


    initColumns() {
        let columns = ["TrackNumber", "Mood", "Title", "Artist", "Playcount", "Rating", "Duration"];
        let columnsVis = window.GetProperty("Album.Columns.Visible", "1,1,1,1,1,1,1").split(",");
        if (columnsVis.length !== columns.length) {
            columnsVis = columns.map(i => "1");
            window.SetProperty("Album.Columns.Visible", columnsVis.join(","));
        }
        columns.forEach((col, i) => {
            let obj = new ColumnItem();
            obj.visible = columnsVis[i] != "0";
            this.columns.set(col, obj);
        })
    }

    setColumns() {
        let columns = this.columns;
        let tracknumber = columns.get("TrackNumber");
        let title = columns.get("Title");
        let trackartist = columns.get("Artist");
        let playcount = columns.get("Playcount");
        // let addedtime = columns.get("Addtime");
        let liked = columns.get("Mood");
        let duration = columns.get("Duration");
        let rating = columns.get("Rating");


        // tracknumber.visible = true;
        tracknumber.width = scale(40);
        // duration.visible = true;
        duration.width = durationWidth;
        // liked.visible = true;
        liked.width = scale(36);
        // playcount.visible = foo_playcount;
        let playcountVis = playcount.visible && foo_playcount;
        playcount.width = MeasureString("0,000", itemFont).Width + scale(16);
        rating.width = RatingBar.Width + scale(16);

        let whitespace = this.width - 2 * paddingLR;
        let reservedwidth = 0;
        whitespace -= reservedwidth;
        tracknumber.visible && (whitespace -= tracknumber.width);
        liked.visible && (whitespace -= liked.width);
        playcountVis && (whitespace -= playcount.width);
        rating.visible && (whitespace -= rating.width);
        duration.visible && (whitespace -= duration.width);


        // let ratio = 0.7;
        // if (this.width >= pageWidth.wide) {
        //     ratio = 0.7;
        // } else if (this.width <= pageWidth.thin) {
        //     ratio = 0.87;
        // } else {
        //     ratio = 0.7 + 0.13 * easeOutCubic((pageWidth.wide - this.width) / (pageWidth.wide - pageWidth.thin));
        // }
        let titleWidth_ = scale(280);
        let artistWidth_ = scale(250);
        let artistVis = trackartist.visible && whitespace > (titleWidth_ + artistWidth_);
        let widthToAdd = whitespace - titleWidth_;
        let count = 1;
        // playcountVis && (count++);
        // rating.visible && (count++);
        if (artistVis) {
            count++;
            widthToAdd -= artistWidth_;
        }
        // if (artistVis && playcount.visible) {
        //     widthToAdd = Math.floor((whitespace - titleWidth_ - playcountWidth_) / 3);
        // }
        // } else if (artist)
        // if (!playcount.visible) {
        //     ratio = 1;
        // }
        widthToAdd = widthToAdd / count;

        // let titleWidth = (whitespace * ratio) >> 0;
        // let otherWidth = (whitespace - titleWidth);

        tracknumber.x = this.x + paddingLR;
        liked.x = tracknumber.x + (tracknumber.visible ? tracknumber.width : 0);

        title.x = liked.x + (liked.visible ? liked.width : 0);
        title.width = titleWidth_ + widthToAdd;

        trackartist.x = title.x + title.width;
        trackartist.width = (artistVis ? artistWidth_ + widthToAdd : 0);

        playcount.x = trackartist.x + trackartist.width;
        playcount.width = (playcountVis ? playcount.width : 0);

        rating.x = playcount.x + playcount.width;
        rating.width = (rating.visible ? rating.width : 0);

        duration.x = rating.x + rating.width;
    }

    on_init() {
        //
        if (!this.metadbs) {
            return;
        }

        this.on_playback_new_track();

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
        this.itemsTotalHeight = rowHeight * (this.items.length + 1);
        this.totalHeight = this.itemsTotalHeight + headerHeight + listHeaderHeight;

        this.setColumns();
        this.scrollbar.setBoundary(this.x + this.width - scrollbarWidth, this.y, scrollbarWidth, this.height);
        this.header.setBoundary(this.x, this.y - this.scroll, this.width, headerHeight);

        this.scrollTo();
    }

    // track list;
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
        let listOffsetToTop = headerHeight + listHeaderHeight;
        let isfocuspart = ui.isFocusPart(this);

        let tracknumber = this.columns.get("TrackNumber");
        let liked = this.columns.get("Mood");
        let title = this.columns.get("Title");
        let playcount = this.columns.get("Playcount");
        let duration = this.columns.get("Duration");
        let rating = this.columns.get("Rating");
        let artist = this.columns.get("Artist");

        let textColor = pageColors.text;
        let textSelectionColor = pageColors.titleText;
        let secondaryText = pageColors.secondaryText;
        let highlightColor = pageColors.highlight;
        let backgroundSelectionColor = pageColors.backgroundSelection;

        // draw headbar;
        let headbarY = this.y + this.header.height - this.scroll;
        let lineY = headbarY + listHeaderHeight - 1;
        gr.DrawLine(rowX, lineY, rowX + rowWidth, lineY, 1, pageColors.splitLine);

        // track number;
        gr.DrawString("#", semiItemFont, secondaryText,
            tracknumber.x, headbarY, tracknumber.width, listHeaderHeight, StringFormat.Center);

        // title/artist;
        gr.DrawString(TXT("TITLE"), semiItemFont, secondaryText,
            title.x, headbarY, title.width, listHeaderHeight, StringFormat.LeftCenter);

        // artist;
        if (artist.visible && artist.width > 0) {
            gr.DrawString(TXT("ARTIST"), semiItemFont, secondaryText,
                artist.x, headbarY, artist.width, listHeaderHeight, StringFormat.LeftCenter);
        }

        // playcount;
        if (playcount.visible && playcount.width > 0) {
            gr.DrawString(TXT("PLAYS"), semiItemFont, secondaryText,
                playcount.x, headbarY, playcount.width, listHeaderHeight, StringFormat.LeftCenter);
        }

        // rating;
        if (rating.visible) {
            gr.DrawString(TXT("RATING"), semiItemFont, secondaryText,
                rating.x + scale(4), headbarY, rating.width, listHeaderHeight, StringFormat.LeftCenter);
        }

        // duration;
        gr.DrawString(Material.time, iconFont, secondaryText,
            duration.x, headbarY, duration.width - scale(8), listHeaderHeight, StringFormat.RightCenter);


        for (let i = 0, len = items.length; i < len; i++) {
            let row = items[i];
            row.x = rowX;
            row.width = rowWidth;
            row.y = this.y + row.yOffset - this.scroll + listOffsetToTop;

            // row items visible;
            if (row.y + rowHeight >= this.y && row.y < this.y + this.height) {
                this.visibleItems.push(row);
                row.getTags();

                let _textColor: number = textColor;
                let _textSecondaryColor: number = secondaryText;

                // selcted row;
                if (row.isselect) {
                    gr.FillSolidRect(row.x, row.y, row.width, row.height, backgroundSelectionColor);
                    _textColor = textSelectionColor;
                    _textSecondaryColor = textSelectionColor;
                }

                if (isfocuspart && this.focusIndex === i) {
                    gr.DrawRect(row.x, row.y, row.width - 1, row.height - 1, scale(1), RGB(127, 127, 127));
                }

                // split line;
                let lineY = row.y + row.height - 1;
                gr.DrawLine(row.x, lineY, row.x + row.width, lineY, 1, pageColors.splitLine);

                if (row.type === 1) {
                    // disc icon;
                    gr.DrawString(Material.disc, iconFont, secondaryText,
                        tracknumber.x, row.y, tracknumber.width, row.height, StringFormat.Center);

                    // disc number
                    let discText = spaceEnd(TXT("Disc")) + row.discNumber;
                    let discTextX = tracknumber.x + tracknumber.width;
                    gr.DrawString(discText, semiItemFont, secondaryText,
                        discTextX, row.y, this.width, row.height, StringFormat.LeftCenter);

                } else {
                    // tracknumber;
                    if (tracknumber.visible) {
                        if (this.playingIndex === i) {
                            gr.DrawString(fb.IsPaused ? Material.volume_mute : Material.volume, iconFont, highlightColor,
                                tracknumber.x, row.y, tracknumber.width, row.height, StringFormat.Center);
                        } else {
                            gr.DrawString(row.trackNumber, itemFont, _textSecondaryColor,
                                tracknumber.x, row.y, tracknumber.width, row.height, StringFormat.Center);
                        }
                    }

                    // liked;
                    if (liked.visible) {
                        // let moodOn = row.mood > 0;
                        // let likedIcon = moodOn ? Material.heart : Material.heart_empty;
                        // let iconColor = moodOn ? pageColors.moodRed : _textSecondaryColor;
                        // gr.DrawString(likedIcon, iconFont, iconColor,
                        //     liked.x, row.y, liked.width, row.height, StringFormat.Center);
                        row.moodbtn.setBoundary(liked.x, row.y, liked.width, row.height);
                        row.moodbtn.on_paint(gr);
                    }

                    // title
                    if (rowHeight > scale(35) && artist.visible && artist.width == 0) {
                        let titleRowY = row.y + row.height / 2 - itemFont.Height;
                        gr.DrawString(row.trackTitle, itemFont, _textColor,
                            title.x + scale(8), titleRowY, title.width - scale(24), row.height, StringFormat.LeftTop);
                        let artistText = row.trackArtist || row.albumArtist;
                        gr.DrawString(artistText, smallItemFont, _textSecondaryColor,
                            title.x + scale(8), row.y + row.height / 2, title.width - scale(24), row.height, StringFormat.LeftTop);
                    } else {
                        gr.DrawString(row.trackTitle, itemFont, _textColor,
                            title.x + scale(8), row.y, title.width - scale(24), row.height, StringFormat.LeftCenter);
                    }

                    if (artist.visible && artist.width > 0) {
                        gr.DrawString(row.trackArtist || row.albumArtist, itemFont, _textSecondaryColor,
                            artist.x, row.y, artist.width - scale(16), row.height, StringFormat.LeftCenter);
                    }


                    // playcount;
                    if (playcount.visible && playcount.width > 0) {
                        gr.DrawString(row.playcount, itemFont, _textSecondaryColor,
                            playcount.x, row.y, playcount.width - scale(4), row.height, StringFormat.LeftCenter);
                    }

                    // rating;
                    if (rating.visible && rating.width > 0) {
                        row.ratingbar.x = rating.x + scale(4);
                        row.ratingbar.y = row.y + (row.height - row.ratingbar.height) / 2;
                        row.ratingbar.on_paint(gr);
                    }

                    // duration;
                    if (duration.visible) {
                        gr.DrawString(row.duration, timeFont, _textSecondaryColor,
                            duration.x, row.y, duration.width - scale(8), row.height, StringFormat.RightCenter);
                    }
                    //gr.DrawRect(duration.x, row.y, duration.width - scale(8), row.height - 1, 1, 0xffaabbcc);
                }
            }
        }
    }

    private findHoverItem(x: number, y: number) {
        if (!this.trace(x, y)) {
            return;
        }
        return this.visibleItems.find(item => item.trace(x, y));
    }

    private getActiveMoodId(x: number, y: number) {
        let moodcolumn = this.columns.get("Mood");
        if (!moodcolumn || !moodcolumn.visible || moodcolumn.width === 0) {
            return -1;
        }
        let pad = (moodcolumn.width - moodWidth) / 2;
        let posLeft = moodcolumn.x + pad;
        let posRight = moodcolumn.x + pad + moodWidth;
        if (x > posLeft && x <= posRight) {
            let hoveritem = this.findHoverItem(x, y);
            return hoveritem && hoveritem.type == 0 ? hoveritem.rowIndex : -1;
        } else {
            return -1;
        }
    }

    private setselection(from?: number, to?: number) {
        if (from == null) {
            this._selectedIndexes.length = 0;
            this.applysel();
            return;
        }
        else {
            if (to == null) {
                to = from;
            }
            let c = from;
            if (from > to) {
                from = to;
                to = c;
            }
            this._selectedIndexes.length = 0;
            for (let i = from; i <= to; i++) {
                this.items[i] && this._selectedIndexes.push(i);
            }
            this.applysel();
        }
        // console.log("setsel")
    }

    private setfocus(id: number) {
        this.focusIndex = clamp(id, 0, this.items.length - 1);
    }

    private getSelectedMetadbs() {
        let metadbarray = this.items.filter(item => item.isselect).map(item => item.metadb);
        return new FbMetadbHandleList(metadbarray);
    }

    private applysel() {
        this.items.forEach(item => item.isselect = false);
        for (let i = 0, len = this._selectedIndexes.length; i < len; i++) {
            let item = this.items[this._selectedIndexes[i]];
            item && (item.isselect = true);
        }
    }

    private updatesel(x: number, y: number) {
        if (this.items.length === 0) {
            return;
        }
        let topY = Math.max(this.y, this.header.y + this.header.height + listHeaderHeight);
        let bottomY = this.y + this.height - 1;
        selecting.pageX2 = clamp(x, this.x, this.x + this.width - this.scrollbar.width) - this.x;
        selecting.pageY2 = clamp(y, topY, bottomY) - this.y + this.scroll;

        let first = -1;
        let last = -1;
        if (!(
            (selecting.pageX1 < paddingLR && selecting.pageX2 < paddingLR)
            || (selecting.pageX1 > this.width - paddingLR && selecting.pageX2 > this.width - paddingLR)
        )) {
            first = this.traceItemLineIndex(selecting.pageY1);//Math.floor((selecting.pageY1 - offsetTop) / rowHeight);
            last = this.traceItemLineIndex(selecting.pageY2);//Math.floor((selecting.pageY2 - offsetTop) / rowHeight);
        }
        this.setselection(first, last);
        this.repaint();
    }

    private showFocusItem() {
        if (this.focusIndex === -1) {
            return;
        }
        let listtopY = this.header.y + this.header.height + listHeaderHeight;
        if (listtopY < this.y) listtopY = this.y;
        let listbottomY = this.y + this.height;
        let focusItem = this.items[this.focusIndex];
        if (focusItem) {
            let isFocusItemVis = focusItem.y >= listtopY && focusItem.y + focusItem.height < listbottomY;
            if (!isFocusItemVis) {
                let targetscroll = this.header.height + listHeaderHeight + focusItem.yOffset - (this.height - rowHeight) / 2;
                this.scrollTo(targetscroll);
            }
        }
    }

    on_mouse_lbtn_dblclk(x: number, y: number) {
        let hoveritem = this.findHoverItem(x, y);
        let hoverMood = this.getActiveMoodId(x, y);

        if (hoveritem && hoveritem.moodbtn.trace(x, y)) {
            return;
        }

        if (hoveritem && hoveritem.ratingbar.trace(x, y)) {
            this.ratingID = hoveritem.rowIndex;
            return;
        }

        if (hoveritem) {
            let queue = plman.FindOrCreatePlaylist(TXT("Queue"), true);
            let metadbs = this.metadbs;
            plman.ActivePlaylist = queue;
            plman.UndoBackup(queue);
            plman.ClearPlaylist(queue);
            plman.InsertPlaylistItems(queue, 0, metadbs);
            plman.ExecutePlaylistDefaultAction(queue, hoveritem.metadbIndex);
        }
    }

    private ratingID = -1;

    on_mouse_lbtn_down(x: number, y: number) {
        let hoveritem = this.findHoverItem(x, y);
        this.clickedMoodId = this.getActiveMoodId(x, y);
        if (this.clickedMoodId > -1) {
            // this.clickedMoodId = hoveritem.rowIndex;
            return;
        }

        this.ratingID = -1;
        if (hoveritem && hoveritem.ratingbar.trace(x, y)) {
            hoveritem.ratingbar.on_mouse_lbtn_down(x, y);
            // hoveritem.trackTitle = "";
            this.ratingID = hoveritem.rowIndex;
            // this.repaint();
            return;
        }
        // console.log("click not on rating");


        if (hoveritem) {
            this.setfocus(hoveritem.rowIndex);
        } else { }

        if (!hoveritem) {
            if (utils.IsKeyPressed(VKeyCode.Control)) {
                //
            } else if (utils.IsKeyPressed(VKeyCode.Shift)) {
                //
            } else {
                selecting.isActive = true;
                selecting.pageX1 = selecting.pageX2 = x - this.x;
                selecting.pageY1 = selecting.pageY2 = y - this.y + this.scroll;
                this.setselection();
                // console.log("sel 1");
            }
            this.mulselstartId = -1;
        } else if (hoveritem.isselect) {
            if (utils.IsKeyPressed(VKeyCode.Shift)) {
                this.setselection(this.mulselstartId, this.focusIndex);
                // console.log("sel 2");
            } else if (utils.IsKeyPressed(VKeyCode.Control)) {
                hoveritem.isselect = !hoveritem.isselect;
                this._selectedIndexes = this.items
                    .filter(item => item.isselect)
                    .map(item => item.rowIndex);
            } else {
                this.clickonsel = true;
            }
        } else {
            if (!utils.IsKeyPressed(VKeyCode.Shift)) {
                this.mulselstartId = this.focusIndex;
            }
            if (utils.IsKeyPressed(VKeyCode.Shift)) {
                this.setselection(this.mulselstartId, hoveritem.rowIndex);
                // console.log("sel 3");
            } else if (utils.IsKeyPressed(VKeyCode.Control)) {
                hoveritem.isselect = !hoveritem.isselect;
                this._selectedIndexes = this.items.filter(item => item.isselect)
                    .map(item => item.rowIndex);
            } else {
                if (hoveritem.isselect) {
                    this.clickonsel = true;
                } else {
                    this.setselection(hoveritem.rowIndex);
                    // console.log("sel 4");
                }
                selecting.isActive = true;
                selecting.pageX1 = selecting.pageX2 = x - this.x;
                selecting.pageY1 = selecting.pageY2 = y - this.y + this.scroll;
            }
        }
        this.repaint();
    }


    on_mouse_move(x: number, y: number) {
        if (this.clickedMoodId > -1) {
            return;
        }

        if (this.ratingID > -1) {
            return;
        }

        if (selecting.isActive) {
            if (y < this.y + rowHeight) {
                this.scroll -= rowHeight / 3;
            } else if (y > this.y + this.height - rowHeight) {
                this.scroll += rowHeight / 3;
            }
            this.updatesel(x, y);
            // console.log("upate sele");
        } else if (dnd.isActive) {
            window.SetCursor(CursorName.IDC_NO);
        } else {
            if (this.clickonsel) {
                dnd.isActive = true;
            }
        }
    }

    on_metadb_changed() {
        this.items.forEach(item => item.trackTitle = "");
        this.repaint();
    }

    on_mouse_lbtn_up(x: number, y: number) {
        let hoveritem = this.findHoverItem(x, y);

        if (this.clickedMoodId > -1) {
            if (this.getActiveMoodId(x, y) === this.clickedMoodId) {
                ToggleMood(this.items[this.clickedMoodId].metadb);
                // this.items[this.clickedMoodId].trackTitle = undefined;
                // this.repaint();
            }
            return;
        }

        // console.log("ratid: ", this.ratingID)
        if (this.ratingID > -1) {
            this.ratingID = -1;
            return;
        }

        if (dnd.isActive) {
            // 
        } else if (selecting.isActive) {
            // do nothing;
        } else {
            if (hoveritem) {
                if (!utils.IsKeyPressed(VKeyCode.Control) && !utils.IsKeyPressed(VKeyCode.Shift)) {
                    this.setselection(hoveritem.rowIndex);
                    // console.log("sel up");
                }
            }
        }

        selecting.clearInterval();
        selecting.isActive = false;
        selecting.pageX2 = selecting.pageX1 = -1;
        selecting.pageY2 = selecting.pageY1 = -1;

        this.clickonsel = false;

        dnd.clearInterval();
        dnd.isActive = false;
        dnd.dropTargetRowIndex = -1;

        window.SetCursor(CursorName.IDC_ARROW);

        this.repaint();
    }

    on_mouse_rbtn_down(x: number, y: number) {
        let hoveritem = this.findHoverItem(x, y);
        if (hoveritem == null) {
            this.setselection();
        } else {
            if (!hoveritem.isselect) {
                this.setselection(hoveritem.rowIndex);
                this.setfocus(hoveritem.rowIndex);
            }
        }
        this.repaint();
    }

    on_mouse_rbtn_up(x: number, y: number) {
        // try {
        if (x > this.x + paddingLR && x <= this.x + this.width - paddingLR && y > this.header.y + this.header.height && y < this.header.y + this.header.height + listHeaderHeight) {
            showlistheadermenu(x, y, this);

        } else {
            showTrackContextMenu(-5, this.getSelectedMetadbs(), x, y);
        }
        // } catch (e) { }
    }

    on_key_down(vkey: number, mask = KMask.none) {
        if (selecting.isActive || dnd.isActive) {
            return;
        }

        if (this.items.length === 0) {
            return;
        }

        switch (vkey) {
            case VKeyCode.Escape:
                this.setselection();
                this.repaint();
                break;
            case VKeyCode.Return:
                let focusItem = this.items[this.focusIndex];
                if (focusItem) {
                    try {
                        SendToQueueListPlay(this.metadbs, focusItem.metadbIndex);
                    } catch (e) { }
                }

                break;
            case VKeyCode.Home:
                this.setselection(0);
                this.setfocus(0);
                this.scroll = 0;
                this.repaint();
                break;
            case VKeyCode.End:
                // if (this.items.length > 0) {
                this.setselection(this.items.length - 1);
                this.setfocus(this.items.length - 1);
                this.scroll = this.totalHeight;
                // }
                this.repaint();
                break;
            case VKeyCode.PageUp:
                // if (this.items.length > 0) {
                this.scrollTo(this.scroll - this.height);
                // }
                this.repaint();
                break;
            case VKeyCode.PageDown:
                this.scrollTo(this.scroll + this.height);
                this.repaint();
                break;
            case VKeyCode.Up:
                this.setfocus(this.focusIndex - 1);
                this.showFocusItem();
                this.setselection(this.focusIndex);
                this.repaint();
                break;
            case VKeyCode.Down:
                this.setfocus(this.focusIndex + 1);
                this.showFocusItem();
                this.setselection(this.focusIndex);
                this.repaint();
                break;

            case 65: // A;
                if (mask === KMask.ctrl) {
                    this.setselection(0, this.items.length - 1);
                    this.repaint();
                }
                break;
            case 67: // C
                if (mask === KMask.ctrl) {
                    let metadbs = this.getSelectedMetadbs();
                    fb.CopyHandleListToClipboard(metadbs);
                }
                break;
        }
    }

    on_playback_new_track() {
        let metadb = fb.GetNowPlaying();
        if (metadb == null || this.metadbs == null) return;
        this.playingIndex = this.items.findIndex(item => {
            return item.metadb.RawPath === metadb.RawPath && item.type === 0;
        });
        if (this.playingIndex > -1) {
            this.setfocus(this.playingIndex);
            this.setselection(this.playingIndex);
            this.showFocusItem();
        }
        this.repaint();
    }

    on_playback_stop(reason: number) {
        if (reason !== StopReason.StartingAnotherTrack) {
            this.playingIndex = -1;
            this.repaint();
        }
    }

    on_playback_pause() {
        this.repaint();
    }

    on_focus(is_focused: boolean) {
        this.repaint();
    }

    on_change_focus() {
        this.repaint();
    }

    protected traceItemLineIndex(y: number) {
        let offsetToTop = headerHeight + listHeaderHeight;
        let lastItem = this.items[this.items.length - 1];
        let firstItem = this.items[0];
        let resultIndex = this.items.findIndex(item => {
            return y > item.yOffset + offsetToTop && y <= item.yOffset + item.height + offsetToTop;
        });
        if (resultIndex === -1) {
            if (lastItem && y > lastItem.yOffset + lastItem.height + offsetToTop) {
                resultIndex = this.items.length;
            } else if (firstItem && y < firstItem.yOffset + offsetToTop) {
                resultIndex = -1;
            }
        }
        return resultIndex;
    }

}

function formatTrackCount(count: number) {
    return count + spaceStart((count > 1 ? TXT("tracks") : TXT("track")));
}

function easeOutCubic(x: number): number {
    return 1 - Math.pow(1 - x, 3);
}


function showlistheadermenu(x: number, y: number, pl: AlbumPageView) {
    let menu = window.CreatePopupMenu();
    let cols = window.CreatePopupMenu();

    cols.AppendTo(menu, MenuFlag.STRING, TXT("Columns"));
    cols.AppendMenuItem(MenuFlag.STRING, 100, TXT("Track number"));
    cols.AppendMenuItem(MenuFlag.STRING, 101, TXT("Mood"));
    cols.AppendMenuItem(MenuFlag.GRAYED, 102, TXT("Title"));
    cols.AppendMenuItem(MenuFlag.STRING, 103, TXT("Artist"));
    cols.AppendMenuItem(MenuFlag.STRING, 104, TXT("Play count"));
    cols.AppendMenuItem(MenuFlag.STRING, 105, TXT("Rating"));
    cols.AppendMenuItem(MenuFlag.STRING, 106, TXT("Duration"));

    let columnsVis = window.GetProperty("Album.Columns.Visible", "1,1,1,1,1,1,1").split(",");
    let columns = ["TrackNumber", "Mood", "Title", "Artist", "Playcount", "Rating", "Duration"];
    if (columnsVis.length !== columns.length) {
        columnsVis = columns.map(i => "1");
        window.SetProperty("Album.Columns.Visible", columnsVis);
    }

    for (let i = 0; i < columnsVis.length; i++) {
        cols.CheckMenuItem(100 + i, columnsVis[i] != "0");
    }

    const ret = menu.TrackPopupMenu(x, y);
    let col = ret - 100;
    columnsVis[col] = (columnsVis[col] == "0" ? "1" : "0");
    window.SetProperty("Album.Columns.Visible", columnsVis.join(","));
    pl.initColumns();
    pl.on_size();
    pl.repaint();
}