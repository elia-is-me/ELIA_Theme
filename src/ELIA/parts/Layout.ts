import { scale, ThrottledRepaint } from "../common/common";
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
import { lang } from "./Lang";


const CONTROL_BAR_HEIGHT = scale(76);
const TOPBAR_HEIGHT = scale(48);
const PLMAN_MIN_WIDTH = scale(256);
const MIN_TWO_COLUMN_WIDTH = scale(850);

export const layout = {
	plmanMinWidth: PLMAN_MIN_WIDTH
};

const enum ViewStates {
	Default,
	Search,
	Settings,
}

export class Layout extends Component {
	className = "Layout";
	topbar: TopBar;
	playbackControlBar: PlaybackControlView;
	playlistManager: PlaylistManagerView;
	playlistView: PlaylistView;
	searchResult: SearchResultView;
	settingsView?: SettingsView;
	inputPopupPanel?: InputPopupPanel;
	alertDialog?: AlertDialog;

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

		// init view;
		this.topbar.visible = true;
		this.playbackControlBar.visible = true;
		this.playlistManager.visible = true;
		this.setPartsVisibility(this.viewState);
	}

	on_size() {

		if (this.width >= MIN_TWO_COLUMN_WIDTH) {
			this.playlistManager.visible = !this.hidePlman;
		} else {
			this.playlistManager.visible = false;
		}

		this.updatePartsLayout();
	}

	setPartsVisibility(viewState: ViewStates) {
		if (viewState === ViewStates.Default) {
			this.playlistView.visible = true;
			this.searchResult.visible = false;
			this.settingsView.visible = false;
		} else if (viewState === ViewStates.Search) {
			this.playlistView.visible = false;
			this.searchResult.visible = true;
			this.settingsView.visible = false;
		} else if (viewState === ViewStates.Settings) {
			this.playlistView.visible = false;
			this.searchResult.visible = false;
			this.settingsView.visible = true;
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
		const { searchResult } = this;
		const listY = this.topbar.y + this.topbar.height;
		const listHeight = this.height - this.topbar.height - this.playbackControlBar.height;

		// Playlist Manager;
		playlistManager.visible && playlistManager.setBoundary(x, listY, PLMAN_MIN_WIDTH, listHeight);

		// Get visible main view;
		let mainView = [playlistView, searchResult, settingsView].find(p => p.visible);
		let mainViewX = (playlistManager.visible ? playlistManager.x + playlistManager.width : x);
		if (this.width < MIN_TWO_COLUMN_WIDTH) {
			mainViewX = x;
		}
		let mainViewWidth = x + width - mainViewX;

		mainView.setBoundary(mainViewX, listY, mainViewWidth, listHeight);

		if (this.inputPopupPanel && this.inputPopupPanel.visible) {
			this.inputPopupPanel.setPosition(
				this.x + (this.width - this.inputPopupPanel.width) / 2,
				this.y + (this.height - this.inputPopupPanel.height) / 2
			);
		}

		if (this.alertDialog && this.alertDialog.visible) {
			this.alertDialog.setPosition(
				this.x + (this.width - this.alertDialog.width) / 2,
				this.y + (this.height - this.alertDialog.height) / 2
			);
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

	onNotifyData(message: string, data?: any) {
		switch (message) {
			case "Toggle.PlaylistManager":
				this.togglePlman();
				break;
			case "Popup.InputPopupPanel":
				let options = data as IInputPopupOptions;
				if (options == null) break;
				this.inputPopupPanel = new InputPopupPanel(options);
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
				// this.on_size();
				ui.updateParts();
				this.repaint();
				break;
		}
	}
}

/**
 * Popup an input panel for users to create a playlist, and the active_playlist
 * will be changed to the newly created one; 
 * Click 'Cancel' to cancel action;
 */
export function CreatePlaylistPopup() {
	let options = {
		title: lang("Create playlist"),
		onSuccess(playlistName: string) {
			let playlistIndex = plman.CreatePlaylist(plman.PlaylistCount, playlistName);
			if (isValidPlaylist(playlistIndex)) {
				plman.ActivePlaylist = playlistIndex;
			}
		}
	};
	notifyOthers("Popup.InputPopupPanel", options);
}

/**
 * Rename a playlist with a popup panel;
 */
export function RenamePlaylist(playlistIndex: number) {
	let options = {
		title: lang("Rename playlist"),
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
		title: lang("Delete playlist") + "?",
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
