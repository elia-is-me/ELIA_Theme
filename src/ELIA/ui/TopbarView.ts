import { scale, RGB, StringFormat, TextRenderingHint, setAlpha, MenuFlag } from "../common/common";
import { Icon2 } from "../common/IconButton";
import { Component } from "../common/BasePart";
import { mainColors } from "./Theme";
import { SerializableIcon } from "../common/IconType";
import { SearchBox } from "./SearchBox";
import { notifyOthers, ui } from "../common/UserInterface";
import { Material, MaterialFont } from "../common/iconCode";

const iconSize = scale(20);
const textRenderingHint = ui.textRender;

const menuIcon = new SerializableIcon({
	code: Material.menu,
	name: MaterialFont,
	size: iconSize,
});

const settingsIcon = new SerializableIcon({
	code: Material.gear,
	name: MaterialFont,
	size: iconSize,
});

const appsIcon = new SerializableIcon({
	code: Material.apps,
	name: MaterialFont,
	size: iconSize,
});

const topbarColors = {
	backgroundColor: RGB(37, 37, 37),
	foreColor: mainColors.text,
};


export const Topbar_Properties = {
	height: scale(56),
};

export class TopBar extends Component {
	foreColor: number;
	backgroundColor: number;
	private _icoWidth: number = scale(40);
	private _logoFont = gdi.Font("Impact", scale(18));
	private _logoText = "foobar2000";

	mainIco: Icon2;
	settingsIco: Icon2;
	switchIco: Icon2;
	searchBox: SearchBox;

	constructor() {
		super({});

		this.foreColor = topbarColors.foreColor;
		this.backgroundColor = topbarColors.backgroundColor;

		this.mainIco = new Icon2({
			fontIcon: menuIcon,
			normalColor: this.foreColor,
			hoverColor: setAlpha(this.foreColor, 200),
			downColor: setAlpha(this.foreColor, 128),
		});

		this.mainIco.on_click = () => {
			notifyOthers("Toggle.PlaylistManager");
		};

		this.settingsIco = new Icon2({
			fontIcon: settingsIcon,
			normalColor: this.foreColor,
			hoverColor: setAlpha(this.foreColor, 200),
			downColor: setAlpha(this.foreColor, 128),
		});
		this.settingsIco.disable();

		this.switchIco = new Icon2({
			fontIcon: appsIcon,
			normalColor: this.foreColor,
			hoverColor: setAlpha(this.foreColor, 200),
			downColor: setAlpha(this.foreColor, 128),
		});
		this.switchIco.disable();

		this.searchBox = new SearchBox();

		[this.mainIco, this.switchIco, this.searchBox, this.settingsIco].forEach((child) =>
			this.addChild(child)
		);
	}

	on_init() { }

	on_size() {
		let icoOffsetTop = ((this.height - this._icoWidth) / 2) | 0;
		let padLeft = scale(16);
		let { _icoWidth } = this;

		this.mainIco.setBoundary(this.x + padLeft, this.y + icoOffsetTop, _icoWidth, _icoWidth);
		this.settingsIco.setBoundary(
			this.x + this.width - padLeft - _icoWidth,
			this.y + icoOffsetTop,
			_icoWidth,
			_icoWidth
		);
		this.switchIco.setBoundary(
			this.settingsIco.x - _icoWidth - scale(4),
			this.y + icoOffsetTop,
			_icoWidth,
			_icoWidth
		);

		this.searchBox.setBoundary(
			this.x + scale(272),
			this.y + scale(8),
			scale(400),
			this.height - scale(16)
		);
	}

	on_paint(gr: IGdiGraphics) {
		gr.FillSolidRect(this.x, this.y, this.width, this.height, this.backgroundColor);

		const { _logoFont, _logoText, foreColor } = this;
		const logoX = this.mainIco.x + this.mainIco.width + scale(16);

		gr.SetTextRenderingHint(TextRenderingHint.AntiAlias);
		gr.DrawString( _logoText, _logoFont, foreColor, logoX, this.y, 1000, this.height, StringFormat.LeftCenter);
		gr.SetTextRenderingHint(textRenderingHint);
	}

	on_mouse_rbtn_up (x: number, y: number) {
		showMainMenu(x, y);
	}
}

/**
 * reference: "MainMenuManager All-In-One.js"
 */
function showMainMenu(x: number, y: number) {
	// Create menu;
	const objMenu = window.CreatePopupMenu();
	const fileMenu = window.CreatePopupMenu()
	const editMenu = window.CreatePopupMenu();
	const viewMenu = window.CreatePopupMenu();
	const playbackMenu = window.CreatePopupMenu();
	const libraryMenu = window.CreatePopupMenu();
	const helpMenu = window.CreatePopupMenu();

	fileMenu.AppendTo(objMenu, MenuFlag.STRING, "File");
	editMenu.AppendTo(objMenu, MenuFlag.STRING, "Edit");
	viewMenu.AppendTo(objMenu, MenuFlag.STRING, "View");
	playbackMenu.AppendTo(objMenu, MenuFlag.STRING, "Playback");
	libraryMenu.AppendTo(objMenu, MenuFlag.STRING, "Library");
	helpMenu.AppendTo(objMenu, MenuFlag.STRING, "Help");

	// Menu managers;
	const fileMan = fb.CreateMainMenuManager();
	const editMan = fb.CreateMainMenuManager();
	const viewMan = fb.CreateMainMenuManager();
	const playbackMan = fb.CreateMainMenuManager();
	const libraryMan = fb.CreateMainMenuManager();
	const helpMan = fb.CreateMainMenuManager();

	fileMan.Init("file");
	fileMan.BuildMenu(fileMenu, 1, 200);
	editMan.Init("edit");
	editMan.BuildMenu(editMenu, 201, 200);
	viewMan.Init("view");
	viewMan.BuildMenu(viewMenu, 401, 200);
	playbackMan.Init("playback");
	playbackMan.BuildMenu(playbackMenu, 601, 300);
	libraryMan.Init("library");
	libraryMan.BuildMenu(libraryMenu, 901, 300);
	helpMan.Init("help");
	helpMan.BuildMenu(helpMenu, 1201, 100);

	const ret = objMenu.TrackPopupMenu(x, y);

	switch (true) {
		case ret >= 1 && ret < 201:
			fileMan.ExecuteByID(ret - 1);
			break;
		case ret >= 201 && ret < 401:
			editMan.ExecuteByID(ret - 201);
			break;
		case ret >= 401 && ret < 601:
			viewMan.ExecuteByID(ret - 401);
			break;
		case ret >= 601 && ret < 901:
			playbackMan.ExecuteByID(ret - 601);
			break;
		case ret >= 901 && ret < 1201:
			libraryMan.ExecuteByID(ret - 901);
			break;
		case ret >= 1201 && ret < 1301:
			helpMan.ExecuteByID(ret - 1201);
			break;
	}

}
