import { joinPath, type FinderEntry, type FinderFS } from '../fs.js';

/** The slice of modern-monaco's `FileSystem` the adapter uses (no dependency on the package). */
export interface ModernMonacoFileSystem {
	readDirectory(path: string): Promise<[string, number][]>;
	stat(path: string): Promise<{ type: number; size: number; mtime: number }>;
	readFile?(path: string): Promise<Uint8Array>;
	rename?(from: string, to: string): Promise<void>;
	watch(
		path: string,
		options: { recursive: boolean },
		handle: (...args: never[]) => void
	): () => void;
}

export function modernMonacoFS(fs: ModernMonacoFileSystem): FinderFS {
	return {
		async list(path) {
			const entries = await fs.readDirectory(path);
			return Promise.all(
				entries.map(async ([name, type]): Promise<FinderEntry> => {
					const entry: FinderEntry = {
						name,
						path: joinPath(path, name),
						// VS Code's FileType bits: 2 directory, 64 symbolic link (66 = a link to a folder)
						kind: type & 2 ? 'directory' : 'file',
						symlink: (type & 64) !== 0
					};
					try {
						const s = await fs.stat(entry.path);
						entry.size = s.size;
						entry.modified = s.mtime;
					} catch {
						// size/modified stay omitted
					}
					return entry;
				})
			);
		},
		watch: (path, onChange) => fs.watch(path, { recursive: true }, () => onChange()),
		read: fs.readFile?.bind(fs),
		// rejects when the target exists unless asked to overwrite, which this never does
		move: fs.rename?.bind(fs)
	};
}
