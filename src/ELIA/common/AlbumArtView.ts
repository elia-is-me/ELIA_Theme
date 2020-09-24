import {
	StringFormat,
	CropImage,
	TextRenderingHint,
	drawImage,
	SmoothingMode,
	RGB,
	RGBA,
	debounce,
	InterpolationMode,
	StopReason,
} from "./common";
import { Component } from "./BasePart";

export const enum AlbumArtId {
	Front = 0,
	Back = 1,
	Disc = 2,
	Icon = 3,
	Artist = 4,
}

export const enum ArtworkType {
	Nowplaying,
	Album,
	Artist,
	Playlist,
}

// Create stub images;
let stubImages: IGdiBitmap[] = [];
let font1 = gdi.Font("Segoe UI", 230, 1);
let font2 = gdi.Font("Segoe UI", 120, 1);
let font3 = gdi.Font("Segoe UI", 200, 1);
let font4 = gdi.Font("Segoe UI", 90, 1);

for (let i = 0; i < 3; i++) {
	stubImages[i] = drawImage(500, 500, true, (g) => {
		g.SetSmoothingMode(SmoothingMode.HighQuality);
		g.FillRoundRect(0, 0, 500, 500, 8, 8, 0x0fffffff);
		g.SetTextRenderingHint(TextRenderingHint.AntiAlias);
		g.DrawString("NO", font1, 0x25ffffff, 0, 0, 500, 275, StringFormat.Center);
		g.DrawString(
			["COVER", "PHOTO", "ART"][i],
			font2,
			0x20ffffff,
			2.5,
			175,
			500,
			275,
			StringFormat.Center
		);
		g.FillSolidRect(60, 400, 380, 20, 0x15fffffff);
	});
}

let maskImage = drawImage(500, 500, true, (g: IGdiGraphics) => {
	g.FillSolidRect(0, 0, 500, 500, RGB(255, 255, 255));
	g.SetSmoothingMode(SmoothingMode.HighQuality);
	g.FillEllipse(1, 1, 498, 498, RGBA(0, 0, 0, 255));
});

const tf_album = fb.TitleFormat("[%album artist%]^^%album%");

export class PlaylistArtwork extends Component {
	stubImage: IGdiBitmap = stubImages[2];
	image: IGdiBitmap;

	constructor() {
		super({});
	}

	async getArtwork() {
		let metadbs = plman.GetPlaylistItems(plman.ActivePlaylist);

		if (!metadbs || metadbs.Count === 0) {
			this.image = CropImage(stubImages[0], this.width, this.height);
			this.repaint();
			return;
		}

		metadbs.OrderByFormat(tf_album, 0);

		let albums: IFbMetadb[] = [];
		let compare = "#@!";

		for (let i = 0, len = metadbs.Count; i < len; i++) {
			if (!metadbs[i]) {
				break;
			}
			let albumKey = tf_album.EvalWithMetadb(metadbs[i]);
			if (!albums[albums.length - 1] || albumKey !== compare) {
				albums.push(metadbs[i]);
				compare = albumKey;
			}
		}

		let images: IGdiBitmap[] = [];

		for (let i = 0, len = albums.length; i < len && i < 10 && images.length < 4; i++) {
			let result = await utils.GetAlbumArtAsyncV2(window.ID, albums[i], AlbumArtId.Front);
			if (!result || !result.image) {
				result = await utils.GetAlbumArtAsyncV2(window.ID, albums[i], AlbumArtId.Disc);
			}
			if (result && result.image) {
				images.push(result.image);
			}
		}

		if (images.length === 0) {
			this.image = null;
		} else if (images.length === 1) {
			this.image = CropImage(images[0], this.width, this.height);
		} else {
			images = images.map((img) => CropImage(img, 250, 250));
			if (images.length < 4) {
				let stubimg = CropImage(stubImages[0], 250, 250);
				for (let i = images.length; i < 4; i++) {
					images.push(stubimg);
				}
			}
			let img = gdi.CreateImage(500, 500);
			let g = img.GetGraphics();
			images[0] && g.DrawImage(images[0], 0, 0, 250, 250, 0, 0, 250, 250);
			images[1] && g.DrawImage(images[1], 250, 0, 250, 250, 0, 0, 250, 250);
			images[2] && g.DrawImage(images[2], 0, 250, 250, 250, 0, 0, 250, 250);
			images[3] && g.DrawImage(images[3], 250, 250, 250, 250, 0, 0, 250, 250);
			img.ReleaseGraphics(g);
			this.image = img;
		}

		this.repaint();
	}

	on_init() {
		this.getArtwork();
	}

	on_playlists_changed() {
		this.getArtwork();
	}

	on_playlist_switch() {
		this.getArtwork();
	}

	on_paint(gr: IGdiGraphics) {
		let img = this.image || this.stubImage;
		if (!img) return;
		gr.DrawImage(img, this.x, this.y, this.width, this.height, 0, 0, img.Width, img.Height);
	}

	on_size = debounce(() => {
		if (stubImages[2]) {
			if (!this.stubImage || this.stubImage.Width !== this.width) {
				this.stubImage = CropImage(
					stubImages[2],
					this.width,
					this.height,
					InterpolationMode.HighQuality
				);
			}
		}
	}, 100);
}

export class NowplayingArtwork extends Component {
	image: IGdiBitmap;
	stubImage: IGdiBitmap = stubImages[0];
	trackKey: string = "##@!";

	constructor() {
		super({});
	}

	async getArtwork(metadb?: IFbMetadb) {
		if (metadb) {
			let trackKey = tf_album.EvalWithMetadb(metadb);
			if (trackKey !== this.trackKey || !this.image) {
				let result = await utils.GetAlbumArtAsyncV2(window.ID, metadb, AlbumArtId.Front);
				if (!result || !result.image) {
					result = await utils.GetAlbumArtAsyncV2(
						window.ID,
						metadb,
						AlbumArtId.Disc
					);
				}
				if (result && result.image) {
					this.image = CropImage(
						result.image,
						this.width,
						this.height,
						InterpolationMode.HighQualityBicubic
					);
					this.image = result.image;
				} else {
					this.image = null;
				}
				this.trackKey = trackKey;
			} //else {/** */}
		} else {
			this.trackKey = "3@!#@";
			this.image = null;
		}
		this.repaint();
	}

	on_init() {
		this.getArtwork(fb.GetNowPlaying());
	}

	on_playback_new_track() {
		this.getArtwork(fb.GetNowPlaying());
	}

	on_playback_stop(reason: number) {
		if (reason !== StopReason.StartingAnotherTrack) {
			this.getArtwork();
		}
	}

	on_paint(gr: IGdiGraphics) {
		let img = this.image || this.stubImage;
		if (!img) return;
		gr.DrawImage(img, this.x, this.y, this.width, this.height, 0, 0, img.Width, img.Height);
	}

	on_size = debounce(() => {
		if (stubImages[0]) {
			if (!this.stubImage || this.stubImage.Width !== this.width) {
				this.stubImage = CropImage(
					stubImages[0],
					this.width,
					this.height,
					InterpolationMode.HighQuality
				);
			}
		}
	}, 100);
}
