// -------------------------
// Playlist Manager
// -------------------------

import { scale, blendColors, RGB, StringFormat, ThrottledRepaint, RGBA, rgba2hsla } from "../common/common";
import { Scrollbar } from "../common/Scrollbar";
import { ScrollView } from "../common/ScrollView";
import { Component } from "../common/BasePart";
import { Material, MaterialFont } from "../common/iconCode";
import { scrollbarWidth, IThemeColors, mainColors, sidebarColors, scrollbarColor, globalFontName } from "./Theme";
import { Icon, Button, IButtonColors } from "../common/IconButton";
import { SerializableIcon } from "../common/IconType";


type IconSets = "volume" | "gear" | "queue_music";

interface IPlaylistManagerProps {
    colors: IPlaylistManagerColors;
    itemFont: IGdiFont;
    rowHeight: number;
    icons: { [keys in IconSets]: SerializableIcon };
}

const icons: { [keys in IconSets]: SerializableIcon } = {
    volume: new SerializableIcon({ name: MaterialFont, code: Material.volume, size: scale(20), width: scale(40), height: scale(40) }),
    gear: new SerializableIcon({ name: MaterialFont, code: Material.gear, size: scale(20), width: scale(40), height: scale(40) }),
    queue_music: new SerializableIcon({ name: MaterialFont, code: Material.queue_music, size: scale(20), width: scale(40), height: scale(40) }),
}

interface IPlaylistManagerColors extends IThemeColors {
    textActive: number;
    background_hover: number;
}

const PLM_Colors: IPlaylistManagerColors = {
    text: blendColors(mainColors.text, mainColors.background, 0.3),
    textActive: mainColors.text,
    background: sidebarColors.background,
    highlight: mainColors.highlight,
    background_sel: RGB(20, 20, 20),
    background_hover: RGB(10, 10, 10)
}

export const PLM_Properties = {
    minWidth: scale(256),
    rowHeight: scale(40),
    itemFont: gdi.Font(globalFontName, scale(14)),
    headerHeight: scale(80),
    headerFont: gdi.Font("Segoe UI Semibold", scale(12)),
    icons: icons,
    colors: PLM_Colors
}

class PLM_Header extends Component {
    label: string = "PLAYLISTS";
    colors: IPlaylistManagerColors;
    addPlaylistBtn: Button;

    constructor(attrs: {
        colors: IPlaylistManagerColors
    }) {
        super({});

        this.colors = attrs.colors;
        this.setAddPlaylistBtn();
    }

    private setAddPlaylistBtn() {
        let addIcon = new SerializableIcon({
            name: MaterialFont,
            code: Material.circle_add,
            size: scale(20),
            width: scale(40),
            height: scale(40)
        });
        let font = gdi.Font(globalFontName, scale(14));
        let colors: IButtonColors = {
            textColor: PLM_Properties.colors.text,
            hoverColor: PLM_Properties.colors.textActive,
            downColor: PLM_Properties.colors.textActive
        }

        this.addPlaylistBtn = new Button({
            icon: addIcon,
            text: "ADD PLAYLIST",
            font: font,
            colors: colors,
            paddings: { left: scale(16), right: scale(8) },
            onClick: null
        });

        this.addChild(this.addPlaylistBtn);
    }

    on_size() {
        this.addPlaylistBtn.setSize(this.x, this.y + scale(20), this.width, scale(40));
    }

    on_paint(gr: IGdiGraphics) {

        const { colors } = this;

        // draw background;
        gr.FillSolidRect(this.x, this.y, this.width, this.height, colors.background);

        // split line;
        let lineY = this.y + scale(40 + 10 + 20);
        let lineX1 = this.x + scale(28);
        let lineX2 = this.x + this.width - scale(16);

        gr.DrawLine(lineX1, lineY, lineX2, lineY, scale(1), RGB(100, 100, 100));

    }
}

class PLM_Item {
    metadb: IFbMetadb; // First track in playlist;
    index: number;
    x: number = 0;
    y: number = 0;
    width: number = 0;
    height: number = 0;
    yOffset: number = 0;
    //
    listName: string = "";
    isSelect: boolean = false;
    isAuto: boolean = false;

    trace(x: number, y: number) {
        return x > this.x && x <= this.x + this.width
            && y > this.y && y <= this.y + this.height;
    }
}

export class PlaylistManagerView extends ScrollView implements IPlaylistManagerProps {

    items: PLM_Item[] = [];
    scrollbar: Scrollbar;
    header: PLM_Header;

    minWidth: number = scale(256);
    rowHeight: number;
    itemFont: IGdiFont;
    colors: IPlaylistManagerColors;
    icons: { volume: SerializableIcon; gear: SerializableIcon; queue_music: SerializableIcon; };

    constructor(attrs: IPlaylistManagerProps = PLM_Properties) {
        super(attrs);

        this.rowHeight = attrs.rowHeight;
        this.itemFont = attrs.itemFont;
        this.colors = attrs.colors;
        this.icons = attrs.icons;

        this.scrollbar = new Scrollbar({
            cursorColor: scrollbarColor.cursor,
            backgroundColor: 0
        });
        this.header = new PLM_Header({
            colors: this.colors
        });
        this.addChild(this.scrollbar);
        this.addChild(this.header);
    }

    initList() {
        const rowHeight = PLM_Properties.rowHeight;
        const items: PLM_Item[] = [];
        const itemCount = plman.PlaylistCount;
        let itemYOffset = 0;

        for (let playlistIndex = 0; playlistIndex < itemCount; playlistIndex++) {
            let rowItem = new PLM_Item();
            let playlistMetadbs = plman.GetPlaylistItems(playlistIndex);
            items.push(rowItem);
            rowItem.index = playlistIndex;
            rowItem.height = rowHeight;
            rowItem.metadb = (playlistMetadbs.Count === 0 ? null : playlistMetadbs[0]);
            rowItem.listName = plman.GetPlaylistName(playlistIndex)

            // FIXIT: isAuto 不能在foobar启动时被设置，force reload script 之后正常.
            // 单独给一个 onReady，在启动时。
            rowItem.isAuto = plman.IsAutoPlaylist(playlistIndex);
            rowItem.yOffset = itemYOffset;
            itemYOffset += rowHeight;
        }

        this.items = items;
        this.totalHeight = rowHeight * itemCount + PLM_Properties.headerHeight;

        console.log("init playlist manager");
    }

    on_init() {
        this.initList();
    }

    on_size() {
        if (this.items.length > 0) {
            let items_ = this.items;

            for (let playlistId = 0; playlistId < plman.PlaylistCount; playlistId++) {
                let rowItem = items_[playlistId];
                rowItem.x = this.x;
                rowItem.width = this.width;
            }
        }

        this.scrollbar.setSize(
            this.x + this.width - scale(14),
            this.y + PLM_Properties.headerHeight,
            scrollbarWidth,
            this.height - PLM_Properties.headerHeight
        );

        this.header.setSize(
            this.x, this.y, this.width, PLM_Properties.headerHeight
        );
    }

    on_paint(gr: IGdiGraphics) {
        let rowHeight = this.rowHeight;
        let items_ = this.items;
        let colors = this.colors;
        let itemFont = this.itemFont;
        let headerHeight = PLM_Properties.headerHeight;
        let paddingL = scale(16);
        let paddingR = scale(4);
        let icons = this.icons;
        let iconOffsetRowY = ((this.rowHeight - icons.gear.height) / 2) | 0;

        // draw background
        gr.FillSolidRect(this.x, this.y, this.width, this.height, colors.background);

        // draw items;
        for (let itemIndex = 0; itemIndex < items_.length; itemIndex++) {
            let rowItem = items_[itemIndex];
            rowItem.x = this.x;
            rowItem.width = this.width;
            rowItem.y = this.y + headerHeight
                + rowItem.yOffset - this.scroll;

            // items in visible area;
            if (rowItem.y + rowHeight >= this.y + headerHeight
                && rowItem.y < this.y + this.height) {

                let isActive = rowItem.index === plman.ActivePlaylist;
                let textColor = (isActive ? colors.textActive : colors.text);
                let indicateWidth = scale(4);

                if (isActive) {
                    gr.FillSolidRect(rowItem.x, rowItem.y, rowItem.width, rowItem.height,
                        colors.text & 0x1fffffff);
                }

                // draw icon;
                let icon_ = (rowItem.isAuto ? icons.gear : icons.queue_music);
                icon_.draw(gr, textColor, 0x000000, rowItem.x + paddingL, rowItem.y + iconOffsetRowY);

                // draw list name;
                gr.DrawString(rowItem.listName, itemFont, textColor,
                    rowItem.x + paddingL + rowHeight,
                    rowItem.y,
                    rowItem.width - paddingL - paddingR - rowHeight,
                    rowHeight,
                    StringFormat.LeftCenter);
            }
        }

        // draw shadow
        if (this.scroll > 0) {
            let topY = this.y + headerHeight;
            gr.FillSolidRect(this.x, topY, this.width, 1, RGB(16, 16, 16));
            gr.FillSolidRect(this.x, topY + 1, this.width, 1, RGB(19, 19, 19));
            gr.FillSolidRect(this.x, topY + 2, this.width, 1, RGB(22, 22, 22));
            gr.FillSolidRect(this.x, topY + 2, this.width, 1, RGB(24, 24, 24));
        }
    }

    on_mouse_wheel(step: number) {
        this.scrollTo(this.scroll - step * PLM_Properties.rowHeight * 3);
    }

    on_playlists_changed() {
        this.initList();
        ThrottledRepaint();
    }
}
