// ---------------------
// Playback control bar;
// ---------------------

import { MenuFlag, Repaint, StopReason } from "../common/common";
import { TextLink } from "../common/TextLink";
import { NowplayingArtwork } from "../common/AlbumArt";
import { Slider, SliderThumbImage } from "../common/Slider";
import { Icon } from "../common/IconButton";
import { Component } from "../common/BasePart";
import { Material, MaterialFont } from "../common/Icon"
import { scale, imageFromCode, PlaybackOrder, SmoothingMode, blendColors, MeasureString, StringFormat } from "../common/common";
import { IThemeColors, bottomColors, globalFontName } from "./Theme";
import { IInputPopupOptions } from "./InputPopupPanel";
import { notifyOthers } from "../common/UserInterface";
import { isValidPlaylist } from "./PlaylistView";

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

const CMD_LOVE = 'Playback Statistics/Rating/5';
const CMD_UNLOVE = 'Playback Statistics/Rating/<not set>';
const TF_RATING = fb.TitleFormat('%rating%');

export function toggleMood(metadb: IFbMetadb) {
	if (metadb && fb.IsMetadbInMediaLibrary(metadb)) {
		let moodOn = +TF_RATING.EvalWithMetadb(metadb) === 5;
		fb.RunContextCommandWithMetadb(
			moodOn ? CMD_UNLOVE : CMD_LOVE, metadb, 8
		);
	}
}

type ButtonKeys = "playOrPause" | "next" | "prev" | "love" | "repeat" | "shuffle" | "volume";
type ImageKeys = "pause" | "play" | "next" | "prev" | "heart" | "heart_empty"
	| "repeat_off" | "repeat_on" | "repeat1_on" | "shuffle_off" | "shuffle_on"
	| "volume" | "volume_mute";
type TPlaybackButtons = { [K in ButtonKeys]: Icon };

const createBottomButtons = (themeColors?: IThemeColors) => {
	const colors = bottomColors;
	let iconName = MaterialFont;
	let iconFont = gdi.Font(iconName, scale(24));
	let iconFont2 = gdi.Font(iconName, scale(22));
	let bw_1 = scale(32);
	let bw_2 = scale(32);
	let images: { [K in ImageKeys]: IGdiBitmap } = {
		pause: imageFromCode(Material.pause, iconFont, colors.text, bw_1, bw_1),
		play: imageFromCode(Material.play_arrow, iconFont, colors.text, bw_1, bw_1),
		next: imageFromCode(Material.skip_next, iconFont, colors.text, bw_1, bw_1),
		prev: imageFromCode(Material.skip_prev, iconFont, colors.text, bw_1, bw_1),
		heart: imageFromCode(Material.heart, iconFont2, colors.heart, bw_2, bw_2),
		heart_empty: imageFromCode(Material.heart_empty, iconFont2, colors.text, bw_2, bw_2),
		repeat_off: imageFromCode(Material.repeat, iconFont2, colors.text, bw_2, bw_2),
		repeat_on: imageFromCode(Material.repeat, iconFont2, colors.highlight, bw_2, bw_2),
		repeat1_on: imageFromCode(Material.repeat1, iconFont2, colors.highlight, bw_2, bw_2),
		shuffle_off: imageFromCode(Material.shuffle, iconFont2, colors.text, bw_2, bw_2),
		shuffle_on: imageFromCode(Material.shuffle, iconFont2, colors.highlight, bw_2, bw_2),
		volume: imageFromCode(Material.volume, iconFont2, colors.text, bw_2, bw_2),
		volume_mute: imageFromCode(Material.volume_mute, iconFont2, colors.text, bw_2, bw_2),
	}
	let buttons: TPlaybackButtons = {
		playOrPause: null,
		next: null,
		prev: null,
		love: null,
		repeat: null,
		shuffle: null,
		volume: null
	}

	//

	buttons.playOrPause = new Icon({
		image: images.pause,
		on_click: function () {
			fb.PlayOrPause();
			this.on_init();
			Repaint();
		},
		on_init: function () {
			this.setImage(fb.IsPlaying && !fb.IsPaused ? images.pause : images.play);
		},
		on_playback_new_track: function () {
			this.on_init();
			Repaint();
		},
		on_playback_stop: function (reason: number) {
			this.on_init();
			Repaint();
		},
		on_playback_pause: function () {
			this.on_init();
			Repaint();
		}
	});
	buttons.next = new Icon({
		image: images.next,

		on_click: function () {
			fb.Next();
		}
	});

	buttons.prev = new Icon({
		image: images.prev,
		on_click: function () {
			fb.Prev();
		}
	});

	buttons.love = new Icon({
		image: images.heart_empty,
		on_init: function () {
			var metadb = fb.GetNowPlaying();
			if (!metadb || !fb.IsMetadbInMediaLibrary(metadb)) {
				this.setImage(images.heart_empty);
			} else {
				this.setImage(+TF_RATING.EvalWithMetadb(metadb) == 5 ? images.heart : images.heart_empty);
			}
			if (!metadb || !fb.IsPlaying) {
				(this as Icon).disable();
			} else {
				(this as Icon).enable();
			}
		},
		on_click: function () {
			var metadb = fb.GetNowPlaying();
			if (metadb && fb.IsMetadbInMediaLibrary(metadb)) {
				var loved_ = +TF_RATING.EvalWithMetadb(metadb) == 5;
				fb.RunContextCommandWithMetadb(loved_ ? CMD_UNLOVE : CMD_LOVE, metadb, 8);
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

	buttons.repeat = new Icon({
		image: images.repeat_off,
		on_init() {
			switch (plman.PlaybackOrder) {
				case PlaybackOrder.RepeatPlaylist:
					this.setImage(images.repeat_on);
					break;
				case PlaybackOrder.RepeatTrack:
					this.setImage(images.repeat1_on);
					break;
				default: // repeat off
					this.setImage(images.repeat_off);
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

			this.on_init();
			Repaint();
		},
		on_playback_order_changed() {
			this.on_init();
			Repaint();
		}
	})

	buttons.shuffle = new Icon({
		image: images.shuffle_off,
		on_init() {
			if (plman.PlaybackOrder === getShuffleOrder()) {
				this.setImage(images.shuffle_on);
			} else {
				this.setImage(images.shuffle_off);
			}
		},
		on_click() {
			if (plman.PlaybackOrder === getShuffleOrder()) {
				plman.PlaybackOrder = 0; // reset to default
			} else {
				plman.PlaybackOrder = getShuffleOrder();
			}
			this.on_init();
		},
		on_playback_order_changed() {
			this.on_init();
			Repaint();
		},
	});

	buttons.volume = new Icon({
		image: images.volume,
		on_init() {
			this.setImage(
				fb.Volume == -100 ? images.volume_mute : images.volume
			);
		},
		on_click() {
			fb.VolumeMute();
		},
		on_volume_change() {
			this.on_init();
			Repaint();
		}
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
const slider_secondaryColor = blendColors(bottomColors.text, bottomColors.background, 0.7);
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
// \u30fb: Middle dot char code.
const TF_ARTIST = fb.TitleFormat("$if2([%artist%],未知艺人)[\u30fb$year(%date%)]");
const artistFont = gdi.Font(globalFontName, scale(12));

const artistText = new TextLink({
	text: "ARTIST",
	font: artistFont,
	textColor: blendColors(bottomColors.text, bottomColors.background, 0.2),
	textHoverColor: blendColors(bottomColors.text, bottomColors.background, 0.2),
}, {

	on_init() {
		let metadb = fb.GetNowPlaying();
		this.setText(
			metadb ? TF_ARTIST.EvalWithMetadb(metadb) : "ARTIST"
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
	titleFont = gdi.Font("Segoe UI Semibold", scale(13));
	timeFont = gdi.Font("Segoe UI", scale(12));
	timeWidth = 1;
	volumeWidth = scale(80);
	artworkWidth = scale(55);
	colors: IThemeColors;

	// children;
	volume: Slider;
	seekbar: Slider;
	artwork: NowplayingArtwork;
	artist: TextLink;
	buttons: TPlaybackButtons;

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
		this.trackTitle = npMetadb == null ? "NOT PLAYING" : TF_TRACK_TITLE.EvalWithMetadb(npMetadb);
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
		// let buttons = pb_btns2;
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
		let bx_6 = vol_x - bw_2 - scale(4);
		let by_6 = (top + (height - bw_2) / 2) >> 0;
		buttons.volume.setPosition(bx_6, by_6);

		// love;
		buttons.love.setPosition(bx_6 - bw_2, by_6);

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
		let art_w = scale(48);
		let art_pad = (height - art_w) / 2;
		artwork.setBoundary(left + art_pad, top + art_pad, art_w, art_w);

		// artist text;
		let artist_y = this.y + this.height / 2;
		let pb_time_x = seekbar.x - this.timeWidth - scale(4);
		let artist_x = albumArt.x + albumArt.width + scale(8);
		let artist_max_w = pb_time_x - scale(16) - artist_x;
		artist.setMaxWidth(artist_max_w);
		artist.setSize(null, scale(20));
		artist.setPosition(artist_x, artist_y);
	}

	on_paint(gr: IGdiGraphics) {
		let { colors } = this;

		// bg
		gr.FillSolidRect(this.x, this.y, this.width, this.height, colors.background);

		// playback time;
		let pb_time_x = seekbar.x - this.timeWidth - scale(4);
		let pb_time_y = seekbar.y;
		gr.DrawString(this.playbackTime, this.timeFont, colors.text, pb_time_x, pb_time_y, this.timeWidth, seekbar.height, StringFormat.Center);

		// playback length;
		let pb_len_x = seekbar.x + seekbar.width + scale(4);
		gr.DrawString(this.playbackLength, this.timeFont, colors.text, pb_len_x, pb_time_y, this.timeWidth, seekbar.height, StringFormat.Center);

		// track title;
		let title_x = albumArt.x + albumArt.width + scale(8);
		let title_max_w = pb_time_x - scale(16) - title_x;
		let title_y = this.y + this.height / 2 - scale(22) - scale(2);
		gr.DrawString(this.trackTitle, this.titleFont, colors.text, title_x, title_y, title_max_w, scale(22), StringFormat.LeftCenter);
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

	on_mouse_rbtn_down(x: number, y: number) {
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

function showShuffleBtnMenu(x: number, y: number) {
	const objMenu = window.CreatePopupMenu();

	objMenu.AppendMenuItem(MenuFlag.STRING, PlaybackOrder.Random, "Random");
	objMenu.AppendMenuItem(MenuFlag.STRING, PlaybackOrder.ShuffleTracks, "Shuffle(tracks)");
	objMenu.AppendMenuItem(MenuFlag.STRING, PlaybackOrder.ShuffleAlbums, "Shuffle(albums)");
	objMenu.AppendMenuItem(MenuFlag.STRING, PlaybackOrder.ShuffleFolders, "Shuffle(Folders)");

	let orderSetting = getShuffleOrder();
	objMenu.CheckMenuRadioItem(PlaybackOrder.Random, PlaybackOrder.ShuffleFolders, orderSetting);

	let ret = objMenu.TrackPopupMenu(x, y);

	setShuffleOrder(ret);
	plman.PlaybackOrder = ret;

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


/**
 * TODO:
 *
 * - info area onClick action;
 * - artist onClick action; // 等等
 */