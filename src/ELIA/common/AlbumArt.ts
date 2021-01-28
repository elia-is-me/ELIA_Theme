/// <reference path="../../typings/foo_spider_monkey_panel.d.ts" />

import { CropImage, TextRenderingHint, drawImage, SmoothingMode, debounce, StopReason, BuildFullPath, fso, scale, InterpolationMode, isNumber, ScaleImage, DrawImageScale } from "./common";
import { Component } from "./BasePart";
import { StringFormat } from "./String";

// image cache;
// ---- 

interface CacheObj {
	image: IGdiBitmap | null;
	load_request: number;
	tid: number;
}

class ImageCache {
	private _cacheFolder = fb.ProfilePath + "ELIA_CACHE\\";
	private _imageSize = +window.GetProperty("ImageCache.Image Size", 500);
	private _cacheMap: Map<string | number, CacheObj> = new Map();
	tf_crc = fb.TitleFormat("$crc32($directory(%path%)^^%album%)");
	noCover: IGdiBitmap;
	noArt: IGdiBitmap;
	noPhoto: IGdiBitmap;

	private coverLoad: number | null;
	private coverDone: number | null;

	constructor() {
		BuildFullPath(this._cacheFolder);
		if (!isNumber(this._imageSize)) {
			this._imageSize = 500;
			window.SetProperty("ImageCache.Image Size", this._imageSize);
		}
		this._createStubImages();
		this.noCover = this._stubImages[0];
		this.noArt = this._stubImages[2];
		this.noPhoto = this._stubImages[1];
	}

	clear() {
		this._cacheMap.clear();
	}

	hit(metadb: IFbMetadb, crcKey?: string, is_scrolling = false) {
		if (!metadb) {
			return;
		}
		let cacheKey = this.tf_crc.EvalWithMetadb(metadb);
		let cacheObj = this._cacheMap.get(cacheKey);
		if (cacheObj && cacheObj.image) return cacheObj.image;
		if (cacheObj == null) {
			cacheObj = {
				tid: -1,
				image: null,
				load_request: 0
			};
			this._cacheMap.set(cacheKey, cacheObj);
		};
		if (cacheObj.image == null) {
			if (cacheObj.load_request === 0) {
				if (!this.coverLoad) {
					this.coverLoad = window.SetTimeout(() => {
						try {
							cacheObj.tid = this.loadImageFromCache(cacheKey);
							cacheObj.load_request = 1;
						} catch (e) { }
						this.coverLoad && window.ClearTimeout(this.coverLoad);
						this.coverLoad = null;
					}, is_scrolling ? 100 : 5);
				}

			}
		}
		if (cacheObj.load_request !== 0) {
			if (!this.coverLoad) {
				this.coverLoad = window.SetTimeout(() => {
					utils.GetAlbumArtAsync(window.ID, metadb, AlbumArtId.Front, false);
					this.coverLoad && window.ClearTimeout(this.coverLoad);
					this.coverLoad = null;
				}, (is_scrolling ? 100 : 5));
			}
		}

	}

	on_load_image_done(tid: number, image: IGdiBitmap | null) {
		let cacheObj: CacheObj;
		for (let [key, obj] of this._cacheMap) {
			if (obj.tid === tid) {
				cacheObj = obj;
				cacheObj.tid = -1; // reset;
				cacheObj.image = image;
				cacheObj.load_request = 2;
				break;
			}
		}
	}

	on_get_album_art_done(metadb: IFbMetadb, art_id: number, image: IGdiBitmap | null, image_path: string) {
		if (!metadb) {
			return;
		}
		if (!image && art_id === AlbumArtId.Front) {
			if (!this.coverLoad) {
				this.coverLoad = window.SetTimeout(() => {
					// 网易云下载的音乐会把封面存在 'Disc' 中;
					utils.GetAlbumArtAsync(window.ID, metadb, AlbumArtId.Disc, false);
					this.coverLoad && window.ClearTimeout(this.coverLoad);
					this.coverLoad = null;
				}, 5);
			}
		} else {
			let cacheKey = this.tf_crc.EvalWithMetadb(metadb);
			let cacheObj: CacheObj = {
				tid: -1,
				image: ScaleImage(image, this._imageSize, this._imageSize, InterpolationMode.HighQuality),
				load_request: 2
			}
			this._cacheMap.set(cacheKey, cacheObj);
			window.SetTimeout(() => {
				if (fso.FileExists(this._cacheFolder + cacheKey)) {
					//
				} else {
					if (cacheObj.image) {
						cacheObj.image.SaveAs(this._cacheFolder + cacheKey, "image/jpeg");
						console.log("save image to " + this._cacheFolder + cacheKey)
					}
				}
			}, 5);
		}
	}

	private loadImageFromCache(crc: string) {
		return gdi.LoadImageAsync(window.ID, this._cacheFolder + crc);
	}

	private _stubImages: IGdiBitmap[] = [];

	private _createStubImages() {
		let stubImages: IGdiBitmap[] = [];
		let font1 = gdi.Font("Segoe UI", 230, 1);
		let font2 = gdi.Font("Segoe UI", 120, 1);
		for (let i = 0; i < 3; i++) {
			stubImages[i] = drawImage(500, 500, true, g => {
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
		this._stubImages = stubImages;
	}
}

const imageCache = new ImageCache();

// -----

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

const tf_album = fb.TitleFormat("$directory(%path%)^^%album%");

export class PlaylistArtwork extends Component {
	readonly className = "PlaylistArtwork";
	readonly stubImage: IGdiBitmap = imageCache.noArt;
	image: IGdiBitmap;

	private _cache: Map<string | number, IGdiBitmap> = new Map();
	private _noCoverKey = "<no-cover>";

	constructor() {
		super({});
	}

	async getArtwork() {

		// Check stub_image;
		let stub = this._cache.get(-1);
		if (!stub) {
			stub = CropImage(this.stubImage, this.width, this.height);
			this._cache.set(-1, stub);
		}

		let metadbs = plman.GetPlaylistItems(plman.ActivePlaylist);

		// No tracks in active playlist;
		if (!metadbs || metadbs.Count === 0) {
			this.image = stub;
			this.repaint();
			return;
		}

		// Image cached already;
		let img = this._cache.get(plman.ActivePlaylist);
		if (img) {
			this.image = img;
			this.repaint();
			return;
		}

		// Create image if not in cache;
		let albums: IFbMetadb[] = [];
		let albumKeys: string[] = [];
		let compare = "#@!";

		for (let i = 0, len = metadbs.Count; i < len && i < 200; i++) {
			if (!metadbs[i]) {
				break;
			}
			let albumKey = tf_album.EvalWithMetadb(metadbs[i]);
			if (!albums[albums.length - 1] || albumKey !== compare && albumKeys.indexOf(albumKey) === -1) {
				albums.push(metadbs[i]);
				albumKeys.push(albumKey)
				compare = albumKey;
			}
		}

		let images: IGdiBitmap[] = [];

		for (
			let i = 0, len = albums.length;
			i < len && i < 10 && images.length < 4;
			i++
		) {
			let result = await utils.GetAlbumArtAsyncV2(
				window.ID,
				albums[i],
				AlbumArtId.Front
			);
			if (!result || !result.image) {
				result = await utils.GetAlbumArtAsyncV2(
					window.ID,
					albums[i],
					AlbumArtId.Disc
				);
			}
			if (result && result.image) {
				images.push(result.image);
			}
		}

		if (images.length === 0) {
			this.image = stub;
			this._cache.set(plman.ActivePlaylist, stub);
		} else if (images.length < 4) {
			this.image = this.processImage(images[0]);
			this._cache.set(plman.ActivePlaylist, this.image)
		} else {
			images = images.map(img => CropImage(img, 250, 250));
			let img = gdi.CreateImage(500, 500);
			let g = img.GetGraphics();
			g.DrawImage(images[0], 0, 0, 250, 250, 0, 0, 250, 250);
			g.DrawImage(images[1], 250, 0, 250, 250, 0, 0, 250, 250);
			g.DrawImage(images[2], 0, 250, 250, 250, 0, 0, 250, 250);
			g.DrawImage(images[3], 250, 250, 250, 250, 0, 0, 250, 250);
			img.ReleaseGraphics(g);
			this.image = this.processImage(img);
			this._cache.set(plman.ActivePlaylist, this.image);
		}

		this.repaint();
	}

	processImage(image: IGdiBitmap) {
		return CropImage(image, this.width, this.height);
	}

	on_init() {
		this._cache.clear();
		this.getArtwork();
	}

	on_playlists_changed() {
		this._cache.clear();
		this.getArtwork();
	}

	on_playlist_switch() {
		this._cache.clear();
		this.getArtwork();
	}

	on_playlist_items_added = debounce(() => {
		this._cache.clear();
		this.getArtwork();
	}, 1000);

	on_playlist_items_removed = debounce(() => {
		this._cache.clear();
		this.getArtwork();
	}, 1000);

	on_paint(gr: IGdiGraphics) {
		let img = this.image || this.stubImage;
		if (!img) return;
		gr.DrawImage(img, this.x, this.y, this.width, this.height, 0, 0, img.Width, img.Height);
	}

	on_size = debounce(() => {
		this.getArtwork();
	}, 100);
}

export class NowplayingArtwork extends Component {
	readonly className = "NowplayingArtwork";
	readonly stubImage: IGdiBitmap = imageCache.noCover;	
	image: IGdiBitmap;
	_noCover: IGdiBitmap;
	trackKey: string = "0123456789";
	metadb: IFbMetadb;

	constructor() {
		super({});
	}

	async getArtwork(metadb?: IFbMetadb) {
		// check stub image;
		if (!this._noCover || this._noCover.Width !== this.width) {
			this._noCover = this.processImage(this.stubImage);
		}

		// get album art;
		if (metadb) {
			let trackKey = tf_album.EvalWithMetadb(metadb);
			if (trackKey !== this.trackKey || !this.image) {
				let result = await utils.GetAlbumArtAsyncV2(
					window.ID,
					metadb,
					AlbumArtId.Front
				);
				if (!result || !result.image) {
					result = await utils.GetAlbumArtAsyncV2(
						window.ID,
						metadb,
						AlbumArtId.Disc
					);
				}
				if (result && result.image) {
					this.image = this.processImage(result.image);
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

	processImage(image: IGdiBitmap) {
		if (!this.width || !this.height) {
			return;
		}
		return CropImage(image, this.width, this.height);
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
		let img = this.image || this._noCover;
		if (!img) return;
		gr.DrawImage(img, this.x, this.y, this.width, this.height, 0, 0, img.Width, img.Height);
	}

	on_size = debounce(() => {
		this.getArtwork(fb.GetNowPlaying());
	}, 100);
}

export class AlbumArtwork extends Component {
	readonly className = "AlbumArtwork";
	readonly stubImage = imageCache.noCover;

	image: IGdiBitmap;
	_noCover: IGdiBitmap;
	metadb: IFbMetadb;

	constructor() {
		super({})
	}
	processImage(image: IGdiBitmap) {
		if (!this.width || !this.height) {
			return;
		}
		return CropImage(image, this.width, this.height);
	}

	async getArtwork(metadb: IFbMetadb) {
		if (!this._noCover || this._noCover.Width !== this.width) {
			// console.log(this.width, this.height);
			this._noCover = this.processImage(this.stubImage);
		}

		// getalbumart;
		if (metadb) {
			this.metadb = metadb;

			let result = await utils.GetAlbumArtAsyncV2(
				window.ID, metadb, AlbumArtId.Front
			);
			if (!result || !result.image) {
				result = await utils.GetAlbumArtAsyncV2(
					window.ID, metadb, AlbumArtId.Disc
				);
			};
			if (result && result.image) {
				this.image = this.processImage(result.image);
			} else {
				this.image = null;
			}
		} else {
			this.image = null;
			this.metadb = null;
		}
		this.repaint();
	}

	on_init() {
		if (this.metadb) {
			this.getArtwork(this.metadb);
		}
	}

	on_paint(gr: IGdiGraphics) {
		let img = this.image || this._noCover;
		if (!img) return;
		gr.DrawImage(img, this.x, this.y, this.width, this.height, 0, 0, img.Width, img.Height);
	}

	on_size = debounce(() => {
		this.getArtwork(this.metadb);
	}, 100);

}