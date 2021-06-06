/**
 * This type file should be compatible with foo_spider_monkey_panel.dll v1.4.0,
 * if not, please let me know.
 */

// version: v1.4.0

/**
 * Evaluates the script in file.
 * Similar to eval({@link utils.ReadTextFile}(path)), but provides better error reporting
 *
 * @param {string} path Path to JavaScript file
 */
declare var include: (path: string) => void;

type StringOrNumber = string | number;

interface IFbUtils {

    /** 
     * returns foobar2000 version as a string, e.g. 1.4.1;
     */
    Version: string;


    /** At %appdata%\foobar2000 or foobar2000 installation folder; */
    ProfilePath: string;

    /**
     * @type {boolean}
     *
     * @example
     * fb.AlwaysOnTop = !fb.AlwaysOnTop; // Toggles the current value.
     */
    AlwaysOnTop: boolean; //(boolean) (read, write)

    /**
     * @type {string}
     * @readonly
     *
     * @example
     * console.log(fb.ComponentPath); // C:\Users\User\AppData\Roaming\foobar2000\user-components\foo_spider_monkey_panel\
     */
    readonly ComponentPath: string; // (string) (read)

    /** @type {boolean} */
    CursorFollowPlayback: boolean; // (boolean) (read, write)

    /**
     * @type {string}
     * @readonly
     */
    readonly FoobarPath: string; // (string) (read)

    /**
     * @type {boolean}
     * @readonly
     */
    readonly IsPaused: boolean; // (boolean) (read)

    /**
     * @type {boolean}
     * @readonly
     */
    readonly IsPlaying: boolean; // (boolean) (read)

    /**
     * @type {float}
     * @readonly
     *
     * @example
     * console.log(fb.PlaybackLength); // 322.843414966166
     *
     * @example
     * console.log(Math.round(fb.PlaybackLength)); // 323
     */
    readonly PlaybackLength: number; // (double) (read)

    /**
     * @type {float}
     *
     * @example
     * fb.PlaybackTime = 60; // Jumps to the 1 minute mark.
     */
    PlaybackTime: number; // (double) (read, write)

    /**
     * 0 - None<br>
     * 1 - Track<br>
     * 2 - Album<br>
     * 3 - Track/Album by Playback Order (only available in foobar2000 v1.3.8 and later)
     *
     * @type {number}
     */
    ReplaygainMode: number; // (uint) (read, write)

    /**
     * @type {boolean}
     *
     * @example
     * fb.StopAfterCurrent = !fb.StopAfterCurrent; // Toggles the current value.
     */
    StopAfterCurrent: boolean; // (boolean) (read, write)

    /**
     * @type {float}
     *
     * @example
     * fb.Volume = 0; // Sets the volume to max. -100 is the minimum.
     */
    Volume: number; // (float) (read, write),

    /**
     * @return {FbUiSelectionHolder}
     */
    AcquireUiSelectionHolder(): IFbUiSelectionHolder; // (FbUiSelectionHolder)

    /** @method */
    AddDirectory(): void; // (void)

    /** @method */
    AddFiles(): void; // (void)

    /**
     * Checks Clipboard contents are handles or a file selection from Windows Explorer. Use in conjunction
     * with {@link fb.GetClipboardContents}.
     *
     * @return {boolean}
     */
    CheckClipboardContents(): boolean; // (boolean)

    /**
     * Clears active playlist.<br>
     * If you wish to clear a specific playlist, use {@link plman.ClearPlaylist}(playlistIndex).
     */
    ClearPlaylist(): void; // (void)

    /**
     * Note: items can then be pasted in other playlist viewers or in Windows Explorer as files.
     *
     * @param {FbMetadbHandleList} handle_list
     * @return {boolean}
     *
     * @example <caption>Copy playlist items</caption>
     * let handle_list = plman.GetPlaylistSelectedItems(plman.ActivePlaylist);
     * fb.CopyHandleListToClipboard(handle_list);
     *
     * @example <caption>cut playlist items</caption>
     * let ap = plman.ActivePlaylist;
     * if (!plman.IsPlaylistLocked(ap)) {
     *    let handle_list = plman.GetPlaylistSelectedItems(ap);
     *    if (fb.CopyHandleListToClipboard(handle_list)) {
     *        plman.UndoBackup(ap);
     *        plman.RemovePlaylistSelection(ap);
     *    }
     *  }
     */
    CopyHandleListToClipboard(metadbList: IFbMetadbList): boolean; // (boolean)

    /**
     * @return {ContextMenuManager}
     *
     * @example
     * // See samples\basic\MainMenuManager All-In-One, samples\basic\Menu Sample.txt
     */
    CreateContextMenuManager(): IContextMenuManager; // (ContextMenuManager)

    /**
     * Returns an empty handle list.<br>
     * Deprecated: use {@link FbMetadbHandleList} constructor instead.
     *
     * @deprecated
     * @return {FbMetadbHandleList}
     */
    CreateHandleList(): void; // (FbMetadbHandleList)

    /**
     * @return {MainMenuManager}
     *
     * @example
     * // See samples\basic\MainMenuManager All-In-One, samples\basic\Menu Sample.txt
     */
    CreateMainMenuManager(): IMainMenuManager; // (MainMenuManager)

    /**
     * @param {string=} [name=''] Will be shown in console when used with {@link FbProfiler#Print} method.
     * @return {FbProfiler}
     */
    CreateProfiler(name: string): IFbProfiler; // (FbProfiler) [name]

    /**
     * Invokes drag-n-drop operation (see {@link https://msdn.microsoft.com/en-us/library/windows/desktop/ms678486.aspx}).<br>
     * <br>
     * Quick tips:<br>
     * - If you need only to drag from your panel with copy (i.e. without physically moving them):
     *      use only fb.DoDragDrop(handles, DROPEFFECT_COPY | DROPEFFECT_LINK).<br>
     * - If you need only to receive drop to your panel with copy:
     *      handle on_drop_* callbacks, while setting action.effect argument to (DROPEFFECT_COPY | DROPEFFECT_LINK).<br>
     * <br>
     * Full drag-n-drop interface description:<br>
     * - Drag-n-drop interface is based on Microsoft IDropSource and IDropTarget interfaces, so a lot of info (including examples) could be gathered from MSDN (IDropSource, IDropTarget, DoDragDrop, DROPEFFECT).<br>
     * - Drag operation is started with DoDragDrop (whether it is called by your panel, or externally) with okEffects argument supplied.<br>
     * - DoDragDrop blocks code execution until the drag operation is finished (callbacks will be called properly though). It returns effect from Action.Effect from on_drag_drop after completion.<br>
     * - (Spider Monkey Panel specific) Drag operation is canceled when any mouse button is pressed.<br>
     * - (Spider Monkey Panel specific) All mouse callbacks are suppressed during drag operation (including on_mouse_lbtn_up, but excluding on_mouse_mbtn_up and on_mouse_rbtn_up).<br>
     * - Every drag callback receives Action argument. Action.Effect contains okEffects from DoDragDrop call. Action.Effect should be changed to the desired effect in the callback.
     *   If the returned Action.Effect was not in okEffects or is equal to DROPEFFECT_NONE (=== 0), then drop will be denied:
     *   cursor icon will be changed, on_drag_drop won't be called after releasing lmbtn, on_drag_leave will be called instead.<br>
     * - DROPEFFECT_LINK should be used as fallback in case effect argument does not have DROPEFFECT_COPY (===1), since some external drops only allow DROPEFFECT_LINK effect.<br>
     * - Changing effect on key modifiers is nice (to be in line with native Windows behaviour): see example here: https://github.com/TheQwertiest/CaTRoX_QWR/blob/ab1aa4c7fc19e08d3ccff84d5959779ba46bf704/theme/Scripts/Panel_Playlist.js#L2512 .<br>
     *
     * @param {number} window_id see {@link window.ID}
     * @param {FbMetadbHandleList} handle_list
     * @param {number} effect Allowed effects.
     * @param {object=} [options=undefined] Customization options for the data displayed in the drag window.
     * @param {boolean=} [options.show_text=true] If true, will add track count text.
     * @param {boolean=} [options.use_album_art=true] If true, will use album art of the focused item from dragged tracks (if available)
     * @param {boolean=} [options.use_theming=true] If true, will use Windows drag window style. Album art and custom image are resized to fit when Windows style is active.
     * @param {?GdiBitmap=} [options.custom_image=undefined] Custom dragging image. Will be also displayed if use_album_art is true, but there is no album art available.
     * @return {number} Effect that was returned in {@link module:callbacks~on_drag_drop on_drag_drop}.
     *
     * @example
     * // See samples/basic/DragnDrop.txt
     */
    DoDragDrop(
        windowId: number,
        handle_list: IFbMetadbList,
        effect: number,
        options?: {
            show_text?: boolean;
            use_album_art?: boolean;
            use_theming?: boolean;
            custom_image?: IGdiBitmap;
        }
    ): number;

    /** @method */
    Exit(): void;

    /**
     * Note: clipboard contents can be handles copied to the clipboard in other components,
     * from {@link fb.CopyHandleListToClipboard} or a file selection, from Windows Explorer and etc.<br>
     * <br>
     * Performance note: validate clipboard content with {@link fb.CheckClipboardContents} before calling this method.
     *
     * @param {number} window_id
     * @return {FbMetadbHandleList}
     *
     * @example
     * function on_mouse_rbtn_up(x, y) {
     *    let ap = plman.ActivePlaylist;
     *    let menu = window.CreatePopupMenu();
     *    menu.AppendMenuItem(!plman.IsPlaylistLocked(ap) && fb.CheckClipboardContents() ? MF_STRING : MF_GRAYED, 1, "Paste"); // see Flags.js for MF_* definitions
     *    let idx = menu.TrackPopupMenu(x, y);
     *    if (idx == 1) {
     *        let handle_list  = fb.GetClipboardContents(window.ID);
     *        plman.InsertPlaylistItems(ap, plman.PlaylistItemCount(ap), handle_list );
     *    }
     *    return true;
     * }
     */
    GetClipboardContents(winow_id: number): IFbMetadbList;

    /**
     * @param {boolean=} [force=true] When true, it will use the first item of the active playlist if it is unable to get the focus item.
     * @return {FbMetadbHandle}
     */
    GetFocusItem(force?: boolean): IFbMetadb;

    /**
     * Returns all Media Library items as a handle list.
     *
     * @return {FbMetadbHandleList}
     */
    GetLibraryItems(): IFbMetadbList;

    /**
     * Note: do not use this while looping through a handle list. Use {@link FbMetadbHandleList#GetLibraryRelativePaths} instead. <br>
     * <br>
     * Returns an empty string when used on track not in Media Library
     *
     * @param {FbMetadbHandle} handle
     * @return {string}
     *
     * @example
     * // The foobar2000 Media Library is configured to watch "D:\Music" and the
     * // path of the now playing item is "D:\Music\Albums\Artist\Some Album\Some Song.flac"
     * let handle = fb.GetNowPlaying();
     * console.log(fb.GetLibraryRelativePath(handle)); // Albums\Artist\Some Album\Some Song.flac*
     */
    GetLibraryRelativePath(): string;

    /**
     * Get handle of the now playing track.
     *
     * @return {?FbMetadbHandle} null, if nothing is being played.
     */
    GetNowPlaying(): IFbMetadb | null;

    /**
     * Available only in foobar2000 v1.4 and above. Throws a script error on v1.3. * <br>
     * Returns a JSON array in string form so you need to use JSON.parse() on the result.
     *
     * @return {string}
     *
     * @example
     * let str = fb.GetOutputDevices();
     * let arr = JSON.parse(str);
     * console.log(JSON.stringify(arr, null, 4));
     * // [
     * //     {
     * //         "active": false,
     * //         "device_id": "{5243F9AD-C84F-4723-8194-0788FC021BCC}",
     * //         "name": "Null Output",
     * //         "output_id": "{EEEB07DE-C2C8-44C2-985C-C85856D96DA1}"
     * //     },
     * //     {
     * //         "active": true,
     * //         "device_id": "{00000000-0000-0000-0000-000000000000}",
     * //         "name": "Primary Sound Driver",
     * //         "output_id": "{D41D2423-FBB0-4635-B233-7054F79814AB}"
     * //     },
     * //     {
     * //         "active": false,
     * //         "device_id": "{1C4EC038-97DB-48E7-9C9A-05FDED46847B}",
     * //         "name": "Speakers (Sound Blaster Z)",
     * //         "output_id": "{D41D2423-FBB0-4635-B233-7054F79814AB}"
     * //     },
     * //     {
     * //         "active": false,
     * //         "device_id": "{41B86272-3D6C-4A5A-8907-4FE7EBE39E7E}",
     * //         "name": "SPDIF-Out (Sound Blaster Z)",
     * //         "output_id": "{D41D2423-FBB0-4635-B233-7054F79814AB}"
     * //     },
     * //     {
     * //         "active": false,
     * //         "device_id": "{9CDC0FAE-2870-4AFA-8287-E86099D69076}",
     * //         "name": "3 - BenQ BL3200 (AMD High Definition Audio Device)",
     * //         "output_id": "{D41D2423-FBB0-4635-B233-7054F79814AB}"
     * //     }
     * // ]
     * // As you can see, only one of the items in the array has "active"
     * // set to true so that is the device you'd want to display the name of
     * // or mark as selected in a menu.
     */
    GetOutputDevices(): string;

    /**
     * Note: use try/catch to handle invalid queries. An empty handle list will be returned if the query
     * is valid but there are no results.
     *
     * @param {FbMetadbHandleList} handle_list
     * @param {string} query
     * @return {FbMetadbHandleList} Unsorted results.
     *
     * @example
     * let a = fb.GetQueryItems(plman.GetPlaylistItems(plman.ActivePlaylist), "rating IS 5");
     *
     * @example
     * let b = fb.GetQueryItems(fb.GetLibraryItems(), "rating IS 5");
     */
    GetQueryItems(handle_list: IFbMetadbList, query: string): IFbMetadbList;

    /**
     * Gets now playing or selected item according to settings in "File>Preferences>Display>Selection viewers".
     *
     * @return {?IFbMetadb}
     */
    GetSelection(): IFbMetadb | undefined;

    /**
     * Works like {@link fb.GetSelection}, but returns a handle list.<br>
     *
     * @param {number=} [flags=0] 1 - no now playing
     * @return {FbMetadbHandleList}
     */
    GetSelections(flags: number): IFbMetadbList;

    /**
     * Retrieves what the selection type is.
     *
     * @return {number}
     *     0 - undefined (no item)<br>
     *     1 - active_playlist_selection<br>
     *     2 - caller_active_playlist<br>
     *     3 - playlist_manager<br>
     *     4 - now_playing<br>
     *     5 - keyboard_shortcut_list<br>
     *     6 - media_library_viewer
     */
    GetSelectionType(): number;

    /**
     * @return {boolean}
     */
    IsLibraryEnabled(): boolean;

    /**
     * Performance note: don't use in `on_paint`.
     *
     * @param {string} command Path to main menu item
     * @return {boolean} true, if the item is checked.
     *
     * @example
     * fb.RunMainMenuCommand("Playback/Scrobble Tracks"); // available with foo_scrobble
     */
    IsMainMenuCommandChecked(command: string): boolean;

    /**
     * @param {FbMetadbHandle} handle
     * @return {boolean}
     *
     * @example
     * let np = fb.GetNowplaying();
     * console.log(fb.IsMetadbInMediaLibrary(np)); // If false, playing track is not in Media Library.
     */
    IsMetadbInMediaLibrary(handle: IFbMetadb): boolean;

    /**
     * Loads playlist from file. Equivalent to `File`>`Load Playlist...`.
     *
     * @method
     */
    LoadPlaylist(): void;

    /** @method */
    Next(): void;

    /** @method */
    Pause(): void;

    /** @method */
    Play(): void;

    /** @method */
    PlayOrPause(): void;

    /** @method */
    Prev(): void;

    /** @method */
    Random(): void;

    /**
     * Shows context menu for currently played track.
     *
     * @param {string} command
     * @param {number=} [flags=0]
     *     0 - default (depends on whether SHIFT key is pressed, flag_view_reduced or flag_view_full is selected)<br>
     *     4 - flag_view_reduced<br>
     *     8 - flag_view_full. This can be useful if you need to run context commands the user may have hidden
     *         using File>Preferences>Display>Context Menu<br>
     * @return {boolean}
     *
     * @example
     * fb.RunContextCommand("Properties");
     */
    RunContextCommand(command: string, flags?: number): boolean;

    /**
     * Shows context menu for supplied tracks.
     *
     * @param {string} command
     * @param {FbMetadbHandle|FbMetadbHandleList} handle_or_handle_list Handles on which to apply context menu
     * @param {number=} flags Same flags as {@link fb.RunContextCommand}
     * @return {boolean}
     */
    RunContextCommandWithMetadb(
        command: string,
        handle_or_handle_list: IFbMetadb | IFbMetadbList,
        flags?: number
    ): boolean;

    /**
     * @param {string} command
     * @return {boolean}
     *
     * @example
     * fb.RunMainMenuCommand("File/Add Location...");
     */
    RunMainMenuCommand(command: string): boolean;

    /** @method */
    SavePlaylist(): void;

    /**
     * Available only in foobar2000 v1.4 and above. Throws a script error on v1.3.<br>
     * See {@link fb.GetOutputDevices}.
     *
     * @param {string} output
     * @param {string} device
     *
     * @example
     * // To actually change device, you'll need the device_id and output_id
     * // and use them with fb.SetOutputDevice.
     * let str = fb.GetOutputDevices();
     * let arr = JSON.parse(str);
     * // Assuming same list from above, switch output to the last device.
     * fb.SetOutputDevice(arr[4].output_id, arr[4].device_id);
     */
    SetOutputDevice(output: string, device: string): void;

    /** @method */
    ShowConsole(): void;

    /**
     * Opens the Library>Search window populated with the query you set.
     *
     * @param {string} query
     */
    ShowLibrarySearchUI(query: string): void;

    /**
     * @param {string} message
     * @param {string=} [title='Spider Monkey Panel']
     */
    ShowPopupMessage(message: string, title: string): void;

    /** @method */
    ShowPreferences(): void;

    /** @method */
    Stop(): void;

    /**
     * Performance note: if you use the same query frequently,
     * try caching FbTitleFormat object (by storing it somewhere),
     * instead of creating it every time.
     *
     * @param {string} expression
     * @return {FbTitleFormat}
     */
    TitleFormat(expression: string): IFbTitleFormat;

    /** @method */
    VolumeDown(): void;

    /** @method */
    VolumeMute(): void;

    /** @method */
    VolumeUp(): void;

    /**
     * Does the same thing as `utils.FileTest(path, 'charset')`;
     * 
     * @method
     * @param {string} path
     */
    DetectCharset(path: string): string;

    /**
     * It uses the same editor as the one that is set for editing scripts in
     * `window.ShowConfigureV2`;
     * 
     * @method
     * @param {string} path
     * 
     */
    EditTextFile(path: string): void;

    /**
     * Does the same thing as `FileTest(path, 'e');
     * 
     * @method
     * @param {string} path
     */
    FileExists(path: string): boolean;

    /**
     * @method
     * @param {string} path
     */
    GetFileSize(path: string): string;

    /**
     * Package id can be retrieved from `window.ScriptInfo` (only if the panel
     * actually uses script package)
     * 
     * @param {number} package_id
     */
    GetPackagePath(package_id: number): string;

    /**
     *  Does the same thing as `utils.FileTest(path, 'd');
     * 
     * @param {string} path
     */
    IsDirectory(path: string): boolean;


    /**
     * @param {string} path
     */
    IsFile(path: string): boolean;

    /**
     * @param {string} path
     */
    SplitFilePath(path: string): string[];

}

/**
 * Functions for working with graphics. Most of them are wrappers for Gdi and GdiPlus methods.
 *
 * @namespace
 */
interface IGdiUtils {
    /**
     * @param {number} w
     * @param {number} h
     * @return {IGdiBitmap}
     */
    CreateImage(w: number, h: number): IGdiBitmap;

    /**
     * Performance note: avoid using inside `on_paint`.
     *
     * @param {string} name
     * @param {number} ptSize See Helper.js > Point2Pixel function for conversions
     * @param {number=} [style=0] See Flags.js > FontStyle
     * @return {?GdiFont} null, if font is not present.
     */
    Font(name: string, ptSize: number, style?: number): IGdiFont;

    /**
     * Load image from file.<br>
     * <br>
     * Performance note: consider using {@link gdi.LoadImageAsync} or {@link gdi.LoadImageAsyncV2} if there are a lot of images to load
     * or if the image is big.
     *
     * @param {string} path
     * @return {?GdiBitmap} null, if image failed to load.
     *
     * @example
     * let img = gdi.Image('e:\\images folder\\my_image.png');
     */
    Image(path: string): IGdiBitmap;

    /**
     * Load image from file asynchronously.
     *
     * @param {number} window_id see {@link window.ID}
     * @param {string} path
     * @return {number} a unique id, which is used in {@link module:callbacks~on_load_image_done on_load_image_done}.
     *
     * @example
     * // See samples\basic\LoadImageAsync.txt
     */
    LoadImageAsync(window_id: number, path: string): number;

    /**
     * Load image from file asynchronously.
     * Returns a `Promise` object, which will be resolved when image loading is done.
     *
     * @param {number} window_id see {@link window.ID}
     * @param {string} path
     * @return {Promise.<?GdiBitmap>}
     *
     * @example
     * // See samples\basic\LoadImageAsyncV2.txt
     */
    LoadImageAsyncV2(window_id: number, path: string): Promise<IGdiBitmap>;
}

/**
 * Functions for managing foobar2000 playlists.
 *
 * @namespace
 */
interface IFbPlaylistManager {
    /**
     * -1 if there is no active playlist.
     *
     * @type {number}
     *
     * @example
     * console.log(plman.ActivePlaylist);
     *
     * @example
     * plman.ActivePlaylist = 1; // Switches to 2nd playlist.
     */
    ActivePlaylist: number; // (int) (read, write)

    /**
     * 0 - Default<br>
     * 1 - Repeat (Playlist)<br>
     * 2 - Repeat (Track)<br>
     * 3 - Random<br>
     * 4 - Shuffle (tracks)<br>
     * 5 - Shuffle (albums)<br>
     * 6 - Shuffle (folders)
     *
     * @type {number}
     */
    PlaybackOrder: number; // (uint) (read, write)

    /**
     * -1 if there is no playing playlist.
     *
     * @type {number}
     *
     * @example
     * console.log(plman.PlayingPlaylist);
     */
    PlayingPlaylist: number; // (int) (read, write)

    /**
     * @type {number}
     * @readonly
     */
    readonly PlaylistCount: number; // (uint) (read)

    /**
     * A Recycle Bin for playlists.
     *
     * @type {IFbPlaylistRecycler}
     * @readonly
     */
    readonly PlaylistRecycler: IFbPlaylistRecycler; // (FbPlaylistRecycler) (read)

    /**
     * This operation is asynchronous and may take some time to complete if it's a large array.
     *
     * @param {number} playlistIndex
     * @param {Array<string>} paths An array of files/URLs
     * @param {boolean=} [select=false]
     *        If true, the active playlist will be set to the playlistIndex, the items will
     *        be selected and focus will be set to the first new item.
     *
     * @example
     * plman.AddLocations(plman.ActivePlaylist, ["e:\\1.mp3"]);
     * // This operation is asynchronous, so any code in your script directly
     * // after this line will run immediately without waiting for the job to finish.
     */
    AddLocations(playlistIndex: number, paths: string[], select: boolean): void;

    /**
     * @param {number} playlistIndex
     *
     * @example
     * plman.ClearPlaylist(plman.PlayingPlaylist);
     */
    ClearPlaylist(playlistIndex: number): void;

    /**
     * @param {number} playlistIndex
     *
     * @example
     * plman.ClearPlaylistSelection(plman.ActivePlaylist);
     */
    ClearPlaylistSelection(playlistIndex: number): void;

    /**
     * @param {number} playlistIndex
     * @param {string} name A name for the new Autplaylist
     * @param {string} query A valid query
     * @param {string=} [sort=''] Title formatting pattern.
     * @param {number=} [flags=0] Use 1 to force sort
     * @return {number} -1 on failure
     */
    CreateAutoPlaylist(
        playlistIndex: number,
        name: string,
        query: string,
        sort?: string,
        flags?: number
    ): number;

    /**
     * @param {number} playlistIndex
     * @param {string} name
     * @return {number} -1 on failure.
     *
     * @example
     * // Creates a new playlist named "New playlist", which is put at the beginning of the current playlists.
     * plman.CreatePlaylist(0, '');
     *
     * @example
     * // Create a new playlist named "my favourites", which is put at the end.
     * plman.CreatePlaylist(plman.PlaylistCount, 'my favourites');
     */
    CreatePlaylist(playlistIndex: number, name: string): number;

    /**
     * Note: the duplicated playlist gets inserted directly after the source playlistIndex.<br>
     * It only duplicates playlist content, not the properties of the playlist (e.g. Autoplaylist).
     *
     * @param {number} playlistIndex
     * @param {?string=} [name] A name for the new playlist. If the name is "" or undefined, the name of the source playlist will be used.
     * @return {number}
     */
    DuplicatePlaylist(playlistIndex: number, name: string): number;

    /**
     * Signals playlist viewers to display the track (e.g. by scrolling to it's position).
     *
     * @param {number} playlistIndex
     * @param {number} playlistItemIndex
     */
    EnsurePlaylistItemVisible(
        playlistIndex: number,
        playlistItemIndex: number
    ): void;

    /**
     * Starts playback by executing default doubleclick/enter action unless overridden by a lock to do something else.
     *
     * @param {number} playlistIndex
     * @param {number} playlistItemIndex
     * @return {boolean} -1 on failure.
     */
    ExecutePlaylistDefaultAction(
        playlistIndex: number,
        playlistItemIndex: number
    ): boolean;

    /**
     * Returns playlist index of the named playlist or creates a new one, if not found.<br>
     * If a new playlist is created, the playlist index of that will be returned.
     *
     * @param {string} name
     * @param {boolean} unlocked If true, locked playlists are ignored when looking for existing playlists.
     *                           If false, the playlistIndex of any playlist with the matching name will be returned.
     * @return {number}
     */
    FindOrCreatePlaylist(name: string, unlocked: boolean): number;

    /**
     * @param {string} name Case insensitive.
     * @return {number} playlistIndex or -1 on failure.
     */
    FindPlaylist(name: string): number;

    /**
     * Retrieves playlist position of currently playing item.<br>
     * On failure, the property {@link FbPlayingItemLocation#IsValid} will be set to false.
     *
     * @return {IFbPlayingItemLocation}
     */
    GetPlayingItemLocation(): IFbPlayingItemLocation;

    /**
     * @param {number} playlistIndex
     * @return {number} Returns -1 if nothing is selected
     *
     * @example
     * let focus_item_index = plman.GetPlaylistFocusItemIndex(plman.ActivePlaylist); // 0 would be the first item
     */
    GetPlaylistFocusItemIndex(playlistIndex: number): number;

    /**
     * @param {number} playlistIndex
     * @return {FbMetadbHandleList}
     *
     * @example
     * let handle_list = plman.GetPlaylistItems(plman.PlayingPlaylist);
     */
    GetPlaylistItems(playlistIndex: number): IFbMetadbList;

    /**
     * @param {number} playlistIndex
     * @return {string}
     *
     * @example
     * console.log(plman.GetPlaylistName(plman.ActivePlaylist));
     */
    GetPlaylistName(playlistIndex: number): string;

    /**
     * @param {number} playlistIndex
     * @return {FbMetadbHandleList}
     *
     * @example
     * let selected_items = plman.GetPlaylistSelectedItems(plman.ActivePlaylist);
     */
    GetPlaylistSelectedItems(playlistIndex: number): IFbMetadbList;

    /**
     * @param {number} playlistIndex
     * @param {number} base Position in playlist
     * @param {FbMetadbHandleList} handle_list Items to insert
     * @param {boolean=} [select=false] If true then inserted items will be selected
     * @return {number}
     *
     * @example <caption>Add all library tracks to beginning of playlist.</caption>
     * let ap = plman.ActivePlaylist;
     * plman.InsertPlaylistItems(ap, 0, fb.GetLibraryItems());
     *
     * @example <caption>Add all library tracks to end of playlist.</caption>
     * let ap = plman.ActivePlaylist;
     * plman.InsertPlaylistItems(ap, plman.PlaylistItemCount(ap), fb.GetLibraryItems());
     */
    InsertPlaylistItems(
        playlistIndex: number,
        base: number,
        handle_list: IFbMetadbList,
        select?: boolean
    ): void;

    /**
     * Same as {@link plman.InsertPlaylistItems} except any duplicates contained in handle_list are removed.
     *
     * @param {number} playlistIndex
     * @param {number} base
     * @param {FbMetadbHandleList} handle_list
     * @param {boolean=} [select=false]
     * @return {number}
     */
    InsertPlaylistItemsFilter(
        playlistIndex: number,
        base: number,
        handle_list: IFbMetadbList,
        select?: boolean
    ): number;

    /**
     * @param {number} playlistIndex
     * @return {boolean}
     */
    IsAutoPlaylist(playlistIndex: number): boolean;

    /**
     * @param {number} playlistIndex
     * @param {number} playlistItemIndex
     * @return {boolean}
     */
    IsPlaylistItemSelected(
        playlistIndex: number,
        playlistItemIndex: number
    ): boolean;

    /**
     * Note: returns true, if the playlist is an autoplaylist. To determine if a playlist is not an autoplaylist,
     * but locked with something like `foo_utils` or `foo_playlist_attributes`, use with conjunction of {@link plman.IsAutoPlaylist}.
     *
     * @param {number} playlistIndex
     * @return {boolean}
     */
    IsPlaylistLocked(playlistIndex: number): boolean;

    /**
     * @param {number} from
     * @param {number} to
     * @return {boolean}
     */
    MovePlaylist(from: number, to: number): boolean;

    /**
     * @param {number} playlistIndex
     * @param {number} delta
     * @return {boolean}
     *
     * @example
     * // Moves selected items to end of playlist.
     * plman.MovePlaylistSelection(plman.ActivePlaylist, plman.PlaylistItemCount(plman.ActivePlaylist));
     */
    MovePlaylistSelection(playlistIndex: number, delta: number): boolean;

    /**
     * @param {number} playlistIndex
     * @return {number}
     *
     * @example
     * console.log(plman.PlaylistItemCount(plman.PlayingPlaylist)); // 12
     */
    PlaylistItemCount(playlistIndex: number): number;

    /**
     * Removes the specified playlist.<br>
     * Note: if removing the active playlist, no playlist will be active after using this. You'll
     * need to set it manually or use {@link plman.RemovePlaylistSwitch} instead.
     *
     * @param {number} playlistIndex
     * @return {boolean}
     */
    RemovePlaylist(playlistIndex: number): boolean;

    /**
     * @param {number} playlistIndex
     * @param {boolean=} [crop=false] If true, then removes items that are NOT selected.
     *
     * @example <Remove selected items from playlist>
     * plman.RemovePlaylistSelection(plman.ActivePlaylist);
     *
     * @example <Remove items that are NOT selected>
     * plman.RemovePlaylistSelection(plman.ActivePlaylist, true);
     */
    RemovePlaylistSelection(playlistIndex: number, crop?: boolean): void;

    /**
     * Removes the specified playlist.<br>
     * This automatically sets another playlist as active if removing the active playlist.
     *
     * @param {number} playlistIndex
     * @return {boolean}
     */
    RemovePlaylistSwitch(playlistIndex: number): boolean;

    /**
     * @param {number} playlistIndex
     * @param {string} name
     * @return {boolean}
     */
    RenamePlaylist(playlistIndex: number, name: string): boolean;

    /**
     * Workaround so you can use the Edit menu or run {@link fb.RunMainMenuCommand}("Edit/Something...")
     * when your panel has focus and a dedicated playlist viewer doesn't.
     *
     * @example
     * plman.SetActivePlaylistContext(); // once on startup
     *
     * function on_focus(is_focused) {
     *    if (is_focused) {
     *        plman.SetActivePlaylistContext(); // When the panel gets focus but not on every click
     *    }
     * }
     */
    SetActivePlaylistContext(): void;

    /**
     * @param {number} playlistIndex
     * @param {number} playlistItemIndex
     *
     * @example
     * plman.SetPlaylistFocusItem(plman.ActivePlaylist, 0);
     */
    SetPlaylistFocusItem(
        playlistIndex: number,
        playlistItemIndex: number
    ): void;

    /**
     * @param {number} playlistIndex
     * @param {IFbMetadb} handle
     *
     * @example
     * let ap = plman.ActivePlaylist;
     * let handle = plman.GetPlaylistItems(ap)[1]; // 2nd item in playlist
     * plman.SetPlaylistFocusItemByHandle(ap, handle);
     */
    SetPlaylistFocusItemByHandle(
        playlistIndex: number,
        handle: IFbMetadb
    ): void;

    /**
     * @param {number} playlistIndex
     * @param {Array<number>} affectedItems An array of item indexes.
     * @param {boolean} state
     *
     * @example
     * // Selects first, third and fifth tracks in playlist. This does not affect other selected items.
     * plman.SetPlaylistSelection(plman.ActivePlaylist, [0, 2, 4], true);
     */
    SetPlaylistSelection(
        playlistIndex: number,
        affectedItems: number[],
        state: boolean
    ): void;

    /**
     * @param {number} playlistIndex
     * @param {number} playlistItemIndex
     * @param {boolean} state
     *
     * @example
     * // Deselects first playlist item. Only works when it is already selected!
     * plman.SetPlaylistSelectionSingle(plman.ActivePlaylist, 0, false);
     *
     * @example
     * let ap = plman.ActivePlaylist;
     * // Selects last item in playlist. This does not affect other selected items.
     * plman.SetPlaylistSelectionSingle(ap, plman.PlaylistItemCount(ap) - 1, true);
     */
    SetPlaylistSelectionSingle(
        playlistIndex: number,
        playlistItemIndex: number,
        state: boolean
    ): void;

    /**
     * Shows popup window letting you edit certain autoplaylist properties.<br>
     * Before using, check if your playlist is an autoplaylist by using {@link plman.IsAutoPlaylist};
     *
     * @param {number} playlistIndex
     * @return {boolean}
     *
     * @example
     * fb.ShowAutoPlaylistUI(plman.ActivePlaylist);
     */
    ShowAutoPlaylistUI(playlistIndex: number): boolean;

    /**
     * @param {number} playlistIndex Index of playlist to alter.
     * @param {string} pattern Title formatting pattern to sort by. Set to "" to randomise the order of items.
     * @param {boolean=} [selected_items_only=false]
     * @return {boolean} true on success, false on failure (playlist locked etc).
     */
    SortByFormat(
        playlistIndex: number,
        pattern: string,
        selected_items_only?: boolean
    ): boolean;

    /**
     * @param {number} playlistIndex Index of playlist to alter.
     * @param {string} pattern Title formatting pattern to sort by.
     * @param {number=} [direction=1]
     *     1 - ascending<br>
     *     -1 - descending<br>
     * @return {boolean}
     */
    SortByFormatV2(
        playlistIndex: number,
        pattern: string,
        direction: number
    ): boolean;

    /**
     * @param {number=} [direction=1]
     *     1 - ascending<br>
     *     -1 - descending<br>
     */
    SortPlaylistsByName(direction: number): void;

    /**
     * Saves playlist's current state: this will enable `Edit`>`Undo` menu item after calling other {@link plman} methods that change playlist content.<br>
     * Note: this method should be called before performing modification to the playlist.
     *
     * @param {number} playlistIndex
     */
    UndoBackup(playlistIndex: number): void;

    /**
     * @param {IFbMetadb} handle
     */
    AddItemToPlaybackQueue(handle: IFbMetadb): void;

    /**
     * @param {number} playlistIndex
     * @param {number} playlistItemIndex
     */
    AddPlaylistItemToPlaybackQueue(
        playlistIndex: number,
        playlistItemIndex: number
    ): void;

    /**
     * @param {IFbMetadb} handle
     * @param {number} playlistIndex
     * @param {number} playlistItemIndex
     * @return {number} -1 on failure
     */
    FindPlaybackQueueItemIndex(
        handle: IFbMetadb,
        playlistIndex: number,
        playlistItemIndex: number
    ): number;

    /** @method */
    FlushPlaybackQueue(): void;

    /**
     * @return {Array<FbPlaybackQueueItem>}
     *
     * @example
     * let contents = plman.GetPlaybackQueueContents();
     * if (contents.length) {
     *     // access properties of first item
     *     console.log(contents[0].PlaylistIndex, contents[0].PlaylistItemIndex);
     * }
     */
    GetPlaybackQueueContents(): IFbPlaybackQueueItem[];

    /**
     * @return {IFbMetadbList}
     *
     * @example
     * let handles = plman.GetPlaybackQueueHandles();
     * if (handles.Count > 0) {
     *    // use "Count" to determine if Playback Queue is active.
     * }
     */
    GetPlaybackQueueHandles(): IFbMetadbList;

    /**
     * @param {number} index
     */
    RemoveItemFromPlaybackQueue(index: number): void;

    /**
     * @param {Array<number>} affectedItems Array like [1, 3, 5]
     */
    RemoveItemsFromPlaybackQueue(affectedItems: number[]): void;
}

/**
 * Various utility functions.
 *
 * @namespace
 */
interface IWSHUtils {

    /**
     * A string corresponding to the version.
     *
     * Component uses semantic versioning (see {@link https://semver.org}).
     *
     * @type {string}
     *
     * @example
     * function is_compatible(requiredVersionStr) {
     *     let requiredVersion = requiredVersionStr.split('.');
     *     let currentVersion = utils.Version.split('.'); // e.g. 0.1.0-alpha.2
     *     if (currentVersion.length > 3) {
     *         currentVersion.length = 3; // We need only numbers
     *     }
     *
     *     for(let i = 0; i< currentVersion.length; ++i) {
     *       if (currentVersion[i] != requiredVersion[i]) {
     *           return currentVersion[i] > requiredVersion[i];
     *       }
     *     }
     *
     *     return true;
     * }
     *
     * let requiredVersionStr = '1.0.0';
     * if (!is_compatible(requiredVersionStr)) {
     *     fb.ShowPopupMessage(`This script requires v${requiredVersionStr}. Current component version is v${utils.Version}.`);
     * }
     */
    readonly Version: string; // (string) (read)

    /**
     * Checks the availability of foobar2000 component.
     * 
     * @param {string} name
     * @param {boolean=} [is_dll=true] If true, method checks filename as well as the internal name.
     * @return {boolean}
     *
     * @example
     * console.log(utils.CheckComponent("foo_playcount", true));
     */
    CheckComponent(name: string, is_dll?: boolean): boolean;

    /**
     * Check if the font is installed.<br>
     * Note: it cannot detect fonts loaded by `foo_ui_hacks`. However, {@link gdi.Font} can use those fonts.
     *
     * @param {string} name Can be either in English or the localised name in your OS.
     * @return {boolean}
     */
    CheckFont(name: string): boolean;

    /**
     * Spawns a windows popup dialog to let you choose a colour.
     *
     * @param {number} window_id {@link window.ID}
     * @param {number} default_colour
     * @return {number}
     *
     * @example
     * let colour = utils.ColourPicker(window.ID, RGB(255, 0, 0));
     * // See docs\Helper.js for RGB function.
     */
    ColourPicker(window_id: number, default_colour: number): number;

    /**
     * Various utility functions for working with file.
     * 
     * @param {string} path
     * @param {string} mode
     *     "chardet" - Guesses the charset of a file and return the codepage. It may not be accurate and returns 0 if an error occurred.<br>
     *     "e" - If file path exists, returns true.<br>
     *     "s" - Retrieves file size, in bytes.<br>
     *     "d" - If path is a directory, returns true.<br>
     *     "split" - Returns an array of directory, filename and filename extension.
     * @return {*}
     *
     * @example
     * let arr = utils.FileTest("D:\\Somedir\\Somefile.txt", "split");
     * // arr[0] <= "D:\\Somedir\\" (always includes backslash at the end)
     * // arr[1] <= "Somefile"
     * // arr[2] <= ".txt"
     */
    FileTest(path: string, mode: string): boolean | number | string[];

    /**
     * @param {number} seconds
     * @return {string}
     *
     * @example
     * console.log(utils.FormatDuration(plman.GetPlaylistItems(plman.ActivePlaylist).CalcTotalDuration())); // 1wk 1d 17:25:30
     */
    FormatDuration(seconds: number): string;

    /**
     * @param {number} bytes
     * @return {string}
     *
     * @example
     * console.log(utils.FormatFileSize(plman.GetPlaylistItems(plman.ActivePlaylist).CalcTotalSize())); // 7.9 GB
     */
    FormatFileSize(bytes: number): string;

    /**
     * Load art image for the track asynchronously.<br>
     * <br>
     * Performance note: consider using {@link gdi.LoadImageAsync} or {@link gdi.LoadImageAsyncV2} if there are a lot of images to load
     * or if the image is big.
     * 
     * @param {number} window_id {@link window.ID}
     * @param {FbMetadbHandle} handle
     * @param {number=} [art_id=0] See Flags.js > AlbumArtId
     * @param {boolean=} [need_stub=true]
     * @param {boolean=} [only_embed=false]
     * @param {boolean=} [no_load=false]  If true, "image" parameter will be null in {@link module:callbacks~on_get_album_art_done on_get_album_art_done} callback.
     *
     * @example
     * // See samples\basic\GetAlbumArtAsync.txt
     */
    GetAlbumArtAsync(window_id: number, handle: IFbMetadb, art_id?: number, need_stub?: boolean, only_embed?: boolean, no_load?: boolean): void;

    /**
     * @typedef {Object} ArtPromiseResult
     * @property {?GdiBitmap} image null on failure
     * @property {string} image_path path to image file (or track file if image is embedded)
     */

    /**
     * Load art image for the track asynchronously.<br>
     * Returns a `Promise` object, which will be resolved when art loading is done.
     * 
     * @param {number} window_id {@link window.ID}
     * @param {FbMetadbHandle} handle
     * @param {number=} [art_id=0] See Flags.js > AlbumArtId
     * @param {boolean=} [need_stub=true] If true, will return a stub image from `Preferences`>`Display`>`Stub image path` when there is no art image available.
     * @param {boolean=} [only_embed=false] If true, will only try to load the embedded image.
     * @param {boolean=} [no_load=false] If true, then no art loading will be performed and only path to art will be returned in {@link ArtPromiseResult}.
     * @return {Promise.<ArtPromiseResult>}
     *
     * @example
     * // See samples\basic\GetAlbumArtAsyncV2.txt
     */
    GetAlbumArtAsyncV2(window_id: number, handle: IFbMetadb, art_id?: number, need_stub?: boolean, only_embed?: boolean, no_load?: boolean):
        Promise<{
            path: string | null;
            image: IGdiBitmap | null;
        }>

    /**
     * Load embedded art image for the track.<br>
     * <br>
     * Performance note: consider using {@link fb.GetAlbumArtAsync} or {@link fb.GetAlbumArtAsyncV2} if there are a lot of images to load.
     *
     * @param {string} rawpath Path to track file
     * @param {number=} [art_id=0] See Flags.js > AlbumArtId
     * @return {GdiBitmap}
     *
     * @example
     * let img = utils.GetAlbumArtEmbedded(fb.GetNowPlaying().RawPath, 0);
     */
    GetAlbumArtEmbedded(rawpath: string, art_id?: number): IGdiBitmap;

    /**
     * Load art image for the track.<br>
     * <br>
     * Performance note: consider using {@link fb.GetAlbumArtAsync} or {@link fb.GetAlbumArtAsyncV2} if there are a lot of images to load.
     *
     * @param {FbMetadbHandle} handle
     * @param {number=} [art_id=0] See Flags.js > AlbumArtId
     * @param {boolean=} [need_stub=true]
     * @return {GdiBitmap}
     * 
     * @example
     * // See samples\basic\GetAlbumArtV2.txt
     */
    GetAlbumArtV2(handle: IFbMetadb, art_id?: number, need_stub?: boolean): IGdiBitmap;

    /**
     * @param {number} index {@link http://msdn.microsoft.com/en-us/library/ms724371%28VS.85%29.aspx}
     * @return {number} 0 if failed
     *
     * @example
     * let splitter_colour = utils.GetSysColour(15);
     */
    GetSysColour(index: number): number;

    /**
     * @param {number} index {@link http://msdn.microsoft.com/en-us/library/ms724385%28VS.85%29.aspx}
     * @return {number} 0 if failed
     */
    GetSystemMetrics(index: number): number;

    /**
     * Retrieves filepaths that match the supplied pattern.
     * 
     * @param {string} pattern
     * @param {number=} [exc_mask=0x10] Default is FILE_ATTRIBUTE_DIRECTORY. See Flags.js > Used in utils.Glob()
     * @param {number=} [inc_mask=0xffffffff]
     * @return {Array<string>}
     *
     * @example
     * let arr = utils.Glob("C:\\*.*");
     */
    Glob(pattern: string, exc_mask?: number, inc_mask?: number): string[];

    /**
     * @param {number} window_id
     * @param {string} prompt
     * @param {string} caption
     * @param {string=} [defaultval='']
     * @param {boolean=} [error_on_cancel=false] If set to true, use try/catch like Example2.
     * @return {string}
     *
     * @example
     * // With "error_on_cancel" not set (or set to false), cancelling the dialog will return "defaultval".
     * let username = utils.InputBox(window.ID, "Enter your username", "Spider Monkey Panel", "");
     *
     * @example
     * // Using Example1, you can't tell if OK or Cancel was pressed if the return value is the same
     * // as "defaultval". If you need to know, set "error_on_cancel" to true which throws a script error
     * // when Cancel is pressed.
     * let username = "";
     * try {
     *    username = utils.InputBox(window.ID, "Enter your username", "Spider Monkey Panel", "", true);
     *    // OK was pressed.
     * } catch(e) {
     *     // Dialog was closed by pressing Esc, Cancel or the Close button.
     * }
     */
    InputBox(window_id: number, prompt: string, caption: string, defaultval?: string, error_on_cancel?: boolean): string;

    /**
     * @param {number} vkey {@link http://msdn.microsoft.com/en-us/library/ms927178.aspx}. Some are defined in Flags.js > Used with utils.IsKeyPressed().
     * @return {boolean}
     */
    IsKeyPressed(vkey: number): boolean;

    /**
     * See {@link https://docs.microsoft.com/en-us/windows/desktop/api/winnls/nf-winnls-lcmapstringa}.
     * 
     * @param {string} text
     * @param {string} lcid
     * @param {number} flags
     * @return {string}
     */
    MapString(text: string, lcid: string, flags: number): string;

    /**
     * Check if the supplied string matches the pattern.<br>
     * Using Microsoft MS-DOS wildcards match type. eg "*.txt", "abc?.tx?"
     *
     * @param {string} pattern
     * @param {string} str
     * @return {boolean}
     */
    PathWildcardMatch(pattern: string, str: string): boolean;

    /**
     * Performance note: supply codepage argument if it is known, since codepage detection might take some time.
     * 
     * @param {string} filename
     * @param {number=} [codepage=0] See Codepages.js. If codepage is 0, then automatic detection is performed.
     * @return {string}
     *
     * @example
     * let text = utils.ReadTextFile("E:\\some text file.txt");
     */
    ReadTextFile(filename: string, codepage?: number): string;

    /**
     * Note: this only returns up to 255 characters per value.
     *
     * @param {string} filename
     * @param {string} section
     * @param {string} key
     * @param {string=} [defaultval]
     * @return {string}
     *
     * @example
     * let username = utils.ReadINI("e:\\my_file.ini", "Last.fm", "username");
     */
    ReadINI(filename: string, section: string, key: string, defaultval: string): string;

    /**
     * Displays an html dialog, rendered by IE engine.<br>
     * Utilizes the latest non-Edge IE that you have on your system.<br>
     * Dialog is modal (blocks input to the parent window while open).<br>
     *<br>
     * Html code must be IE compatible, meaning:<br>
     * - JavaScript features are limited by IE (see {@link https://www.w3schools.com/js/js_versions.asp}).<br>
     * - Objects passed to `data` are limited to standard JavaScript objects:<br>
     *   - No extensions from Spider Monkey Panel (e.g. no FbMetadbHandle or GdiBitmap).<br>
     *<br>
     * There are also additional limitations:<br>
     * - options.data may contain only the following types:<br>
     *   - Basic types: number, string, boolean, null, undefined.<br>
     *   - Objects as string: the only way to pass objects is to convert them to string and back with `JSON.stringify()` and `JSON.parse()`.<br>
     *   - Arrays: must be cast via `.toArray()` inside html. Each element has same type limitations as options.data.<br>
     *   - Functions: with maximum of 7 arguments. Each argument has same type limitations as options.data.
     *
     * @param {number} window_id {@link window.ID}
     * @param {string} code_or_path Html code or file path. File path must begin with `file://` prefix.
     * @param {object=} [options=undefined]
     * @param {number=} [options.width=250] Window width
     * @param {number=} [options.height=100] Window height
     * @param {number=} [options.x=0] Window horizontal position relative to desktop
     * @param {number=} [options.y=0] Window vertical position relative to desktop
     * @param {boolean=} [options.center=true] If true and if options.x and options.y are not set, will center window relative to fb2k position.
     * @param {boolean=} [options.context_menu=false] If true, will enable right-click context menu.
     * @param {boolean=} [options.resizable=false] If true, will allow to resize the window.
     * @param {boolean=} [options.selection=false] If true, will allow to select everything (label texts, buttons and etc).
     * @param {boolean=} [options.scroll=false] If true, will display scrollbars.
     * @param {*=} [options.data=undefined] Will be saved in `window.external.dialogArguments` and can be accessed from JavaScript executed inside HTML window.
     *                                      This data is read-only and should not be modified. Has type limitations (see above).
     *
     * @example <caption>Dialog from code</caption>
     * // See samples/basic/HtmlDialogWithCheckbox.txt
     *
     * @example <caption>Dialog from file</caption>
     * utils.ShowHtmlDialog(window.ID, `file://${fb.ComponentPath}samples/basic/html/PopupWithCheckBox.html`);
     */
    ShowHtmlDialog(window_id: number, code_or_path: string, options?: {
        width?: number;
        height?: number;
        x?: number;
        y?: number;
        center?: boolean;
        context_menu?: boolean;
        resizable?: boolean;
        selection?: boolean;
        scroll?: boolean;
        data?: any;

    }): void;

    /**
     * @param {string} filename
     * @param {string} section
     * @param {string} key
     * @param {string} val
     * @return {boolean}
     *
     * @example
     * utils.WriteINI("e:\\my_file.ini", "Last.fm", "username", "Bob");
     */
    WriteINI(filename: string, section: string, key: string, val: string): boolean;

    /**
     * Note: the parent folder must already exist.
     * Note2: the file is written with UTF8 encoding.
     *
     * @param {string} filename
     * @param {string} content
     * @param {boolean=} [write_bom=true]
     * @return {boolean}
     *
     * @example <caption>Default encoding</caption>
     * // write_bom missing but defaults to true, resulting file is UTF8-BOM
     * utils.WriteTextFile("z:\\1.txt", "test");
     *
     * @example <caption>UTF8 with BOM</caption>
     * utils.WriteTextFile("z:\\2.txt", "test", true);
     *
     * @example <caption>UTF8 without BOM</caption>
     * utils.WriteTextFile("z:\\3.txt", "test", false);
     */
    WriteTextFile(filename: string, content: string, write_bom?: boolean): boolean;
}

/**
 * Functions for working with the current SMP panel and accessing it's properties.
 *
 * @namespace
 */
interface Window {
    /**
     * Indicates which keys should be processed by the panel.<br>
     * See {@link https://docs.microsoft.com/en-us/windows/desktop/dlgbox/wm-getdlgcode} for more info.
     *
     * @return {number} See Flags.js > With window.DlgCode
     *
     * @example
     * window.DlgCode(DLGC_WANTALLKEYS);
     */
    DlgCode: number; // (int) (read, write)

    /**
     * Required in multiple methods such as {@link fb.GetClipboardContents}, {@link utils.ColourPicker}, {@link utils.GetAlbumArtAsync},
     * {@link utils.InputBox}, {@link utils.LoadImageAsync} and etc.
     *
     * @type {number}
     * @readonly
     */
    readonly ID: number, // (read) (int)

    /**
     * You need this to determine which GetFontXXX and GetColourXXX methods to use, assuming you want to support both interfaces.<br>
     * <br>
     * 0 - if using Columns UI<br>
     * 1 - if using default UI.
     *
     * @type {number}
     * @readonly
     */
    readonly InstanceType: number; // (int)

    /**
     * Only useful within Panel Stack Splitter (Columns UI component)<br>
     * Depends on setting inside Spider Monkey Panel Configuration window. You generally use it to determine
     * whether or not to draw a background.
     *
     * @type {boolean}
     * @readonly
     */
    readonly IsTransparent: boolean; // (boolean) (read)

    /**
     * @type {boolean}
     * @readonly
     */
    readonly IsVisible: boolean; // (boolean) (read)

    /**
     * @type {number}
     * @readonly
     */
    readonly Height: number; // (int) (read)

    /**
     * {@link window.MaxHeight}, {@link window.MaxWidth}, {@link window.MinHeight} and {@link window.MinWidth} can be used to lock the panel size.<br>
     * Do not use if panels are contained within Panel Stack Splitter (Columns UI component).
     *
     * @type {number}
     */
    MaxHeight: number; // (int) (read, write)

    /**
     * See {@link window.MaxHeight}.
     *
     * @type {number}
     */
    MaxWidth: number; // (int) (read, write)

    /**
     * Maximum allowed memory usage for the component (in bytes).<br>
     * If the total memory usage exceeds this value, all panels will fail with OOM error.
     * 
     * @type {number}
     * @readonly
     */
    readonly MemoryLimit: number; // (uint) (read)

    /**
     * See {@link window.MaxHeight}.
     *
     * @type {number}
     */
    MinHeight: number; // (int) (read, write)

    /**
     * See {@link window.MaxHeight}.
     *
     * @type {number}
     */
    MinWidth: number; // (int) (read, write)

    /**
     * Returns the author set in {@link window.DefinePanel}.
     * If it isn't present, the GUID of the panel is returned.
     *
     * @type {string}
     * @readonly
     */
    readonly Name: string; // (string) (read)

    /**
     * Memory usage of the current panel (in bytes).
     * 
     * @type {number}
     * @readonly
     */
    readonly PanelMemoryUsage: number; // (uint) (read)

    /**
     * Total memory usage of all panels (in bytes).
     * 
     * @type {number}
     * @readonly
     */
    readonly TotalMemoryUsage: number; // (uint) (read)

    /**
     * @type {number}
     * @readonly
     */
    readonly Width: number; // (int) (read)

    /**
     * See {@link clearTimeout}.
     * 
     * @param {number} timerID
     */
    ClearTimeout(timerId: number): void;

    /**
     * See {@link clearInterval}.
     * 
     * @param {number} timerID
     */
    ClearInterval(tiemrId: number): void;

    /**
     * Setups the panel information and available features.<br>
     * Can be called only once, so it's better to define it
     * directly in the panel Configure menu.
     *
     * @param {string} name Displayed panel name
     * @param {object=} [options={}]
     * @param {string=} [options.author=''] Script author
     * @param {string=} [options.version=''] Script version
     * @param {object=} [options.features=undefined] Additional script features
     * @param {boolean=} [options.features.drag_n_drop=false] Indicates if drag_n_drop functionality should be enabled
     */
    DefinePanel(name: string, options?: {
        author?: string;
        version?: string
        features?: {
            drag_n_drop?: boolean
        }
    }): void;

    /**
     * @return {MenuObject}
     *
     * @example
     * // See samples\basic\MainMenuManager All-In-One, samples\basic\Menu Sample.txt
     */
    CreatePopupMenu(): IMenuObj;

    /**
     * @param {string} class_id {@link http://msdn.microsoft.com/en-us/library/bb773210%28VS.85%29.aspx}
     * @return {ThemeManager}
     *
     * @example
     * // See samples\basic\SimpleThemedButton.txt
     */
    CreateThemeManager(class_id: string): IThemeManager;

    /**
     * @param {string=} [font_name='Segoe UI']
     * @param {number=} [font_size_px=12]
     * @param {number=} [font_style=0] See Flags.js > FontStyle
     * @return {FbTooltip}
     */
    CreateTooltip(font_name: string, font_size_px?: number, font_style?: number): IFbTooltip;

    /**
     * @param {number} type See Flags.js > Used in window.GetColourXXX()
     * @param {string=} client_guid See Flags.js > Used in GetColourCUI() as client_guid.
     * @return {number}
     */
    GetColourCUI(type: number, client_guid?: string): number;

    /**
     * @param {number} type
     * @return {number}
     */
    GetColourDUI(type: number): number;

    /**
     * @param {number} type See Flags.js > Used in window.GetFontXXX()
     * @param {string=} client_guid See Flags.js > Used in GetFontCUI() as client_guid.
     * @return {GdiFont} null if the component was unable to determine your font.
     */
    GetFontCUI(type: number, client_guid?: string): IGdiFont;

    /**
     * @param {number} type See Flags.js > Used in window.GetFontXXX()
     * @return {GdiFont} null if the component was unable to determine your font.
     *
     * @example
     * // To avoid errors when trying to use the font or access its properties, you
     * // should use code something like this...
     * let font = window.GetFontDUI(0);
     * if (!font) {
     *    console.log("Unable to determine your default font. Using Segoe UI instead.");
     *    font = gdi.Font("Segoe UI", 12);
     * }
     */
    GetFontDUI(type: number): IGdiFont;

    /**
     * Get value of property.<br>
     * If property does not exist and defaultval is not undefined and not null,
     * it will be created with the value of defaultval.<br>
     * <br>
     * Note: leading and trailing whitespace are removed from property name.
     *
     * @param {string} name
     * @param {*=} defaultval
     * @return {*}
     */
    GetProperty<T>(name: string, defaultval?: T): T;

    /**
     * This will trigger {@link module:callbacks~on_notify_data on_notify_data}(name, info) in other panels.<br>
     *
     * @param {string} name
     * @param {*} info
     */
    NotifyOthers(name: string, info: any): void;

    /**
     * Reload panel.
     * @method
     */
    Reload(): void;

    /**
     * Performance note: don't force the repaint unless it's really necessary -
     * repaint calls might be grouped up when *not forced* which will turn them into a single repaint call,
     * thus reducing the amount of {@link module:callbacks~on_paint on_paint} calls.
     * 
     * @param {boolean=} [force=false] If true, will repaint immediately, otherwise a repaint task will be *scheduled*.
     */
    Repaint(force?: boolean): void;

    /**
     * Repaints a part of the screen.<br>
     * Use this instead of {@link window.Repaint} on frequently updated areas
     * such as time, bitrate, seekbar, etc.<br>
     * <br>
     * Performance note: see Performance note in {@link window.Repaint}.
     * 
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {boolean=} [force=false] If true, will repaint immediately, otherwise a repaint task will be *scheduled*.
     */
    RepaintRect(x: number, y: number, w: number, h: number, force?: boolean): void;

    /**
     * This would usually be used inside the {@link module:callbacks~on_mouse_move on_mouse_move} callback.<br>
     * Use -1 if you want to hide the cursor.
     *
     * @param {number} id See Flags.js > Used in window.SetCursor()
     */
    SetCursor(id: number): void;

    /**
     * See {@link setInterval}.
     *
     * @param {function()} func
     * @param {number} delay
     *
     * @return {number}
     */
    SetInterval(func: Function, delay: number): number;

    /**
     * Set property value.<br>
     * Property will be removed, if val is undefined or null.<br>
     * <br>
     * Property values are saved per panel instance and are remembered between foobar2000 restarts.<br>
     * <br>
     * Note: leading and trailing whitespace are removed from property name.
     *
     * @param {string} name
     * @param {*=} val
     */
    SetProperty(name: string, val: any): void;

    /**
     * See {@link setTimeout}.
     *
     * @param {function()} func
     * @param {number} delay
     *
     * @return {number}
     */
    SetTimeout(func: Function, delay: number): number;

    /**
     * Show configuration window of current panel
     * @method
     */
    ShowConfigure(): void;

    /**
     * Show properties window of current panel
     * @method
     */
    ShowProperties(): void;

    /**
     * Uses editor that is set in `window.ShowConfigureV2`. By default works as
     * the same as the old `window.Configure` dialog.
     */
    EditScript(): void;

    /**
     * This dialog contains only various panel settings. Script editing is now
     * invoked via `Edit` buttons or `window.EditScript` dialog.
     */
    ShowConfigureV2(): void;

    /**
     *  - 'memory_usage': same values as `window.PanelMemoryUsage`;
     *  - 'total_memory_usage': same values as `window.TotalMemeoryUsage`;
     *  - 'total_memory_limit': same values as `window.MemoryLimit`;
     */
    JsMemoryStats: {
        memory_usage: number;
        total_memory_usage: number;
        total_memory_limit: number;
    }

    /**
     * `grab_focus` has the same behavior as the checkbox int the old
     * `window.Configure` dialog, i.e. if true, grabs user input when mouse is
     * over the panel. `true` by default.
     */
    DefineScript(script_name: string, infoObj: {
        author?: string;
        version?: string;
        features: {
            drag_n_drop?: boolean;
            grab_focus?: boolean;
        }
    }): void;


    /**
     * Contains all the info about the script that was either set up with
     * `window.DefineScript` or was defined in script package.
     */
    ScriptInfo:  {
        author: string;
        version: string;
        features: {
            drag_n_drop: boolean;
            grab_focus: boolean;
        }
    }

    Tooltip: IFbTooltip;
}

/**
 * @constructor
 * @hideconstructor
 */
interface IFbMetadb {
    /**
     * @type {string}
     * @readonly
     *
     * @example
     * let handle = fb.GetFocusItem();
     * console.log(handle.Path); // D:\SomeSong.flac
     */
    readonly Path: string;

    /**
     * @type {string}
     * @readonly
     *
     * @example
     * console.log(handle.RawPath); // file://D:\SomeSong.flac
     */
    readonly RawPath: string; // (string) (read)

    /**
     * @type {number}
     * @readonly
     */
    readonly SubSong: number; // (int) (read)

    /**
     * -1 if size is unavailable.
     *
     * @type {number} 
     * @readonly
     */
    readonly FileSize: number; // (LONGLONG) (read)

    /**
     * @type {float}
     * @readonly
     */
    readonly Length: number; // (double) (read)

    /**
     * See {@link https://github.com/TheQwertiest/foo_spider_monkey_panel/wiki/Playback-stats}
     *
     * @param {number} playcount Use 0 to clear
     */
    SetPlayCount(playcount: number): void;

    /**
     * See {@link https://github.com/TheQwertiest/foo_spider_monkey_panel/wiki/Playback-stats}
     *
     * @param {number} loved Use 0 to clear
     */
    SetLoved(loved: number): void;

    /**
     * See {@link https://github.com/TheQwertiest/foo_spider_monkey_panel/wiki/Playback-stats}
     *
     * @param {string} first_played Use "" to clear
     */
    SetFirstPlayed(first_played: string): void;

    /**
     * See {@link https://github.com/TheQwertiest/foo_spider_monkey_panel/wiki/Playback-stats}
     *
     * @param {string} last_played Use "" to clear
     */
    SetLastPlayed(last_played: string): void;

    /**
     * See {@link https://github.com/TheQwertiest/foo_spider_monkey_panel/wiki/Playback-stats}
     *
     * @param {number} rating Use 0 to clear
     */
    SetRating(rating: number): void;

    /**
     * See {@link https://github.com/TheQwertiest/foo_spider_monkey_panel/wiki/Playback-stats}
     *
     * @method
     */
    ClearStats(): void;

    /**
     * See {@link https://github.com/TheQwertiest/foo_spider_monkey_panel/wiki/Playback-stats}
     *
     * @method
     */
    RefreshStats(): void;

    /**
     * Compare two {@link FbMetadbHandle} instances, pointer only.<br>
     * If you want to compare them physically, use the {@link FbMetadbHandle#RawPath} property.
     *
     * @param {FbMetadbHandle} handle
     * @return {boolean}
     *
     * @example
     * handle.Compare(handle2);
     */
    Compare(handle: IFbMetadb): boolean;

    /**
     * @return {FbFileInfo}
     */
    // GetFileInfo () : IFbFileInfo;
}

/**
 * @constructor
 * @hideconstructor
 */
// function FbFileInfo() {
//     /**
//      * @type {number}
//      * @readonly
//      *
//      * @example
//      * let handle = fb.GetFocusItem();
//      * let file_info = handle.GetFileInfo();
//      * console.log(file_info.MetaCount); // 11
//      */
//     this.MetaCount = undefined; // (read)

//     /**
//      * @type {number}
//      * @readonly
//      *
//      * @example
//      * console.log(file_info.InfoCount); // 9
//      */
//     this.InfoCount = undefined; // (read)

//     /**
//      * @param {string} name
//      * @return {number} -1 on failure
//      */
//     this.InfoFind = function (name) { }; //

//     /**
//      * @param {number} idx
//      * @return {string}
//      */
//     this.InfoName = function (idx) { }; //

//     /**
//      * @param {number} idx
//      * @return {string}
//      */
//     this.InfoValue = function (idx) { }; //

//     /**
//      * @param {string} name
//      * @return {number} -1 on failure
//      */
//     this.MetaFind = function (name) { }; //

//     /**
//      * Note: the case of the tag name returned can be different depending on tag type,
//      * so using toLowerCase() or toUpperCase() on the result is recommended
//      *
//      * @param {number} idx
//      * @return {string}
//      *
//      * @example
//      * for (let i = 0; i < f.MetaCount; ++i) {
//      *      console.log(file_info.MetaName(i).toUpperCase());
//      * }
//      */
//     this.MetaName = function (idx) { }; //

//     /**
//      * @param {number} idx
//      * @param {number} vidx
//      * @return {string}
//      */
//     this.MetaValue = function (idx, vidx) { }; //

//     /**
//      * @param {number} idx
//      * @return {number}
//      */
//     this.MetaValueCount = function (idx) { }; //
// }

/**
 * Handle list elements can be accessed with array accessor, e.g.
 * handle_list[i]
 * Added iterator protocol support to FbMetadbHandleList: see
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols
 * for more info.
 *
 * @constructor
 * @param {FbMetadbHandleList | FbMetadbHandle | Array<FbMetadbHandle> | null | undefined} arg
 */
interface IFbMetadbList extends Array<IFbMetadb> {

    new(arg?: IFbMetadbList | IFbMetadb | IFbMetadb[] | null | undefined): IFbMetadbList;





    /**
     * @type {number}
     * @readonly
     *
     * @example
     * plman.GetPlaylistItems(plman.ActivePlaylist);
     * console.log(handle_list.Count);
     */
    readonly Count: number; // (uint) (read)

    /**
     * @param {FbMetadbHandle} handle
     * @return {number}
     *
     * @example
     * handle_list.Add(fb.GetNowPlaying());
     */
    Add(handle: IFbMetadb): number;

    /**
     * @param {FbMetadbHandleList} handle_list
     *
     * @example
     * handle_list.AddRange(fb.GetLibraryItems());
     */
    AddRange(handle_list: IFbMetadbList): void;

    /**
     * Errors such as invalid path, corrupt image, target file type not supporting
     * embedded art, etc should all silently fail. A progress dialog will be shown for larger file
     * selections.<br>
     * Any existing artwork of the specified type will be overwritten - there is no need to remove it first.
     *
     * @param {FbMetadbHandleList} image_path path to an existing image
     * @param {number=} [art_id=0] See Flags.js > AlbumArtId
     *
     * @example
     * let handle_list = plman.GetPlaylistItems(plman.ActivePlaylist);
     * if (handle_list.Count > 0) {
     *    let img_path = 'C:\\path\\to\\image.jpg';
     *    handle_list.AttachImage(img_path, 0);
     * }
     *
     * @example
     * // since there is no handle method, do this for a single item
     * let handle_list = new FbMetadbHandleList(fb.GetFocusItem());
     * let img_path = "C:\\path\\to\\image.jpg";
     * handle_list.AttachImage(img_path, 0);
     */
    AttachImage(image_path: string, art_id: number): void;

    /**
     * Faster than {@link FbMetadbHandleList#Find}.
     *
     * @param {FbMetadbHandle} handle Must be sorted with {@link FbMetadbHandleList#Sort}.
     * @return {number} -1 on failure.
     */
    BSearch(handle: IFbMetadb): number;

    /**
     * @return {float} total duration in seconds. For display purposes, consider using {@link utils.FormatDuration} on the result.
     */
    CalcTotalDuration(): number;

    /**
     * @return {number} total size in bytes. For display purposes, consider using utils.FormatFileSize() on the result.
     */
    CalcTotalSize(): number;

    /**
     * @return {FbMetadbHandleList}
     *
     * @example
     * let handle_list2 = handle_list.Clone();
     */
    Clone(): IFbMetadbList;

    /**
     * Converts {@link FbMetadbHandleList} to an array of {@link FbMetadbHandle}.<br>
     * Use this instead of looping through {@link FbMetadbHandleList}, if the playlist is big
     * or if you need to loop multiple times.<br>
     *
     * @return {Array<FbMetadbHandle>}
     *
     * @example
     * let playlist_items_array = plman.GetPlaylistItems(plman.ActivePlaylist).Convert();
     * for (let i = 0; i < playlist_items_array.length; ++i) {
     *    // do something with playlist_items_array[i] which is your handle
     * }
     */
    Convert(): IFbMetadb[];

    /**
     * Performance note: if sorted with {@link FbMetadbHandleList#Sort}, use {@link FbMetadbHandleList#BSearch} instead.
     *
     * @param {FbMetadbHandle} handle
     * @return {number} index in the handle list on success, -1 on failure
     */
    Find(handle: IFbMetadb): number;

    /**
     * See {@link fb.GetLibraryRelativePath}.<br>
     * <br>
     * This should be faster than looping a handle list manually and using the aforementioned method.
     *
     * @return {Array<string>}
     *
     * @example
     * let handle_list = fb.GetLibraryItems();
     * handle_list.OrderByRelativePath();
     * let relative_paths = handle_list.GetLibraryRelativePaths();
     */
    GetLibraryRelativePaths(): string[];

    /**
     * @param {number} index
     * @param {FbMetadbHandle} handle
     * @return {number}
     *
     * @example
     * // This inserts at the end of the handle list.
     * handle_list.Insert(handle_list.Count, fb.GetNowPlaying());
     */
    Insert(index: number, handle: IFbMetadb): number;

    /**
     * @param {number} index
     * @param {FbMetadbHandleList} handle_list
     * @return {number}
     */
    InsertRange(index: number, handle_list: IFbMetadbList): number;

    /**
     * Note: sort with {@link FbMetadbHandleList#Sort} before using.
     * 
     * @param {FbMetadbHandleList} handle_list Sorted handle list.
     *
     * @example
     * let one = plman.GetPlaylistItems(0);
     * one.Sort();
     *
     * let two = plman.GetPlaylistItems(1);
     * two.Sort();
     *
     * one.MakeDifference(two);
     * // "one" now only contains handles that were unique to "one".
     * // Anything that also existed in "two" will have been removed.
     */
    MakeDifference(handle_list: IFbMetadbList): void;

    /**
     * Note: sort with {@link FbMetadbHandleList#Sort} before using.
     * 
     * @param {FbMetadbHandleList} handle_list Sorted handle list.
     *
     * @example
     * let one = plman.GetPlaylistItems(0);
     * one.Sort();
     *
     * let two = plman.GetPlaylistItems(1);
     * two.Sort();
     *
     * one.MakeIntersection(two);
     * // "one" now only contains handles that were in BOTH "one" AND "two"
     */
    MakeIntersection(handle_list: IFbMetadbList): void;

    /**
     * Note: sort with {@link FbMetadbHandleList#Sort} before using.
     * 
     * @param {FbMetadbHandleList} handle_list Sorted handle list.
     *
     * @example
     * let one = plman.GetPlaylistItems(0);
     * one.Sort();
     *
     * let two = plman.GetPlaylistItems(1);
     * two.Sort();
     *
     * one.MakeUnion(two);
     * // "one" now contains all handles from "one" AND "two" with any duplicates removed
     */
    MakeUnion(handle_list: IFbMetadbList): void;

    /**
     * @param {FbTitleFormat} tfo An instance of FbTitleFormat.
     * @param {number} direction > 0 - ascending.
     *
     * @example
     * let handle_list = fb.GetLibraryItems();
     * let tfo = fb.TitleFormat("%album artist%|%date%|%album%|%discnumber%|%tracknumber%");
     * handle_list.OrderByFormat(tfo, 1);
     */
    OrderByFormat(tfo: IFbTitleFormat, direction: number): void;

    /**
     * Note: this method should only be used on a handle list containing items that are monitored as part of the Media Library.
     *
     * @method
     */
    OrderByPath(): void;

    /** @method */
    OrderByRelativePath(): void;

    /**
     * See {@link https://github.com/TheQwertiest/foo_spider_monkey_panel/wiki/Playback-stats}
     *
     * @method
     */
    RefreshStats(): void;

    /**
     * @param {FbMetadbHandle} handle
     */
    Remove(handle: IFbMetadb): void;

    /** @method */
    RemoveAll(): void;

    /**
     * Note: a progress dialog will be shown for larger file selections.
     *
     * @param {number=} [art_id=0] See Flags.js > AlbumArtId
     */
    RemoveAttachedImage(art_id: number): void;

    /**
     * Removes all attached images.
     * 
     * Note: a progress dialog will be shown for larger file selections.
     */
    RemoveAttachedImages(): void;

    /**
     * @param {number} idx
     *
     * @example
     * handle_list.RemoveById(0);
     */
    RemoveById(idx: number): void;

    /**
     * @param {number} from
     * @param {number} num
     *
     * @example
     * handle_list.RemoveRange(10, 20);
     */
    RemoveRange(from: number, num: number): void;

    /**
     * Remove duplicates and optimise for other handle list operations
     *
     * @method
     */
    Sort(): void;

    /**
     * Updated metadb tags with new values.
     *
     * @param {string} str JSON string, which contains an object (applies same values to every track)
     *                     or an array of objects (one object per track).
     *
     * @example
     * // assume we've selected one album
     * let handles = plman.GetPlaylistSelectedItems(plman.ActivePlaylist);
     *
     * let arr = [];
     * for (let i = 0; i < handles.Count; ++i) {
     *     // each element of the array must be an object of key names/values, indicated by the curly braces
     *     arr.push({
     *         'tracknumber' : i + 1, // independent values per track
     *         'totaltracks' : handles.Count,
     *         'album' : 'Greatest Hits', // a simple string for a single value
     *         'genre' : ['Rock', 'Hard Rock'], // we can use an array here for multiple value tags
     *         'bad_tag' : '' // blank values will clear any existing tags.
     *     });
     * }
     *
     * handles.UpdateFileInfoFromJSON(JSON.stringify(arr));
     */
    UpdateFileInfoFromJSON(str: string): void;
}

// interface FbMetadbHandleList extends IFbMetadbList {
//     new(arg: IFbMetadbList | IFbMetadb | IFbMetadb[] | null | undefined): IFbMetadbList;
// }

/**
 * A Recycle Bin for playlists.
 * 
 * @constructor
 * @hideconstructor
 */
interface IFbPlaylistRecycler {

    /**
     * @type {number}
     * @readonly
     */
    readonly Count: number; // (uint) (read)

    /**
     * @param {number} index
     * @return {string}
     */
    GetName(index: number): string;

    /**
     * @param {number} index
     * @return {FbMetadbHandleList}
     */
    GetContent(index: number): IFbMetadbList;

    /**
     * @param {number[]} affectedItems array like [1, 3, 5]
     */
    Purge(affectedItems: number[]): void;

    /**
     * @param {number} index
     */
    Restore(index: number): void;
}

/**
 * @constructor
 * @hideconstructor
 *
 * @example
 * let playing_item_location = plman.GetPlayingItemLocation();
 * if (playing_item_location.IsValid) {
 *     console.log(playing_item_location.PlaylistIndex);
 *     console.log(playing_item_location.PlaylistItemIndex);
 * }
 */
interface IFbPlayingItemLocation {

    /**
     * @type {boolean}
     * @readonly
     */
    readonly IsValid: boolean; // (boolean) (read)

    /**
     * @type {number}
     * @readonly
     */
    readonly PlaylistIndex: number; // (int) (read)

    /**
     * @type {number}
     * @readonly
     */
    readonly PlaylistItemIndex: number; // (int) (read)
}

/**
 * @constructor
 * @hideconstructor
 */
interface IFbPlaybackQueueItem {

    /**
     * @type {FbMetadbHandle}
     * @readonly
     */
    Handle: IFbMetadb; // (FbMetadbHandle) (read)

    /**
     * @type {number}
     * @readonly
     */
    PlaylistIndex: number; // (int) (read)

    /**
     * -1 if added not from a playlist
     *
     * @type {number}
     * @readonly
     */
    PlaylistItemIndex: number; // (int) (read)
}

/**
 * @constructor
 * @param {string} name
 *
 * @example
 * let test = new FbProfiler('test');
 * // do something time consuming
 * console.log(test.Time); // Outputs bare time in ms like "789"
 * test.Print(); // Outputs component name/version/assigned name like "Spider Monkey Panel v1.0.0: profiler (test): 789 ms"
 */
interface IFbProfiler {

    /**
     * @type {number}
     * @readonly
     */
    Time: number; // (uint) // milliseconds

    /** @method */
    Reset(): void;

    /** 
     * @param {string=} [additionalMsg=''] string that will be prepended to the measured time
     * @param {boolean=} [printComponentInfo=true]
     * 
     * @example
     * let test = new FbProfiler('Group #1');
     * // Do smth #1
     * test.Print('\nTask #1:', false);
     * // Do smth #2
     * test.Print('\nTask #2:', false);
     * // Do smth
     * test.Print();
     * // Output:
     * // profiler (Group #1): 
     * // Task #1: 789 ms"
     * // profiler (Group #1):
     * // Task #2: 1530 ms"
     * // Spider Monkey Panel v1.0.0: profiler (Group #1): 3541 ms"
     */
    Print(additionalMsg?: string, printComponentInfo?: boolean): void;
}

/**
 * Performance note: if you use the same query frequently, 
 * try caching FbTitleFormat object (by storing it somewhere),
 * instead of creating it every time.
 * 
 * @constructor
 * @param {string} expression
 */
interface IFbTitleFormat {

    new(expression: string): IFbTitleFormat;

    /**
     * Always use Eval when you want dynamic info such as %playback_time%, %bitrate% etc.<br>
     * {@link FbTitleFormat#EvalWithMetadb}(fb.GetNowplaying()) will not give the results you want.
     *
     * @param {boolean=} [force=false] If true, you can process text that doesn't contain
     *     title formatting even when foobar2000 isn't playing. When playing, you
     *     should always get a result.
     * @return {string}
     *
     * @example
     * let tfo = fb.TitleFormat("%artist%");
     * console.log(tfo.Eval());
     */
    Eval(force?: boolean): string;

    /**
     * @param {FbMetadbHandle} handle
     * @return {string}
     *
     * @example
     * let tfo = fb.TitleFormat("%artist%");
     * console.log(tfo.EvalWithMetadb(fb.GetFocusItem()));
     */
    EvalWithMetadb(handle: IFbMetadb): string;

    /**
     * @param handle_list {FbMetadbHandleList}
     * @return {Array<string>}
     *
     * @example
     * let tfo = fb.TitleFormat("%artist%");
     * let handle_list = fb.GetLibraryItems();
     * let artists = tfo.EvalWithMetadbs(handle_list);
     * console.log(handle_list.Count === artists.length); // should always be true!
     */
    EvalWithMetadbs(handle_list: IFbMetadbList): string[];
}

/**
 * @constructor
 * @hideconstructor
 */
interface IFbTooltip {
    /**
     * @type {string}
     *
     * @example
     * let tooltip = window.CreateTooltip();
     * tooltip.Text = "Whoop";
     */
    Text: string; // (string) (read, write)

    /** @type {boolean} */
    TrackActivate: boolean; // (boolean) (write)

    /**
     * Note: only do this when text has changed, otherwise it will flicker.
     *
     * @method
     *
     * @example
     * let text = "...";
     * if (tooltip.Text != text) {
     *    tooltip.Text = text;
     *    tooltip.Activate();
     * }
     */
    Activate(): void;

    /** @method */
    Deactivate(): void;

    /**
     * @param {number} type
     * @return {number}
     */
    GetDelayTime(type: number): number;

    /**
     * @param {number} type See Flags.js > Used in {@link FbTooltip#GetDelayTime} and {@link FbTooltip#SetDelayTime}
     * @param {number} time
     */
    SetDelayTime(type: number, time: number): void;

    /**
     * Use if you want multi-line tooltips.<br>
     * Use \n as a new line separator.
     *
     * @param {number} width
     *
     * @example
     * tooltip.SetMaxWidth(800);
     * tooltip.Text = "Line1\nLine2";
     */
    SetMaxWidth(width: number): void;

    /**
     * Note: check that x, y positions have changed from the last time, otherwise it will flicker.
     *
     * @param {number} x
     * @param {number} y
     */
    TrackPosition(x: number, y: number): void;

    SetFont(fontName: string, size_px: number, style?: number): void;
}

/**
 * This is typically used to update the selection used by the default UI artwork panel
 * or any other panel that makes use of the preferences under
 * File > Preferences > Display > Selection viewers. Use in conjunction with the {@link module:callbacks~on_focus on_focus}
 * callback.
 *
 * @constructor
 * @hideconstructor
 *
 * @example <caption>For playlist viewers</caption>
 * let selection_holder = fb.AcquireUiSelectionHolder();
 * selection_holder.SetPlaylistSelectionTracking();
 *
 * function on_focus(is_focused) {
 *     if (is_focused) { // Updates the selection when panel regains focus
 *         selection_holder.SetPlaylistSelectionTracking();
 *     }
 * }
 *
 * @example <caption>For library viewers</caption>
 * let selection_holder = fb.AcquireUiSelectionHolder();
 * let handle_list = null;
 *
 * function on_mouse_lbtn_up(x, y) { // Presumably going to select something here...
 *    handle_list = ...;
 *    selection_holder.SetSelection(handle_list);
 * }
 *
 * function on_focus(is_focused) {
 *    if (is_focused) { // Updates the selection when panel regains focus
 *        if (handle_list && handle_list.Count)
 *            selection_holder.SetSelection(handle_list);
 *    }
 * }
 */
interface IFbUiSelectionHolder {

    /**
     * Sets the selected items.
     *
     * @param {FbMetadbHandleList} handle_list
     * @param {number} type = 0
     *  - 0: undefined, default value;
     *  - 1: active_playlist_selection;
     *  - 2: caller_active_playlist;
     *  - 3: playlist_manager;
     *  - 4: now_playing;
     *  - 5: keyboard_shortcut_list;
     *  - 6: media_library_viewer;
     */
    SetSelection(handle_list: IFbMetadbList, type?: number): void;

    /**
     * Sets selected items to playlist selection and enables tracking.<br>
     * When the playlist selection changes, the stored selection is automatically
     * updated. Tracking ends when a set method is called on any ui_selection_holder
     * or when the last reference to this ui_selection_holder is released.
     */
    SetPlaylistSelectionTracking(): void;

    /**
     * Sets selected items to playlist contents and enables tracking.<br>
     * When the playlist selection changes, the stored selection is automatically
     * updated. Tracking ends when a set method is called on any ui_selection_holder
     * or when the last reference to this ui_selection_holder is released.
     */
    SetPlaylistTracking(): void;
}

/**
 * @constructor
 * @param {GdiBitmap} arg
 */
interface IGdiBitmap {
    /**
     * @type {number}
     * @readonly
     */
    readonly Height: number;// (int) (read)

    /**
     * @type {number}
     * @readonly
     */
    readonly Width: number;// (int) (read)

    /**
     * @param {number} alpha Valid values 0-255.
     * @return {GdiBitmap}
     */
    ApplyAlpha(alpha: number): IGdiBitmap;

    /**
     * Changes will be saved in the current bitmap. See samples\basic\Apply Mask.txt
     *
     * @param {GdiBitmap} img
     * @return {boolean}
     */
    ApplyMask(img: IGdiBitmap): boolean;

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @return {GdiBitmap}
     */
    Clone(x: number, y: number, w: number, h: number): IGdiBitmap;

    /**
     * Create a DDB bitmap from GdiBitmap, which is used in {@link GdiGraphics#GdiDrawBitmap}
     *
     * @return {GdiRawBitmap}
     */
    CreateRawBitmap(): IGdiRawBitmap;

    /**
     * @param {number} max_count
     * @return {Array<number>}
     */
    GetColourScheme(max_count: number): number[];

    /**
     * Returns a JSON array in string form so you need to use JSON.parse() on the result.<br>
     * Each entry in the array is an object which contains colour and frequency values.<br>
     * Uses a different method for calculating colours than {@link GdiBitmap#GetColourScheme}.<br>
     * Image is automatically resized during processing for performance reasons so there's no
     * need to resize before calling the method.
     *
     * @param {number} max_count
     * @return {string}
     *
     * @example
     * // See docs\Helpers.js for "toRGB" function.
     * img = ... // use utils.GetAlbumArtV2 / gdi.Image / etc
     * colours = JSON.parse(img.GetColourSchemeJSON(5));
     * console.log(colours[0].col); // -4194304
     * console.log(colours[0].freq); // 0.34
     * console.log(toRGB(colours[0].col)); // [192, 0, 0]
     */
    GetColourSchemeJSON(max_count: number): string;

    /**
     * Note: don't forget to use {@link GdiGraphics#ReleaseGraphics} after operations on GdiGraphics interface is done!
     *
     * @return {GdiGraphics}
     */
    GetGraphics(): IGdiGraphics;

    /**
     * @param {GdiGraphics} gr
     * @return {GdiGraphics}
     */
    ReleaseGraphics(gr: IGdiGraphics): IGdiGraphics;

    /**
     * @param {number} w
     * @param {number} h
     * @param {number=} [mode=0] See Flags.js > InterpolationMode
     * @return{GdiBitmap}
     */
    Resize(w: number, h: number, mode?: number): IGdiBitmap;

    /**
     * @param {number} mode See Flags.js > RotateFlipType
     */
    RotateFlip(mode: number): void;

    /**
     * @param {string} path Full path including file extension. The parent folder must already exist.
     * @param {string=} [format='image/png']
     *      "image/png"<br>
     *      "image/bmp"<br>
     *      "image/jpeg"<br>
     *      "image/gif"<br>
     *      "image/tiff"
     * @return {boolean}
     *
     * @example
     * let img = utils.GetAlbumArtEmbedded(fb.GetFocusItem().RawPath, 0);
     * if (img) {
     *     img.SaveAs("D:\\export.jpg", "image/jpeg");
     * }
     */
    SaveAs(path: string, format?: string): boolean;

    /**
     * @param {number} radius Valid values 2-254. S
     *
     * @example <caption>Blur image<caption>
     * // samples\basic\StackBlur (image).txt
     *
     * @example <caption>Blur text<caption>
     * // samples\basic\StackBlur (text).txt
     */
    StackBlur(radius: number): void;
}


interface IGdiFont {
    readonly Height: number;
    readonly Name: string;
    readonly Size: number;
    readonly Style: number;
    // Dispose(): void;
}

/**
 * Typically used inside `on_paint`.<br>
 *
 * Note: there are many different ways to get colours:
 * window.GetColourDUI/window.GetColourCUI,
 * RGB function from Helpers.js, utils.ColourPicker and
 * etc.
 *
 * @constructor
 * @hideconstructor
 */
interface IGdiGraphics {
    /**
     * Calculates text height for {@link GdiGraphics#GdiDrawText}.<br>
     * Note: this will only calculate the text height of one line.
     *
     * @param {string} str
     * @param {IGdiFont} font
     * @return {number}
     */
    CalcTextHeight(str: string | number, font: IGdiFont): number;

    /**
     * Calculates text width for {@link GdiGraphics#GdiDrawText}.
     *
     * @param {string} str
     * @param {GdiFont} font
     * @return {number}
     */
    CalcTextWidth(str: string | number, font: IGdiFont): number;

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number} line_width
     * @param {number} colour
     */
    DrawEllipse(x: number, y: number, w: number, h: number, line_width: number, colour: number): void;

    /**
     * @param {GdiBitmap} img
     * @param {number} dstX
     * @param {number} dstY
     * @param {number} dstW
     * @param {number} dstH
     * @param {number} srcX
     * @param {number} srcY
     * @param {number} srcW
     * @param {number} srcH
     * @param {number=} [angle=0]
     * @param {number=} [alpha=255] Valid values 0-255.
     */
    DrawImage(img: IGdiBitmap, dstX: number, dstY: number, dstW: number, dstH: number, srcX: number, srcY: number, srcW: number, srcH: number, angle?: number, alpha?: number): void;

    /**
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @param {number} line_width
     * @param {number} colour
     */
    DrawLine(x1: number, y1: number, x2: number, y2: number, line_width: number, colour: number): void;

    /**
     * @param {number} colour
     * @param {number} line_width
     * @param {Array<Array<number>>} points
     */
    DrawPolygon(colour: number, line_width: number, points: number[]): void;

    /**
     * Should be only used when {@link GdiGraphics#GdiDrawText} is not applicable.
     *
     * @param {string} str
     * @param {GdiFont} font
     * @param {number} colour
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number=} [flags=0] See Flags.js > StringFormatFlags
     */
    DrawString(str: string | number, font: IGdiFont, colour: number, x: number, y: number, w: number, h: number, flags: number): void;

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number} line_width
     * @param {number} colour
     */
    DrawRect(x: number, y: number, w: number, h: number, line_width: number, colour: number): void;

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number} arc_width
     * @param {number} arc_height
     * @param {number} line_width
     * @param {number} colour
     */
    DrawRoundRect(x: number, y: number, w: number, h: number, arc_width: number, arc_height: number, line_width: number, colour: number): void;

    /**
     * @param {string} str
     * @param {GdiFont} font
     * @param {number} max_width
     * @return {Array<Array>}
     *    index | meaning <br>
     *    [0] text line 1 <br>
     *    [1] width of text line 1 (in pixel) <br>
     *    [2] text line 2 <br>
     *    [3] width of text line 2 (in pixel) <br>
     *    ... <br>
     *    [2n + 2] text line n <br>
     *    [2n + 3] width of text line n (px)
     */
    EstimateLineWrap(str: string | number, font: IGdiFont, max_width: number): Array<string | number>;

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number} colour
     */
    FillEllipse(x: number, y: number, w: number, h: number, colour: number): void;

    /**
     * Note: this may appear buggy depending on rectangle size. The easiest fix is
     * to adjust the "angle" by a degree or two.
     *
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number} angle
     * @param {number} colour1
     * @param {number} colour2
     * @param {float} [focus=1.0] Specify where the centred colour will be at its highest intensity. Valid values between 0 and 1.
     */
    FillGradRect(x: number, y: number, w: number, h: number, angle: number, colour1: number, colour2: number, focus?: number): void;

    /**
     * @param {number} colour
     * @param {number} fillmode 0 alternate, 1 winding.
     * @param {Array<Array<number>>} points
     */
    FillPolygon(colour: number, fillmode: number, points: number[]): void;

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number} arc_width
     * @param {number} arc_height
     * @param {number} colour
     */
    FillRoundRect(x: number, y: number, w: number, h: number, arc_width: number, arc_height: number, colour: number): void;

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number} colour
     */
    FillSolidRect(x: number, y: number, w: number, h: number, colour: number): void;

    /**
     * @param {GdiRawBitmap} img
     * @param {number} dstX
     * @param {number} dstY
     * @param {number} dstW
     * @param {number} dstH
     * @param {number} srcX
     * @param {number} srcY
     * @param {number} srcW
     * @param {number} srcH
     * @param {number=} [alpha=255] Valid values 0-255.
     */
    GdiAlphaBlend(img: IGdiBitmap, dstX: number, dstY: number, dstW: number, dstH: number, srcX: number, srcY: number, srcW: number, srcH: number, alpha?: number): void;

    /**
     * Always faster than {@link GdiGraphics#DrawImage}, does not support alpha channel.
     *
     * @param {GdiRawBitmap} img
     * @param {number} dstX
     * @param {number} dstY
     * @param {number} dstW
     * @param {number} dstH
     * @param {number} srcX
     * @param {number} srcY
     * @param {number} srcW
     * @param {number} srcH
     */
    GdiDrawBitmap(img: IGdiBitmap, dstX: number, dstY: number, dstW: number, dstH: number, srcX: number, srcY: number, srcW: number, srcH: number): void;

    /**
     * Provides faster and better rendering than {@link GdiGraphics#DrawString}.<br>
     * <br>
     * Do not use this to draw text on transparent background or
     * with GdiGraphics other than the one passed in {@link module:callbacks~on_paint on_paint} callback:
     * this will result in visual artifacts caused by ClearType hinting.<br>
     * Use {@link GdiGraphics#DrawString} instead in such cases.<br>
     * <br>
     * To calculate text dimensions use {@link GdiGraphics#CalcTextHeight}, {@link GdiGraphics#CalcTextWidth} or DT_CALCRECT flag.
     *
     * @param {string} str
     * @param {GdiFont} font
     * @param {number} colour
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number=} [format=0] See Flags.js > DT_*
     * @return {Array<number>}
     *     index | meaning <br>
     *     [0] left   (DT_CALCRECT) <br>
     *     [1] top    (DT_CALCRECT) <br>
     *     [2] right  (DT_CALCRECT) <br>
     *     [3] bottom (DT_CALCRECT) <br>
     *     [4] characters drawn
     */
    GdiDrawText(str: number | string, font: IGdiFont, colour: number, x: number, y: number, w: number, h: number, format?: number): string[];

    /**
     * Calculates text dimensions for {@link GdiGraphics#DrawString}.
     *
     * @param {string} str
     * @param {GdiFont} font
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number=} [flags=0] See Flags.js > StringFormatFlags
     * @return {MeasureStringInfo}
     */
    MeasureString(str: number | string, font: IGdiFont, x: number, y: number, w: number, h: number, flags?: number): IMeasureStringInfo;


    /**
     * @param {number=} [mode=0] See Flags.js > InterpolationMode
     */
    SetInterpolationMode(mode?: number): void;

    /**
     * @param {number=} [mode=0] See Flags.js > SmoothingMode
     */
    SetSmoothingMode(mode?: number): void;

    /**
     * @param {number=} [mode=0] See Flags.js > TextRenderingHint
     */
    SetTextRenderingHint(mode?: number): void;
}


/**
 * @constructor
 * @hideconstructor
 *
 * @example
 * include(`${fb.ComponentPath}docs\\Flags.js`);
 * include(`${fb.ComponentPath}docs\\Helpers.js`);
 *
 * let sf = StringFormat(StringAlignment.Near, StringAlignment.Near);
 * let text = utils.ReadTextFile("z:\\info.txt");
 * let font = window.GetFontDUI(0);
 *
 * function on_paint(gr) {
 *     gr.DrawString(text, font, RGB(255, 0, 0), 0, 0, window.Width, window.Height, sf);
 *     let temp = gr.MeasureString(text, font, 0, 0, window.Width, 10000, sf);
 *     // If we want to calculate height, we must set the height to be far larger than what
 *     // the text could possibly be.
 *
 *     console.log(temp.Height); // 2761.2421875 // far larger than my panel height!
 *     console.log(temp.Chars); // 7967
 * }
 */
interface IMeasureStringInfo {
    // Properties
    readonly X: number;
    readonly Y: number;
    readonly Width: number;
    readonly Height: number;
    readonly Lines: number;
    readonly Chars: number;
}

/**
 * @constructor
 * @hideconstructor
 */
interface IGdiRawBitmap {

    /**
     * @type {number}
     * @readonly
     */
    readonly Width: number; // (int) (read)

    /**
     * @type {number}
     * @readonly
     */
    readonly Height: number; // (int) (read)
}

/**
 * @constructor
 * @hideconstructor
 */
interface IDropTargetAction {

    /** @type {number} */
    Base: number; // (write)

    /**
     * See {@link https://msdn.microsoft.com/en-us/library/windows/desktop/ms693457.aspx}
     *
     * @type {number}
     */
    Effect: number; //(read, write)

    /**
     * Active playlist.<br>
     * -1 by default.<br>
     * <br>
     * Note: property is write-only.
     *
     * @type {number}
     */
    Playlist: number; // (write)

    /** 
     * The tooltip text that is displayed during dragging.<br>
     * If the property is not modified, then default tooltip text will be used.
     * <br>
     * Note: property is write-only.
     * 
     * @type {string} 
     */
    Text: string; // (write)

    /**      
     * Note: property is write-only.
     * 
     * @type {boolean} 
     */
    ToSelect: boolean; // (boolean) (write)
}

/**
 * @constructor
 * @hideconstructor
 */
interface IContextMenuManager {
    /**
     * @param {MenuObject} menuObj
     * @param {number} base_id
     * @param {number=} [max_id=-1]
     */
    BuildMenu(menuObj: IMenuObj, base_id: number, max_id: number): void;

    /**
     * @param {number} id
     * @return {boolean}
     */
    ExecuteByID(id: number): boolean;

    /**
     * Initializes context menu by supplied tracks.
     * 
     * @param {FbMetadbHandleList} handle_list
     */
    InitContext(handle_list: IFbMetadbList): void;

    /**
     * Shows playlist specific options that aren't available when passing a
     * handle list to {@link ContextMenuManager#InitContext}.
     */
    InitContextPlaylist(): void;

    /**
     * Initializes context menu by currently played track.
     * 
     * @method 
     */
    InitNowPlaying(): void;
}

/**
 * @constructor
 * @hideconstructor
 */
interface IMainMenuManager {
    /**
     * @param {MenuObject} menuObj
     * @param {number} base_id
     * @param {number} count
     */
    BuildMenu(menuObj: IMenuObj, base_id: number, count: number): void;

    /**
     * @param {number} id
     * @return {boolean}
     */
    ExecuteByID(id: number): boolean;

    /** @method */
    Init(root_name: string): void;
}

/**
 * @constructor
 * @hideconstructor
 */
interface IMenuObj {

    /**
     * @param {number} flags See Flags.js > Used in AppendMenuItem()
     * @param {number} item_id Integer greater than 0. Each menu item needs a unique id.
     * @param {string} text
     */
    AppendMenuItem(flags: number, item_id: number, text: string): void;

    /** @method */
    AppendMenuSeparator(): void;

    /**
     * @param {MenuObject} parentMenu
     * @param {number} flags See Flags.js > Used in AppendMenuItem()
     * @param {string} text
     */
    AppendTo(parentMenu: IMenuObj, flags: number, text: string): void;

    /**
     * @param {number} item_id
     * @param {boolean} check
     */
    CheckMenuItem(item_id: number, check: boolean): void;

    /**
     * @param {number} first_item_id
     * @param {number} last_item_id
     * @param {number} selected_item_id
     */
    CheckMenuRadioItem(first_item_id: number, last_item_id: number, selected_item_id: number): void;

    /**
     * @param {number} x
     * @param {number} y
     * @param {number=} [flags=0] See Flags.js > Used in TrackPopupMenu().
     * @return {number}
     */
    TrackPopupMenu(x: number, y: number, flags?: number): number;
}

/**
 * @constructor
 * @hideconstructor
 */
interface IThemeManager {
    /**
     * @param {GdiGraphics} gr
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number=} [clip_x=0]
     * @param {number=} [clip_y=0]
     * @param {number=} [clip_w=0]
     * @param {number=} [clip_h=0]
     */
    DrawThemeBackground(gr: IGdiGraphics, x: number, y: number, w: number, h: number, clip_x?: number, clip_y?: number, clip_w?: number, clip_h?: number): void;

    /**
     * @param {number} partid
     * @return {boolean}
     */
    IsThemePartDefined(partid: number): boolean;

    /**
     * See {@link http://msdn.microsoft.com/en-us/library/bb773210%28VS.85%29.aspx}
     *
     * @param {number} partid
     * @param {number=} [stateid=0]
     */
    SetPartAndStateID(partid: number, stateid?: number): void;
}

declare var fb: IFbUtils;
declare var gdi: IGdiUtils;
declare var utils: IWSHUtils;
declare var plman: IFbPlaylistManager;
declare var FbMetadbHandleList: IFbMetadbList;
