/* ---------------------------------------------------
 * SearchBox on TopBar, Search library, playlist, etc.
 * ------------------------------------------------- */

import { Component,  IInjectableCallbacks } from "./BasePart";
import { InputBox } from "./Inputbox";
import { Icon2 } from "./IconButton";
import { scale, setAlpha, RGB } from "./common";
import { SerializableIcon } from "./IconType";
import { Material, MaterialFont } from "./iconCode";
import { mainColors, globalFontName } from "../ui/Theme";

type TIconKeys = "loupe" | "delta" | "cross";
const iconFontSize = scale(20);
const iconHeight = scale(32);

const icons: {
    [keys in TIconKeys]: SerializableIcon
} = {
    loupe: new SerializableIcon({
        code: Material.search,
        name: MaterialFont,
        size: iconFontSize,
        width: iconHeight,
        height: iconHeight
    }),
    delta: new SerializableIcon({
        code: Material.down_arrow,
        name: MaterialFont,
        size: iconFontSize,
        width: iconHeight,
        height: iconHeight
    }),
    cross: new SerializableIcon({
        code: Material.close,
        name: MaterialFont,
        size: iconFontSize,
        width: iconHeight,
        height: iconHeight
    })
}

interface IIconColors {
    normal: number;
    hover?: number;
    down?: number;
}

const iconColor: IIconColors = {
    normal: mainColors.text,
    hover: setAlpha(mainColors.text, 200),
    down: setAlpha(mainColors.text, 128)
}

interface ISearchBoxOptions {
    backgroundColor: number;
    foreColor: number;
    borderColor?: number;
    borderActiveColor?: number;
    backgroundActiveColor?: number;
    iconColors: IIconColors;
}


export class SearchBox extends Component {

    inputbox: InputBox;
    searchBtn: Icon2;
    clearBtn: Icon2;
    menuBtn: Icon2;

    _iconColors: IIconColors;
    backgroundColor: number;
    foreColor: number;
    borderColor: number;
    borderActiveColor: number;
    backgroundActiveColor: number;

    inputState: number = 0;
    icons: { [keys in TIconKeys]: SerializableIcon };
    iconHeight: number;

    constructor(opts: ISearchBoxOptions, callbacks?: IInjectableCallbacks) {

        super(opts);

        this.icons = icons;
        this.iconHeight = iconHeight;
        this._iconColors = iconColor;

        this.searchBtn = new Icon2({
            fontIcon: this.icons.loupe,
            hoverColor: this._iconColors.hover,
            downColor: this._iconColors.down,
            normalColor: this._iconColors.normal
        });
        this.clearBtn = new Icon2({
            fontIcon: this.icons.cross,
            hoverColor: this._iconColors.hover,
            downColor: this._iconColors.down,
            normalColor: this._iconColors.normal
        });
        this.menuBtn = new Icon2({
            fontIcon: this.icons.delta,
            hoverColor: this._iconColors.hover,
            downColor: this._iconColors.down,
            normalColor: this._iconColors.normal
        });

        this.inputbox = new InputBox({
            font: gdi.Font(globalFontName, scale(14)),
            font_italic: gdi.Font(globalFontName, scale(14), 2),
            textcolor: mainColors.secondaryText,
            backcolor: this.backgroundColor,
            backselectioncolor: RGB(180, 180, 180),
            empty_text: "Search",
            func() { }
        });

        [this.searchBtn, this.clearBtn, this.menuBtn, this.inputbox].forEach(btn => this.addChild(btn));

    }

    on_init() { }

    on_size() {

        const { searchBtn, clearBtn, menuBtn, inputbox } = this;
        const { iconHeight } = this;

        let btnY = (this.y + this.height - iconHeight)
        let marginLeft = scale(8);

        searchBtn.setSize(this.x + marginLeft, btnY, iconHeight, iconHeight);
        menuBtn.setSize(this.x + this.width - marginLeft - iconHeight, btnY, iconHeight, iconHeight);
        clearBtn.setSize(menuBtn.x - iconHeight - scale(4), btnY, iconHeight, iconHeight);

        inputbox.setSize(searchBtn.x + searchBtn.width, btnY, clearBtn.x - searchBtn.x - searchBtn.width, iconHeight);

    }

    on_paint(gr: IGdiGraphics) {

        gr.FillSolidRect(this.x, this.y, this.width, this.height, this.backgroundColor)

    }


}