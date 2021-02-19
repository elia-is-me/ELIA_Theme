import { getOrDefault, scale, tail } from "../common/Common";
import { Component } from "../common/BasePart";
import { notifyOthers, ui } from "../common/UserInterface";
import { TopBar } from "./TopbarView";
import { PlaybackControlView } from "./PlaybackControlView";
import { PlaylistManagerView } from "./PlaylistManagerView";
import { isValidPlaylist, PlaylistView } from "./PlaylistView";
import { InputPopupPanel, IInputPopupOptions } from "./InputPopupPanel";
import { AlertDialog, IAlertDialogOptions } from "./AlertDialog";
import { SearchResultView } from "./SearchResultView";
import { SettingsView } from "./SettingsView";
import { TXT } from "../common/Lang";
import { PlaybackBarMenu } from "./PlaybackBarMenu";
import { scrollbarWidth } from "../common/Theme";
import { ArtistPageView } from "./ArtistPage";
import { AlbumPageView } from "./AlbumPage";
import { BrowserView, SourceTypes } from "./BrowserView";


const CONTROL_BAR_HEIGHT = scale(76);
const TOPBAR_HEIGHT = scale(48);
const PLMAN_MIN_WIDTH = scale(200);
const MIN_TWO_COLUMN_WIDTH = scale(850);

export const layout = {
	plmanMinWidth: PLMAN_MIN_WIDTH
};

const enum ViewStates {
	Default,
	Search,
	Settings,
	Artist,
	Album,
	Browser,
}

export class Layout extends Component {
	className = "Layout";

	//
	topbar: TopBar;
	playbackControlBar: PlaybackControlView;

	// 
	playlistManager: PlaylistManagerView;
	playlistView: PlaylistView;
	artistPage: ArtistPageView;
	albumPage: AlbumPageView;
	searchResult: SearchResultView;
	settingsView?: SettingsView;
	browser: BrowserView;

	//
	inputPopupPanel?: InputPopupPanel;
	alertDialog?: AlertDialog;

	//
	playbackBarMenu: PlaybackBarMenu;

	viewState: ViewStates;

	// No matter window is wide or thin, only changed by clicking on toggle menu
	// btn;
	hidePlman: boolean = window.GetProperty("Layout.Hide Plman", false);

	constructor(options: {
		topbar: TopBar;
		playbackControlBar: PlaybackControlView;
		playlistManager: PlaylistManagerView;
		playlistView: PlaylistView;
		addPlaylistPanel?: InputPopupPanel;
		searchResult: SearchResultView;
		settingsView: SettingsView;
		artistPage: ArtistPageView;
		albumPage: AlbumPageView;
		browser: BrowserView;
	}) {
		super({});

		this.viewState = ViewStates.Default;

		//
		this.topbar = options.topbar;
		this.topbar.z = 100;
		this.addChild(this.topbar);
		this.playbackControlBar = options.playbackControlBar;
		this.playbackControlBar.z = 10;
		this.addChild(this.playbackControlBar);
		this.playlistManager = options.playlistManager;
		this.playlistManager.z = 1;
		this.addChild(this.playlistManager);
		this.playlistView = options.playlistView;
		this.addChild(this.playlistView);
		this.searchResult = options.searchResult;
		this.addChild(this.searchResult);
		this.settingsView = options.settingsView;
		this.addChild(this.settingsView);

		this.artistPage = options.artistPage;
		this.addChild(this.artistPage);

		this.albumPage = options.albumPage;
		this.addChild(this.albumPage);

		this.browser = options.browser;
		this.addChild(this.browser);

		this.playbackBarMenu = new PlaybackBarMenu();
		this.addChild(this.playbackBarMenu);

		// init view;
		this.topbar.visible = true;
		this.playbackControlBar.visible = true;
		this.playlistManager.visible = true;
		this.playbackBarMenu.visible = false;
		this.setPartsVisibility(this.viewState);
	}

	on_init() {
		this.topbar.visible = true;
		this.playbackControlBar.visible = true;
		this.playlistManager.visible = true;
		this.playbackBarMenu.visible = false;
		this.goTo(new RouteItem("playlist", {
			scroll: 0,
			playlistIndex: plman.ActivePlaylist,
		}))
	}

	on_size() {

		if (this.width >= MIN_TWO_COLUMN_WIDTH) {
			this.playlistManager.visible = !this.hidePlman;
			this.playlistManager.type = 0;
		} else {
			this.playlistManager.visible = false;
			this.playlistManager.type = 1;
		}

		if (this.playbackBarMenu.visible) {
			this.playbackBarMenu.visible = false;
		}

		this.updatePartsLayout();
	}

	setPartsVisibility(viewState: ViewStates) {
		let all = [
			this.playlistView,
			this.searchResult,
			this.settingsView,
			this.artistPage,
			this.albumPage,
			this.browser
		];
		all.forEach(p => p.visible = false);

		if (viewState === ViewStates.Default) {
			this.playlistView.visible = true;
		} else if (viewState === ViewStates.Search) {
			this.searchResult.visible = true;
		} else if (viewState === ViewStates.Settings) {
			this.settingsView.visible = true;
		} else if (viewState === ViewStates.Artist) {
			this.artistPage.visible = true;
		} else if (viewState === ViewStates.Album) {
			this.albumPage.visible = true;
		} else if (viewState === ViewStates.Browser) {
			this.browser.visible = true;
		}
	}

	updatePartsLayout() {
		const { x, y, width, height } = this;

		/**
		 * Set pinned parts;
		 */
		this.topbar.setBoundary(x, y, width, TOPBAR_HEIGHT);
		this.playbackControlBar.setBoundary(
			x,
			x + height - CONTROL_BAR_HEIGHT,
			width,
			CONTROL_BAR_HEIGHT
		);

		/**
		 * Set others;
		 */
		const { playlistView, playlistManager, settingsView } = this;
		const { searchResult, playbackControlBar, artistPage, albumPage, browser } = this;
		const listY = this.topbar.y + this.topbar.height;
		const listHeight = this.height - this.topbar.height - this.playbackControlBar.height;

		// Playlist Manager;
		playlistManager.visible && playlistManager.setBoundary(x, listY, PLMAN_MIN_WIDTH, listHeight);

		// Get visible main view;
		let mainView = [playlistView, searchResult, settingsView, artistPage, albumPage, browser].find(p => p.visible);
		let mainViewX = (playlistManager.visible ? playlistManager.x + playlistManager.width : x);
		if (this.width < MIN_TWO_COLUMN_WIDTH) {
			mainViewX = x;
		}
		let mainViewWidth = x + width - mainViewX;

		mainView.setBoundary(mainViewX, listY, mainViewWidth, listHeight);

		if (this.inputPopupPanel && this.inputPopupPanel.visible) {
			this.inputPopupPanel.setPosition(
				(this.x + (this.width - this.inputPopupPanel.width) / 2) >> 0,
				(this.y + (this.height - this.inputPopupPanel.height) / 2) >> 0,
			);
		}

		if (this.alertDialog && this.alertDialog.visible) {
			this.alertDialog.setPosition(
				(this.x + (this.width - this.alertDialog.width) / 2) >> 0,
				(this.y + (this.height - this.alertDialog.height) / 2) >> 0
			);
		}

		let menu_w = scale(164);
		let menu_x = playbackControlBar.x + playbackControlBar.width - menu_w - scale(4) - scrollbarWidth;
		let menu_y = playbackControlBar.y - this.playbackBarMenu.totalHeight - scale(2);
		let menu_h = this.playbackBarMenu.totalHeight;

		if (this.playbackBarMenu.visible) {
			this.playbackBarMenu.setBoundary(menu_x, menu_y, menu_w, menu_h);
		}
	}

	private togglePlman() {
		// Current state;
		let prevVisibleState = this.playlistManager.visible;

		if (this.width >= MIN_TWO_COLUMN_WIDTH) {
			this.hidePlman = !!prevVisibleState;
			window.SetProperty("Layout.Hide Plman", this.hidePlman);
		}

		this.playlistManager.visible = !prevVisibleState;
		if (this.playlistManager.visible) {
			this.playlistManager.on_init();
		}
		this.updatePartsLayout();
		ui.updateParts();
		this.repaint();
	}

	on_paint(gr: IGdiGraphics) { }

	on_key_down(vkey: number, mask?: number) { }

	on_drag_enter(action: IDropTargetAction, x: number, y: number) {

	}

	on_drag_leave() {
		this.playlistManager.on_drag_leave();
		this.playlistView.on_drag_leave();
	}

	on_drag_over(action: IDropTargetAction, x: number, y: number) {
		let { playlistView, playlistManager } = this;

		if (playlistView.trace(x, y)) {
			playlistManager.on_drag_leave();
			playlistView.on_drag_over(action, x, y);
		} else if (playlistManager.trace(x, y)) {
			playlistView.on_drag_leave();
			playlistManager.on_drag_over(action, x, y);
		} else {
			action.Effect = 0;
			playlistManager.on_drag_leave();
			playlistView.on_drag_leave();
		}
	}

	on_drag_drop(action: IDropTargetAction, x: number, y: number) {
		let { playlistView, playlistManager } = this;
		if (playlistManager.trace(x, y)) {
			playlistManager["on_drag_drop"] && playlistManager.on_drag_drop(action, x, y);
		} else if (playlistView.trace(x, y)) {
			playlistView["on_drag_drop"] && playlistView.on_drag_drop(action, x, y);
		} else {
			action.Effect = 0;
		}
	}

	private st_back: RouteItem[] = [];
	private st_forward: RouteItem[] = [];

	private checkRoute(route: RouteItem) {
		if (!route) return;
		switch (route.title) {
			case "playlist":
				break;
		}
		return route;
	}

	goBack() {
		let route = this.checkRoute(this.st_back.pop());
		if (!route) return;
		this.goTo__(route);
		this.st_forward.push(route);
	}

	goForward() {
		let route = this.checkRoute(this.st_forward.pop());
		if (!route) return;
		this.goTo__(route);
		this.st_back.push(route);
	}

	goTo(route: RouteItem) {
		route = this.checkRoute(route);
		if (!route) return;
		let prevRoute = tail(this.st_back);
		if (!prevRoute || prevRoute.compare !== route.compare) {
			this.goTo__(route);
			this.st_back.push(route);
			notifyOthers("update_navigation", this.st_back.length)
		}
	}


	// 主要视图切换，不保存切换历史. 
	// return route;
	private goTo__(route: RouteItem) {
		if (!route.title) return;
		let viewState: number;
		switch (route.title) {
			case "playlist":
				viewState = ViewStates.Default;
				break;
			case "search":
				viewState = ViewStates.Search;
				break;
			case "album":
				viewState = ViewStates.Album;
				break;
			case "artist":
				viewState = ViewStates.Artist;
				break;
			case "browser":
				viewState = ViewStates.Browser;
				break;
			default:
			// viewState = this.viewState;
		}
		if (this.viewState !== viewState) {
			// current View onHide.
			// 也要考虑播放列表可能只是切换歌列表，
		}
		// change view state with options;
		this.viewState = viewState;
		// get currentView;
		// currentView onShow();
		this.setPartsVisibility(this.viewState);
		this.updatePartsLayout();
		ui.updateParts();
		this.repaint();
	}

	onNotifyData(message: string, data?: any) {
		switch (message) {
			case "Toggle.PlaylistManager":
				this.togglePlman();
				break;
			case "Popup.InputPopupPanel":
				let options = data as IInputPopupOptions;
				if (options == null) break;
				this.inputPopupPanel = new InputPopupPanel(options);
				this.inputPopupPanel.z = 1000;
				this.addChild(this.inputPopupPanel);
				// this.on_size();
				this.updatePartsLayout();
				ui.updateParts();
				ui.setFocusPart(this.inputPopupPanel.inputbox);
				this.inputPopupPanel.inputbox.activeInput();
				this.repaint();
				break;
			case "Hide.InputPopupPanel":
				if (!this.inputPopupPanel) break;
				this.inputPopupPanel.visible = false;
				this.removeChild(this.inputPopupPanel);
				this.inputPopupPanel = null;
				// this.on_size();
				this.updatePartsLayout();
				ui.updateParts();
				this.repaint();
				break;
			case "Show.AlertDialog":
				let alertOptions = data as IAlertDialogOptions;
				if (alertOptions == null) break;
				this.alertDialog = new AlertDialog(alertOptions);
				this.alertDialog.z = 1000;
				this.alertDialog.visible = true;
				this.addChild(this.alertDialog);
				// this.on_size();
				this.updatePartsLayout();
				ui.updateParts();
				this.repaint();
				break;
			case "Hide.AlertDialog":
				if (!this.alertDialog) break;
				this.removeChild(this.alertDialog);
				this.alertDialog = null;
				// this.on_size();
				this.updatePartsLayout();
				ui.updateParts();
				this.repaint();
				break;
			case "Show.SearchResult":
				this.searchResult.updateList((data as any).titleText, (data as any).metadbs);
				this.viewState = ViewStates.Search;
				this.setPartsVisibility(this.viewState);
				// this.on_size();
				this.updatePartsLayout();
				ui.updateParts();
				this.repaint();
				break;
			case "Show.Playlist":
				this.viewState = ViewStates.Default;
				this.setPartsVisibility(this.viewState);
				// this.on_size();
				this.updatePartsLayout();

				ui.updateParts();
				this.repaint();
				break;
			case "Show.Settings":
				this.viewState = ViewStates.Settings;
				this.setPartsVisibility(this.viewState);
				this.updatePartsLayout();
				ui.updateParts();
				this.repaint();
				break;
			case "Show.Playbackbar Menu":
				this.playbackBarMenu.visible = !this.playbackBarMenu.visible;
				this.updatePartsLayout();
				ui.updateParts();
				this.repaint();
				break;
			case "Show.ArtistPage":
				this.viewState = ViewStates.Artist;
				this.artistPage.setArtist(data as string);
				this.setPartsVisibility(this.viewState);
				this.updatePartsLayout();
				ui.updateParts();
				this.repaint();
				break;

			case "Show.AlbumPage":
				this.viewState = ViewStates.Album;
				this.albumPage.setAlbum(data as string);
				this.setPartsVisibility(this.viewState);
				this.updatePartsLayout();
				ui.updateParts();
				this.repaint();
				break;
			case "Show.Browser":
				this.viewState = ViewStates.Browser;
				let browserOptions = (data as any);
				this.setPartsVisibility(this.viewState);
				this.updatePartsLayout();
				ui.updateParts();
				this.repaint()
				break;
		}
	}

}

interface IRouteItem {
	title: string;
	compare: string;
	options: { [key: string]: any }
}

class RouteItem implements IRouteItem {
	title: string;
	compare: string;
	options: { [key: string]: any }
	constructor(title: string, options: { [key: string]: any }) {
		this.title = title;
		this.options = options;
		// gen compare string;
		switch (title) {
			case "playlist":
				let playlistIndex: number = getOrDefault(options, o => o.playlistIndex, -1);
				this.compare = `playlist|playlistIndex=${playlistIndex}`;
				break;
			case "browser":
				let sourceType: number = getOrDefault(options, o => o.sourceType, -1);
				let groupType: number = getOrDefault(options, o => o.groupType, -1);
				let sortType: string = getOrDefault(options, o => o.sortType, "");
				playlistIndex = getOrDefault(options, o => o.playlistIndex, -1);
				this.compare = `album|sourceType=${sourceType}|groupType=${groupType}|sortType=${sortType}`;
				if (sourceType === SourceTypes.CurrentPlaylist) {
					this.compare += `playlistIndex=${playlistIndex}`;
				}
				break;
			case "search":
				let queryString = getOrDefault(options, o => o.queryString, "");
				groupType = getOrDefault(options, o => o.groupType, -1);
				sortType = getOrDefault(options, o => o.sortType, "");
				this.compare = `search|queryString=${queryString}|groupType=${groupType}|sortType=${sortType}`
				break;
			case "album":
				this.compare = `album`;
				break;
			case "artist":
				this.compare = `artist`;
				break;
		}
	}
}

/**
 * Popup an input panel for users to create a playlist, and the active_playlist
 * will be changed to the newly created one; 
 * Click 'Cancel' to cancel action;
 */
export function CreatePlaylistPopup(metadbs?: IFbMetadbList) {
	let playlistCount = plman.PlaylistCount;
	let reName = /New Playlist(\s+\((\d+)\))?$/i;
	let defaultName = "New Playlist";
	let num = 0;
	for (let i = 0; i < playlistCount; i++) {
		if (reName.test(plman.GetPlaylistName(i))) {
			if (num === 0) {
				num = 1;
			}
			let count = +plman.GetPlaylistName(i).match(reName)[2];
			if (Number.isInteger(count) && count > num) {
				num = count;
			}
		};
	}
	if (num > 0) {
		defaultName += ` (${num + 1})`;
	}
	let options = {
		title: TXT("Create playlist"),
		defaultText: defaultName,
		onSuccess(playlistName: string) {
			let playlistIndex = plman.CreatePlaylist(plman.PlaylistCount, playlistName);
			if (metadbs && metadbs.Count > 0) {
				plman.InsertPlaylistItems(playlistIndex, plman.PlaylistItemCount(playlistIndex), metadbs, false);
			}
			plman.ActivePlaylist = playlistIndex;
		}
	};
	notifyOthers("Popup.InputPopupPanel", options);
}

/**
 * Rename a playlist with a popup panel;
 */
export function RenamePlaylist(playlistIndex: number) {
	let options = {
		title: TXT("Rename playlist"),
		defaultText: plman.GetPlaylistName(playlistIndex),
		onSuccess(playlistName: string) {
			plman.RenamePlaylist(playlistIndex, playlistName);
		}
	}
	notifyOthers("Popup.InputPopupPanel", options);
}

/**
 * Delete a playlist and popup an alert to ensure do not delete it just by
 * mistake;
 */
export function DeletePlaylistDialog(playlistIndex: number) {
	if (!isValidPlaylist(playlistIndex)) {
		return;
	}
	let dlgOptions: IAlertDialogOptions = {
		title: TXT("Delete playlist") + "?",
		text: plman.GetPlaylistName(playlistIndex),
		onSuccess() {
			let isActivePlaylist = (playlistIndex === plman.ActivePlaylist);
			plman.RemovePlaylist(playlistIndex);
			if (isActivePlaylist && isValidPlaylist(playlistIndex)) {
				plman.ActivePlaylist = playlistIndex;
			}
		}
	}
	notifyOthers("Show.AlertDialog", dlgOptions);
}


export function ShowPlaybackBarMenu() {
	notifyOthers("Show.Playbackbar Menu")
}

/**
 * Switch to artist page;
 */
export function GoToArtist(artistName: string) {
	notifyOthers("Show.ArtistPage", artistName);
}

/**
 * Switch to album page;
 */
export function GoToAlbum(albumName: string) {
	notifyOthers("Show.AlbumPage", albumName);
}

export function GotoPlaylist(playlistIndex?: number) {
	if (isValidPlaylist(playlistIndex)) {
		plman.ActivePlaylist = playlistIndex;
	}
	notifyOthers("Show.Playlist")
}


export function ShowBrowser(options?: { [key: string]: any }) {
	notifyOthers("Show.Browser", options)
}