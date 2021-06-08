/* ---------------------------------------------------
 * SearchBox on TopBar, Search library, playlist, etc.
 * ------------------------------------------------- */

import { Component } from "./BasePart";
import { InputBox } from "./Inputbox";
import { IconButton } from "./Buttons";
import { scale, RGB, debugTrace } from "./Common";
import { Material, } from "./Icon";
import { GetFont, themeColors } from "./Theme";
import { notifyOthers } from "./UserInterface";
import { TXT } from "./Lang";
import { MeasureString } from "./String";

export class SearchBox extends Component {
	inputbox: InputBox;
	searchBtn: IconButton;
	clearBtn: IconButton;

	backgroundColor: number = themeColors.topbarBackground//RGB(33, 33, 33);
	foreColor: number = themeColors.text;
	borderColor: number;
	borderActiveColor: number;
	backgroundActiveColor: number = themeColors.topbarBackground//RGB(77, 77, 77);

	private iconSize = scale(20);
	private iconHeight = scale(32);
	_inputboxHeight: number;

	constructor() {
		super({});

		this.grabFocus = false;
		let iconFontSize = this.iconSize;

		this.searchBtn = new IconButton({
			icon: Material.search,
			fontSize: iconFontSize,
			colors: [this.foreColor]
		});

		this.searchBtn.on_click = () => {
			if (this.inputbox.text) {
				this.inputbox.func();
			}
		}

		this.searchBtn.grabFocus = false;

		const handleClear = () => {
			this._clearInput();
			this.repaint();
		};

		this.clearBtn = new IconButton({
			icon: Material.close,
			fontSize: iconFontSize,
			colors: [this.foreColor]
		});
		this.clearBtn.on_click = () => {
			handleClear();
		}
		this.clearBtn.grabFocus = false;

		this.inputbox = new InputBox({
			font: GetFont("normal,14"),
			foreColor: themeColors.text,
			backgroundColor: this.backgroundColor,
			backgroundActiveColor: this.backgroundColor,
			backgroundSelectionColor: RGB(28, 98, 185),
			empty_text: TXT("Library Search"),
			func: () => {
				this.handleSearch();
			},
		});

		this._inputboxHeight = MeasureString("ABCDgl" + TXT("Library Search"), this.inputbox.font).Height + scale(4);

		[this.searchBtn, this.clearBtn, this.inputbox].forEach((btn) =>
			this.addChild(btn)
		);

		this.clearBtn.visible = this.inputbox.text.length > 0;
	}

	handleSearch() {
		try {
			let searchText = this.inputbox.text;
			if (searchText.length == 0) {
				return;
			}
			// debugTrace(searchText);
			let result = fb.GetQueryItems(fb.GetLibraryItems(), searchText);
			// debugTrace(result.Count);
			notifyOthers("Show.SearchResult", {
				titleText: searchText,
				metadbs: result,
				groupType: 1,
				sortType: 1,
			});
		} catch (e) {
			fb.ShowPopupMessage("Fail to GetQueryItems", "Search Error");
		}
	}

	private _clearInput() {
		if (this.inputbox.text.length > 0) {
			this.inputbox.text = "";
			this.inputbox.offset = 0;
		}
	}

	on_show() { }

	on_size() {
		const { searchBtn, clearBtn, inputbox } = this;
		const { iconHeight } = this;
		const searchIconWidth = scale(56);

		let btnY = this.y + this.height - iconHeight;

		searchBtn.setBoundary(this.x, btnY, searchIconWidth, iconHeight);
		clearBtn.setBoundary(
			this.x + this.width - iconHeight,
			btnY,
			iconHeight,
			iconHeight
		);

		let inputboxY = this.y + (((this.height - this._inputboxHeight) / 2) | 0);
		let inputboxWidth = this.width - searchIconWidth - iconHeight;
		inputbox.setBoundary(
			this.x + searchIconWidth,
			inputboxY,
			inputboxWidth,
			this._inputboxHeight
		);

	}

	on_paint(gr: IGdiGraphics) {
		gr.FillSolidRect(this.x, this.y, this.width, this.height, this.backgroundColor);
		gr.DrawRect(this.x, this.y, this.width - scale(1), this.height - scale(1), scale(1), themeColors.titleText & 0x25ffffff);
		if (this.inputbox.edit) {
			gr.DrawRect(this.x, this.y, this.width, this.height - scale(1), scale(1), RGB(28, 98, 185));
		}

		let prevState = this.clearBtn.visible;
		this.clearBtn.visible = (this.inputbox.edit && this.inputbox.text.length > 0);
		if (prevState !== this.clearBtn.visible) {
		}
	}

	repaint() {
		this.parent.repaint();
	}
}
