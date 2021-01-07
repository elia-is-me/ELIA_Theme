// ---------------------
// Playback control bar;
// ---------------------

import { MenuFlag, Repaint, setAlpha, StopReason } from "../common/common";
import { TextLink } from "../common/TextLink";
import { NowplayingArtwork } from "../common/AlbumArt";
import { Slider, SliderThumbImage } from "../common/Slider";
import { Component } from "../common/BasePart";
import { Material, MaterialFont } from "../common/Icon"
import { scale, PlaybackOrder, SmoothingMode, blendColors, MeasureString, StringFormat } from "../common/common";
import { themeColors, fonts } from "./Theme";
import { IInputPopupOptions } from "./InputPopupPanel";
import { notifyOthers } from "../common/UserInterface";
import { isValidPlaylist } from "./PlaylistView";
import { IconButton } from "./Buttons";
import { lang, RunContextCommandWithMetadb } from "./Lang";

function pos2vol(pos: number) {
	return (50 * Math.log(0.99 * pos + 0.01)) / Math.LN10;
}

function vol2pos(v: number) {
	return (Math.pow(10, v / 50) - 0.01) / 0.99;
}

function formatPlaybackTime(sec: number) {
	if (!isFinite(sec)) return '--:--';
	var seconds = sec % 60 >> 0;
	var minutes = (sec / 60) >> 0;
	var pad = function (num: number) {
		if (num < 10) return '0' + num;
		else return '' + num;
	};
	return pad(minutes) + ":" + pad(seconds);
}

interface IThemeColors {
	text: number;
	secondaryText: number;
	background: number;
	highlight: number;
}

const bottomColors: IThemeColors = {
	text: themeColors.text,
	secondaryText: themeColors.secondaryText,
	background: themeColors.playbackBarBackground,
	highlight: themeColors.highlight
}

const CMD_LOVE = 'Playback Statistics/Rating/5';
const CMD_UNLOVE = 'Playback Statistics/Rating/<not set>';
const TF_RATING = fb.TitleFormat('%rating%');


type ButtonKeys = "playOrPause" | "next" | "prev" | "love" | "repeat" | "shuffle" | "volume";
type IButtons = { [K in ButtonKeys]: IconButton };

const createBottomButtons = () => {
	let buttons: IButtons = {
		playOrPause: null,
		next: null,
		prev: null,
		love: null,
		repeat: null,
		shuffle: null,
		volume: null
	};

	const createIconButton = (code: string, fontSize: number, color: number): IconButton => {
		return new IconButton({
			icon: code,
			fontSize: fontSize,
			fontName: MaterialFont,
			colors: [color]
		});
	}

	const defaultColor = themeColors.text;
	const highlightColor = themeColors.highlight;
	const iconSize = scale(22);

	// button 'Play or Pause';
	buttons.playOrPause = createIconButton(Material.pause, scale(32), defaultColor);
	Object.assign(buttons.playOrPause, {
		on_click: function () {
			fb.PlayOrPause();
			// this.on_init();
			// this.repaint();
		},
		on_init: function () {
			(this as IconButton).setIcon(fb.IsPlaying && !fb.IsPaused ? Material.pause : Material.play);
		},
		on_playback_new_track: function () {
			this.on_init();
			Repaint();
		},
		on_playback_stop: function () {
			this.on_init();
			Repaint();
		},
		on_playback_pause: function () {
			this.on_init();
			Repaint();
		}
	});

	// button 'Next';
	buttons.next = createIconButton(Material.skip_next, iconSize, defaultColor);
	buttons.next.on_click = function () {
		fb.Next();
	};

	// button 'Prev';
	buttons.prev = createIconButton(Material.skip_prev, iconSize, defaultColor);
	buttons.prev.on_click = function () {
		fb.Prev();
	};

	// button 'Love', enabled when 'foo_playcount' is installed (currently);
	buttons.love = createIconButton(Material.heart, iconSize, themeColors.mood);
	Object.assign(buttons.love, {
		on_init: function () {
			let metadb = fb.GetNowPlaying();
			if (!metadb || !fb.IsMetadbInMediaLibrary(metadb)) {
				buttons.love.setIcon(Material.heart_empty);
				buttons.love.setColors(defaultColor);
			} else {
				let loved = +TF_RATING.EvalWithMetadb(metadb) === 5;
				buttons.love.setIcon(loved ? Material.heart : Material.heart_empty);
				buttons.love.setColors(loved ? themeColors.mood : defaultColor);
			}
			if (!metadb || !fb.IsPlaying! || !fb.IsMetadbInMediaLibrary(metadb)) {
				this.disable();
			} else {
				this.enable();
			}
		},
		on_click: function () {
			let metadb = fb.GetNowPlaying();
			if (metadb && fb.IsMetadbInMediaLibrary(metadb)) {
				let loved_ = +TF_RATING.EvalWithMetadb(metadb) == 5;
				RunContextCommandWithMetadb(loved_ ? CMD_UNLOVE : CMD_LOVE, metadb, 8);
			} else {
				// if (!metadb) console.log("toggle mood failed: NULL metadb!");
				// if (!fb.IsMetadbInMediaLibrary(metadb)) console.log("toggle mood failed, metadb not in MediaLibrary!")
			}
			this.on_init();
			this.repaint();
		},
		on_playback_new_track: function () {
			this.on_init();
			this.repaint();
		},
		on_playback_stop: function (reason: number) {
			if (reason !== StopReason.StartingAnotherTrack) {
				this.on_init();
				this.repaint();
			}
		},
		on_playback_edited() {
			this.on_init();
			this.repaint();
		}
	});


	buttons.repeat = createIconButton(Material.repeat, iconSize, defaultColor);
	Object.assign(buttons.repeat, {
		on_init() {
			switch (plman.PlaybackOrder) {
				case PlaybackOrder.RepeatPlaylist:
					this.setIcon(Material.repeat);
					this.setColors(highlightColor);
					break;
				case PlaybackOrder.RepeatTrack:
					this.setIcon(Material.repeat1);
					this.setColors(highlightColor);
					break;
				default: // repeat off
					this.setIcon(Material.repeat);
					this.setColors(defaultColor);
					break;
			}
		},
		on_click() {
			if (plman.PlaybackOrder < 2) {
				plman.PlaybackOrder += 1;
			} else if (plman.PlaybackOrder === 2) {
				plman.PlaybackOrder = 0;
			} else {
				plman.PlaybackOrder = 1;
			}
			// this.on_init();
			// Repaint();
		},
		on_playback_order_changed() {
			this.on_init();
			this.repaint();
		}
	});

	// button 'Shuffle';
	buttons.shuffle = createIconButton(Material.shuffle, iconSize, defaultColor);
	Object.assign(buttons.shuffle, {
		on_init() {
			if (plman.PlaybackOrder === getShuffleOrder()) {
				this.setColors(highlightColor);
			} else {
				this.setColors(defaultColor);
			}
		},
		on_click() {
			if (plman.PlaybackOrder === getShuffleOrder()) {
				plman.PlaybackOrder = 0; // reset to default
			} else {
				plman.PlaybackOrder = getShuffleOrder();
			}
			// this.on_init();
		},
		on_playback_order_changed() {
			this.on_init();
			this.repaint();
		},
	});

	// button 'Volume Mute Toggle';
	buttons.volume = createIconButton(Material.volume, iconSize, defaultColor);
	Object.assign(buttons.volume, {
		on_init() {
			this.setIcon(fb.Volume === -100 ? Material.volume_off : Material.volume);
		},
		on_click() {
			fb.VolumeMute();
		},
		on_volume_change() {
			this.on_init();
			this.repaint();
		}
	});

	// Set ALL buttons' size;
	Object.values(buttons).forEach(btn => {
		btn.setSize(scale(32), scale(32));
	});

	return buttons;
}

function createThumbImg(colors: IThemeColors): SliderThumbImage {
	let tw = scale(14);
	let thumbImg = gdi.CreateImage(tw, tw);
	let g = thumbImg.GetGraphics();

	g.SetSmoothingMode(SmoothingMode.AntiAlias);
	g.FillEllipse(1, 1, tw - 3, tw - 3, colors.highlight);
	g.FillEllipse(scale(3), scale(3), tw - scale(6) - 1, tw - scale(6) - 1, colors.background);
	thumbImg.ReleaseGraphics(g);

	let downThumbImg = gdi.CreateImage(tw, tw);
	let g2 = downThumbImg.GetGraphics();

	g2.SetSmoothingMode(SmoothingMode.AntiAlias);
	g2.FillEllipse(0, 0, tw - 1, tw - 1, colors.highlight);
	downThumbImg.ReleaseGraphics(g2);

	return { normal: thumbImg, down: downThumbImg };
}

const thumbImages = createThumbImg(bottomColors);
const progressHeight = scale(4);
const slider_secondaryColor = setAlpha(bottomColors.text, 76);
const seekbar = new Slider({
	progressHeight: progressHeight,
	thumbImage: thumbImages.normal,
	pressedThumbImage: thumbImages.down,
	progressColor: bottomColors.highlight,
	secondaryColor: slider_secondaryColor,
	accentColor: bottomColors.highlight,
	getProgress() {
		return fb.PlaybackTime / fb.PlaybackLength;
	},
	setProgress(val: number) {
		fb.PlaybackTime = fb.PlaybackLength * val;
	}
});

const volumebar = new Slider({
	progressHeight: progressHeight,
	thumbImage: thumbImages.normal,
	pressedThumbImage: thumbImages.down,
	progressColor: bottomColors.highlight,
	secondaryColor: slider_secondaryColor,
	accentColor: bottomColors.highlight,
	getProgress() {
		return vol2pos(fb.Volume);
	},
	setProgress(val: number) {
		fb.Volume = pos2vol(val);
	}
});

const TF_TRACK_TITLE = fb.TitleFormat("%title%");
const TF_ARTIST = fb.TitleFormat("$if2([$trim(%artist%)]," + "\u672A\u77E5\u827A\u4EBA" + ")$if(%date%,[ \u30fb $year($replace($replace(%date%,.,-),/,-))],)");
const defaultArtistName = lang("ARTIST");

const artistText = new TextLink({
	text: defaultArtistName,
	font: fonts.normal_12,
	textColor: blendColors(bottomColors.text, bottomColors.background, 0.2),
	textHoverColor: blendColors(bottomColors.text, bottomColors.background, 0.2),
}, {

	on_init() {
		let metadb = fb.GetNowPlaying();
		this.setText(
			metadb ? TF_ARTIST.EvalWithMetadb(metadb) : defaultArtistName
		);
	},

	on_click() {
		// Show artist page: artistName;
		// NotifyOtherPanels(Messages.showArtistPage, "");
	},

	on_playback_new_track() {
		this.on_init();
		Repaint();
	},

	on_playback_stop(reason: number) {
		if (reason != 2) {
			this.on_init();
			Repaint();
		}
	},

	on_playback_edited() {
		this.on_init();
		Repaint();
	}
});

const albumArt = new NowplayingArtwork();

export class PlaybackControlView extends Component {
	private timerId: number = -1;
	playbackTime: string = "";
	playbackLength: string = "";
	trackTitle: string = "";
	titleFont = fonts.semibold_14;
	timeFont = fonts.trebuchet_12;
	timeWidth = 1;
	volumeWidth = scale(80);
	artworkWidth = scale(55);
	colors: IThemeColors;

	// children;
	volume: Slider;
	seekbar: Slider;
	artwork: NowplayingArtwork;
	artist: TextLink;
	buttons: IButtons;

	constructor() {
		super({});
		this.colors = bottomColors;
		this.setChildPanels();

		this.timeWidth = MeasureString("+00:00+", this.timeFont).Width;
	}

	on_init() {
		let panelRefreshInterval = 1000; // ms;
		let onPlaybackTimer_ = () => {
			if (fb.IsPlaying && !fb.IsPaused && fb.PlaybackLength > 0) {
				this.playbackTime = formatPlaybackTime(fb.PlaybackTime);
				this.playbackLength = formatPlaybackTime(fb.PlaybackLength);
				Repaint();
			} else {
			}
			window.ClearTimeout(this.timerId);
			this.timerId = window.SetTimeout(onPlaybackTimer_, panelRefreshInterval);
		};

		onPlaybackTimer_();

		let npMetadb = fb.GetNowPlaying();
		this.trackTitle = npMetadb == null ? lang("NOT PLAYING") : TF_TRACK_TITLE.EvalWithMetadb(npMetadb);
		if (fb.IsPlaying) {
			this.playbackTime = formatPlaybackTime(fb.PlaybackTime);
			this.playbackLength = formatPlaybackTime(fb.PlaybackLength);
		}

		this._rightDown = false;
	}

	setChildPanels() {
		this.buttons = createBottomButtons();
		this.seekbar = seekbar;
		this.volume = volumebar;
		this.artist = artistText;
		this.artwork = albumArt;

		this.addChild(this.seekbar);
		this.addChild(this.volume);
		this.addChild(this.artist);
		this.addChild(this.artwork);
		Object.values(this.buttons).forEach((btn) => this.addChild(btn));
	}

	on_size() {
		let { seekbar, volume, buttons, artwork, artist } = this;
		let left = this.x,
			top = this.y,
			width = this.width,
			height = this.height;

		// play_pause button;
		let bw_1 = buttons.playOrPause.width;
		let by_1 = (top + (scale(50) - bw_1) / 2) >> 0;
		let bx_1 = (left + width / 2 - bw_1 / 2) >> 0;
		let pad_1 = scale(12);
		buttons.playOrPause.setPosition(bx_1, by_1);

		// prev
		let bx_2 = bx_1 - bw_1 - pad_1;
		buttons.prev.setPosition(bx_2, by_1);

		// next;
		let bx_3 = bx_1 + bw_1 + pad_1;
		buttons.next.setPosition(bx_3, by_1);

		// repeat
		let bw_2 = buttons.shuffle.width;
		let by_2 = (top + (scale(50) - bw_2) / 2) >> 0;
		let bx_4 = bx_2 - bw_2 - scale(16);
		buttons.repeat.setPosition(bx_4, by_2);

		//shuffle;
		let bx_5 = bx_3 + bw_1 + scale(16);
		buttons.shuffle.setPosition(bx_5, by_2);

		// volume bar;
		let vol_h = scale(18);
		let vol_w = scale(80);
		let vol_y = top + (height - vol_h) / 2;
		let vol_x = left + width - vol_w - scale(24);
		volume.setBoundary(vol_x, vol_y >> 0, vol_w, vol_h);

		// volume mute button;
		let bx_6 = vol_x - bw_2 - scale(8);
		let by_6 = (top + (height - bw_2) / 2) >> 0;
		buttons.volume.setPosition(bx_6, by_6);

		// love;
		buttons.love.setPosition(bx_6 - bw_2 - scale(8), by_6);

		// seekbar;
		let seek_max_w = scale(640);
		let seek_min_w = scale(240);
		let ui_min_w = scale(780);
		let seek_w = width * (seek_min_w / ui_min_w);
		if (seek_w < seek_min_w) seek_w = seek_min_w;
		else if (seek_w > seek_max_w) seek_w = seek_max_w;
		let seek_x = left + (width - seek_w) / 2;
		let seek_y = by_1 + bw_1 + scale(8);
		seekbar.setBoundary(seek_x, seek_y >> 0, seek_w, scale(16));

		// art;
		let art_pad_left = scale(12);
		let art_pad_top = scale(12);
		let art_width = (height - 2 * art_pad_top);
		artwork.setBoundary(left + art_pad_left, top + art_pad_top, art_width, art_width);

		// artist text;
		let artist_y = this.y + this.height / 2;
		let pb_time_x = seekbar.x - this.timeWidth - scale(4);
		let artist_x = albumArt.x + albumArt.width + scale(12);
		let artist_max_w = pb_time_x - scale(16) - artist_x;
		artist.setMaxWidth(artist_max_w);
		artist.setSize(null, scale(20));
		artist.setPosition(artist_x, artist_y);
	}

	on_paint(gr: IGdiGraphics) {
		// bg
		gr.FillSolidRect(this.x, this.y, this.width, this.height, themeColors.playbackBarBackground);

		// playback time;
		let pb_time_x = seekbar.x - this.timeWidth - scale(4);
		let pb_time_y = seekbar.y;
		gr.DrawString(this.playbackTime, this.timeFont, themeColors.secondaryText, pb_time_x, pb_time_y, this.timeWidth, seekbar.height, StringFormat.Center);

		// playback length;
		let pb_len_x = seekbar.x + seekbar.width + scale(4);
		gr.DrawString(this.playbackLength, this.timeFont, themeColors.secondaryText, pb_len_x, pb_time_y, this.timeWidth, seekbar.height, StringFormat.Center);

		// track title;
		let title_x = albumArt.x + albumArt.width + scale(12);
		let title_max_w = pb_time_x - scale(16) - title_x;
		let title_y = this.y + this.height / 2 - scale(22) - scale(2);
		gr.DrawString(this.trackTitle, this.titleFont, themeColors.text, title_x, title_y, title_max_w, scale(22), StringFormat.LeftCenter);
	}

	on_playback_new_track() {
		this.playbackTime = "00:00";
		this.playbackLength = "--:--";
		this.trackTitle = TF_TRACK_TITLE.EvalWithMetadb(fb.GetNowPlaying());
		Repaint();
	}

	on_playback_stop(reason: number) {
		if (reason != 2) {
			this.playbackTime = "00:00";
			this.playbackLength = "--:--";
			this.trackTitle = "NOT PLAYING";
			Repaint();
		}
	}

	on_mouse_rbtn_down() {
		this._rightDown = true;
	}

	private _rightDown = false;

	on_mouse_rbtn_up(x: number, y: number) {
		if (this._rightDown) {
			// try {
			showPanelContextMenu(fb.GetNowPlaying(), x, y);
			// } catch (e) { }
			this._rightDown = false;
		}
	}

	on_mouse_leave() {
		this._rightDown = false;
	}

	// Sync default order property to foobar's shuffle order (when sometimes
	// playback order is changed thru menu command or sth else);
	on_playback_order_changed() {
		let orderSetting = getShuffleOrder();
		if (plman.PlaybackOrder !== orderSetting && plman.PlaybackOrder >= PlaybackOrder.Random) {
			setShuffleOrder(plman.PlaybackOrder);
		}
	}

}

const tf_title = fb.TitleFormat("%title%");

function showPanelContextMenu(metadb: IFbMetadb, x: number, y: number) {
	const objMenu = window.CreatePopupMenu();
	let Context: IContextMenuManager;
	let BaseID = 1000;
	const metadbs = plman.GetPlaylistItems(-1);
	metadb && metadbs.Add(metadb);

	if (!metadb) {
		objMenu.AppendMenuItem(MenuFlag.GRAYED, 1, "Not playing");
	} else {
		objMenu.AppendMenuItem(MenuFlag.STRING, 10, "Now playing: " + tf_title.EvalWithMetadb(metadb));
		objMenu.AppendMenuSeparator();

		objMenu.AppendMenuItem(MenuFlag.GRAYED, 11, "Go to album");
		objMenu.AppendMenuItem(MenuFlag.GRAYED, 12, "Go to artist");
		objMenu.AppendMenuSeparator();

		// Add to playlist ... menu;
		const objAddTo = window.CreatePopupMenu();
		objAddTo.AppendTo(objMenu, MenuFlag.STRING, "Add to playlist");
		objAddTo.AppendMenuItem(MenuFlag.STRING, 5000, "New playlist...");

		if (plman.PlaylistCount > 0) {
			objAddTo.AppendMenuSeparator();
		}

		for (let i = 0; i < plman.PlaylistCount; i++) {
			objAddTo.AppendMenuItem(plman.IsPlaylistLocked(i) ? MenuFlag.GRAYED : MenuFlag.STRING, 5001 + i, plman.GetPlaylistName(i));
		}

		// fb's context menu;
		Context = fb.CreateContextMenuManager();
		Context.InitContext(metadbs);
		Context.BuildMenu(objMenu, BaseID, -1);
	}

	objMenu.AppendMenuSeparator();

	const playbackMenu = window.CreatePopupMenu();
	const menuMan = fb.CreateMainMenuManager();
	playbackMenu.AppendTo(objMenu, MenuFlag.STRING, "Playback");
	menuMan.Init("playback");
	menuMan.BuildMenu(playbackMenu, 9000, 300);

	const ret = objMenu.TrackPopupMenu(x, y);
	let inputOptions: IInputPopupOptions;

	switch (true) {
		case ret === 1:
			// "Not playing" grey;
			break;
		case ret === 10:
			// TODO: show now playing;
			break;
		case ret >= BaseID && ret < 5000:
			Context.ExecuteByID(ret - BaseID);
			break;
		case ret === 5000:
			inputOptions = {
				title: "Add to playlist...",
				defaultText: "New playlist",
				onSuccess(playlistName: string) {
					let playlistIndex = plman.CreatePlaylist(plman.PlaylistCount, playlistName);
					if (isValidPlaylist(playlistIndex)) {
						plman.ActivePlaylist = playlistIndex;
						plman.InsertPlaylistItems(playlistIndex, plman.PlaylistItemCount(playlistIndex), metadbs, false);
					}
				}
			}
			notifyOthers("Popup.InputPopupPanel", inputOptions);
			break;
		case ret >= 5001 && ret < 9000:
			let playlistIndex = ret - 5001;
			if (plman.IsPlaylistLocked(playlistIndex)) {
				// DO Nothing;
			} else {
				plman.ActivePlaylist = playlistIndex;
				plman.InsertPlaylistItems(playlistIndex, plman.PlaylistItemCount(playlistIndex), metadbs, false);
				// TODO: scroll to bottom to show items added;
			}
			break;
		case ret >= 9000 && ret < 10000:
			menuMan.ExecuteByID(ret - 9000);
			break;
	}

}


function getShuffleOrder() {
	let orderSetting = +window.GetProperty("Global.DefaultShuffle", 4);
	if (!Number.isInteger(orderSetting) || orderSetting < PlaybackOrder.Random || orderSetting > PlaybackOrder.ShuffleFolders) {
		window.SetProperty("Global.DefaultShuffle", "")
	}
	orderSetting = +window.GetProperty("Global.DefaultShuffle", 4);
	return orderSetting;
}

function setShuffleOrder(order: number) {
	if (isNaN(order) || order < PlaybackOrder.Random || order > PlaybackOrder.ShuffleFolders) {
		return -1;
	}
	window.SetProperty("Global.DefaultShuffle", order);
	return order;
}

export function toggleMood(metadb: IFbMetadb) {
	if (metadb && fb.IsMetadbInMediaLibrary(metadb)) {
		let liked = +TF_RATING.EvalWithMetadb(metadb) === 5;
		RunContextCommandWithMetadb(liked ? CMD_UNLOVE : CMD_LOVE, metadb, 8);
	} else {
		// if (!metadb) console.log("toggle mood failed: NULL metadb!");
		// if (!fb.IsMetadbInMediaLibrary(metadb)) console.log("toggle mood failed, metadb not in MediaLibrary!")
	}
}