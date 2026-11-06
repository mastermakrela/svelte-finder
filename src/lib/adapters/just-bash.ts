import { joinPath, type FinderEntry, type FinderFS } from '../fs.js';

/** The slice of just-bash's `IFileSystem` the adapter uses (no dependency on the package). */
export interface JustBashFileSystem {
	readdir(path: string): Promise<string[]>;
	readdirWithFileTypes?(
		path: string
	): Promise<{ name: string; isFile: boolean; isDirectory: boolean; isSymbolicLink: boolean }[]>;
	stat(path: string): Promise<{ isFile: boolean; isDirectory: boolean; size: number; mtime: Date }>;
	readFileBuffer?(path: string): Promise<Uint8Array>;
	exists?(path: string): Promise<boolean>;
	mv?(src: string, dest: string): Promise<void>;
}

export function justBashFS(fs: JustBashFileSystem): FinderFS {
	const { exists, mv } = fs;
	return {
		read: fs.readFileBuffer?.bind(fs),
		// mv replaces an existing target, the contract says reject
		move:
			exists && mv
				? async (from, to) => {
						if (await exists.call(fs, to)) throw new Error(`Already exists: ${to}`);
						await mv.call(fs, from, to);
					}
				: undefined,
		async list(path) {
			// Sync-throwing backends still reject: this is an async function.
			const names = fs.readdirWithFileTypes
				? (await fs.readdirWithFileTypes(path)).map((d) => ({
						name: d.name,
						isDirectory: d.isDirectory,
						symlink: d.isSymbolicLink
					}))
				: (await fs.readdir(path)).map((name) => ({
						name,
						isDirectory: undefined,
						symlink: undefined
					}));
			return Promise.all(
				names.map(async ({ name, isDirectory, symlink }): Promise<FinderEntry> => {
					const entryPath = joinPath(path, name);
					try {
						// stat follows the link, so a link to a folder lists as a folder
						const s = await fs.stat(entryPath);
						return {
							name,
							path: entryPath,
							kind: s.isDirectory ? 'directory' : 'file',
							size: s.size,
							modified: s.mtime.getTime(),
							symlink
						};
					} catch {
						return { name, path: entryPath, kind: isDirectory ? 'directory' : 'file', symlink };
					}
				})
			);
		}
	};
}
